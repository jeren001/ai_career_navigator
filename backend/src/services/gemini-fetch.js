import { ProxyAgent } from 'undici';

let proxy;

export function geminiFetch() {
  const proxyUrl = process.env.GEMINI_HTTP_PROXY?.trim();
  if (!proxyUrl) return undefined;
  if (proxy?.url === proxyUrl) return proxy.fetch;

  const url = new URL(proxyUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Invalid Gemini proxy protocol');
  const dispatcher = new ProxyAgent(url);
  proxy?.dispatcher.close().catch(() => {});
  proxy = { url: proxyUrl, dispatcher, fetch: (input, init) => fetch(input, { ...init, dispatcher }) };
  return proxy.fetch;
}
