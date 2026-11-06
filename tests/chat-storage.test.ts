import { describe, expect, it } from 'vitest';
import { buildRequestMessages, titleFrom } from '../src/lib/chat';
import { exportJson, parseConversations, serializeConversations } from '../src/lib/storage';
import type { Conversation, Message } from '../src/lib/types';

const msg = (role: 'user' | 'assistant', content: string, extra: Partial<Message> = {}): Message => ({
  id: Math.random().toString(36).slice(2),
  role,
  content,
  createdAt: 1,
  ...extra,
});
const conv = (messages: Message[], extra: Partial<Conversation> = {}): Conversation => ({
  id: 'c1',
  title: 't',
  model: 'openrouter/free',
  createdAt: 1,
  updatedAt: 1,
  messages,
  ...extra,
});

describe('request building', () => {
  it('starts with the system prompt and skips failed/empty assistant messages', () => {
    const out = buildRequestMessages([
      msg('user', 'hi'),
      msg('assistant', '', { error: { kind: 'rate', message: 'x' } }),
      msg('assistant', ''),
      msg('user', 'again'),
    ]);
    expect(out.map((m) => m.role)).toEqual(['system', 'user', 'user']);
  });
  it('keeps the newest messages within the budget and begins on a user turn', () => {
    const history = [msg('user', 'a'.repeat(50)), msg('assistant', 'b'.repeat(50)), msg('user', 'c'.repeat(50))];
    const out = buildRequestMessages(history, 120);
    expect(out.slice(1).map((m) => m.content[0])).toEqual(['c']);
    const out2 = buildRequestMessages(history, 160);
    expect(out2.slice(1).map((m) => m.content[0])).toEqual(['a', 'b', 'c']);
  });
  it('always keeps the latest message even if it exceeds the budget', () => {
    expect(buildRequestMessages([msg('user', 'x'.repeat(500))], 10)).toHaveLength(2);
  });
  it('builds short titles', () => {
    expect(titleFrom('  hello\n  world ')).toBe('hello world');
    expect(titleFrom('x'.repeat(100))).toHaveLength(48);
  });
});

describe('persistence', () => {
  it('round-trips conversations and drops empty chats and placeholders', () => {
    const raw = serializeConversations([
      conv([msg('user', 'hi'), msg('assistant', '')]),
      conv([], { id: 'empty' }),
    ]);
    const back = parseConversations(raw);
    expect(back).toHaveLength(1);
    expect(back[0].messages).toHaveLength(1);
  });
  it('never persists unknown fields (so a key cannot sneak into storage)', () => {
    const polluted: any = conv([msg('user', 'hi')]);
    polluted.apiKey = 'sk-or-v1-secret';
    polluted.messages[0].apiKey = 'sk-or-v1-secret';
    expect(serializeConversations([polluted])).not.toContain('sk-or-v1-secret');
    expect(exportJson([polluted])).not.toContain('sk-or-v1-secret');
  });
  it('survives corrupted storage', () => {
    expect(parseConversations('{not json')).toEqual([]);
    expect(parseConversations(JSON.stringify({ conversations: [{ id: 1 }, null, 'x'] }))).toEqual([]);
  });
});
