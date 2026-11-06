import type { Conversation } from '../lib/types';
import { Icon, Logo } from './Icons';

interface Props {
  conversations: Conversation[];
  activeId: string;
  open: boolean;
  keyState: 'none' | 'memory' | 'device';
  onClose: () => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
}

const KEY_LABEL = { none: 'Add API key', memory: 'API key in memory', device: 'API key saved on device' } as const;

export function Sidebar({ conversations, activeId, open, keyState, onClose, onSelect, onNew, onDelete, onOpenSettings }: Props) {
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Chats"
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col border-r border-line bg-surface transition-transform motion-reduce:transition-none md:static md:z-auto md:max-w-none md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-4 pb-2 pt-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-[0.95rem] font-semibold tracking-tight">UR Intelligence</span>
          </div>
          <button type="button" onClick={onClose} aria-label="Close menu" className="icon-btn md:hidden">
            <Icon name="x" />
          </button>
        </div>

        <div className="px-3 pb-2 pt-2">
          <button type="button" onClick={onNew} className="btn-outline w-full justify-start gap-2 px-3 py-2">
            <Icon name="plus" className="size-4" /> New chat
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-2" aria-label="Chat history">
          <ul className="space-y-0.5">
            {sorted.map((c) => {
              const isActive = c.id === activeId;
              return (
                <li key={c.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`block w-full truncate rounded-lg px-3 py-2 text-left text-sm ${c.messages.length ? 'pr-9' : ''} ${isActive ? 'bg-sunken font-medium' : 'text-ink/80 hover:bg-sunken'}`}
                  >
                    {c.title}
                  </button>
                  {c.messages.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onDelete(c.id)}
                      aria-label={`Delete chat: ${c.title}`}
                      title="Delete chat"
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:text-ink focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    >
                      <Icon name="x" className="size-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-line p-2">
          <button type="button" onClick={onOpenSettings} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink/80 hover:bg-sunken">
            <span className={`size-2 shrink-0 rounded-full ${keyState === 'none' ? 'bg-muted/50' : 'bg-accent'}`} aria-hidden="true" />
            <span className="truncate">{KEY_LABEL[keyState]}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
