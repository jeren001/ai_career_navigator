import { GoogleGenAI } from '@google/genai';
import { geminiFetch } from './gemini-fetch.js';
import { arkProvider, openAiCompatibleProvider } from './openai-compatible.js';

export const GEMINI_DEFAULT_MODEL = 'gemini-3.1-flash-lite';

export function geminiProvider(injectedClient) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!injectedClient && (!apiKey || process.env.NODE_ENV === 'test')) return undefined;
  const model = process.env.GEMINI_MODEL || GEMINI_DEFAULT_MODEL;
  return {
    id: 'gemini',
    model,
    async generate({ contents, systemInstruction, schema, maxOutputTokens, signal, timeoutMs }) {
      let retryAfter;
      const transport = geminiFetch() || fetch;
      const client = injectedClient || new GoogleGenAI({
        apiKey,
        httpOptions: {
          async fetch(input, init) {
            const response = await transport(input, init);
            retryAfter = response.headers.get('retry-after');
            return response;
          },
        },
      });
      try {
        const response = await client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            maxOutputTokens,
            temperature: 0.2,
            abortSignal: signal,
            httpOptions: { timeout: timeoutMs, retryOptions: { attempts: 1 } },
          },
        });
        return response.text;
      } catch (error) {
        if (retryAfter) error.retryAfter = retryAfter;
        throw error;
      }
    },
  };
}

export function ollamaProvider() {
  const model = process.env.OLLAMA_MODEL?.trim();
  if (!model) return undefined;
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim() || 'http://127.0.0.1:11434';
  return {
    id: 'ollama',
    model,
    cacheScope: baseUrl,
    async generate({ contents, systemInstruction, schema, maxOutputTokens, signal }) {
      const endpoint = new URL('api/chat', baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
      if (!['http:', 'https:'].includes(endpoint.protocol)) throw new Error('Invalid Ollama URL protocol');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        redirect: 'error',
        signal,
        body: JSON.stringify({
          model,
          stream: false,
          format: schema,
          messages: [{ role: 'system', content: systemInstruction }, { role: 'user', content: contents }],
          options: { temperature: 0.2, num_predict: maxOutputTokens },
        }),
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw Object.assign(new Error('Ollama request failed'), {
          status: response.status,
          retryAfter: response.headers.get('retry-after'),
        });
      }
      return (await response.json()).message?.content;
    },
  };
}

export function configuredAiProviders(injectedGemini) {
  const registry = new Map([
    ['ark', arkProvider],
    ['gemini', () => geminiProvider(injectedGemini)],
    ['ollama', ollamaProvider],
    ['openai-compatible', openAiCompatibleProvider],
  ]);
  const primary = process.env.AI_PRIMARY_PROVIDER?.trim() || (injectedGemini ? 'gemini' : 'ark');
  const secondary = process.env.AI_SECONDARY_PROVIDER?.trim();
  return [...new Set([primary, secondary])].map((name) => registry.get(name)?.()).filter(Boolean);
}
