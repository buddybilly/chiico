import { useEffect, useState, useCallback } from 'react';
import { supabase, fnHeaders, ScheduledPost, PostMetric, Platform, PLATFORM_CONFIG } from '../lib/supabase';
import { Calendar, Clock, CheckCircle, XCircle, FileText, Trash2, RefreshCw, Send, Edit3, ExternalLink, Loader2, Copy, AlertTriangle, Eye, Heart, MessageCircle, TrendingUp, Film, Columns, Zap, X, ZoomIn, Instagram, Globe, Linkedin, Search, BarChart2 } from 'lucide-react';

const PLATFORM_ICONS: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  google_business: Globe,
  linkedin: Linkedin,
};
import { formatNumber } from '../lib/utils';

interface Props {
  userId: string;
  onCreateNew: () => void;
}

const STATUS_CONFIG = {
  draft: { label: 'Rascunho', cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30', Icon: FileText },
  scheduled: { label: 'Agendado', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30', Icon: Clock },
  published: { label: 'Publicado', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', Icon: CheckCircle },
  failed: { label: 'Falhou', cls: 'bg-red-500/20 text-red-400 border-red-500/30', Icon: XCircle },
};

const POST_TYPE_CONFIG = {
  story: { label: 'Story', icon: Film, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' },
  carousel: { label: 'Carrossel', icon: Columns, color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/20' },
};

type Filter = 'all' | 'draft' | 'scheduled' | 'published' | 'failed';

interface ImageModalProps {
  src: string;
  postType: 'story' | 'carousel';
  caption: string;
  onClose: () => void;
}

function ImageModal({ src, postType, caption, onClose }: ImageModalProps) {
  const isCarousel = postType === 'carousel';

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700/60 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            {isCarousel ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-400 bg-sky-500/15 border border-sky-500/20 px-2.5 py-1 rounded-full">
                <Columns className="w-3 h-3" />Carrossel — linhas de corte visíveis
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-full">
                <Film className="w-3 h-3" />Story
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Image area */}
        <div className="relative bg-slate-950">
          <img src={src} alt="Post preview" className="w-full object-contain max-h-[60vh]" />

          {/* Carousel grid overlay */}
          {isCarousel && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Vertical cut lines dividing into 3 equal slides */}
              <div className="absolute inset-0 flex">
                {[0, 1, 2].map(i => (
                  <div key={i} className="flex-1 relative">
                    {i < 2 && (
                      <div className="absolute right-0 top-0 bottom-0 w-px bg-white/50 z-10">
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
                          {i + 1}/{3}
                        </div>
                      </div>
                    )}
                    {/* Slide number label at bottom */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Slide {i + 1}
                    </div>
                  </div>
                ))}
                {/* Last slide label */}
              </div>
              {/* Outer border accent */}
              <div className="absolute inset-0 border border-sky-400/30 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Caption preview */}
        {caption && (
          <div className="px-5 py-4 border-t border-slate-700/60">
            <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScheduledPosts({ userId, onCreateNew }: Props) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [metrics, setMetrics] = useState<Record<string, PostMetric>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);
  const [editPost, setEditPost] = useState<ScheduledPost | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [fetchingMetrics, setFetchingMetrics] = useState(false);
  const [alertPosts, setAlertPosts] = useState<{ postId: string; views: number }[]>([]);
  const [expandedImage, setExpandedImage] = useState<{ src: string; postType: 'story' | 'carousel'; caption: string } | null>(null);
  const [search, setSearch] = useState('');
  const [publishLog, setPublishLog] = useState<{ postId: string; platform: string; status: 'success' | 'error'; message: string; at: string }[]>([]);

  async function load() {
    setLoading(true);
    let query = supabase.from('scheduled_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) {
      setPosts(data as ScheduledPost[]);
      const publishedIds = (data as ScheduledPost[]).filter(p => p.status === 'published').map(p => p.id);
      if (publishedIds.length > 0) {
        const { data: metricsData } = await supabase.from('post_metrics').select('*').in('post_id', publishedIds);
        if (metricsData) {
          const metricsMap: Record<string, PostMetric> = {};
          (metricsData as PostMetric[]).forEach(m => { metricsMap[m.post_id] = m; });
          setMetrics(metricsMap);
        }
      }
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [userId, filter]);

  async function fetchMetrics() {
    setFetchingMetrics(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-metrics`, {
        method: 'POST',
        headers: fnHeaders(),
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao buscar metricas');

      if (data.alerts_500 && data.alerts_500.length > 0) {
        setAlertPosts(data.alerts_500);
        for (const alert of data.alerts_500) {
          if (Notification.permission === 'granted') {
            new Notification('PostFlow IA Chico - 500+ visualizacoes!', {
              body: `Seu post alcancou ${alert.views} visualizacoes!`,
              icon: '/FE79B38A-DD32-4D48-A4F2-0F1A474620C3.jpeg',
            });
          }
        }
      }

      await load();
      showToast(`${data.updated || 0} metricas atualizadas`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Erro ao buscar metricas', 'error');
    }
    setFetchingMetrics(false);
  }

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function deletePost(id: string) {
    setDeleting(id);
    const { error } = await supabase.from('scheduled_posts').delete().eq('id', id);
    if (error) showToast('Erro ao deletar post', 'error');
    else { setPosts(prev => prev.filter(p => p.id !== id)); showToast('Post deletado'); }
    setDeleting(null);
  }

  async function publishNow(post: ScheduledPost) {
    setPublishing(post.id);

    const platforms = post.platforms || ['instagram'];
    const functionMap: Record<string, string> = {
      instagram: 'publish-instagram',
      google_business: 'publish-google-business',
      linkedin: 'publish-linkedin',
    };

    const results = await Promise.allSettled(
      platforms.map(async (platform) => {
        const fnName = functionMap[platform];
        if (!fnName) return { platform, success: false, error: 'Plataforma nao suportada' };
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`, {
          method: 'POST',
          headers: fnHeaders(),
          body: JSON.stringify({ postId: post.id, userId }),
        });
        const data = await res.json();
        if (!res.ok) throw Object.assign(new Error(data.error || 'Erro ao publicar'), { platform });
        return { platform, success: true, data };
      })
    );

    let anySuccess = false;
    const at = new Date().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

    for (const result of results) {
      if (result.status === 'fulfilled') {
        const r = result.value as { platform: string; success: boolean; data?: { published_at?: string; instagram_post_id?: string } };
        anySuccess = true;
        setPublishLog(prev => [...prev, { postId: post.id, platform: r.platform, status: 'success', message: 'Publicado com sucesso', at }]);
        if (r.platform === 'instagram' && r.data) {
          setPosts(prev => prev.map(p => p.id === post.id
            ? { ...p, status: 'published' as const, published_at: r.data!.published_at || new Date().toISOString(), instagram_post_id: r.data!.instagram_post_id || '' }
            : p));
        }
      } else {
        const err = result.reason as Error & { platform?: string };
        const platform = err.platform || 'unknown';
        setPublishLog(prev => [...prev, { postId: post.id, platform, status: 'error', message: err.message, at }]);
      }
    }

    if (anySuccess) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: 'published' as const } : p));
      showToast(`Publicado em ${results.filter(r => r.status === 'fulfilled').length} plataforma(s)!`);
    } else {
      showToast('Falha ao publicar. Verifique as credenciais nas Configuracoes.', 'error');
    }

    setPublishing(null);
  }

  async function saveEdit() {
    if (!editPost) return;
    setSavingEdit(true);
    const { error } = await supabase.from('scheduled_posts').update({
      generated_caption: editCaption,
      scheduled_at: editScheduledAt || null,
      status: editScheduledAt ? 'scheduled' : 'draft',
      updated_at: new Date().toISOString(),
    }).eq('id', editPost.id);
    if (error) { showToast('Erro ao salvar', 'error'); }
    else {
      setPosts(prev => prev.map(p => p.id === editPost.id ? { ...p, generated_caption: editCaption, scheduled_at: editScheduledAt, status: editScheduledAt ? 'scheduled' as const : 'draft' as const } : p));
      showToast('Post atualizado');
      setEditPost(null);
    }
    setSavingEdit(false);
  }

  function startEdit(post: ScheduledPost) {
    setEditPost(post);
    setEditCaption(post.generated_caption);
    setEditScheduledAt(post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : '');
  }

  async function copyCaption(caption: string) {
    try { await navigator.clipboard.writeText(caption); showToast('Legenda copiada!'); }
    catch { showToast('Erro ao copiar', 'error'); }
  }

  const filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'scheduled', label: 'Agendados' },
    { value: 'published', label: 'Publicados' },
    { value: 'draft', label: 'Rascunhos' },
    { value: 'failed', label: 'Falhos' },
  ];

  const visiblePosts = search.trim()
    ? posts.filter(p =>
        (p.generated_caption || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.prompt || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.hashtags || []).some(h => h.toLowerCase().includes(search.toLowerCase()))
      )
    : posts;

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border transition-all ${toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>{toast.message}</div>
      )}

      {/* Image expand modal */}
      {expandedImage && (
        <ImageModal
          src={expandedImage.src}
          postType={expandedImage.postType}
          caption={expandedImage.caption}
          onClose={() => setExpandedImage(null)}
        />
      )}

      {alertPosts.length > 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
          <Zap className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-400">500+ Visualizacoes!</p>
            <p className="text-xs text-amber-300/70">{alertPosts.length} post{alertPosts.length > 1 ? 's' : ''} atingiram 500+ views</p>
          </div>
          <button onClick={() => setAlertPosts([])} className="text-xs text-slate-400 hover:text-white">Dispensar</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Posts Agendados</h2>
          <p className="text-slate-400 mt-0.5 sm:mt-1 text-sm">Gerencie seus posts e metricas</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchMetrics} disabled={fetchingMetrics} className="flex items-center gap-1.5 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl text-sm transition" title="Atualizar metricas">
            {fetchingMetrics ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            <span className="hidden md:inline">Metricas</span>
          </button>
          <button onClick={load} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition" title="Atualizar">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Publish log */}
      {publishLog.length > 0 && (
        <div className="mb-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="w-4 h-4 text-sky-400" />
            <p className="text-sm font-semibold text-white">Historico de Publicacoes</p>
            <button onClick={() => setPublishLog([])} className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition">Limpar</button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {publishLog.map((log, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs ${log.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {log.status === 'success' ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                <span className="font-medium capitalize">{log.platform}</span>
                <span className="text-current/70">— {log.message}</span>
                <span className="ml-auto text-current/50 flex-shrink-0">{log.at}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search + filters */}
      <div className="mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por legenda, hashtag..."
            className="w-full bg-slate-800/60 border border-slate-700/50 text-white placeholder-slate-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)} className={`px-4 py-1.5 rounded-xl text-sm font-medium transition border ${filter === f.value ? 'bg-sky-500/15 text-sky-400 border-sky-500/30' : 'text-slate-400 border-slate-700 hover:text-white hover:bg-slate-700'}`}>{f.label}</button>
          ))}
          {search && <span className="px-3 py-1.5 rounded-xl text-sm text-slate-500 border border-slate-700">{visiblePosts.length} resultado{visiblePosts.length !== 1 ? 's' : ''}</span>}
        </div>
      </div>

      {/* Edit modal */}
      {editPost && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40 p-4" onClick={() => setEditPost(null)}>
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white">Editar Post</h3>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Legenda</label>
              <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} rows={6} className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Agendar para</label>
              <input type="datetime-local" value={editScheduledAt} onChange={e => setEditScheduledAt(e.target.value)} className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition [color-scheme:dark]" />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setEditPost(null)} className="px-4 py-2 rounded-xl border border-slate-600 text-slate-300 hover:text-white text-sm transition">Cancelar</button>
              <button onClick={saveEdit} disabled={savingEdit} className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-60">
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-800/40 rounded-2xl animate-pulse" />)}</div>
      ) : visiblePosts.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="w-14 h-14 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-medium">{search ? 'Nenhum post encontrado para a busca' : 'Nenhum post encontrado'}</p>
          {!search && <button onClick={onCreateNew} className="mt-4 bg-sky-500 hover:bg-sky-400 text-white px-5 py-2 rounded-xl text-sm font-medium transition">Criar Post</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {visiblePosts.map(post => {
            const cfg = STATUS_CONFIG[post.status];
            const Icon = cfg.Icon;
            const ptCfg = POST_TYPE_CONFIG[post.post_type || 'carousel'];
            const PtIcon = ptCfg.icon;
            const metric = metrics[post.id];
            const reached500 = metric?.reached_500 && metric.views >= 500;
            const isCarousel = (post.post_type || 'carousel') === 'carousel';

            return (
              <div key={post.id} className={`bg-slate-800/60 border rounded-2xl p-4 sm:p-5 hover:border-slate-600/60 transition group ${reached500 ? 'border-amber-500/30' : 'border-slate-700/50'}`}>
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Thumbnail — clickable to expand */}
                  {post.image_url ? (
                    <button
                      onClick={() => setExpandedImage({ src: post.image_url!, postType: post.post_type || 'carousel', caption: post.generated_caption })}
                      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden flex-shrink-0 border border-slate-700 hover:border-sky-500/50 transition"
                    >
                      <img src={post.image_url} alt="" className="w-full h-full object-cover" />
                      {isCarousel && (
                        <div className="absolute inset-0 flex pointer-events-none">
                          <div className="flex-1 border-r border-white/30" />
                          <div className="flex-1 border-r border-white/30" />
                          <div className="flex-1" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center">
                        <ZoomIn className="w-4 h-4 text-white" />
                      </div>
                    </button>
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-slate-500" /></div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm text-white line-clamp-2 flex-1">{post.generated_caption || post.prompt || 'Sem conteudo'}</p>
                      {/* Actions: sempre visíveis no mobile, hover no desktop */}
                      <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition flex-shrink-0">
                        {(post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed') && (
                          <button onClick={() => startEdit(post)} className="p-1.5 text-slate-500 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition" title="Editar"><Edit3 className="w-3.5 h-3.5" /></button>
                        )}
                        {post.generated_caption && (
                          <button onClick={() => copyCaption(post.generated_caption)} className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition" title="Copiar"><Copy className="w-3.5 h-3.5" /></button>
                        )}
                        <button onClick={() => deletePost(post.id)} disabled={deleting === post.id} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition" title="Deletar"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>

                    {post.hashtags && post.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {post.hashtags.slice(0, 4).map(h => <span key={h} className="text-xs text-sky-500">{h}</span>)}
                        {post.hashtags.length > 4 && <span className="text-xs text-slate-600">+{post.hashtags.length - 4}</span>}
                      </div>
                    )}

                    <div className="flex items-center gap-2 sm:gap-3 mt-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.cls}`}>
                        <Icon className="w-3 h-3" />{cfg.label}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${ptCfg.bg} ${ptCfg.border} ${ptCfg.color}`}>
                        <PtIcon className="w-3 h-3" />{ptCfg.label}
                      </span>
                      {/* Platform badges */}
                      {(post.platforms || ['instagram']).map((pl: Platform) => {
                        const plCfg = PLATFORM_CONFIG[pl];
                        const PlIcon = PLATFORM_ICONS[pl];
                        return (
                          <span key={pl} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${plCfg.bg} ${plCfg.border} ${plCfg.color}`}>
                            <PlIcon className="w-3 h-3" />{plCfg.label}
                          </span>
                        );
                      })}
                      {post.scheduled_at && (
                        <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(post.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      )}
                      {post.published_at && (
                        <span className="text-xs text-emerald-500 flex items-center gap-1 hidden sm:flex"><CheckCircle className="w-3 h-3" />{new Date(post.published_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                      )}
                    </div>

                    {metric && post.status === 'published' && (
                      <div className={`flex items-center gap-4 mt-3 p-2.5 rounded-xl ${reached500 ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-900/40 border border-slate-700/30'}`}>
                        <div className="flex items-center gap-1.5">
                          <Eye className={`w-3.5 h-3.5 ${reached500 ? 'text-amber-400' : 'text-slate-400'}`} />
                          <span className={`text-sm font-bold ${reached500 ? 'text-amber-400' : 'text-white'}`}>{formatNumber(metric.views)}</span>
                          <span className="text-xs text-slate-500">views</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Heart className="w-3.5 h-3.5 text-red-400" />
                          <span className="text-sm font-bold text-white">{formatNumber(metric.likes)}</span>
                          <span className="text-xs text-slate-500">curtidas</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-sm font-bold text-white">{formatNumber(metric.comments)}</span>
                          <span className="text-xs text-slate-500">comentarios</span>
                        </div>
                        {reached500 && (
                          <span className="ml-auto flex items-center gap-1 text-xs text-amber-400 font-medium">
                            <Zap className="w-3 h-3" />500+ views!
                          </span>
                        )}
                      </div>
                    )}

                    {post.status === 'failed' && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-amber-400"><AlertTriangle className="w-3 h-3" />Verifique suas credenciais do Instagram nas Configuracoes</div>
                    )}

                    {/* Per-post publish log */}
                    {publishLog.filter(l => l.postId === post.id).map((log, i) => (
                      <div key={i} className={`flex items-center gap-2 mt-2 px-3 py-1.5 rounded-lg text-xs ${log.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-red-500/10 text-red-400 border border-red-500/15'}`}>
                        {log.status === 'success' ? <CheckCircle className="w-3 h-3 flex-shrink-0" /> : <XCircle className="w-3 h-3 flex-shrink-0" />}
                        <span>{log.message}</span>
                        <span className="ml-auto text-current/60">{log.at}</span>
                      </div>
                    ))}

                    {(post.status === 'draft' || post.status === 'scheduled' || post.status === 'failed') && (
                      <div className="flex gap-2 mt-3">
                        {post.image_url && (
                          <button onClick={() => publishNow(post)} disabled={publishing === post.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 text-xs font-medium hover:bg-emerald-500/25 transition disabled:opacity-60">
                            {publishing === post.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            {publishing === post.id ? 'Publicando...' : 'Publicar Agora'}
                          </button>
                        )}
                        {post.instagram_post_id && (
                          <a href={`https://www.instagram.com/p/${post.instagram_post_id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/20 text-xs font-medium hover:bg-sky-500/25 transition">
                            <ExternalLink className="w-3 h-3" />Ver no Instagram
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
