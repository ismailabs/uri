import { AUTO_MODEL } from './types';
import type { ChatError, Conversation, Message } from './types';

export const CHATS_KEY = 'ur.chats.v1';
const API_KEY = 'ur.apiKey'; // only written if the user explicitly opts in
const THEME_KEY = 'ur.theme';
const MODEL_KEY = 'ur.lastModel';

const get = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const set = (k: string, v: string): boolean => {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
};
const del = (k: string) => {
  try {
    localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
};

/* ------------------------------- API key ---------------------------------- */
export const loadSavedKey = (): string => get(API_KEY) ?? '';
export const saveKey = (key: string): boolean => set(API_KEY, key);
export const clearSavedKey = () => del(API_KEY);

/* -------------------------------- Prefs ----------------------------------- */
export const saveTheme = (t: 'light' | 'dark') => set(THEME_KEY, t);
export const loadLastModel = (): string => get(MODEL_KEY) || AUTO_MODEL;
export const saveLastModel = (m: string) => set(MODEL_KEY, m);

/* ------------------------------ Conversations ----------------------------- */
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function cleanError(e: any): ChatError | undefined {
  if (!e || !str(e.kind) || !str(e.message)) return undefined;
  return { kind: e.kind, message: e.message, ...(num(e.status) ? { status: e.status } : {}) };
}

function cleanMessage(m: any): Message | null {
  if (!m || !str(m.id) || (m.role !== 'user' && m.role !== 'assistant') || !str(m.content)) return null;
  const error = cleanError(m.error);
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: num(m.createdAt) ? m.createdAt : Date.now(),
    ...(str(m.model) ? { model: m.model } : {}),
    ...(error ? { error } : {}),
    ...(m.stopped === true ? { stopped: true } : {}),
  };
}

/** Only known fields are ever read from, or written to, localStorage. */
function cleanConversation(c: any): Conversation | null {
  if (!c || !str(c.id) || !Array.isArray(c.messages)) return null;
  const messages = c.messages.map(cleanMessage).filter((m: Message | null): m is Message => m !== null);
  return {
    id: c.id,
    title: str(c.title) && c.title ? c.title : 'New chat',
    model: str(c.model) && c.model ? c.model : AUTO_MODEL,
    createdAt: num(c.createdAt) ? c.createdAt : Date.now(),
    updatedAt: num(c.updatedAt) ? c.updatedAt : Date.now(),
    messages,
  };
}

export function parseConversations(raw: string | null): Conversation[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    const list = Array.isArray(data?.conversations) ? data.conversations : [];
    return list.map(cleanConversation).filter((c: Conversation | null): c is Conversation => c !== null);
  } catch {
    return [];
  }
}

export const readChatsRaw = (): string | null => get(CHATS_KEY);
export const loadConversations = (): Conversation[] => parseConversations(get(CHATS_KEY));

/** Empty chats and in-flight (empty) assistant placeholders are not persisted. */
export function serializeConversations(list: Conversation[]): string {
  const conversations = list
    .map((c) => ({
      ...c,
      messages: c.messages.filter((m) => !(m.role === 'assistant' && !m.content && !m.error)),
    }))
    .filter((c) => c.messages.length > 0)
    .map(cleanConversation)
    .filter((c): c is Conversation => c !== null);
  return JSON.stringify({ v: 1, conversations });
}

export const writeChatsRaw = (raw: string): boolean => set(CHATS_KEY, raw);
export const clearChats = () => del(CHATS_KEY);

/** Export contains conversations only. It never includes the API key. */
export function exportJson(list: Conversation[]): string {
  const { conversations } = JSON.parse(serializeConversations(list));
  return JSON.stringify({ app: 'UR Intelligence', exportedAt: new Date().toISOString(), conversations }, null, 2);
}
