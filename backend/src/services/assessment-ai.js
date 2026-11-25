import { createHash } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { ASSESSMENT_SYSTEM_PROMPT } from './assessment-prompts.js';
import { geminiProvider, ollamaProvider } from './ai-providers.js';

const CACHE_TTL_MS = 5 * 60_000;
const MIN_REQUEST_INTERVAL_MS = 3_000;
const MAX_ATTEMPTS_PER_MINUTE = 10;
const MAX_ATTEMPTS_PER_DAY = 450;
const TASK_TIMEOUT_MS = 34_000;
const ATTEMPT_TIMEOUT_MS = 15_000;
const cache = new Map();
const inFlight = new Map();
const cooldowns = new Map();
let attempts = [];
let injectedGemini;
let injectedProviders;

function fallback(reason) {
  return { status: 'fallback', reason };
}

async function reserveAttempt(initial, { beforeRequest, quotaReason }, deadline, spacingDeadline) {
  const now = Date.now();
  const day = Math.floor(now / 86_400_000);
  attempts = attempts.filter(({ time }) => time >= day * 86_400_000 || now - time < 60_000);
  const minuteCount = attempts.filter(({ time }) => now - time < 60_000).length;
  const dayCount = attempts.filter(({ time }) => time >= day * 86_400_000).length;
  if (minuteCount >= MAX_ATTEMPTS_PER_MINUTE || dayCount >= MAX_ATTEMPTS_PER_DAY) return 'rate_limited';
  if (performance.now() >= deadline) return 'timeout';

  const lastInitial = attempts.findLast((attempt) => attempt.initial);
  const delay = initial && lastInitial ? lastInitial.time + MIN_REQUEST_INTERVAL_MS - now : 0;
  if (delay > 0) {
    const waitMs = delay + 5;
    if (performance.now() + waitMs >= Math.min(spacingDeadline, deadline)) return 'rate_limited';
    await wait(waitMs);
    return reserveAttempt(initial, { beforeRequest, quotaReason }, deadline, spacingDeadline);
  }

  const slot = { time: now, initial };
  attempts.push(slot);
  try {
    if (beforeRequest && !(await beforeRequest())) {
      attempts = attempts.filter((entry) => entry !== slot);
      return quotaReason;
    }
  } catch {
    attempts = attempts.filter((entry) => entry !== slot);
    return 'daily_limit_unavailable';
  }
  return undefined;
}

function retryAfterMs(error) {
  const header = error?.retryAfter;
  if (header != null && /^\d+(?:\.\d+)?$/.test(String(header))) return Number(header) * 1000;
  if (header && Number.isFinite(Date.parse(header))) return Math.max(0, Date.parse(header) - Date.now());
  return 0;
}

function failureFor(error) {
  const status = Number(error?.status || error?.response?.status);
  if (status === 429) return { reason: 'quota_exceeded', retry: true, retryAfter: retryAfterMs(error) || 15_000 };
  if (status === 408 || error?.name === 'TimeoutError' || error?.name === 'AbortError') {
    return { reason: 'timeout', retry: true };
  }
  if (status >= 500 && status <= 599) return { reason: 'service_unavailable', retry: true, retryAfter: retryAfterMs(error) };
  const detail = `${error?.code || ''} ${error?.cause?.code || ''} ${error?.message || ''}`;
  if (/fetch failed|network error|ECONN|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|UND_ERR/i.test(detail)) {
    return { reason: 'network_error', retry: true };
  }
  if (error instanceof SyntaxError) return { reason: 'invalid_response', retry: true };
  return { reason: 'unavailable' };
}

async function generateWithTimeout(provider, request, timeoutMs) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new DOMException('AI provider timed out', 'TimeoutError');
          reject(error);
          controller.abort(error);
        }, timeoutMs);
      }),
      provider.generate({ ...request, signal: controller.signal, timeoutMs }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function runProviders(providers, request, options) {
  const { validate, maxAttempts = 3, waitForSlot = false } = options;
  const deadline = performance.now() + (options.taskTimeoutMs ?? TASK_TIMEOUT_MS);
  const spacingDeadline = waitForSlot ? performance.now() + MIN_REQUEST_INTERVAL_MS + 100 : 0;
  let used = 0;
  let reason = 'not_configured';

  for (const [index, provider] of providers.entries()) {
    const circuit = cooldowns.get(provider.id);
    if (circuit && circuit.until > Date.now()) {
      reason = circuit.reason;
      continue;
    }
    // Leave one attempt for a configured secondary provider.
    const providerLimit = maxAttempts - (providers.length - index - 1);
    const providerDeadline = index === providers.length - 1 ? deadline : deadline - 8_000;
    for (let retry = 0; used < providerLimit; retry += 1) {
      if (performance.now() >= providerDeadline) break;
      const denied = await reserveAttempt(used === 0, options, providerDeadline, spacingDeadline);
      if (denied) return fallback(denied);
      used += 1;
      let failure;
      try {
        const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, Math.max(1, Math.floor(providerDeadline - performance.now())));
        const text = await generateWithTimeout(provider, request, timeoutMs);
        const value = validate(JSON.parse(text || 'null'));
        if (value) return { ...value, status: 'ai', provider: provider.id, cached: false };
        failure = { reason: 'invalid_response', retry: true };
      } catch (error) {
        failure = failureFor(error);
      }

      reason = failure.reason;
      if (failure.retryAfter) {
        cooldowns.set(provider.id, { reason, until: Date.now() + failure.retryAfter });
      }
      const delay = Math.max(failure.retryAfter || 0, 250 * 2 ** retry + Math.random() * 100);
      if (!failure.retry || used >= providerLimit || delay > 2_000 || delay >= providerDeadline - performance.now()) break;
      await wait(delay);
    }
  }
  return fallback(reason);
}

export async function generateAssessmentJson(options) {
  const { userId, contents, schema, maxOutputTokens } = options;
  const providers = injectedProviders || [geminiProvider(injectedGemini), ollamaProvider()].filter(Boolean);
  const systemInstruction = ASSESSMENT_SYSTEM_PROMPT;
  const request = { contents, systemInstruction, schema, maxOutputTokens };
  const scope = providers.map(({ id, model, cacheScope }) => ({ id, model, cacheScope }));
  const key = createHash('sha256').update(JSON.stringify({ userId, scope, request })).digest('hex');
  const now = Date.now();
  for (const [id, entry] of cache) {
    if (now - entry.createdAt >= CACHE_TTL_MS) cache.delete(id);
  }
  const cached = cache.get(key);
  if (cached) return { ...cached.value, cached: true };

  const pending = inFlight.get(key);
  if (pending) return pending;
  const operation = runProviders(providers, request, { quotaReason: 'daily_limit', ...options });
  inFlight.set(key, operation);
  try {
    const result = await operation;
    if (result.status === 'ai') cache.set(key, { value: result, createdAt: Date.now() });
    return result;
  } finally {
    inFlight.delete(key);
  }
}

export function setGeminiClientForTests(client) {
  injectedGemini = client;
}

export function setAiProvidersForTests(providers) {
  injectedProviders = providers;
}

export function resetGeminiStateForTests() {
  injectedGemini = undefined;
  injectedProviders = undefined;
  attempts = [];
  cache.clear();
  inFlight.clear();
  cooldowns.clear();
}
