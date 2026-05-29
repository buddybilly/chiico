import { useEffect, useState } from 'react';
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

type Page = 'dashboard' | 'create' | 'scheduled' | 'grid' | 'settings' | 'ai-tools' | 'quick-edit' | 'planner';

interface PlannerPostData {
  caption: string;
  theme: string;
  hashtags: string[];
}

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
  const key = 'postflow_user_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = generateId();
    localStorage.setItem(key, id);
  }
  return id;
}

export default function App() {
  const [userId] = useState<string>(getOrCreateUserId);
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
      {oauthBanner && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl border flex items-center gap-2 max-w-sm w-[90vw] ${
          oauthBanner.type === 'success'
            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
            : 'bg-red-500/15 text-red-300 border-red-500/30'
        }`}>
          {oauthBanner.type === 'success' ? '✓' : '✗'} {oauthBanner.msg}
        </div>
      )}
      <Sidebar currentPage={page} onNavigate={setPage} username={undefined} />
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
