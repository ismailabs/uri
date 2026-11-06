import { AUTO_MODEL } from './types';
import type { ApiMessage, ChatError, ErrorKind, ModelInfo } from './types';

const API = 'https://openrouter.ai/api/v1';

export class OpenRouterError extends Error {
  kind: ErrorKind;
  status?: number;
  constructor(kind: ErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'OpenRouterError';
    this.kind = kind;
    this.status = status;
  }
  toJSON(): ChatError {
    return { kind: this.kind, message: this.message, status: this.status };
  }
}

export const isAbortError = (e: unknown): boolean =>
  e instanceof DOMException && e.name === 'AbortError';

/** The only models this app will ever send a request to. */
export const isFreeModelId = (id: string): boolean => id === AUTO_MODEL || id.endsWith(':free');

/** Turns an HTTP status (or a mid-stream error code) into a readable error. */
export function errorFromStatus(status: number, apiMessage?: string): OpenRouterError {
  const detail = apiMessage ? ` Details: ${apiMessage.slice(0, 240)}` : '';
  if (status === 401)
    return new OpenRouterError('auth', 'OpenRouter rejected your API key. Check that it is correct and still active.', status);
  if (status === 402)
    return new OpenRouterError(
      'credits',
      'OpenRouter reports insufficient credits for this request. UR Intelligence only uses free models, so check your OpenRouter account.',
      status,
    );
  if (status === 403) return new OpenRouterError('forbidden', `OpenRouter blocked this request.${detail}`, status);
  if (status === 404)
    return new OpenRouterError('model', 'This model is not available right now. Choose another model or switch to Auto.', status);
  if (status === 429)
    return new OpenRouterError(
      'rate',
      'Rate limit reached. Free models allow a limited number of requests, so wait a moment and try again.',
      status,
    );
  if (status === 400) {
    if (apiMessage && /context|too long|maximum.*token|token.*limit/i.test(apiMessage))
      return new OpenRouterError(
        'context',
        'This conversation is too long for the selected model. Start a new chat or choose a model with a larger context window.',
        status,
      );
    if (apiMessage && /no endpoints|not a valid model|model.*(not|unavailable)/i.test(apiMessage))
      return new OpenRouterError('model', 'This model is not available right now. Choose another model or switch to Auto.', status);
    return new OpenRouterError('unknown', `OpenRouter rejected the request.${detail}`, status);
  }
  if (status >= 500 || status === 408)
    return new OpenRouterError('provider', 'The model provider is unavailable or timed out. Try again, or choose another model.', status);
  return new OpenRouterError('unknown', `Unexpected response from OpenRouter (HTTP ${status}).${detail}`, status);
}

async function readApiMessage(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    const m = body?.error?.message;
    return typeof m === 'string' ? m : undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------ SSE parsing ------------------------------ */

/**
 * Minimal Server-Sent Events line parser. Handles chunk boundaries, CRLF,
 * and ignores comment lines such as ": OPENROUTER PROCESSING".
 */
export function createSseParser(onData: (data: string) => void) {
  let buffer = '';
  const handleLine = (line: string) => {
    if (!line || line.startsWith(':')) return;
    if (line.startsWith('data:')) onData(line.slice(5).trimStart());
  };
  return {
    feed(text: string) {
      buffer += text;
      const lines = buffer.split(/\r\n|\n|\r/);
      buffer = lines.pop() ?? '';
      for (const line of lines) handleLine(line);
    },
    flush() {
      if (buffer) handleLine(buffer);
      buffer = '';
    },
  };
}

function errorFromChunk(err: unknown): OpenRouterError {
  const e = err as { code?: unknown; message?: unknown } | null;
  const code = typeof e?.code === 'number' ? e.code : Number(e?.code);
  const message = typeof e?.message === 'string' ? e.message : undefined;
  return errorFromStatus(Number.isFinite(code) && code > 0 ? code : 502, message);
}

/** Handles one parsed SSE `data:` payload. Returns true when the stream is finished. */
export function handleStreamPayload(
  data: string,
  cb: { onDelta: (t: string) => void; onModel?: (m: string) => void },
): boolean {
  if (data === '[DONE]') return true;
  let json: any;
  try {
    json = JSON.parse(data);
  } catch {
    return false; // ignore anything that isn't JSON
  }
  if (json?.error) throw errorFromChunk(json.error); // mid-stream error
  if (typeof json?.model === 'string') cb.onModel?.(json.model);
  const choice = json?.choices?.[0];
  const text = choice?.delta?.content;
  if (typeof text === 'string' && text) cb.onDelta(text);
  if (choice?.finish_reason === 'error') throw errorFromStatus(502);
  return false;
}

/* ------------------------------- Chat stream ------------------------------ */

export interface StreamArgs {
  apiKey: string;
  model: string;
  messages: ApiMessage[];
  signal: AbortSignal;
  onDelta: (text: string) => void;
  onModel?: (model: string) => void;
}

/**
 * Streams a chat completion. Throws OpenRouterError on failure and a
 * DOMException("AbortError") when cancelled. Content is delivered through
 * onDelta, so partial output survives an error.
 */
export async function streamChat(args: StreamArgs): Promise<void> {
  // Safety net: never send a request for a model that is not free.
  if (!isFreeModelId(args.model))
    throw new OpenRouterError('model', 'Only free models can be used. Choose Auto or a ":free" model.');

  let res: Response;
  try {
    res = await fetch(`${API}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${args.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: args.model, messages: args.messages, stream: true }),
      signal: args.signal,
    });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new OpenRouterError(
      'network',
      'Could not reach OpenRouter. Check your connection, VPN, or ad blocker, then try again.',
    );
  }
  if (!res.ok) throw errorFromStatus(res.status, await readApiMessage(res));
  if (!res.body) throw new OpenRouterError('network', 'OpenRouter returned an empty response.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let finished = false;
  const parser = createSseParser((data) => {
    if (handleStreamPayload(data, { onDelta: args.onDelta, onModel: args.onModel })) finished = true;
  });

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    parser.feed(decoder.decode());
    parser.flush();
  } catch (e) {
    if (isAbortError(e) || e instanceof OpenRouterError) throw e;
    throw new OpenRouterError('network', 'The connection to OpenRouter was interrupted.');
  } finally {
    reader.cancel().catch(() => {});
  }
}

/* ------------------------------ Model catalogue --------------------------- */

/** True for free, text-in/text-out chat models. The router itself is excluded (Auto handles it). */
export function isFreeChatModel(m: any): boolean {
  if (typeof m?.id !== 'string' || !m.id.endsWith(':free') || m.id.startsWith('openrouter/')) return false;
  const out = m.architecture?.output_modalities;
  const inp = m.architecture?.input_modalities;
  if (Array.isArray(out) && !out.includes('text')) return false;
  if (Array.isArray(inp) && !inp.includes('text')) return false;
  if (m.pricing && (Number(m.pricing.prompt) > 0 || Number(m.pricing.completion) > 0)) return false;
  return true;
}

export const displayName = (name: string): string => name.replace(/\s*\(free\)\s*$/i, '').trim();

export async function fetchFreeModels(signal?: AbortSignal): Promise<ModelInfo[]> {
  let res: Response;
  try {
    // Public endpoint: no API key is sent.
    res = await fetch(`${API}/models`, { signal });
  } catch (e) {
    if (isAbortError(e)) throw e;
    throw new OpenRouterError('network', 'Could not load the model list. Check your connection and try again.');
  }
  if (!res.ok) throw new OpenRouterError('provider', `Could not load the model list (HTTP ${res.status}).`, res.status);
  const body = await res.json().catch(() => null);
  const data: any[] = Array.isArray(body?.data) ? body.data : [];
  return data
    .filter(isFreeChatModel)
    .map((m) => ({
      id: m.id as string,
      name: displayName(typeof m.name === 'string' && m.name ? m.name : m.id),
      contextLength: typeof m.context_length === 'number' ? m.context_length : undefined,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
