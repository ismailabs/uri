import { useId, useState } from 'react';
import type { FormEvent } from 'react';

interface Props {
  initialRemember: boolean;
  submitLabel: string;
  onSubmit: (key: string, remember: boolean) => void;
}

export function KeyForm({ initialRemember, submitLabel, onSubmit }: Props) {
  const [value, setValue] = useState('');
  const [remember, setRemember] = useState(initialRemember);
  const id = useId();
  const key = value.replace(/\s+/g, '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (key) {
      onSubmit(key, remember);
      setValue('');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
          OpenRouter API key
        </label>
        <input
          id={id}
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="sk-or-v1-…"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          className="field w-full font-mono text-sm"
        />
        {key && !key.startsWith('sk-or-') && (
          <p className="mt-1.5 text-xs text-muted">OpenRouter keys usually start with “sk-or-”. Double-check the key you pasted.</p>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--c-accent)]"
        />
        <span>Remember this key on this device</span>
      </label>
      {remember && (
        <p className="notice text-xs leading-relaxed">
          The key is saved unencrypted in this browser’s localStorage. Anyone with access to this device or browser
          profile can read it. Don’t use this option on shared or public computers. You can remove it at any time.
        </p>
      )}

      <button type="submit" disabled={!key} className="btn-solid w-full justify-center py-2.5">
        {submitLabel}
      </button>
    </form>
  );
}
