import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Conversation } from '../lib/types';
import { Icon, Logo } from './Icons';
import { KeyForm } from './KeyForm';
import { MessageView } from './MessageView';

interface Props {
  conversation: Conversation;
  streaming: boolean;
  hasKey: boolean;
  keySaved: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onSwitchToAuto: () => void;
  onOpenSettings: () => void;
  onSaveKey: (key: string, remember: boolean) => void;
}

const STARTERS = [
  'Explain how HTTPS works in plain language',
  'Help me write a polite follow-up email',
  'Write a Python function that parses a CSV file',
];

export function ChatView({
  conversation,
  streaming,
  hasKey,
  keySaved,
  onSend,
  onStop,
  onRegenerate,
  onSwitchToAuto,
  onOpenSettings,
  onSaveKey,
}: Props) {
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const msgs = conversation.messages;
  const last = msgs[msgs.length - 1];

  // Follow the stream unless the reader has scrolled up.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs, streaming]);

  useLayoutEffect(() => {
    const ta = area.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [text]);

  useEffect(() => {
    if (hasKey && window.matchMedia('(pointer: fine)').matches) area.current?.focus();
  }, [hasKey]);

  const submit = (value = text) => {
    const t = value.trim();
    if (!t || streaming || !hasKey) return;
    setText('');
    stick.current = true;
    onSend(t);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const empty = msgs.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <div className="mx-auto w-full max-w-[46rem] px-4 py-6">
          {empty && !hasKey && (
            <div className="mx-auto mt-6 max-w-sm sm:mt-16">
              <Logo className="mb-5 size-10" />
              <h1 className="text-2xl font-semibold tracking-tight">Connect your OpenRouter key</h1>
              <p className="mb-6 mt-2 text-sm leading-relaxed text-muted">
                UR Intelligence runs entirely in your browser. Your key is sent straight to OpenRouter and kept in memory
                unless you choose to remember it on this device.{' '}
                <a className="text-accent underline underline-offset-2" href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">
                  Get a free key
                </a>
                .
              </p>
              <KeyForm initialRemember={keySaved} submitLabel="Start chatting" onSubmit={onSaveKey} />
            </div>
          )}

          {empty && hasKey && (
            <div className="mt-8 sm:mt-20">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What can I help with?</h1>
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {STARTERS.map((s) => (
                  <li key={s}>
                    <button type="button" onClick={() => submit(s)} className="w-full px-1 py-3 text-left text-[0.9375rem] text-ink/80 hover:text-ink">
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-7">
            {msgs.map((m, i) => (
              <MessageView
                key={m.id}
                message={m}
                isLast={i === msgs.length - 1}
                streaming={streaming}
                conversationModel={conversation.model}
                onRegenerate={onRegenerate}
                onSwitchToAuto={onSwitchToAuto}
                onOpenSettings={onOpenSettings}
              />
            ))}
          </div>

          {last?.role === 'user' && !streaming && hasKey && (
            <div className="mt-4">
              <button type="button" className="btn-outline" onClick={onRegenerate}>
                <Icon name="refresh" className="size-4" /> Get a response
              </button>
            </div>
          )}
          {!empty && !hasKey && (
            <div className="notice mt-6">
              <p>Add your OpenRouter API key to continue this chat.</p>
              <button type="button" className="btn-solid mt-2.5" onClick={onOpenSettings}>
                Add API key
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="mx-auto w-full max-w-[46rem]">
          <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-sm focus-within:border-accent">
            <textarea
              ref={area}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={!hasKey}
              placeholder={hasKey ? 'Message UR Intelligence' : 'Add your OpenRouter key to start'}
              aria-label="Message"
              className="max-h-[200px] min-h-[2.5rem] flex-1 resize-none bg-transparent px-2.5 py-2 text-[0.9375rem] leading-6 outline-none placeholder:text-muted disabled:cursor-not-allowed"
            />
            {streaming ? (
              <button type="button" onClick={onStop} aria-label="Stop generating" title="Stop generating" className="send-btn">
                <Icon name="stop" />
              </button>
            ) : (
              <button type="button" onClick={() => submit()} disabled={!text.trim() || !hasKey} aria-label="Send message" title="Send" className="send-btn">
                <Icon name="send" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-xs text-muted">Free models can be wrong and may log prompts. Don’t share sensitive information.</p>
        </div>
      </div>
    </div>
  );
}
