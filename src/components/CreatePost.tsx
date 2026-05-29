import { useState, useEffect } from 'react';
import { supabase, fnHeaders, AgentResult, AutoScheduleSlot, PostType, Platform, PLATFORM_CONFIG } from '../lib/supabase';
import { Sparkles, ImagePlus, Calendar, CalendarDays, Send, Hash, Wand2, Check, Loader2, Type, Bot, Zap, RotateCcw, Clock, LayoutGrid, Film, Columns, ThumbsUp, ThumbsDown, SlidersHorizontal, RefreshCw, CheckCircle2, XCircle, Pencil, Instagram, Globe, Linkedin, Search, TrendingUp, ChevronRight, X, Lightbulb } from 'lucide-react';

interface Props {
  userId: string;
  initialData?: { caption: string; theme: string; hashtags: string[] };
  onInitialDataUsed?: () => void;
}

const SAMPLE_IMAGES = [
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/11035580/pexels-photo-11035580.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/11035488/pexels-photo-11035488.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/7869091/pexels-photo-7869091.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/7621392/pexels-photo-7621392.jpeg?auto=compress&cs=tinysrgb&w=600',
];

type GenMode = 'agents' | 'caption-only';
type ScheduleMode = 'auto' | 'custom';
type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'adjusting';

const PLATFORM_ICONS: Record<Platform, typeof Instagram> = {
  instagram: Instagram,
  google_business: Globe,
  linkedin: Linkedin,
};

const POST_TYPE_CONFIG: Record<PostType, { icon: typeof Film; label: string; desc: string; color: string; bg: string; border: string }> = {
  story: { icon: Film, label: 'Story', desc: 'Conteudo efemero 24h', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20' },
  carousel: { icon: Columns, label: 'Carrossel', desc: 'Multiplas imagens', color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/20' },
};

export default function CreatePost({ userId, initialData, onInitialDataUsed }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(initialData ? 2 : 1);
  const [genMode, setGenMode] = useState<GenMode>('agents');
  const [prompt, setPrompt] = useState(initialData?.theme || '');
  const [tone, setTone] = useState('profissional');
  const [caption, setCaption] = useState(initialData?.caption || '');
  const [hashtags, setHashtags] = useState<string[]>(initialData?.hashtags || []);
  const [newHashtag, setNewHashtag] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [postType, setPostType] = useState<PostType>('carousel');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('custom');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [slots, setSlots] = useState<AutoScheduleSlot[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [agentProgress, setAgentProgress] = useState('');
  const [themeOutput, setThemeOutput] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');

  const [platforms, setPlatforms] = useState<Platform[]>(['instagram']);

  // AI Review state
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('pending');
  const [adjustNote, setAdjustNote] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [rejectedPosts, setRejectedPosts] = useState<{ caption: string; hashtags: string[]; imageUrl: string }[]>([]);

  // Research state
  const [showResearch, setShowResearch] = useState(false);
  const [researchTopic, setResearchTopic] = useState('');
  const [researching, setResearching] = useState(false);
  const [researchResult, setResearchResult] = useState<{
    summary: string;
    angles: string[];
    trends: string[];
    suggested_prompts: { prompt: string; type: string }[];
  } | null>(null);
  const [researchError, setResearchError] = useState('');

  const TONES = [
    { id: 'profissional', label: 'Profissional' },
    { id: 'casual', label: 'Casual' },
    { id: 'divertido', label: 'Divertido' },
    { id: 'inspirador', label: 'Inspirador' },
    { id: 'educativo', label: 'Educativo' },
  ];

  useEffect(() => {
    async function loadSlots() {
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-schedule`, {
          method: 'POST',
          headers: fnHeaders(),
          body: JSON.stringify({ action: 'get_slots', userId }),
        });
        const data = await res.json();
        if (data.slots) setSlots(data.slots);
      } catch { /* use defaults */ }
    }
    loadSlots();
  }, [userId]);

  useEffect(() => {
    if (scheduleMode === 'auto' && selectedDate && selectedSlotId) {
      const slot = slots.find(s => s.id === selectedSlotId);
      if (slot) {
        setScheduledAt(`${selectedDate}T${slot.time}:00`);
        setPostType(slot.post_type);
      }
    }
  }, [scheduleMode, selectedDate, selectedSlotId, slots]);

  // Reset review when content changes
  useEffect(() => {
    if (step === 3) setReviewStatus('pending');
  }, [step]);

  async function generateWithAgents() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');
    setAgentProgress('Iniciando pipeline de agentes...');

    try {
      const steps = genMode === 'agents' ? ['theme', 'caption', 'image'] : ['caption'];
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-agents`, {
        method: 'POST',
        headers: fnHeaders(),
        body: JSON.stringify({ prompt: prompt.trim(), steps, userId }),
      });

      const data: AgentResult = await res.json();
      if (!res.ok) throw new Error((data as { error?: string }).error || 'Erro ao gerar conteudo');

      if (data.theme?.output) {
        setThemeOutput(data.theme.output);
        setAgentProgress('Tema gerado! Criando legenda...');
      }
      if (data.caption) {
        setCaption(data.caption.output || '');
        setHashtags(data.caption.hashtags || []);
        setAgentProgress(data.image ? 'Legenda gerada! Gerando imagem...' : 'Legenda gerada!');
      }
      if (data.image) {
        setImagePrompt(data.image.output || '');
        if (data.image.imageUrl) {
          setGeneratedImageUrl(data.image.imageUrl);
          setImageUrl(data.image.imageUrl);
        }
        setAgentProgress('Conteudo completo gerado!');
      }

      setTimeout(() => { setAgentProgress(''); setStep(2); }, 500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar conteudo');
      setAgentProgress('');
    }
    setGenerating(false);
  }

  async function generateCaptionOnly() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-caption`, {
        method: 'POST',
        headers: fnHeaders(),
        body: JSON.stringify({ prompt: prompt.trim(), tone, userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar conteudo');

      setCaption(data.caption || '');
      setHashtags(data.hashtags || []);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao gerar conteudo');
    }
    setGenerating(false);
  }

  function handleGenerate() {
    if (genMode === 'agents') generateWithAgents();
    else generateCaptionOnly();
  }

  async function handleAdjust() {
    if (!adjustNote.trim()) return;
    setAdjusting(true);
    setError('');

    try {
      const adjustPrompt = `${prompt.trim()} — Ajuste solicitado: ${adjustNote.trim()}`;
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-caption`, {
        method: 'POST',
        headers: fnHeaders(),
        body: JSON.stringify({ prompt: adjustPrompt, tone, userId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao ajustar conteudo');

      setCaption(data.caption || '');
      setHashtags(data.hashtags || []);
      setAdjustNote('');
      setReviewStatus('pending');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao ajustar conteudo');
    }
    setAdjusting(false);
  }

  async function savePost(asDraft = false) {
    setSaving(true);
    setError('');
    const finalImage = customImageUrl || imageUrl || generatedImageUrl;

    const { error: dbErr } = await supabase.from('scheduled_posts').insert({
      user_id: userId,
      prompt,
      generated_caption: caption,
      image_url: finalImage,
      hashtags,
      post_type: postType,
      platforms,
      auto_slot: scheduleMode === 'auto',
      status: asDraft ? 'draft' : scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: scheduledAt || null,
      theme_output: themeOutput,
      image_prompt: imagePrompt,
    });

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSaved(true);
      setTimeout(() => {
        setStep(1);
        setPrompt(''); setCaption(''); setHashtags([]); setImageUrl('');
        setCustomImageUrl(''); setScheduledAt(''); setSaved(false);
        setThemeOutput(''); setImagePrompt(''); setGeneratedImageUrl('');
        setSelectedDate(''); setSelectedSlotId('');
        setReviewStatus('pending'); setAdjustNote(''); setRejectedPosts([]);
        setPlatforms(['instagram']);
      }, 1500);
    }
    setSaving(false);
  }

  function handleReject() {
    setRejectedPosts(prev => [...prev, { caption, hashtags, imageUrl: customImageUrl || imageUrl || generatedImageUrl }]);
    setReviewStatus('rejected');
  }

  function removeHashtag(tag: string) { setHashtags(prev => prev.filter(h => h !== tag)); }

  function addHashtag() {
    const tag = newHashtag.trim().startsWith('#') ? newHashtag.trim() : `#${newHashtag.trim()}`;
    if (tag.length > 1 && !hashtags.includes(tag)) setHashtags(prev => [...prev, tag]);
    setNewHashtag('');
  }

  function resetGeneration() { setGenerating(false); setAgentProgress(''); setError(''); }

  async function handleResearch() {
    if (!researchTopic.trim()) return;
    setResearching(true);
    setResearchError('');
    setResearchResult(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-topic`, {
        method: 'POST',
        headers: fnHeaders(),
        body: JSON.stringify({ topic: researchTopic.trim(), userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro na pesquisa');
      setResearchResult(data);
    } catch (e: unknown) {
      setResearchError(e instanceof Error ? e.message : 'Erro na pesquisa');
    }
    setResearching(false);
  }

  function applyResearchPrompt(suggested: string) {
    setPrompt(suggested);
    setShowResearch(false);
    setResearchResult(null);
    setResearchTopic('');
  }

  const stepsDef = [
    { n: 1, label: 'Gerar com IA' },
    { n: 2, label: 'Personalizar' },
    { n: 3, label: 'Agendar' },
  ];

  const fromPlanner = !!initialData;

  const storySlots = slots.filter(s => s.post_type === 'story' && s.is_active);
  const carouselSlots = slots.filter(s => s.post_type === 'carousel' && s.is_active);

  const finalImage = customImageUrl || imageUrl || generatedImageUrl;
  const canSchedule = reviewStatus === 'approved';

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Criar Post</h2>
        <p className="text-slate-400 mt-1 text-sm">Gere conteudo com seus agentes GPT e agende</p>
      </div>

      {fromPlanner && (
        <div className="mb-5 flex items-center gap-3 px-4 py-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
          <CalendarDays className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-sky-300">Post criado a partir do Planejador. Legenda pre-preenchida — edite e agende.</p>
          {onInitialDataUsed && <button onClick={onInitialDataUsed} className="ml-auto text-slate-500 hover:text-slate-300 transition"><X className="w-4 h-4" /></button>}
        </div>
      )}

      <div className="flex items-center gap-0 mb-6 sm:mb-8 overflow-x-auto pb-1">
        {stepsDef.map((s, i) => (
          <div key={s.n} className="flex items-center flex-shrink-0">
            <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${step === s.n ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' : step > s.n ? 'text-emerald-400' : 'text-slate-500'}`}>
              {step > s.n ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <span className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border flex items-center justify-center text-[10px] sm:text-xs">{s.n}</span>}
              {s.label}
            </div>
            {i < stepsDef.length - 1 && <div className={`w-4 sm:w-8 h-px mx-0.5 sm:mx-1 ${step > s.n ? 'bg-emerald-500/40' : 'bg-slate-700'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={resetGeneration} className="text-red-400 hover:text-red-300"><RotateCcw className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <label className="block text-sm font-medium text-slate-300 mb-3">Modo de geracao</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setGenMode('agents')} className={`flex items-center gap-3 p-4 rounded-xl border transition text-left ${genMode === 'agents' ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${genMode === 'agents' ? 'bg-sky-500/20' : 'bg-slate-700/50'}`}><Zap className="w-5 h-5" /></div>
                <div><p className="text-sm font-semibold">Pipeline Completo</p><p className="text-xs opacity-70">3 agentes: Tema + Legenda + Imagem</p></div>
              </button>
              <button onClick={() => setGenMode('caption-only')} className={`flex items-center gap-3 p-4 rounded-xl border transition text-left ${genMode === 'caption-only' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${genMode === 'caption-only' ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}><Type className="w-5 h-5" /></div>
                <div><p className="text-sm font-semibold">Somente Legenda</p><p className="text-xs opacity-70">Apenas texto + hashtags</p></div>
              </button>
            </div>
          </div>

          {genMode === 'agents' && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pipeline de Agentes</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20"><Bot className="w-4 h-4 text-amber-400" /><span className="text-xs font-medium text-amber-400">Tema</span></div>
                <div className="w-4 h-px bg-slate-600" />
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><Bot className="w-4 h-4 text-emerald-400" /><span className="text-xs font-medium text-emerald-400">Legenda</span></div>
                <div className="w-4 h-px bg-slate-600" />
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 border border-sky-500/20"><Bot className="w-4 h-4 text-sky-400" /><span className="text-xs font-medium text-sky-400">Imagem</span></div>
              </div>
            </div>
          )}

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Descreva o assunto do seu post</label>
                <button
                  type="button"
                  onClick={() => { setShowResearch(prev => !prev); setResearchError(''); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${showResearch ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' : 'bg-slate-700/60 text-slate-400 border-slate-600/50 hover:text-sky-400 hover:border-sky-500/30'}`}
                >
                  <Search className="w-3.5 h-3.5" />
                  Pesquisar com GPT
                </button>
              </div>

              {showResearch && (
                <div className="mb-4 bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-sky-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5" />
                      Pesquisa de Conteudo com IA
                    </p>
                    <button onClick={() => { setShowResearch(false); setResearchResult(null); setResearchError(''); }} className="text-slate-500 hover:text-slate-300 transition">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={researchTopic}
                      onChange={e => setResearchTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleResearch()}
                      placeholder="Ex: marketing digital, saude mental, financas pessoais..."
                      className="flex-1 bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition"
                    />
                    <button
                      onClick={handleResearch}
                      disabled={researching || !researchTopic.trim()}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl text-sm transition disabled:opacity-60 flex-shrink-0"
                    >
                      {researching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      {researching ? 'Pesquisando...' : 'Pesquisar'}
                    </button>
                  </div>

                  {researchError && (
                    <p className="text-xs text-red-400">{researchError}</p>
                  )}

                  {researchResult && (
                    <div className="space-y-4">
                      {/* Summary */}
                      <div className="bg-slate-900/50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1"><Lightbulb className="w-3 h-3 text-amber-400" />Contexto</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{researchResult.summary}</p>
                      </div>

                      {/* Angles */}
                      {researchResult.angles?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" />Angulos de Conteudo</p>
                          <div className="space-y-1">
                            {researchResult.angles.map((a, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-emerald-400 font-bold mt-0.5">{i + 1}.</span>
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Trends */}
                      {researchResult.trends?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-2">Tendencias</p>
                          <div className="flex flex-wrap gap-1.5">
                            {researchResult.trends.map((t, i) => (
                              <span key={i} className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested prompts */}
                      {researchResult.suggested_prompts?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3 text-sky-400" />Prompts Prontos — clique para usar</p>
                          <div className="space-y-2">
                            {researchResult.suggested_prompts.map((sp, i) => (
                              <button
                                key={i}
                                onClick={() => applyResearchPrompt(sp.prompt)}
                                className="w-full flex items-center gap-3 p-3 bg-slate-800/80 hover:bg-sky-500/10 border border-slate-700/50 hover:border-sky-500/30 rounded-xl text-left transition group"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-300 group-hover:text-white transition leading-relaxed">{sp.prompt}</p>
                                  {sp.type && (
                                    <span className="text-[10px] text-slate-500 mt-0.5 block capitalize">{sp.type}</span>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 flex-shrink-0 transition" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} placeholder="Ex: Lancamento de produto fitness, dica de produtividade..." className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" />
            </div>

            {genMode === 'caption-only' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Type className="w-4 h-4 text-emerald-400" />Tom da legenda</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${tone === t.id ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'text-slate-400 border-slate-700 hover:text-white hover:border-slate-500'}`}>{t.label}</button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={handleGenerate} disabled={generating || !prompt.trim()} className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : genMode === 'agents' ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {generating ? agentProgress || 'Gerando...' : genMode === 'agents' ? 'Executar Pipeline de Agentes' : 'Gerar Legenda com IA'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <div className="space-y-5">
          {themeOutput && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Bot className="w-3.5 h-3.5" />Tema Gerado pelo Agente</h4>
              <p className="text-sm text-slate-300 leading-relaxed">{themeOutput}</p>
            </div>
          )}

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Wand2 className="w-4 h-4 text-emerald-400" />Legenda gerada</label>
              <textarea value={caption} onChange={e => setCaption(e.target.value)} rows={6} className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" />
              <p className="text-xs text-slate-600 mt-1">{caption.length}/2200 caracteres</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2"><Hash className="w-4 h-4 text-sky-400" />Hashtags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {hashtags.map(tag => (
                  <span key={tag} onClick={() => removeHashtag(tag)} className="px-3 py-1 bg-sky-500/15 text-sky-400 border border-sky-500/20 rounded-full text-xs font-medium cursor-pointer hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/20 transition" title="Clique para remover">{tag}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newHashtag} onChange={e => setNewHashtag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())} placeholder="Adicionar hashtag..." className="flex-1 bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" />
                <button onClick={addHashtag} className="px-4 py-2 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-xl text-sm font-medium hover:bg-sky-500/25 transition">Adicionar</button>
              </div>
            </div>
          </div>

          {generatedImageUrl && (
            <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-5">
              <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Bot className="w-3.5 h-3.5" />Imagem Gerada pelo Agente</h4>
              {imagePrompt && <p className="text-xs text-slate-500 mb-2">Prompt: {imagePrompt}</p>}
              <img src={generatedImageUrl} alt="Imagem gerada por IA" className="w-full max-h-64 object-cover rounded-xl border border-slate-700" />
            </div>
          )}

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-medium text-slate-300 flex items-center gap-2"><ImagePlus className="w-4 h-4 text-amber-400" />Imagem do Post</label>
            <div className="grid grid-cols-4 gap-2">
              {SAMPLE_IMAGES.map(img => (
                <button key={img} onClick={() => { setImageUrl(img); setCustomImageUrl(''); }} className={`aspect-square rounded-xl overflow-hidden border-2 transition ${imageUrl === img && !customImageUrl && !generatedImageUrl ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-slate-700 hover:border-slate-500'}`}>
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <input type="url" value={customImageUrl} onChange={e => { setCustomImageUrl(e.target.value); if (e.target.value) setImageUrl(''); }} placeholder="Ou cole uma URL de imagem..." className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" />
            {finalImage && (
              <img src={finalImage} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border border-slate-700" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-medium transition">Voltar</button>
            <button onClick={() => setStep(3)} disabled={!caption.trim()} className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 text-sm disabled:opacity-60 disabled:cursor-not-allowed">Continuar para Agendamento</button>
          </div>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && (
        <div className="space-y-5">

          {/* Instagram Preview */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Instagram className="w-3.5 h-3.5 text-pink-400" />
              Pre-visualizacao do Post
            </h3>
            <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden max-w-sm mx-auto">
              {/* Mock Instagram header */}
              <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-700/40">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white leading-tight">sua_conta</p>
                  <p className="text-[10px] text-slate-500">Instagram</p>
                </div>
                <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border ${postType === 'story' ? 'bg-amber-500/15 text-amber-400 border-amber-500/20' : 'bg-sky-500/15 text-sky-400 border-sky-500/20'}`}>
                  {postType === 'story' ? 'Story' : 'Carrossel'}
                </span>
              </div>
              {/* Image */}
              {finalImage ? (
                <div className={`relative bg-slate-950 ${postType === 'story' ? 'aspect-[9/16]' : 'aspect-square'} overflow-hidden`}>
                  <img src={finalImage} alt="" className="w-full h-full object-cover" />
                  {postType === 'carousel' && (
                    <div className="absolute inset-0 flex pointer-events-none">
                      <div className="flex-1 border-r border-white/20" />
                      <div className="flex-1 border-r border-white/20" />
                      <div className="flex-1" />
                    </div>
                  )}
                </div>
              ) : (
                <div className={`${postType === 'story' ? 'aspect-[9/16]' : 'aspect-square'} bg-slate-800 flex items-center justify-center`}>
                  <p className="text-xs text-slate-600">Sem imagem selecionada</p>
                </div>
              )}
              {/* Caption preview */}
              <div className="px-4 py-3">
                {caption && (
                  <p className="text-xs text-slate-200 leading-relaxed line-clamp-3">
                    <span className="font-bold text-white">sua_conta </span>
                    {caption}
                  </p>
                )}
                {hashtags.length > 0 && (
                  <p className="text-xs text-sky-400 mt-1 line-clamp-2">
                    {hashtags.slice(0, 8).join(' ')}{hashtags.length > 8 ? ` +${hashtags.length - 8}` : ''}
                  </p>
                )}
                <p className="text-[10px] text-slate-600 mt-1.5">{caption.length} caracteres · {hashtags.length} hashtags</p>
              </div>
            </div>
          </div>

          {/* ── AI REVIEW BOX ── */}
          <div className={`rounded-2xl border p-5 transition-all ${
            reviewStatus === 'approved'
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : reviewStatus === 'rejected'
              ? 'bg-red-500/5 border-red-500/30'
              : reviewStatus === 'adjusting'
              ? 'bg-amber-500/5 border-amber-500/30'
              : 'bg-slate-800/60 border-slate-700/50'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Bot className={`w-4 h-4 ${reviewStatus === 'approved' ? 'text-emerald-400' : reviewStatus === 'rejected' ? 'text-red-400' : 'text-sky-400'}`} />
              <h3 className="text-sm font-semibold text-white">Revisao do Conteudo Gerado por IA</h3>
              {reviewStatus === 'approved' && (
                <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />Aprovado
                </span>
              )}
              {reviewStatus === 'rejected' && (
                <span className="ml-auto flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/15 border border-red-500/20 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" />Reprovado
                </span>
              )}
            </div>

            {/* Content preview inside review box */}
            <div className="flex gap-4 mb-5">
              {finalImage && (
                <img src={finalImage} alt="" className="w-20 h-20 rounded-xl object-cover border border-slate-700 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed">{caption}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {hashtags.slice(0, 5).map(h => <span key={h} className="text-xs text-sky-400">{h}</span>)}
                  {hashtags.length > 5 && <span className="text-xs text-slate-500">+{hashtags.length - 5}</span>}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            {reviewStatus === 'pending' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewStatus('approved')}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-xl py-2.5 text-sm font-semibold transition"
                >
                  <ThumbsUp className="w-4 h-4" />Aprovar
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 rounded-xl py-2.5 text-sm font-semibold transition"
                >
                  <ThumbsDown className="w-4 h-4" />Reprovar
                </button>
                <button
                  onClick={() => setReviewStatus('adjusting')}
                  className="flex-1 flex items-center justify-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl py-2.5 text-sm font-semibold transition"
                >
                  <SlidersHorizontal className="w-4 h-4" />Ajustar
                </button>
              </div>
            )}

            {reviewStatus === 'approved' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setReviewStatus('pending')}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />Revisar novamente
                </button>
                <button
                  onClick={() => setReviewStatus('adjusting')}
                  className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition ml-auto"
                >
                  <Pencil className="w-3.5 h-3.5" />Ajustar mesmo assim
                </button>
              </div>
            )}

            {reviewStatus === 'rejected' && (
              <div className="space-y-3">
                <p className="text-xs text-red-300/70">Este conteudo foi reprovado. Voce pode ajustar ou voltar ao inicio.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setReviewStatus('adjusting'); }}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-medium transition"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />Ajustar Conteudo
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-2 px-4 py-2 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl text-xs font-medium transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />Gerar Novamente
                  </button>
                </div>

                {/* Rejected history */}
                {rejectedPosts.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <p className="text-xs text-slate-500 mb-2">Versoes reprovadas ({rejectedPosts.length})</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {rejectedPosts.map((rp, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-slate-900/40 rounded-lg">
                          {rp.imageUrl && <img src={rp.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />}
                          <p className="text-xs text-slate-500 line-clamp-1 flex-1">{rp.caption}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {reviewStatus === 'adjusting' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-amber-400 mb-1.5">Descreva o ajuste desejado</label>
                  <textarea
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                    rows={3}
                    placeholder="Ex: Deixe mais animado, adicione mais emocao, use um tom mais formal..."
                    className="w-full bg-slate-900/60 border border-amber-500/30 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleAdjust}
                    disabled={adjusting || !adjustNote.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-semibold transition disabled:opacity-60"
                  >
                    {adjusting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {adjusting ? 'Ajustando...' : 'Aplicar Ajuste'}
                  </button>
                  <button
                    onClick={() => setReviewStatus('pending')}
                    className="px-4 py-2.5 border border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl text-sm transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Platform Selector */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-0.5">Onde publicar</label>
              <p className="text-xs text-slate-500">Marque todas as plataformas desejadas.</p>
            </div>

            {([
              { pl: 'instagram' as Platform, sub: 'Feed, Stories, Reels' },
              { pl: 'google_business' as Platform, sub: 'Perfil de empresa no Google' },
              { pl: 'linkedin' as Platform, sub: 'Pagina ou perfil pessoal' },
            ]).map(({ pl, sub }) => {
              const cfg = PLATFORM_CONFIG[pl];
              const Icon = PLATFORM_ICONS[pl];
              const checked = platforms.includes(pl);
              const toggle = () => {
                if (checked) {
                  if (platforms.length > 1) setPlatforms(prev => prev.filter(p => p !== pl));
                } else {
                  setPlatforms(prev => [...prev, pl]);
                }
              };
              return (
                <label
                  key={pl}
                  className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition select-none
                    ${checked
                      ? `${cfg.bg} ${cfg.border}`
                      : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-700/20'
                    }`}
                >
                  <div
                    onClick={toggle}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition
                      ${checked
                        ? `${cfg.bg} border-current ${cfg.color}`
                        : 'border-slate-600 bg-slate-900/60'
                      }`}
                  >
                    {checked && <Check className="w-3 h-3" strokeWidth={3} />}
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0" onClick={toggle}>
                    <p className={`text-sm font-semibold leading-tight ${checked ? cfg.color : 'text-slate-300'}`}>{cfg.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                  </div>
                  <input type="checkbox" checked={checked} onChange={toggle} className="sr-only" />
                </label>
              );
            })}

            {platforms.length > 1 && (
              <div className="flex items-center gap-2 p-3 bg-slate-900/40 border border-slate-700/30 rounded-xl mt-1">
                <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                <p className="text-xs text-slate-400">
                  Publicando em <span className="text-white font-semibold">{platforms.length} plataformas</span> simultaneamente.
                </p>
              </div>
            )}
          </div>

          {/* Post Type */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-medium text-slate-300 flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-sky-400" />Tipo de Post</label>
            <div className="grid grid-cols-2 gap-3">
              {(['story', 'carousel'] as PostType[]).map(pt => {
                const cfg = POST_TYPE_CONFIG[pt];
                const PtIcon = cfg.icon;
                return (
                  <button key={pt} onClick={() => setPostType(pt)} className={`flex items-center gap-3 p-4 rounded-xl border transition text-left ${postType === pt ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${postType === pt ? cfg.bg : 'bg-slate-700/50'}`}><PtIcon className="w-5 h-5" /></div>
                    <div><p className="text-sm font-semibold">{cfg.label}</p><p className="text-xs opacity-70">{cfg.desc}</p></div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schedule Mode */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
            <label className="block text-sm font-medium text-slate-300 flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" />Agendamento</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setScheduleMode('auto')} className={`flex items-center gap-3 p-4 rounded-xl border transition text-left ${scheduleMode === 'auto' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scheduleMode === 'auto' ? 'bg-amber-500/20' : 'bg-slate-700/50'}`}><Clock className="w-5 h-5" /></div>
                <div><p className="text-sm font-semibold">Horarios Automaticos</p><p className="text-xs opacity-70">8h, 10h, 14h, 16h, 20h</p></div>
              </button>
              <button onClick={() => setScheduleMode('custom')} className={`flex items-center gap-3 p-4 rounded-xl border transition text-left ${scheduleMode === 'custom' ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scheduleMode === 'custom' ? 'bg-sky-500/20' : 'bg-slate-700/50'}`}><Calendar className="w-5 h-5" /></div>
                <div><p className="text-sm font-semibold">Data e Hora</p><p className="text-xs opacity-70">Escolha personalizada</p></div>
              </button>
            </div>

            {scheduleMode === 'auto' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Selecione a data</label>
                  <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} min={new Date().toISOString().slice(0, 10)} className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition [color-scheme:dark]" />
                </div>
                {selectedDate && (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-2">Horarios disponiveis</label>
                    <div className="space-y-2">
                      {storySlots.length > 0 && (
                        <div>
                          <p className="text-xs text-amber-400 font-medium mb-1.5 flex items-center gap-1"><Film className="w-3 h-3" />Stories</p>
                          <div className="flex flex-wrap gap-2">
                            {storySlots.map(slot => (
                              <button key={slot.id} onClick={() => { setSelectedSlotId(slot.id); setPostType('story'); }} className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition flex items-center gap-2 ${selectedSlotId === slot.id ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                                <Clock className="w-3.5 h-3.5" />{slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {carouselSlots.length > 0 && (
                        <div>
                          <p className="text-xs text-sky-400 font-medium mb-1.5 flex items-center gap-1"><Columns className="w-3 h-3" />Carrossel</p>
                          <div className="flex flex-wrap gap-2">
                            {carouselSlots.map(slot => (
                              <button key={slot.id} onClick={() => { setSelectedSlotId(slot.id); setPostType('carousel'); }} className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition flex items-center gap-2 ${selectedSlotId === slot.id ? 'bg-sky-500/20 border-sky-500/30 text-sky-400' : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}>
                                <Clock className="w-3.5 h-3.5" />{slot.time}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {scheduledAt && selectedSlotId && (
                      <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5" />
                        Agendado para {new Date(scheduledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })} ({POST_TYPE_CONFIG[postType].label})
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {scheduleMode === 'custom' && (
              <div>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition [color-scheme:dark]" />
                <p className="text-xs text-slate-600 mt-1">Deixe vazio para salvar como rascunho</p>
              </div>
            )}
          </div>

          {/* Approval required notice */}
          {reviewStatus !== 'approved' && (
            <div className="flex items-center gap-2 p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl text-xs text-slate-400">
              <Bot className="w-3.5 h-3.5 flex-shrink-0" />
              Aprove o conteudo acima antes de agendar o post.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-medium transition">Voltar</button>
            <button onClick={() => savePost(true)} disabled={saving} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-medium transition disabled:opacity-60">Salvar Rascunho</button>
            <button
              onClick={() => savePost(false)}
              disabled={
                saving ||
                !canSchedule ||
                (!scheduledAt && scheduleMode === 'custom') ||
                (scheduleMode === 'auto' && (!selectedDate || !selectedSlotId))
              }
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {saved ? <><Check className="w-4 h-4" /> Agendado!</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Send className="w-4 h-4" /> Agendar Post</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
