import { useEffect, useRef } from 'react';
import { KeyForm } from './KeyForm';
import { Icon } from './Icons';

interface Props {
  open: boolean;
  onClose: () => void;
  hasKey: boolean;
  keySaved: boolean;
  chatCount: number;
  onSaveKey: (key: string, remember: boolean) => void;
  onRemoveKey: () => void;
  onExport: () => void;
  onDeleteAll: () => void;
}

export function SettingsDialog({
  open,
  onClose,
  hasKey,
  keySaved,
  chatCount,
  onSaveKey,
  onRemoveKey,
  onExport,
  onDeleteAll,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="settings-title"
      className="dialog"
    >
      <div className="flex max-h-[85dvh] flex-col overflow-y-auto p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="settings-title" className="text-lg font-semibold tracking-tight">
            Settings
          </h2>
          <button type="button" onClick={onClose} aria-label="Close settings" className="icon-btn">
            <Icon name="x" />
          </button>
        </div>

        <section aria-labelledby="key-title" className="space-y-3">
          <h3 id="key-title" className="text-sm font-semibold">
            API key
          </h3>
          <p className="text-sm text-muted">
            {hasKey
              ? keySaved
                ? 'A key is active and saved on this device.'
                : 'A key is active in memory. It disappears when you close or reload this tab.'
              : 'No key set. Create one at openrouter.ai/settings/keys.'}
          </p>
          <KeyForm initialRemember={keySaved} submitLabel={hasKey ? 'Replace key' : 'Save key'} onSubmit={onSaveKey} />
          {hasKey && (
            <button type="button" onClick={onRemoveKey} className="btn-outline">
              Remove key{keySaved ? ' from this device' : ''}
            </button>
          )}
        </section>

        <section aria-labelledby="data-title" className="mt-7 space-y-3 border-t border-line pt-5">
          <h3 id="data-title" className="text-sm font-semibold">
            Chat history
          </h3>
          <p className="text-sm text-muted">
            {chatCount} saved {chatCount === 1 ? 'chat' : 'chats'}, stored only in this browser. Exports never include your API key.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onExport} disabled={chatCount === 0} className="btn-outline">
              <Icon name="download" className="size-4" /> Export as JSON
            </button>
            <button type="button" onClick={onDeleteAll} disabled={chatCount === 0} className="btn-outline">
              <Icon name="trash" className="size-4" /> Delete all chats
            </button>
          </div>
        </section>

        <section className="mt-7 border-t border-line pt-5">
          <h3 className="mb-2 text-sm font-semibold">Privacy</h3>
          <p className="text-sm leading-relaxed text-muted">
            UR Intelligence has no server. Your key and messages go directly from this browser to OpenRouter. Free models
            are run by third-party providers who may log prompts, so avoid sharing sensitive information.
          </p>
        </section>
      </div>
    </dialog>
  );
}
