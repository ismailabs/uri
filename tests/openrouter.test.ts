import { describe, expect, it } from 'vitest';
import {
  createSseParser,
  errorFromStatus,
  handleStreamPayload,
  isFreeChatModel,
  isFreeModelId,
  streamChat,
} from '../src/lib/openrouter';

function parseAll(chunks: string[]): string[] {
  const out: string[] = [];
  const p = createSseParser((d) => out.push(d));
  chunks.forEach((c) => p.feed(c));
  p.flush();
  return out;
}

describe('SSE parser', () => {
  it('ignores comment lines and blank lines', () => {
    expect(parseAll([': OPENROUTER PROCESSING\n\ndata: {"a":1}\n\n'])).toEqual(['{"a":1}']);
  });
  it('reassembles events split across chunk boundaries', () => {
    expect(parseAll(['da', 'ta: {"x":', '"y"}\n', '\ndata: [DONE]\n\n'])).toEqual(['{"x":"y"}', '[DONE]']);
  });
  it('handles CRLF line endings', () => {
    expect(parseAll(['data: one\r\n\r\ndata: two\r\n\r\n'])).toEqual(['one', 'two']);
  });
  it('flushes a final line with no trailing newline', () => {
    expect(parseAll(['data: last'])).toEqual(['last']);
  });
});

describe('stream payloads', () => {
  const run = (payloads: string[]) => {
    let text = '';
    let model = '';
    let finished = false;
    for (const p of payloads) {
      finished = handleStreamPayload(p, { onDelta: (t) => (text += t), onModel: (m) => (model = m) }) || finished;
    }
    return { text, model, finished };
  };
  it('accumulates deltas and the reported model', () => {
    const r = run([
      '{"model":"qwen/x:free","choices":[{"delta":{"content":"Hel"}}]}',
      '{"choices":[{"delta":{"content":"lo"}}]}',
      '{"choices":[{"delta":{},"finish_reason":"stop"}]}',
      '[DONE]',
    ]);
    expect(r).toEqual({ text: 'Hello', model: 'qwen/x:free', finished: true });
  });
  it('ignores reasoning-only deltas and non-JSON payloads', () => {
    expect(run(['not json', '{"choices":[{"delta":{"reasoning":"hmm"}}]}']).text).toBe('');
  });
  it('throws on mid-stream error chunks', () => {
    expect(() => handleStreamPayload('{"error":{"code":429,"message":"slow down"},"choices":[{"finish_reason":"error"}]}', { onDelta() {} })).toThrow(/Rate limit/);
  });
  it('throws when finish_reason is error without details', () => {
    expect(() => handleStreamPayload('{"choices":[{"delta":{},"finish_reason":"error"}]}', { onDelta() {} })).toThrow();
  });
});

describe('error mapping', () => {
  it.each([
    [401, 'auth'],
    [402, 'credits'],
    [403, 'forbidden'],
    [404, 'model'],
    [429, 'rate'],
    [502, 'provider'],
    [503, 'provider'],
  ])('maps HTTP %i to %s', (status, kind) => {
    expect(errorFromStatus(status).kind).toBe(kind);
  });
  it('recognises context-length and missing-endpoint 400s', () => {
    expect(errorFromStatus(400, 'maximum context length exceeded').kind).toBe('context');
    expect(errorFromStatus(400, 'No endpoints found for foo/bar:free').kind).toBe('model');
    expect(errorFromStatus(400, 'bad field').kind).toBe('unknown');
  });
});

describe('free-model rules', () => {
  it('allows only the router and :free ids', () => {
    expect(isFreeModelId('openrouter/free')).toBe(true);
    expect(isFreeModelId('qwen/qwen3:free')).toBe(true);
    expect(isFreeModelId('openai/gpt-4o')).toBe(false);
    expect(isFreeModelId('openrouter/auto')).toBe(false);
  });
  it('filters the catalogue to free text chat models', () => {
    const ok = { id: 'a/b:free', architecture: { input_modalities: ['text'], output_modalities: ['text'] }, pricing: { prompt: '0', completion: '0' } };
    expect(isFreeChatModel(ok)).toBe(true);
    expect(isFreeChatModel({ ...ok, id: 'a/b' })).toBe(false);
    expect(isFreeChatModel({ ...ok, architecture: { input_modalities: ['text'], output_modalities: ['image'] } })).toBe(false);
    expect(isFreeChatModel({ ...ok, pricing: { prompt: '0.000001', completion: '0' } })).toBe(false);
    expect(isFreeChatModel({ ...ok, id: 'openrouter/free:free' })).toBe(false);
  });
  it('refuses to send a request for a non-free model', async () => {
    await expect(
      streamChat({ apiKey: 'k', model: 'openai/gpt-4o', messages: [], signal: new AbortController().signal, onDelta() {} }),
    ).rejects.toMatchObject({ kind: 'model' });
  });
});
