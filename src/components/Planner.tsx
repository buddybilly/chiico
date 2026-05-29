import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  CalendarDays, Sparkles, Loader2, ChevronDown, ChevronUp,
  Trash2, Plus, BookOpen, Film, Image, Layout, Play,
  Hash, ArrowRight, Check, RefreshCw, AlertCircle, Edit3, Save, X, Send
} from 'lucide-react';

interface Props {
  userId: string;
  onCreatePost?: (data: { caption: string; theme: string; hashtags: string[] }) => void;
}

interface PlanPost {
  id: string;
  plan_id: string;
  day_number: number;
  scheduled_date: string;
  format: string;
  theme: string;
  emotional_angle: string;
  caption_suggestion: string;
  cta: string;
  hashtags: string[];
  pillar: string;
  status: string;
}

interface ContentPlan {
  id: string;
  title: string;
  pillars: string;
  period_days: number;
  start_date: string;
  status: string;
  created_at: string;
  posts?: PlanPost[];
}

const FORMAT_CONFIG: Record<string, { label: string; icon: typeof BookOpen; color: string; bg: string; border: string }> = {
  post: { label: 'Post', icon: Image, color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/25' },
  carrossel: { label: 'Carrossel', icon: Layout, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/25' },
  story: { label: 'Story', icon: Film, color: 'text-rose-400', bg: 'bg-rose-500/15', border: 'border-rose-500/25' },
  reels: { label: 'Reels', icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/25' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pendente', color: 'text-slate-400', bg: 'bg-slate-500/15' },
  in_progress: { label: 'Em andamento', color: 'text-amber-400', bg: 'bg-amber-500/15' },
  done: { label: 'Concluido', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
};

const PERIOD_OPTIONS = [
  { value: 7, label: '7 dias' },
  { value: 14, label: '14 dias' },
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
];

export default function Planner({ userId, onCreatePost }: Props) {
  const [plans, setPlans] = useState<ContentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ theme: string; caption_suggestion: string; cta: string }>({ theme: '', caption_suggestion: '', cta: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [convertingPost, setConvertingPost] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    pillars: '',
    period_days: 30,
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadPlans();
  }, [userId]);

  async function loadPlans() {
    setLoading(true);
    const { data } = await supabase
      .from('content_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setPlans((data as ContentPlan[]) || []);
    setLoading(false);
  }

  async function loadPlanPosts(planId: string) {
    const { data } = await supabase
      .from('content_plan_posts')
      .select('*')
      .eq('plan_id', planId)
      .order('day_number', { ascending: true });

    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, posts: (data as PlanPost[]) || [] } : p
    ));
  }

  async function togglePlan(planId: string) {
    if (expandedPlan === planId) {
      setExpandedPlan(null);
      return;
    }
    setExpandedPlan(planId);
    const plan = plans.find(p => p.id === planId);
    if (!plan?.posts) {
      await loadPlanPosts(planId);
    }
  }

  async function generate() {
    if (!form.pillars.trim()) {
      setError('Descreva os pilares ou temas de conteudo.');
      return;
    }
    setError('');
    setGenerating(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-plan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, userId }),
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao gerar plano');

      setShowForm(false);
      setForm({ title: '', pillars: '', period_days: 30, start_date: new Date().toISOString().split('T')[0] });
      await loadPlans();
      setExpandedPlan(result.plan_id);
      await loadPlanPosts(result.plan_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar plano');
    } finally {
      setGenerating(false);
    }
  }

  async function deletePlan(planId: string) {
    await supabase.from('content_plans').delete().eq('id', planId);
    setPlans(prev => prev.filter(p => p.id !== planId));
    if (expandedPlan === planId) setExpandedPlan(null);
  }

  async function updatePostStatus(postId: string, planId: string, status: string) {
    await supabase.from('content_plan_posts').update({ status }).eq('id', postId);
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, posts: p.posts?.map(pp => pp.id === postId ? { ...pp, status } : pp) }
        : p
    ));
  }

  function startEditPost(post: PlanPost) {
    setEditingPost(post.id);
    setEditFields({ theme: post.theme, caption_suggestion: post.caption_suggestion, cta: post.cta });
  }

  async function savePostEdit(post: PlanPost, planId: string) {
    setSavingEdit(true);
    await supabase.from('content_plan_posts').update({
      theme: editFields.theme,
      caption_suggestion: editFields.caption_suggestion,
      cta: editFields.cta,
    }).eq('id', post.id);
    setPlans(prev => prev.map(p =>
      p.id === planId
        ? { ...p, posts: p.posts?.map(pp => pp.id === post.id ? { ...pp, ...editFields } : pp) }
        : p
    ));
    setEditingPost(null);
    setSavingEdit(false);
  }

  function handleConvertPost(post: PlanPost) {
    if (onCreatePost) {
      onCreatePost({
        caption: post.caption_suggestion,
        theme: post.theme,
        hashtags: post.hashtags || [],
      });
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getFormatConfig(format: string) {
    return FORMAT_CONFIG[format?.toLowerCase()] || FORMAT_CONFIG['post'];
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 sm:mb-8">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Planejador Editorial</h2>
          <p className="text-slate-400 mt-0.5 sm:mt-1 text-sm">Crie calendarios de conteudo estrategico com IA</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(''); }}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-500/20"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Plano</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Generation Form */}
      {showForm && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 mb-8 space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Gerar novo calendario editorial</h3>
              <p className="text-xs text-slate-500">O agente vai criar um plano dia a dia com temas, formatos e CTAs premium</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome do plano <span className="text-slate-600">(opcional)</span></label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Plano de Mayo 2026"
              className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Periodo</label>
              <select
                value={form.period_days}
                onChange={e => setForm(f => ({ ...f, period_days: parseInt(e.target.value) }))}
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
              >
                {PERIOD_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Data de inicio</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Pilares e temas de conteudo <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={form.pillars}
              onChange={e => setForm(f => ({ ...f, pillars: e.target.value }))}
              rows={5}
              placeholder={`Descreva os pilares, especialidades, temas e assuntos do profissional.\n\nEx:\n- Cirurgia bucomaxilofacial\n- Fraturas faciais e trauma\n- Implantes osseointegrados\n- Odontologia hospitalar\n- Cistos e tumores bucomaxilofaciais\n- Desmistificar o medo de cirurgia\n- Humanizacao do atendimento`}
              className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500/40 transition leading-relaxed"
            />
            <p className="text-xs text-slate-600 mt-1.5">Quanto mais detalhado, mais preciso e estrategico sera o plano gerado.</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition shadow-lg shadow-sky-500/20"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Gerando plano...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Gerar Calendario</>
              )}
            </button>
            <button
              onClick={() => { setShowForm(false); setError(''); }}
              disabled={generating}
              className="px-4 py-3 text-slate-400 hover:text-white text-sm transition"
            >
              Cancelar
            </button>
          </div>

          {generating && (
            <div className="flex items-center gap-3 px-4 py-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
              <RefreshCw className="w-4 h-4 text-sky-400 animate-spin flex-shrink-0" />
              <p className="text-xs text-sky-300">O agente esta criando seu calendario editorial estrategico. Isso pode levar alguns segundos...</p>
            </div>
          )}
        </div>
      )}

      {/* Plans List */}
      {plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5">
            <CalendarDays className="w-7 h-7 text-slate-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-2">Nenhum plano criado</h3>
          <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
            Crie seu primeiro calendario editorial e o agente vai gerar um plano completo, dia a dia, com temas estrategicos para o seu perfil.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-sky-500/15 border border-sky-500/25 text-sky-400 hover:bg-sky-500/25 rounded-xl text-sm font-medium transition"
          >
            <Plus className="w-4 h-4" />
            Criar primeiro plano
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(plan => {
            const isExpanded = expandedPlan === plan.id;
            const donePosts = plan.posts?.filter(p => p.status === 'done').length || 0;
            const totalPosts = plan.posts?.length || plan.period_days;
            const progress = plan.posts ? Math.round((donePosts / totalPosts) * 100) : 0;

            return (
              <div key={plan.id} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Plan Header */}
                <div className="flex items-center gap-4 p-5">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-sky-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{plan.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-slate-500">{plan.period_days} dias</span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-500">Inicio: {formatDate(plan.start_date)}</span>
                      {plan.posts && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span className="text-xs text-slate-500">{donePosts}/{totalPosts} concluidos</span>
                        </>
                      )}
                    </div>
                    {plan.posts && plan.posts.length > 0 && (
                      <div className="mt-2 h-1.5 bg-slate-700/60 rounded-full overflow-hidden w-48">
                        <div
                          className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deletePlan(plan.id)}
                      className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => togglePlan(plan.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition"
                    >
                      {isExpanded ? (
                        <><ChevronUp className="w-3.5 h-3.5" /> Fechar</>
                      ) : (
                        <><ChevronDown className="w-3.5 h-3.5" /> Ver plano</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Posts List */}
                {isExpanded && (
                  <div className="border-t border-slate-700/50">
                    {!plan.posts ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-700/30">
                        {plan.posts.map(post => {
                          const fmtCfg = getFormatConfig(post.format);
                          const FmtIcon = fmtCfg.icon;
                          const stCfg = STATUS_CONFIG[post.status] || STATUS_CONFIG['pending'];
                          const isPostExpanded = expandedPost === post.id;

                          return (
                            <div key={post.id} className="group">
                              {/* Post Row */}
                              <div
                                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-slate-700/20 transition"
                                onClick={() => setExpandedPost(isPostExpanded ? null : post.id)}
                              >
                                {/* Day number */}
                                <div className="w-8 h-8 rounded-lg bg-slate-900/60 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-slate-400">{post.day_number}</span>
                                </div>

                                {/* Date */}
                                <div className="w-24 flex-shrink-0">
                                  <p className="text-xs text-slate-400">{post.scheduled_date ? formatDate(post.scheduled_date) : '—'}</p>
                                </div>

                                {/* Format badge */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${fmtCfg.bg} border ${fmtCfg.border} flex-shrink-0`}>
                                  <FmtIcon className={`w-3 h-3 ${fmtCfg.color}`} />
                                  <span className={`text-[10px] font-medium ${fmtCfg.color}`}>{fmtCfg.label}</span>
                                </div>

                                {/* Theme */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white truncate font-medium">{post.theme}</p>
                                  {post.pillar && (
                                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{post.pillar}</p>
                                  )}
                                </div>

                                {/* Status selector */}
                                <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                  <select
                                    value={post.status}
                                    onChange={e => updatePostStatus(post.id, plan.id, e.target.value)}
                                    className={`text-[10px] font-medium px-2 py-1 rounded-lg border bg-transparent cursor-pointer focus:outline-none transition ${stCfg.bg} ${stCfg.color} border-current/20`}
                                  >
                                    <option value="pending">Pendente</option>
                                    <option value="in_progress">Em andamento</option>
                                    <option value="done">Concluido</option>
                                  </select>
                                  {isPostExpanded ? (
                                    <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                  ) : (
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400" />
                                  )}
                                </div>
                              </div>

                              {/* Post Detail */}
                              {isPostExpanded && (
                                <div className="px-5 pb-5 pt-1 bg-slate-900/30 space-y-4">
                                  {editingPost === post.id ? (
                                    /* Inline edit form */
                                    <div className="space-y-3">
                                      <div>
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Tema</label>
                                        <input
                                          value={editFields.theme}
                                          onChange={e => setEditFields(f => ({ ...f, theme: e.target.value }))}
                                          className="w-full bg-slate-800/60 border border-slate-600/50 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">CTA Premium</label>
                                        <input
                                          value={editFields.cta}
                                          onChange={e => setEditFields(f => ({ ...f, cta: e.target.value }))}
                                          className="w-full bg-slate-800/60 border border-slate-600/50 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Sugestao de Legenda</label>
                                        <textarea
                                          value={editFields.caption_suggestion}
                                          onChange={e => setEditFields(f => ({ ...f, caption_suggestion: e.target.value }))}
                                          rows={4}
                                          className="w-full bg-slate-800/60 border border-slate-600/50 text-white rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition"
                                        />
                                      </div>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => savePostEdit(post, plan.id)}
                                          disabled={savingEdit}
                                          className="flex items-center gap-1.5 px-4 py-2 bg-sky-500/15 border border-sky-500/20 text-sky-400 hover:bg-sky-500/25 rounded-xl text-xs font-medium transition disabled:opacity-60"
                                        >
                                          {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                          Salvar
                                        </button>
                                        <button
                                          onClick={() => setEditingPost(null)}
                                          className="flex items-center gap-1.5 px-4 py-2 border border-slate-600 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="grid md:grid-cols-2 gap-4">
                                        {/* Emotional Angle */}
                                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Angulo Emocional</p>
                                          <p className="text-sm text-slate-200 leading-relaxed">{post.emotional_angle || '—'}</p>
                                        </div>

                                        {/* CTA */}
                                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">CTA Premium</p>
                                          <p className="text-sm text-sky-300 leading-relaxed italic">{post.cta || '—'}</p>
                                        </div>
                                      </div>

                                      {/* Caption */}
                                      {post.caption_suggestion && (
                                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Sugestao de Legenda</p>
                                          <p className="text-sm text-slate-300 leading-relaxed">{post.caption_suggestion}</p>
                                        </div>
                                      )}

                                      {/* Hashtags */}
                                      {post.hashtags && post.hashtags.length > 0 && (
                                        <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4">
                                          <div className="flex items-center gap-1.5 mb-2.5">
                                            <Hash className="w-3 h-3 text-slate-500" />
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Hashtags</p>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                            {post.hashtags.map((tag, i) => (
                                              <span key={i} className="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-400 rounded-lg">
                                                {tag}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Action buttons */}
                                      <div className="flex items-center gap-2 flex-wrap">
                                        {post.status !== 'done' && (
                                          <button
                                            onClick={() => updatePostStatus(post.id, plan.id, 'done')}
                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-medium transition"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                            Marcar como concluido
                                          </button>
                                        )}
                                        <button
                                          onClick={() => startEditPost(post)}
                                          className="flex items-center gap-2 px-4 py-2 bg-slate-700/40 border border-slate-600/40 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl text-xs font-medium transition"
                                        >
                                          <Edit3 className="w-3.5 h-3.5" />
                                          Editar
                                        </button>
                                        {onCreatePost && post.caption_suggestion && (
                                          <button
                                            onClick={() => { handleConvertPost(post); }}
                                            disabled={convertingPost === post.id}
                                            className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 rounded-xl text-xs font-medium transition ml-auto"
                                          >
                                            <Send className="w-3.5 h-3.5" />
                                            Criar Post a partir deste dia
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      {plans.length > 0 && (
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {Object.entries(FORMAT_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-md ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                  <Icon className={`w-3 h-3 ${cfg.color}`} />
                </div>
                <span className="text-xs text-slate-500">{cfg.label}</span>
              </div>
            );
          })}
          <div className="ml-auto flex items-center gap-1.5">
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-slate-600">Clique em um post para ver detalhes</span>
          </div>
        </div>
      )}
    </div>
  );
}
