import { useEffect, useState, useRef } from 'react';
import type React from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CreatePost from './components/CreatePost';
import GridCutter from './components/GridCutter';
import ScheduledPosts from './components/ScheduledPosts';
import Settings from './components/Settings';
import AITools from './components/AITools';
import QuickEditor from './components/QuickEditor';
import Planner from './components/Planner';
import { supabase } from './lib/supabase';
import { Smartphone, Copy, Check, RefreshCw } from 'lucide-react';

type Page = 'dashboard' | 'create' | 'scheduled' | 'grid' | 'settings' | 'ai-tools' | 'quick-edit' | 'planner';

interface PlannerPostData {
  caption: string;
  theme: string;
  hashtags: string[];
}

const USER_ID_KEY = 'postflow_user_id';

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function getOrCreateUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

// Short sync code: first 8 chars of the UUID (easy to type)
function codeFromId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function SyncModal({ currentUserId, onSync }: { currentUserId: string; onSync: (id: string) => void }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const myCode = codeFromId(currentUserId);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleCopy() {
    navigator.clipboard.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSync() {
    const code = input.trim().toUpperCase().replace(/[^A-F0-9]/g, '');
    if (code.length !== 8) {
      setError('Codigo invalido. Digite os 8 caracteres exatos.');
      return;
    }
    // Find a userId whose code matches
    const { data } = await supabase
      .from('user_settings')
      .select('user_id')
      .ilike('user_id', `${code.toLowerCase()}%`)
      .maybeSingle();

    if (!data) {
      setError('Codigo nao encontrado. Verifique se digitou corretamente.');
      return;
    }
    localStorage.setItem(USER_ID_KEY, data.user_id);
    onSync(data.user_id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl max-w-sm w-full p-6 space-y-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Sincronizar dispositivos</h3>
            <p className="text-xs text-slate-400">Use o mesmo codigo nos dois aparelhos</p>
          </div>
        </div>

        {/* My code */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">SEU CODIGO NESTE DISPOSITIVO</p>
          <div className="flex items-center gap-3 bg-slate-800 border border-slate-700/50 rounded-xl px-4 py-3">
            <span className="flex-1 text-2xl font-mono font-bold tracking-[0.25em] text-white">{myCode}</span>
            <button onClick={handleCopy} className="text-sky-400 hover:text-sky-300 transition">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-slate-500">Copie este codigo e cole no outro dispositivo para sincronizar os dados.</p>
        </div>

        {/* Enter other code */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-400">OU DIGITE O CODIGO DE OUTRO DISPOSITIVO</p>
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError(''); }}
            placeholder="Ex: A1B2C3D4"
            maxLength={8}
            className="w-full bg-slate-800 border border-slate-700/50 text-white placeholder-slate-600 rounded-xl px-4 py-3 text-lg font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleSync}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl transition"
          >
            <RefreshCw className="w-4 h-4" /> Sincronizar com este codigo
          </button>
        </div>

        <p className="text-xs text-slate-600 text-center">Feche para continuar sem sincronizar</p>
        <button
          onClick={() => onSync(currentUserId)}
          className="w-full text-xs text-slate-500 hover:text-slate-300 transition py-1"
        >
          Continuar sem sincronizar
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [userId, setUserId] = useState<string>(getOrCreateUserId);
  const [showSync, setShowSync] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [plannerPostData, setPlannerPostData] = useState<PlannerPostData | null>(null);
  const [oauthBanner, setOauthBanner] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    const key = `onboarding_done_${userId}`;
    if (!localStorage.getItem(key)) setShowOnboarding(true);
  }, [userId]);

  // Handle OAuth redirect callback (mobile flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_success') === '1') {
      const igToken = params.get('ig_token') || '';
      const igAccountId = params.get('ig_account_id') || '';
      const igUsername = params.get('ig_username') || '';

      // The edge function already saved to DB, just show success banner
      const msg = igUsername ? `Instagram @${igUsername} conectado!` : 'Instagram conectado com sucesso!';
      setOauthBanner({ type: 'success', msg });
      setPage('settings');
      setTimeout(() => setOauthBanner(null), 5000);

      // Clean URL without reload
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);

      // Suppress unused var warning
      void igToken; void igAccountId;
    } else if (params.get('error')) {
      setOauthBanner({ type: 'error', msg: `Erro ao conectar: ${params.get('error')}` });
      setPage('settings');
      setTimeout(() => setOauthBanner(null), 6000);
      const clean = window.location.pathname;
      window.history.replaceState({}, '', clean);
    }
  }, []);

  // Poll for 500+ view alerts
  useEffect(() => {
    const notified500 = new Set<string>();

    const check500Views = async () => {
      const { data } = await supabase
        .from('post_metrics')
        .select('id, post_id, views, reached_500, scheduled_posts!inner(user_id, generated_caption)')
        .eq('scheduled_posts.user_id', userId)
        .gte('views', 500);

      if (data) {
        for (const m of data as any[]) {
          if (!notified500.has(m.id) && m.reached_500) {
            notified500.add(m.id);
            if (Notification.permission === 'granted') {
              new Notification('PostFlow IA Chico - 500+ visualizacoes!', {
                body: `Seu post alcancou ${m.views} views!`,
                icon: '/FE79B38A-DD32-4D48-A4F2-0F1A474620C3.jpeg',
              });
            }
          }
        }
      }
    };

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(check500Views, 60000);
    check500Views();
    return () => clearInterval(interval);
  }, [userId]);

  return (
    <div className="flex h-full bg-slate-900">
      {showSync && (
        <SyncModal
          currentUserId={userId}
          onSync={(id) => { setUserId(id); setShowSync(false); }}
        />
      )}
      {oauthBanner && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border flex items-center gap-2 max-w-sm w-[90vw] ${
          oauthBanner.type === 'success'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
        }`}>
          {oauthBanner.type === 'success' ? '✓' : '✗'} {oauthBanner.msg}
        </div>
      )}
      <Sidebar currentPage={page} onNavigate={setPage} username={undefined} onSyncDevices={() => setShowSync(true)} />
      <main
        className="flex-1 scroll-ios main-scroll"
        style={{ height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {page === 'dashboard' && (
          <Dashboard
            userId={userId}
            onNavigate={(p) => setPage(p as Page)}
            showOnboarding={showOnboarding && page === 'dashboard'}
            onOnboardingComplete={() => {
              setShowOnboarding(false);
              localStorage.setItem(`onboarding_done_${userId}`, '1');
            }}
          />
        )}
        {page === 'create' && (
          <CreatePost
            userId={userId}
            initialData={plannerPostData ?? undefined}
            onInitialDataUsed={() => setPlannerPostData(null)}
          />
        )}
        {page === 'quick-edit' && (
          <QuickEditor userId={userId} onDone={() => setPage('scheduled')} />
        )}
        {page === 'ai-tools' && (
          <AITools onNavigate={(p) => setPage(p)} />
        )}
        {page === 'grid' && <GridCutter />}
        {page === 'scheduled' && (
          <ScheduledPosts userId={userId} onCreateNew={() => setPage('create')} />
        )}
        {page === 'settings' && <Settings userId={userId} />}
        {page === 'planner' && (
          <Planner
            userId={userId}
            onCreatePost={(data) => {
              setPlannerPostData(data);
              setPage('create');
            }}
          />
        )}
      </main>
    </div>
  );
}
