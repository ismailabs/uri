import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { AUTO_MODEL } from '../lib/types';
import type { Conversation } from '../lib/types';
import { newId } from '../lib/chat';
import {
  CHATS_KEY,
  clearChats,
  loadConversations,
  loadLastModel,
  parseConversations,
  readChatsRaw,
  saveLastModel,
  serializeConversations,
  writeChatsRaw,
} from '../lib/storage';

function blank(model: string): Conversation {
  const now = Date.now();
  return { id: newId(), title: 'New chat', model, createdAt: now, updatedAt: now, messages: [] };
}

/**
 * Conversation store. Chats live in React state and are mirrored to
 * localStorage (debounced). Every page load starts on a fresh empty chat.
 * `busy` holds ids of chats that are currently streaming.
 */
export function useConversations(busy: MutableRefObject<Set<string>>) {
  const [initial] = useState(() => {
    const first = blank(loadLastModel());
    return { list: [first, ...loadConversations()], id: first.id };
  });
  const [conversations, setConversations] = useState<Conversation[]>(initial.list);
  const [activeId, setActiveId] = useState(initial.id);
  const [storageError, setStorageError] = useState(false);

  const latest = useRef(conversations);
  latest.current = conversations;
  const lastRaw = useRef<string | null>(readChatsRaw());

  const persist = useCallback(() => {
    const raw = serializeConversations(latest.current);
    if (raw === lastRaw.current) return;
    if (writeChatsRaw(raw)) {
      lastRaw.current = raw;
      setStorageError(false);
    } else {
      setStorageError(true);
    }
  }, []);

  // Debounced save; flushed when the tab is hidden or closed.
  useEffect(() => {
    const t = window.setTimeout(persist, 350);
    return () => window.clearTimeout(t);
  }, [conversations, persist]);
  useEffect(() => {
    const onHide = () => persist();
    const onVisibility = () => document.visibilityState === 'hidden' && persist();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [persist]);

  // Keep several open tabs in sync instead of overwriting each other.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== CHATS_KEY) return;
      lastRaw.current = e.newValue;
      const incoming = parseConversations(e.newValue);
      setConversations((prev) => {
        const keep = prev.filter((c) => busy.current.has(c.id) || c.messages.length === 0);
        const keepIds = new Set(keep.map((c) => c.id));
        return [...keep, ...incoming.filter((c) => !keepIds.has(c.id))];
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [busy]);

  // Always have a valid active chat.
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];
  useEffect(() => {
    if (conversations.length === 0) {
      const c = blank(loadLastModel());
      setConversations([c]);
      setActiveId(c.id);
    } else if (!conversations.some((c) => c.id === activeId)) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const update = useCallback((id: string, fn: (c: Conversation) => Conversation) => {
    setConversations((list) => list.map((c) => (c.id === id ? fn(c) : c)));
  }, []);

  const newChat = useCallback(() => {
    const empty = latest.current.find((c) => c.messages.length === 0);
    if (empty) {
      setActiveId(empty.id);
      return;
    }
    const c = blank(loadLastModel());
    setConversations((list) => [c, ...list]);
    setActiveId(c.id);
  }, []);

  const remove = useCallback((id: string) => {
    const rest = latest.current.filter((c) => c.id !== id);
    setConversations(rest);
    setActiveId((cur) => (cur === id ? [...rest].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? '' : cur));
  }, []);

  const clear = useCallback(
    (id: string) => update(id, (c) => ({ ...c, title: 'New chat', messages: [], updatedAt: Date.now() })),
    [update],
  );

  const removeAll = useCallback(() => {
    const c = blank(loadLastModel());
    setConversations([c]);
    setActiveId(c.id);
    clearChats();
    lastRaw.current = null;
  }, []);

  const setModel = useCallback(
    (id: string, model: string) => {
      update(id, (c) => ({ ...c, model }));
      saveLastModel(model);
    },
    [update],
  );

  return {
    conversations,
    active: active ?? blank(AUTO_MODEL),
    setActiveId,
    update,
    newChat,
    remove,
    clear,
    removeAll,
    setModel,
    storageError,
  };
}
