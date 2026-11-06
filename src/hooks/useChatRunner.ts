import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { ChatError, Conversation, Message } from '../lib/types';
import { buildRequestMessages, newId, titleFrom } from '../lib/chat';
import { OpenRouterError, isAbortError, streamChat } from '../lib/openrouter';

interface Options {
  conversations: Conversation[];
  update: (id: string, fn: (c: Conversation) => Conversation) => void;
  apiKey: string;
  busy: MutableRefObject<Set<string>>;
}

const FLUSH_MS = 50;

/** Runs streaming requests. Each conversation can stream independently. */
export function useChatRunner({ conversations, update, apiKey, busy }: Options) {
  const controllers = useRef(new Map<string, AbortController>());
  const [streamingIds, setStreamingIds] = useState<string[]>([]);
  const convRef = useRef(conversations);
  convRef.current = conversations;
  const keyRef = useRef(apiKey);
  keyRef.current = apiKey;

  const run = useCallback(
    async (convId: string, history: Message[], model: string, title?: string) => {
      const apiKeyNow = keyRef.current;
      if (!apiKeyNow || controllers.current.has(convId)) return;

      const assistantId = newId();
      const controller = new AbortController();
      controllers.current.set(convId, controller);
      busy.current.add(convId);
      setStreamingIds([...controllers.current.keys()]);

      const placeholder: Message = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() };
      update(convId, (c) => ({
        ...c,
        title: title ?? c.title,
        messages: [...history, placeholder],
        updatedAt: Date.now(),
      }));

      let acc = '';
      let usedModel: string | undefined;
      let timer: number | undefined;
      const patch = (fields: Partial<Message>) =>
        update(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantId ? { ...m, ...fields } : m)),
        }));
      const flush = () => {
        timer = undefined;
        patch({ content: acc, ...(usedModel ? { model: usedModel } : {}) });
      };

      try {
        await streamChat({
          apiKey: apiKeyNow,
          model,
          messages: buildRequestMessages(history),
          signal: controller.signal,
          onDelta: (t) => {
            acc += t;
            if (timer === undefined) timer = window.setTimeout(flush, FLUSH_MS);
          },
          onModel: (m) => {
            usedModel = m;
          },
        });
        window.clearTimeout(timer);
        if (!acc.trim()) {
          patch({
            content: '',
            ...(usedModel ? { model: usedModel } : {}),
            error: {
              kind: 'empty',
              message: 'The model returned an empty response. Try again or choose another model.',
            },
          });
        } else {
          patch({ content: acc, ...(usedModel ? { model: usedModel } : {}) });
        }
      } catch (e) {
        window.clearTimeout(timer);
        if (isAbortError(e) || controller.signal.aborted) {
          if (acc.trim()) {
            patch({ content: acc, stopped: true, ...(usedModel ? { model: usedModel } : {}) });
          } else {
            // Nothing was received: drop the empty placeholder.
            update(convId, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== assistantId) }));
          }
        } else {
          const error: ChatError =
            e instanceof OpenRouterError
              ? e.toJSON()
              : { kind: 'unknown', message: 'Something went wrong while contacting OpenRouter.' };
          patch({ content: acc, error, ...(usedModel ? { model: usedModel } : {}) });
        }
      } finally {
        controllers.current.delete(convId);
        busy.current.delete(convId);
        setStreamingIds([...controllers.current.keys()]);
      }
    },
    [busy, update],
  );

  const send = useCallback(
    (convId: string, text: string) => {
      const conv = convRef.current.find((c) => c.id === convId);
      if (!conv) return;
      const userMsg: Message = { id: newId(), role: 'user', content: text, createdAt: Date.now() };
      void run(convId, [...conv.messages, userMsg], conv.model, conv.messages.length === 0 ? titleFrom(text) : undefined);
    },
    [run],
  );

  /** Re-runs the last assistant reply, or answers a trailing user message. */
  const regenerate = useCallback(
    (convId: string, modelOverride?: string) => {
      const conv = convRef.current.find((c) => c.id === convId);
      if (!conv || conv.messages.length === 0) return;
      const last = conv.messages[conv.messages.length - 1];
      const history = last.role === 'assistant' ? conv.messages.slice(0, -1) : conv.messages;
      if (history.length === 0 || history[history.length - 1].role !== 'user') return;
      void run(convId, history, modelOverride ?? conv.model);
    },
    [run],
  );

  const stop = useCallback((convId: string) => controllers.current.get(convId)?.abort(), []);
  const stopAll = useCallback(() => controllers.current.forEach((c) => c.abort()), []);

  useEffect(() => {
    const map = controllers.current;
    return () => map.forEach((c) => c.abort());
  }, []);

  return { streamingIds, send, regenerate, stop, stopAll };
}
