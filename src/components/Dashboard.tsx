import { useEffect, useState } from 'react';
import { supabase, fnHeaders, ScheduledPost, PostMetric } from '../lib/supabase';
import { Calendar, CheckCircle, Clock, FileText, TrendingUp, AlertCircle, Sparkles, BarChart3, Zap, Eye, Heart, MessageCircle, RefreshCw, Loader2, Bot, Edit3, Instagram, Globe, Linkedin } from 'lucide-react';
import { formatNumber } from '../lib/utils';
import Onboarding from './Onboarding';

interface Props {
  userId: string;
  onNavigate: (page: 'create' | 'scheduled' | 'settings') => void;
  showOnboarding?: boolean;
  onOnboardingComplete?: () => void;
}

interface Stats {
  total: number;
  scheduled: number;
  published: number;
  draft: number;
  failed: number;
}

export default function Dashboard({ userId, onNavigate, showOnboarding, onOnboardingComplete }: Props) {
  const [stats, setStats] = useState<Stats>({ total: 0, scheduled: 0, published: 0, draft: 0, failed: 0 });
  const [recentPosts, setRecentPosts] = useState<ScheduledPost[]>([]);
  const [metrics, setMetrics] = useState<Record<string, PostMetric>>({});
  const [loading, setLoading] = useState(true);
  const [settingsConfigured, setSettingsConfigured] = useState({ instagram: false, google_business: false, linkedin: false });
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  const [topPosts, setTopPosts] = useState<(PostMetric & { caption: string })[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; posts: number; views: number }[]>([]);

  useEffect(() => {
    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [postsRes, allRes, settingsRes, metricsRes, weeklyRes] = await Promise.all([
        supabase.from('scheduled_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('scheduled_posts').select('status').eq('user_id', userId),
        supabase.from('user_settings').select('instagram_access_token, instagram_account_id, google_business_access_token, google_business_location_id, linkedin_access_token, linkedin_org_id').eq('user_id', userId).maybeSingle(),
        supabase.from('post_metrics').select('*, scheduled_posts!inner(generated_caption, user_id)').eq('scheduled_posts.user_id', userId).order('views', { ascending: false }).limit(5),
        supabase.from('scheduled_posts').select('created_at, status').eq('user_id', userId).gte('created_at', sevenDaysAgo).order('created_at', { ascending: true }),
      ]);

      if (postsRes.data) setRecentPosts(postsRes.data as ScheduledPost[]);

      if (allRes.data) {
        const counts = (allRes.data as { status: string }[]).reduce(
          (acc, p) => ({ ...acc, [p.status]: (acc[p.status as keyof Stats] || 0) + 1 }),
          { total: allRes.data.length, scheduled: 0, published: 0, draft: 0, failed: 0 }
        );
        setStats(counts);
      }

      if (settingsRes.data) {
        setSettingsConfigured({
          instagram: !!(settingsRes.data.instagram_access_token && settingsRes.data.instagram_account_id),
          google_business: !!(settingsRes.data.google_business_access_token && settingsRes.data.google_business_location_id),
          linkedin: !!(settingsRes.data.linkedin_access_token),
        });
      }

      // Process metrics
      if (metricsRes.data) {
        const metricsMap: Record<string, PostMetric> = {};
        const top: (PostMetric & { caption: string })[] = [];
        for (const m of metricsRes.data as any[]) {
          const metric = { id: m.id, post_id: m.post_id, views: m.views, likes: m.likes, comments: m.comments, reached_500: m.reached_500, fetched_at: m.fetched_at };
          metricsMap[m.post_id] = metric;
          if (m.scheduled_posts?.generated_caption) {
            top.push({ ...metric, caption: m.scheduled_posts.generated_caption });
          }
        }
        setMetrics(metricsMap);
        setTopPosts(top);
      }

      // Process weekly activity
      if (weeklyRes.data) {
        const days: Record<string, number> = {};
        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
          const key = d.toISOString().split('T')[0];
          days[key] = 0;
        }
        for (const p of weeklyRes.data as { created_at: string }[]) {
          const key = p.created_at.split('T')[0];
          if (key in days) days[key]++;
        }
        setWeeklyData(Object.entries(days).map(([date, posts]) => ({
          day: dayNames[new Date(date + 'T12:00:00').getDay()],
          posts,
          views: 0,
        })));
      }

      setLoading(false);
    }
    load();
  }, [userId]);

  async function fetchMetrics() {
    setFetchingMetrics(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-metrics`, {
        method: 'POST',
        headers: fnHeaders(),
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.alerts_500 && data.alerts_500.length > 0) {
        for (const alert of data.alerts_500) {
          if (Notification.permission === 'granted') {
            new Notification('PostFlow IA Chico - 500+ visualizacoes!', {
              body: `Seu post alcancou ${alert.views} visualizacoes!`,
              icon: '/FE79B38A-DD32-4D48-A4F2-0F1A474620C3.jpeg',
            });
          }
        }
      }
      // Reload data without full page reload
      const [postsRes, allRes, metricsRes] = await Promise.all([
        supabase.from('scheduled_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
        supabase.from('scheduled_posts').select('status').eq('user_id', userId),
        supabase.from('post_metrics').select('*, scheduled_posts!inner(generated_caption, user_id)').eq('scheduled_posts.user_id', userId).order('views', { ascending: false }).limit(5),
      ]);
      if (postsRes.data) setRecentPosts(postsRes.data as ScheduledPost[]);
      if (allRes.data) {
        const counts = (allRes.data as { status: string }[]).reduce(
          (acc, p) => ({ ...acc, [p.status]: (acc[p.status as keyof Stats] || 0) + 1 }),
          { total: allRes.data.length, scheduled: 0, published: 0, draft: 0, failed: 0 }
        );
        setStats(counts);
      }
      if (metricsRes.data) {
        const metricsMap: Record<string, PostMetric> = {};
        const top: (PostMetric & { caption: string })[] = [];
        for (const m of metricsRes.data as any[]) {
          const metric = { id: m.id, post_id: m.post_id, views: m.views, likes: m.likes, comments: m.comments, reached_500: m.reached_500, fetched_at: m.fetched_at };
          metricsMap[m.post_id] = metric;
          if (m.scheduled_posts?.generated_caption) top.push({ ...metric, caption: m.scheduled_posts.generated_caption });
        }
        setMetrics(metricsMap);
        setTopPosts(top);
      }
    } catch { /* silent */ }
    setFetchingMetrics(false);
  }

  const totalViews = Object.values(metrics).reduce((sum, m) => sum + m.views, 0);
  const totalLikes = Object.values(metrics).reduce((sum, m) => sum + m.likes, 0);
  const totalComments = Object.values(metrics).reduce((sum, m) => sum + m.comments, 0);
  const posts500 = Object.values(metrics).filter(m => m.reached_500).length;

  const statCards = [
    { label: 'Total Posts', value: stats.total, icon: FileText, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    { label: 'Agendados', value: stats.scheduled, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Publicados', value: stats.published, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    { label: 'Rascunhos', value: stats.draft, icon: TrendingUp, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' },
  ];

  const metricCards = [
    { label: 'Visualizacoes', value: totalViews, icon: Eye, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Curtidas', value: totalLikes, icon: Heart, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20' },
    { label: 'Comentarios', value: totalComments, icon: MessageCircle, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20' },
    { label: '500+ Views', value: posts500, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  ];

  const statusLabel: Record<string, { label: string; cls: string }> = {
    draft: { label: 'Rascunho', cls: 'bg-slate-500/20 text-slate-400' },
    scheduled: { label: 'Agendado', cls: 'bg-amber-500/20 text-amber-400' },
    published: { label: 'Publicado', cls: 'bg-emerald-500/20 text-emerald-400' },
    failed: { label: 'Falhou', cls: 'bg-red-500/20 text-red-400' },
  };

  const nextScheduled = recentPosts
    .filter(p => p.status === 'scheduled' && p.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())[0];

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {showOnboarding && onOnboardingComplete && (
        <Onboarding
          onComplete={onOnboardingComplete}
          onNavigate={(p) => onNavigate(p as 'create' | 'scheduled' | 'settings')}
        />
      )}

      {/* Platform Connection Status */}
      <div className="mb-5 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {[
          { key: 'instagram' as const, label: 'Instagram', Icon: Instagram, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
          { key: 'google_business' as const, label: 'Google Business', Icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { key: 'linkedin' as const, label: 'LinkedIn', Icon: Linkedin, color: 'text-slate-500', bg: 'bg-slate-700/20', border: 'border-slate-700/30' },
        ].map(({ key, label, Icon, color, bg, border }) => {
          const connected = settingsConfigured[key];
          const isLinkedIn = key === 'linkedin';
          return (
            <button key={key} onClick={() => !isLinkedIn && onNavigate('settings')} disabled={isLinkedIn} className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border transition ${isLinkedIn ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-80'} ${connected ? `${bg} ${border}` : 'bg-slate-800/40 border-slate-700/40'}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${connected ? color : isLinkedIn ? 'text-slate-600' : 'text-slate-600'}`} />
              <div className="text-left min-w-0 flex-1">
                <p className={`text-xs font-semibold truncate ${connected ? 'text-white' : 'text-slate-500'}`}>{label}</p>
                <p className={`text-[11px] ${connected ? color : 'text-slate-600'}`}>{isLinkedIn ? 'Em breve' : connected ? 'Conectado' : 'Nao configurado'}</p>
              </div>
              {connected && !isLinkedIn && <CheckCircle className={`w-3.5 h-3.5 ml-auto flex-shrink-0 ${color}`} />}
            </button>
          );
        })}
      </div>

      {/* 500+ Alert Banner */}
      {posts500 > 0 && (
        <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0"><Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-400">{posts500} post{posts500 > 1 ? 's' : ''} com 500+ visualizacoes!</p>
            <p className="text-xs text-amber-300/60 hidden sm:block">Seus conteudos estao performando muito bem</p>
          </div>
          <button onClick={() => onNavigate('scheduled')} className="text-xs text-amber-400 hover:text-amber-300 font-medium transition flex-shrink-0">Ver</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-slate-800/60 border ${card.bg} rounded-2xl p-4 sm:p-5`}>
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${card.bg} border flex items-center justify-center mb-2 sm:mb-3`}><Icon className={`w-4 h-4 ${card.color}`} /></div>
              <p className="text-xl sm:text-2xl font-bold text-white">{loading ? '—' : card.value}</p>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Metrics Cards */}
      {stats.published > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {metricCards.map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className={`bg-slate-800/60 border ${card.bg} rounded-2xl p-4 sm:p-5`}>
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${card.bg} border flex items-center justify-center mb-2 sm:mb-3`}><Icon className={`w-4 h-4 ${card.color}`} /></div>
                <p className="text-xl sm:text-2xl font-bold text-white">{loading ? '—' : formatNumber(card.value)}</p>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">{card.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Weekly Activity Chart */}
      {weeklyData.length > 0 && weeklyData.some(d => d.posts > 0) && (
        <div className="mb-5 sm:mb-6 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-white mb-4 sm:mb-5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Atividade — ultimos 7 dias
          </h3>
          <div className="flex items-end gap-2 h-16 sm:h-20">
            {weeklyData.map((d, i) => {
              const max = Math.max(...weeklyData.map(x => x.posts), 1);
              const pct = (d.posts / max) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="relative w-full flex flex-col justify-end" style={{ height: '48px' }}>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-sky-600 to-sky-400 transition-all duration-500"
                      style={{ height: `${Math.max(pct, d.posts > 0 ? 8 : 2)}%` }}
                    />
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-slate-500">{d.day}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 mt-2 sm:mt-3">{weeklyData.reduce((s, d) => s + d.posts, 0)} posts criados esta semana</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Next Scheduled Post */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-amber-400" />Proximo Agendamento</h3>
          {nextScheduled ? (
            <div className="space-y-3">
              {nextScheduled.image_url && <img src={nextScheduled.image_url} alt="" className="w-full aspect-video rounded-xl object-cover border border-slate-700" />}
              <p className="text-sm text-white line-clamp-2">{nextScheduled.generated_caption || nextScheduled.prompt}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-sm text-amber-400 font-medium">{new Date(nextScheduled.scheduled_at!).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 sm:py-6"><Clock className="w-8 h-8 text-slate-700 mx-auto mb-2" /><p className="text-slate-500 text-sm">Nenhum post agendado</p></div>
          )}
        </div>

        {/* Top Performing Posts */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-sky-400" />Top Performances</h3>
          {topPosts.length === 0 ? (
            <div className="text-center py-4 sm:py-6"><TrendingUp className="w-8 h-8 text-slate-700 mx-auto mb-2" /><p className="text-slate-500 text-sm">Nenhuma metrica disponivel</p></div>
          ) : (
            <div className="space-y-2">
              {topPosts.map((tp, i) => (
                <div key={tp.id} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl">
                  <span className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-white truncate">{tp.caption || 'Post'}</p>
                    <div className="flex items-center gap-2 sm:gap-3 mt-1">
                      <span className="text-[11px] text-amber-400 flex items-center gap-0.5"><Eye className="w-3 h-3" />{formatNumber(tp.views)}</span>
                      <span className="text-[11px] text-red-400 flex items-center gap-0.5"><Heart className="w-3 h-3" />{formatNumber(tp.likes)}</span>
                    </div>
                  </div>
                  {tp.reached_500 && <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6">
          <h3 className="text-sm sm:text-base font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" />Acoes Rapidas</h3>
          <div className="space-y-2 sm:space-y-3">
            <button onClick={() => onNavigate('create')} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:from-emerald-500/20 hover:to-teal-500/20 transition group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center"><Sparkles className="w-4 h-4 text-emerald-400" /></div>
              <div className="text-left"><p className="text-sm font-medium text-white">Gerar com IA</p><p className="text-xs text-slate-400 hidden sm:block">Pipeline de 3 agentes GPT</p></div>
            </button>
            <button onClick={() => onNavigate('quick-edit')} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-teal-500/10 border border-cyan-500/20 hover:from-cyan-500/20 hover:to-teal-500/20 transition group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center"><Edit3 className="w-4 h-4 text-cyan-400" /></div>
              <div className="text-left"><p className="text-sm font-medium text-white">Edicao Manual</p><p className="text-xs text-slate-400 hidden sm:block">Edite imagem e legenda</p></div>
            </button>
            <button onClick={() => onNavigate('scheduled')} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:from-amber-500/20 hover:to-orange-500/20 transition group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/20 flex items-center justify-center"><Calendar className="w-4 h-4 text-amber-400" /></div>
              <div className="text-left"><p className="text-sm font-medium text-white">Ver Agendados</p><p className="text-xs text-slate-400 hidden sm:block">Gerencie posts e metricas</p></div>
            </button>
            <button onClick={() => onNavigate('settings')} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-slate-500/10 to-slate-600/10 border border-slate-500/20 hover:from-slate-500/20 hover:to-slate-600/20 transition group">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-500/20 flex items-center justify-center"><AlertCircle className="w-4 h-4 text-slate-400" /></div>
              <div className="text-left"><p className="text-sm font-medium text-white">Configuracoes</p><p className="text-xs text-slate-400 hidden sm:block">APIs e agentes</p></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}