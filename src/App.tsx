import { useCallback, useRef, useState } from 'react';
import { ChatView } from './components/ChatView';
import { Icon } from './components/Icons';
import { ModelPicker } from './components/ModelPicker';
import { SettingsDialog } from './components/SettingsDialog';
import { Sidebar } from './components/Sidebar';
import { useChatRunner } from './hooks/useChatRunner';
import { useConversations } from './hooks/useConversations';
import { AUTO_MODEL } from './lib/types';
import { clearSavedKey, exportJson, loadSavedKey, saveKey, saveTheme } from './lib/storage';

export default function App() {
  const busy = useRef(new Set<string>());
  const { conversations, active, setActiveId, update, newChat, remove, clear, removeAll, setModel, storageError } =
    useConversations(busy);

  // The API key lives in memory. It is only written to localStorage if the user opts in.
  const [apiKey, setApiKey] = useState(() => loadSavedKey());
  const [keySaved, setKeySaved] = useState(() => loadSavedKey() !== '');
  const [navOpen, setNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  const { streamingIds, send, regenerate, stop, stopAll } = useChatRunner({ conversations, update, apiKey, busy });
  const streaming = streamingIds.includes(active.id);
  const hasKey = apiKey !== '';
  const savedCount = conversations.filter((c) => c.messages.length > 0).length;

  const handleSaveKey = useCallback((key: string, remember: boolean) => {
    setApiKey(key);
    if (remember && saveKey(key)) {
      setKeySaved(true);
    } else {
      clearSavedKey();
      setKeySaved(false);
    }
    setSettingsOpen(false);
  }, []);

  const handleRemoveKey = () => {
    setApiKey('');
    clearSavedKey();
    setKeySaved(false);
    setSettingsOpen(false);
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    document.documentElement.style.colorScheme = next ? 'dark' : 'light';
    saveTheme(next ? 'dark' : 'light');
  };

  const handleExport = () => {
    const blob = new Blob([exportJson(conversations)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ur-intelligence-chats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleDeleteAll = () => {
    if (!window.confirm('Delete all chats from this browser? This cannot be undone.')) return;
    stopAll();
    removeAll();
    setSettingsOpen(false);
  };

  const handleDelete = (id: string) => {
    const c = conversations.find((x) => x.id === id);
    if (!window.confirm(`Delete “${c?.title ?? 'this chat'}”? This cannot be undone.`)) return;
    stop(id);
    remove(id);
  };

  const handleClear = () => {
    if (!window.confirm('Clear all messages in this chat?')) return;
    stop(active.id);
    clear(active.id);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-bg text-ink">
      <Sidebar
        conversations={conversations}
        activeId={active.id}
        open={navOpen}
        keyState={!hasKey ? 'none' : keySaved ? 'device' : 'memory'}
        onClose={() => setNavOpen(false)}
        onSelect={(id) => {
          setActiveId(id);
          setNavOpen(false);
        }}
        onNew={() => {
          newChat();
          setNavOpen(false);
        }}
        onDelete={handleDelete}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setNavOpen(false);
        }}
      />

      <main className="flex min-w-0 flex-1 flex-col bg-bg pt-[env(safe-area-inset-top)]">
        <header className="flex items-center gap-1 px-2 py-2 sm:px-3">
          <button type="button" onClick={() => setNavOpen(true)} aria-label="Open menu" className="icon-btn md:hidden">
            <Icon name="menu" />
          </button>
          <ModelPicker key={active.id} value={active.model} onChange={(m) => setModel(active.id, m)} />
          <div className="flex-1" />
          {active.messages.length > 0 && (
            <button type="button" onClick={handleClear} aria-label="Clear conversation" title="Clear conversation" className="icon-btn">
              <Icon name="trash" />
            </button>
          )}
          <button type="button" onClick={toggleTheme} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme" className="icon-btn">
            <Icon name={dark ? 'sun' : 'moon'} />
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Settings" title="Settings" className="icon-btn">
            <Icon name="sliders" />
          </button>
        </header>

        {storageError && (
          <div className="notice mx-3 mb-1" role="alert">
            Chat history could not be saved because browser storage is full or blocked. New messages will be lost when you
            close this tab. Export your chats from Settings to keep them.
          </div>
        )}

        <ChatView
          key={active.id}
          conversation={active}
          streaming={streaming}
          hasKey={hasKey}
          keySaved={keySaved}
          onSend={(t) => send(active.id, t)}
          onStop={() => stop(active.id)}
          onRegenerate={() => regenerate(active.id)}
          onSwitchToAuto={() => {
            setModel(active.id, AUTO_MODEL);
            regenerate(active.id, AUTO_MODEL);
          }}
          onOpenSettings={() => setSettingsOpen(true)}
          onSaveKey={handleSaveKey}
        />
      </main>

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        hasKey={hasKey}
        keySaved={keySaved}
        chatCount={savedCount}
        onSaveKey={handleSaveKey}
        onRemoveKey={handleRemoveKey}
        onExport={handleExport}
        onDeleteAll={handleDeleteAll}
      />
    </div>
  );
}
