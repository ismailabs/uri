import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUTO_MODEL } from '../lib/types';
import type { ModelInfo } from '../lib/types';
import { fetchFreeModels } from '../lib/openrouter';
import { Icon } from './Icons';

let cache: ModelInfo[] | null = null; // model catalogue for this session only

function useFreeModels(enabled: boolean) {
  const [models, setModels] = useState<ModelInfo[] | null>(cache);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setStatus('loading');
    setError('');
    fetchFreeModels()
      .then((m) => {
        cache = m;
        setModels(m);
        setStatus('idle');
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not load the model list.');
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    if (enabled && !cache && status === 'idle') load();
  }, [enabled, status, load]);

  return { models, status, error, reload: load };
}

const shortId = (id: string) => (id.split('/').pop() ?? id).replace(/:free$/, '');
const fmtCtx = (n?: number) => (n ? (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)) : '');

export function ModelPicker({ value, onChange }: { value: string; onChange: (model: string) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'auto' | 'manual'>('auto');
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);
  const { models, status, error, reload } = useFreeModels(open && view === 'manual');

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isAuto = value === AUTO_MODEL;
  const label = isAuto ? 'Auto' : (models?.find((m) => m.id === value)?.name ?? shortId(value));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (models ?? []).filter((m) => !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
  }, [models, query]);

  const toggle = () => {
    if (!open) {
      setView(isAuto ? 'auto' : 'manual');
      setQuery('');
    }
    setOpen(!open);
  };

  const seg = (active: boolean) =>
    `flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${active ? 'bg-surface shadow-sm' : 'text-muted hover:text-ink'}`;

  return (
    <div ref={root} className="min-w-0 sm:relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium hover:bg-sunken"
      >
        <span className="truncate">{label}</span>
        {isAuto && <span className="hidden text-muted sm:inline">· free router</span>}
        <Icon name="chevron" className="size-4 shrink-0 text-muted" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a model"
          className="fixed inset-x-3 top-[calc(3.25rem+env(safe-area-inset-top))] z-30 rounded-xl border border-line bg-surface p-3 shadow-lg sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-1.5 sm:w-96"
        >
          <div className="flex gap-1 rounded-lg bg-sunken p-1" role="group" aria-label="Model selection mode">
            <button
              type="button"
              className={seg(view === 'auto')}
              aria-pressed={view === 'auto'}
              onClick={() => {
                setView('auto');
                onChange(AUTO_MODEL);
              }}
            >
              Auto
            </button>
            <button type="button" className={seg(view === 'manual')} aria-pressed={view === 'manual'} onClick={() => setView('manual')}>
              Manual
            </button>
          </div>

          {view === 'auto' ? (
            <p className="px-1 pb-1 pt-3 text-sm leading-relaxed text-muted">
              OpenRouter picks a free model for each message. Nothing paid is ever used. The model that answered is shown under each reply.
            </p>
          ) : (
            <div className="pt-3">
              <div className="relative">
                <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search free models"
                  aria-label="Search free models"
                  className="field w-full pl-8 text-sm"
                  autoFocus
                />
              </div>

              <div className="mt-2 max-h-72 overflow-y-auto">
                {status === 'loading' && !models && <p className="p-3 text-sm text-muted">Loading free models…</p>}
                {status === 'error' && (
                  <div className="notice m-1">
                    <p>{error}</p>
                    <button type="button" className="btn-outline mt-2" onClick={reload}>
                      Try again
                    </button>
                  </div>
                )}
                {models && filtered.length === 0 && (
                  <p className="p-3 text-sm text-muted">{models.length === 0 ? 'OpenRouter lists no free chat models right now.' : 'No models match your search.'}</p>
                )}
                <ul>
                  {filtered.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onChange(m.id);
                          setOpen(false);
                        }}
                        aria-current={m.id === value ? 'true' : undefined}
                        className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left hover:bg-sunken ${m.id === value ? 'bg-sunken' : ''}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{m.name}</span>
                          <span className="block truncate font-mono text-[0.72rem] text-muted">{m.id}</span>
                        </span>
                        {m.contextLength ? <span className="shrink-0 text-xs text-muted">{fmtCtx(m.contextLength)}</span> : null}
                        {m.id === value && <Icon name="check" className="size-4 shrink-0 text-accent" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {models && (
                <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted">
                  <span>{models.length} free models · context size on the right</span>
                  <button type="button" onClick={reload} className="hover:text-ink">
                    Refresh
                  </button>
                </div>
              )}
              {!isAuto && !models?.some((m) => m.id === value) && models && (
                <p className="mt-2 px-1 text-xs text-muted">The current model isn’t in the latest list and may be unavailable.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
