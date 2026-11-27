import { createHash } from 'node:crypto';
import { reserveArkSpend } from './ark-usage.js';

export function openAiCompatibleProvider() {
  const baseUrl = process.env.AI_OPENAI_COMPATIBLE_BASE_URL?.trim();
  const model = process.env.AI_OPENAI_COMPATIBLE_MODEL?.trim();
  const apiKey = process.env.AI_OPENAI_COMPATIBLE_API_KEY?.trim();
  return chatCompletionsProvider({ id: 'openai-compatible', baseUrl, model, apiKey });
}

export function arkProvider() {
  const apiKey = process.env.ARK_API_KEY?.trim();
  if (!apiKey) return undefined;
  return chatCompletionsProvider({
    id: 'ark', apiKey,
    baseUrl: process.env.ARK_BASE_URL?.trim() || 'https://ark.cn-beijing.volces.com/api/v3',
    model: process.env.ARK_MODEL?.trim(),
  });
}

function chatCompletionsProvider({ id, baseUrl, model, apiKey }) {
  if (!baseUrl || !model) return undefined;

  let endpoint;
  try {
    endpoint = new URL(baseUrl);
  } catch {
    return undefined;
  }
  if (!['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return undefined;
  if (id === 'ark' && endpoint.protocol !== 'https:') return undefined;
  const ark = id === 'ark';
  endpoint.pathname = endpoint.pathname.replace(/\/+$/, '') + '/chat/completions';

  return {
    id,
    model,
    cacheScope: createHash('sha256').update(JSON.stringify([endpoint.href, apiKey])).digest('hex'),
    ...(ark && { reserveSpend: (request) => reserveArkSpend(model, request) }),
    async generate({ contents, systemInstruction, schema, maxOutputTokens, signal }) {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey && { authorization: 'Bearer ' + apiKey }),
        },
        redirect: 'error',
        signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: ark
            ? systemInstruction + '\nReturn one JSON object matching this schema: ' + JSON.stringify(schema)
            : systemInstruction }, { role: 'user', content: contents }],
          ...(ark ? {
            max_tokens: maxOutputTokens,
            thinking: { type: 'disabled' },
            response_format: { type: 'json_object' },
          } : {
            max_completion_tokens: maxOutputTokens,
            response_format: {
              type: 'json_schema',
              json_schema: { name: 'career_navigator_response', schema },
            },
          }),
        }),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw Object.assign(new Error('OpenAI-compatible request failed'), {
          status: response.status,
          retryAfter: response.headers.get('retry-after'),
        });
      }
      const { choices, usage } = await response.json();
      const text = choices?.[0]?.finish_reason === 'length' ? undefined : choices?.[0]?.message?.content;
      return ark ? { text, usage } : text;
    },
  };
}
