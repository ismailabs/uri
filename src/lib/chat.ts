import type { ApiMessage, Message } from './types';

export const SYSTEM_PROMPT =
  'You are UR Intelligence, a helpful and concise assistant. Use Markdown when it helps, and put code in fenced code blocks with a language tag.';

/** Rough budget for history sent with each request (about 15k tokens). */
export const MAX_CONTEXT_CHARS = 60_000;

export function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }
}

export function titleFrom(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > 48 ? t.slice(0, 47).trimEnd() + '…' : t || 'New chat';
}

/**
 * Builds the request payload: system prompt plus the most recent messages
 * that fit the budget. Failed or empty assistant messages are left out.
 */
export function buildRequestMessages(history: Message[], maxChars = MAX_CONTEXT_CHARS): ApiMessage[] {
  const usable = history.filter((m) => m.content.trim() && !(m.role === 'assistant' && m.error));
  const picked: Message[] = [];
  let total = 0;
  for (let i = usable.length - 1; i >= 0; i--) {
    const m = usable[i];
    if (picked.length > 0 && total + m.content.length > maxChars) break;
    picked.unshift(m);
    total += m.content.length;
  }
  while (picked.length > 1 && picked[0].role !== 'user') picked.shift();
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...picked.map((m) => ({ role: m.role, content: m.content }))];
}
