import { Suspense, lazy, memo } from 'react';
import type { Message } from '../lib/types';
import { AUTO_MODEL } from '../lib/types';
import { CopyButton } from './CopyButton';
import { Icon } from './Icons';

const Markdown = lazy(() => import('./Markdown'));

interface Props {
  message: Message;
  isLast: boolean;
  streaming: boolean;
  conversationModel: string;
  onRegenerate: () => void;
  onSwitchToAuto: () => void;
  onOpenSettings: () => void;
}

const actionBtn =
  'inline-flex items-center gap-1.5 rounded-md p-1.5 text-muted hover:bg-sunken hover:text-ink';

function MessageViewInner({
  message,
  isLast,
  streaming,
  conversationModel,
  onRegenerate,
  onSwitchToAuto,
  onOpenSettings,
}: Props) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-sunken px-4 py-2.5 text-[0.9375rem] leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  const err = message.error;
  const busy = streaming && isLast;

  return (
    <div>
      {message.content ? (
        <Suspense fallback={<div className="whitespace-pre-wrap text-[0.9375rem] leading-relaxed">{message.content}</div>}>
          <Markdown text={message.content} />
        </Suspense>
      ) : busy ? (
        <div className="flex items-center gap-1.5 py-2 text-muted" role="status" aria-label="Waiting for the model">
          <span className="dot" />
          <span className="dot" style={{ animationDelay: '0.15s' }} />
          <span className="dot" style={{ animationDelay: '0.3s' }} />
        </div>
      ) : null}

      {err && (
        <div className="notice mt-3" role="alert">
          <p>{err.message}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {err.kind === 'auth' && (
              <button type="button" className="btn-solid" onClick={onOpenSettings}>
                Update API key
              </button>
            )}
            {(err.kind === 'model' || err.kind === 'provider' || err.kind === 'rate') &&
              conversationModel !== AUTO_MODEL && (
                <button type="button" className="btn-outline" onClick={onSwitchToAuto}>
                  Switch to Auto and retry
                </button>
              )}
            {err.kind !== 'auth' && (
              <button type="button" className="btn-outline" onClick={onRegenerate}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {message.stopped && <p className="mt-2 text-sm text-muted">Response stopped.</p>}

      {!busy && (message.content || err) && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted">
          {message.content && <CopyButton getText={() => message.content} label="Copy response" className={actionBtn} />}
          {isLast && !err && (
            <button type="button" className={actionBtn} onClick={onRegenerate} aria-label="Regenerate response" title="Regenerate response">
              <Icon name="refresh" className="size-4" />
            </button>
          )}
          {message.model && <span className="ml-1 truncate font-mono text-[0.72rem]">{message.model}</span>}
        </div>
      )}
    </div>
  );
}

export const MessageView = memo(MessageViewInner);
