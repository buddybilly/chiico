import { useEffect, useState, useCallback } from 'react';
import { supabase, UserSettings, GptAgent, AgentRole } from '../lib/supabase';
import {
  Instagram, Save, Check, Loader2, Bot, Sparkles,
  Type, Image, Plus, Trash2, ChevronDown, ChevronUp, Globe, Linkedin, Link,
  CheckCircle2, AlertCircle, XCircle
} from 'lucide-react';
import ConnectionGuide, { Platform } from './ConnectionGuide';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const FB_APP_ID = '848251645022190';
const FB_SCOPES = 'pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,business_management';

interface Props {
  userId: string;
}

const DEFAULT_AGENTS: { role: AgentRole; name: string; system_prompt: string; model: string; temperature: number }[] = [
  {
    role: 'theme',
    name: 'Agente de Temas',
    system_prompt: 'Voce e um estrategista de conteudo para Instagram. Dado um assunto, crie um tema especifico e envolvente para um post. Responda SOMENTE com o tema em texto plano, sem JSON. Maximo 200 palavras.',
    model: 'gemini-2.0-flash',
    temperature: 0.9,
  },
  {
    role: 'caption',
    name: 'Agente de Legendas',
    system_prompt: 'Voce e um especialista em marketing digital e redes sociais. Crie legendas envolventes para o Instagram em portugues brasileiro. Responda SOMENTE com JSON valido: {"caption": "...", "hashtags": ["#tag1", "#tag2"]}. Inclua 5-15 hashtags. Legenda maximo 2200 caracteres.',
    model: 'gemini-2.0-flash',
    temperature: 0.8,
  },
  {
    role: 'image',
    name: 'Agente de Imagens',
    system_prompt: 'Voce e um especialista em prompt engineering para geracao de imagens. Crie um prompt detalhado em ingles para gerar uma imagem profissional para Instagram. Responda SOMENTE com JSON: {"image_prompt": "...", "style": "..."}. O prompt deve descrever composicao, iluminacao, cores e estilo.',
    model: 'gemini-2.0-flash',
    temperature: 0.7,
  },
];

const ROLE_CONFIG: Record<AgentRole, { icon: typeof Bot; color: string; bg: string; border: string; label: string; desc: string }> = {
  theme: { icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/20', label: 'Agente de Temas', desc: 'Gera ideias e temas de postagens' },
  caption: { icon: Type, color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/20', label: 'Agente de Legendas', desc: 'Cria legendas e hashtags engajantes' },
  image: { icon: Image, color: 'text-sky-400', bg: 'bg-sky-500/15', border: 'border-sky-500/20', label: 'Agente de Imagens', desc: 'Gera prompts de imagem com Gemini' },
};

const MODELS = [
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (rapido, economico)' },
  { id: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash Thinking (raciocinio)' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (balanceado)' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (mais capacidade)' },
];

const PLATFORM_CONFIG = [
  {
    key: 'instagram' as Platform,
    label: 'Instagram',
    sublabel: 'Business / Creator',
    Icon: Instagram,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    activeBorder: 'border-pink-500/50',
    ring: 'ring-pink-500/20',
    disabled: false,
  },
  {
    key: 'google' as Platform,
    label: 'Google Business',
    sublabel: 'My Business Profile',
    Icon: Globe,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    activeBorder: 'border-emerald-500/50',
    ring: 'ring-emerald-500/20',
    disabled: false,
  },
  {
    key: 'linkedin' as Platform,
    label: 'LinkedIn',
    sublabel: 'Em breve',
    Icon: Linkedin,
    color: 'text-slate-500',
    bg: 'bg-slate-700/30',
    border: 'border-slate-700/30',
    activeBorder: 'border-slate-600/30',
    ring: 'ring-slate-600/10',
    disabled: true,
  },
];

export default function Settings({ userId }: Props) {
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    instagram_access_token: '',
    instagram_account_id: '',
    instagram_username: '',
    google_business_access_token: '',
    google_business_location_id: '',
    google_business_account_name: '',
    linkedin_access_token: '',
    linkedin_org_id: '',
    linkedin_username: '',
  });
  const [agents, setAgents] = useState<GptAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<AgentRole | null>(null);
  const [savingAgent, setSavingAgent] = useState<string | null>(null);
  const [igConnecting, setIgConnecting] = useState(false);
  const [igJustConnected, setIgJustConnected] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform | null>(null);

  const igConnected = !!(settings.instagram_access_token && settings.instagram_account_id);
  const gbConnected = !!(settings.google_business_access_token && settings.google_business_location_id);
  const liConnected = !!(settings.linkedin_access_token);

  const isConnected = (p: Platform) => p === 'instagram' ? igConnected : p === 'google' ? gbConnected : liConnected;

  const connectFacebook = useCallback(() => {
    const redirectUri = `${SUPABASE_URL}/functions/v1/facebook-oauth?action=callback`;
    // state = "userId|appUrl" so callback can redirect back to the app
    const appUrl = window.location.origin + window.location.pathname;
    const state = `${userId}|${appUrl}`;
    const fbUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(FB_SCOPES)}&state=${encodeURIComponent(state)}&response_type=code`;

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (isMobile) {
      // Mobile: full-page redirect — Facebook redirects back to app with params
      window.location.href = fbUrl;
      return;
    }

    // Desktop: popup flow
    const popup = window.open(fbUrl, 'fb_oauth', 'width=600,height=700,scrollbars=yes');
    setIgConnecting(true);

    const handler = async (event: MessageEvent) => {
      if (event.data?.type === 'FB_OAUTH_SUCCESS') {
        window.removeEventListener('message', handler);
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/facebook-oauth?action=exchange`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
            body: JSON.stringify({ short_token: event.data.token, user_id: userId }),
          });
          const data = await res.json();
          if (data.success) {
            setSettings(prev => ({
              ...prev,
              instagram_access_token: data.token || prev.instagram_access_token,
              instagram_account_id: data.instagram_account_id || prev.instagram_account_id,
              instagram_username: data.instagram_username || prev.instagram_username,
            }));
            setIgJustConnected(true);
            setTimeout(() => setIgJustConnected(false), 4000);
          }
        } catch { /* keep manual fields editable */ }
        setIgConnecting(false);
      } else if (event.data?.type === 'FB_OAUTH_ERROR') {
        window.removeEventListener('message', handler);
        setIgConnecting(false);
      }
    };

    window.addEventListener('message', handler);
    const timer = setInterval(() => {
      if (popup?.closed) { clearInterval(timer); window.removeEventListener('message', handler); setIgConnecting(false); }
    }, 500);
  }, [userId]);

  useEffect(() => {
    async function load() {
      const [settingsRes, agentsRes] = await Promise.all([
        supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('gpt_agents').select('*').eq('user_id', userId).order('role'),
      ]);

      if (settingsRes.data) setSettings(settingsRes.data as UserSettings);

      if (agentsRes.data && agentsRes.data.length > 0) {
        setAgents(agentsRes.data as GptAgent[]);
      } else {
        const newAgents = DEFAULT_AGENTS.map(a => ({ ...a, user_id: userId, is_active: true }));
        const { data: created } = await supabase.from('gpt_agents').insert(newAgents).select();
        if (created) setAgents(created as GptAgent[]);
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  async function save() {
    setSaving(true);
    const { data: existing } = await supabase.from('user_settings').select('id').eq('user_id', userId).maybeSingle();
    const payload = { ...settings, user_id: userId, updated_at: new Date().toISOString() };
    if (existing) {
      await supabase.from('user_settings').update(payload).eq('user_id', userId);
    } else {
      await supabase.from('user_settings').insert(payload);
    }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  }

  async function saveAgent(agent: GptAgent) {
    setSavingAgent(agent.id);
    const { error } = await supabase.from('gpt_agents').update({
      name: agent.name, system_prompt: agent.system_prompt, model: agent.model,
      temperature: agent.temperature, is_active: agent.is_active, updated_at: new Date().toISOString(),
    }).eq('id', agent.id);
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSavingAgent(null);
  }

  async function deleteAgent(id: string) {
    await supabase.from('gpt_agents').delete().eq('id', id);
    setAgents(prev => prev.filter(a => a.id !== id));
  }

  async function addAgent(role: AgentRole) {
    const defaults = DEFAULT_AGENTS.find(a => a.role === role);
    if (!defaults) return;
    const { data } = await supabase.from('gpt_agents').insert({
      ...defaults, user_id: userId,
      name: `${defaults.name} ${agents.filter(a => a.role === role).length + 1}`,
    }).select();
    if (data) { setAgents(prev => [...prev, ...(data as GptAgent[])]); setExpandedAgent(role); }
  }

  function updateAgent(id: string, updates: Partial<GptAgent>) {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
      </div>
    );
  }

  const connectionValues = {
    instagram_username: settings.instagram_username || '',
    instagram_account_id: settings.instagram_account_id || '',
    instagram_access_token: settings.instagram_access_token || '',
    google_business_account_name: settings.google_business_account_name || '',
    google_business_location_id: settings.google_business_location_id || '',
    google_business_access_token: settings.google_business_access_token || '',
    linkedin_username: settings.linkedin_username || '',
    linkedin_org_id: settings.linkedin_org_id || '',
    linkedin_access_token: settings.linkedin_access_token || '',
  };

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Configuracoes</h2>
        <p className="text-slate-400 mt-1 text-sm">Configure integracoes e seus agentes Gemini</p>
      </div>

      {saved && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-xl border bg-emerald-500/15 text-emerald-400 border-emerald-500/30 flex items-center gap-2">
          <Check className="w-4 h-4" /> Salvo!
        </div>
      )}

      {/* Conexoes de plataformas */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
            <Link className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Conexoes de Plataformas</h3>
            <p className="text-xs text-slate-500">Clique em uma plataforma para conectar passo a passo</p>
          </div>
        </div>

        {/* Cards de selecao */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 mb-4">
          {PLATFORM_CONFIG.map(({ key, label, sublabel, Icon, color, bg, border, activeBorder, ring, disabled }) => {
            const connected = isConnected(key);
            const active = activePlatform === key;
            return (
              <button
                key={key}
                onClick={() => !disabled && setActivePlatform(active ? null : key)}
                disabled={disabled}
                className={`flex flex-col items-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-2xl border transition-all text-center relative overflow-hidden
                  ${disabled
                    ? 'opacity-50 cursor-not-allowed bg-slate-800/30 border-slate-700/30'
                    : active
                      ? `${bg} ${activeBorder} ring-2 ${ring}`
                      : 'bg-slate-800/60 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'
                  }`}
              >
                {/* Status badge */}
                {!disabled && (
                  <div className={`absolute top-2 right-2 flex items-center ${connected ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {connected
                      ? <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      : <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    }
                  </div>
                )}

                <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-[11px] sm:text-xs font-semibold text-white leading-tight">{label}</p>
                  <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">{sublabel}</p>
                </div>
                {!disabled && (
                  <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-full
                    ${connected
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                    }`}>
                    {connected ? 'Conectado' : active ? 'Configurando...' : 'Conectar'}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Painel do guia */}
        {activePlatform && (
          <div className={`rounded-2xl border overflow-hidden transition-all
            ${activePlatform === 'instagram' ? 'bg-slate-800/70 border-pink-500/20' : ''}
            ${activePlatform === 'google' ? 'bg-slate-800/70 border-emerald-500/20' : ''}
            ${activePlatform === 'linkedin' ? 'bg-slate-800/70 border-sky-500/20' : ''}
          `}>
            {/* Header do painel */}
            <div className={`flex items-center gap-3 px-5 py-4 border-b
              ${activePlatform === 'instagram' ? 'border-pink-500/15' : ''}
              ${activePlatform === 'google' ? 'border-emerald-500/15' : ''}
              ${activePlatform === 'linkedin' ? 'border-sky-500/15' : ''}
            `}>
              {PLATFORM_CONFIG.filter(p => p.key === activePlatform).map(({ label, Icon, color, bg, border }) => (
                <div key={label} className="flex items-center gap-3 flex-1">
                  <div className={`w-8 h-8 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="text-xs text-slate-500">
                      {isConnected(activePlatform) ? 'Configurado e pronto para publicar' : 'Siga o guia abaixo para conectar'}
                    </p>
                  </div>
                </div>
              ))}
              {isConnected(activePlatform) && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Conectado
                </div>
              )}
            </div>

            {/* Conteudo do guia */}
            <div className="p-5">
              <ConnectionGuide
                platform={activePlatform}
                values={connectionValues}
                onChange={(updates) => setSettings(prev => ({ ...prev, ...updates }))}
                onSave={save}
                saving={saving}
                onConnectFacebook={connectFacebook}
                igConnecting={igConnecting}
                igJustConnected={igJustConnected}
              />
            </div>
          </div>
        )}

        {/* Prompt inicial quando nenhuma plataforma esta selecionada */}
        {!activePlatform && (
          <div className="flex items-center gap-3 p-4 bg-slate-800/30 border border-slate-700/30 rounded-xl">
            <AlertCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
            <p className="text-xs text-slate-500">Selecione uma plataforma acima para ver o guia de conexao passo a passo.</p>
          </div>
        )}
      </div>

      {/* Agentes Gemini */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Seus Agentes Gemini</h3>
            <p className="text-xs text-slate-500">3 agentes trabalham em pipeline: Tema &rarr; Legenda &rarr; Imagem</p>
          </div>
        </div>

        <div className="space-y-3">
          {(['theme', 'caption', 'image'] as AgentRole[]).map(role => {
            const roleAgents = agents.filter(a => a.role === role);
            const cfg = ROLE_CONFIG[role];
            const RoleIcon = cfg.icon;
            const isExpanded = expandedAgent === role;

            return (
              <div key={role} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedAgent(isExpanded ? null : role)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-700/20 transition"
                >
                  <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
                    <RoleIcon className={`w-4 h-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">{cfg.label}</p>
                    <p className="text-xs text-slate-500">{roleAgents.length} agente{roleAgents.length !== 1 ? 's' : ''} &middot; {cfg.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {roleAgents.length > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${roleAgents[0].is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>
                        {roleAgents.filter(a => a.is_active).length} ativo{roleAgents.filter(a => a.is_active).length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-700/50 p-5 space-y-4">
                    {roleAgents.map(agent => (
                      <div key={agent.id} className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            value={agent.name}
                            onChange={e => updateAgent(agent.id, { name: e.target.value })}
                            className="bg-transparent text-sm font-semibold text-white border-b border-transparent hover:border-slate-600 focus:border-sky-500 focus:outline-none transition"
                          />
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <span className="text-xs text-slate-500">Ativo</span>
                              <button
                                onClick={() => updateAgent(agent.id, { is_active: !agent.is_active })}
                                className={`w-8 h-4 rounded-full transition relative ${agent.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`}
                              >
                                <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${agent.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                              </button>
                            </label>
                            <button
                              onClick={() => saveAgent(agent)}
                              disabled={savingAgent === agent.id}
                              className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded-lg transition"
                            >
                              {savingAgent === agent.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            </button>
                            {roleAgents.length > 1 && (
                              <button
                                onClick={() => deleteAgent(agent.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Prompt do Sistema</label>
                          <textarea
                            value={agent.system_prompt}
                            onChange={e => updateAgent(agent.id, { system_prompt: e.target.value })}
                            rows={4}
                            className="w-full bg-slate-900/60 border border-slate-700/50 text-white placeholder-slate-600 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500/30 transition"
                            placeholder="Instrucoes que definem o comportamento do agente..."
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Modelo</label>
                            <select
                              value={agent.model}
                              onChange={e => updateAgent(agent.id, { model: e.target.value })}
                              className="w-full bg-slate-900/60 border border-slate-700/50 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition"
                            >
                              {MODELS.map(m => (
                                <option key={m.id} value={m.id}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Criatividade: {agent.temperature.toFixed(1)}</label>
                            <input
                              type="range" min="0" max="2" step="0.1"
                              value={agent.temperature}
                              onChange={e => updateAgent(agent.id, { temperature: parseFloat(e.target.value) })}
                              className="w-full mt-1.5 accent-sky-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>Preciso</span>
                              <span>Criativo</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => addAgent(role)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-sky-500/50 hover:bg-sky-500/5 text-xs font-medium transition w-full justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar outro agente de {cfg.label.toLowerCase().replace('agente de ', '')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <strong className="text-slate-400">Pipeline de agentes:</strong> Quando voce cria um post, os 3 agentes trabalham em sequencia usando Gemini. O Agente de Temas recebe seu prompt e gera um tema. O Agente de Legendas recebe o tema e cria a legenda + hashtags. O Agente de Imagens recebe a legenda e gera um prompt detalhado para geracao de imagem. Voce pode personalizar o prompt de cada agente acima.
        </p>
      </div>
    </div>
  );
}
