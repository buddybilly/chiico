import { useState } from 'react';
import { Sparkles, Film, Workflow, ExternalLink, Bot, Image, Type, Zap, ArrowRight, Play, Video, Wand2 } from 'lucide-react';

interface Props {
  onNavigate: (page: 'create') => void;
}

const AI_TOOLS = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    desc: 'IA multimodal principal utilizada para geração de textos inteligentes, legendas, análises e ideias de conteúdo.',
    url: 'https://gemini.google.com',
    icon: Sparkles,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/25',
    hoverBg: 'hover:from-blue-500/20 hover:to-blue-600/20',
    gradient: 'from-blue-500/10 to-blue-600/10',
    capabilities: ['Texto', 'Legendas', 'Estratégia', 'Análise'],
  },
  {
    id: 'veo',
    name: 'Google Veo',
    desc: 'IA de geração de vídeos avançada do Google integrada para criação de conteúdos audiovisuais a partir de prompts.',
    url: 'https://labs.google/vfx?flow=veo',
    icon: Video,
    color: 'text-rose-400',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/25',
    hoverBg: 'hover:from-rose-500/20 hover:to-rose-600/20',
    gradient: 'from-rose-500/10 to-rose-600/10',
    capabilities: ['Vídeo', 'Cinematic', 'Prompt-to-Video', 'HD'],
  },
  {
    id: 'flow',
    name: 'Google Flow',
    desc: 'Ferramenta de IA do Google Labs utilizada para design, prototipagem e estruturação visual do fluxo de posts.',
    url: 'https://labs.google/flow',
    icon: Workflow,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/25',
    hoverBg: 'hover:from-emerald-500/20 hover:to-emerald-600/20',
    gradient: 'from-emerald-500/10 to-emerald-600/10',
    capabilities: ['Design', 'Protótipo', 'Fluxo', 'Colaboração'],
  },
];

const QUICK_PROMPTS = [
  { label: 'Legenda para Story', prompt: 'Crie uma legenda curta e impactante para um Story do Instagram sobre: ', type: 'story' as const },
  { label: 'Legenda para Carrossel', prompt: 'Crie uma legenda detalhada para um post carrossel do Instagram sobre: ', type: 'carousel' as const },
  { label: 'Prompt de imagem', prompt: 'Crie um prompt detalhado em ingles para gerar uma imagem profissional sobre: ', type: 'image' as const },
  { label: 'Prompt de video', prompt: 'Crie um prompt detalhado em ingles para gerar um video curto sobre: ', type: 'video' as const },
];

export default function AITools({ onNavigate }: Props) {
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-white">Ferramentas IA</h2>
        <p className="text-slate-400 mt-1 text-sm">Acesso rapido ao Gemini, Veo, Flow e prompts otimizados</p>
      </div>

      {/* Main AI Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {AI_TOOLS.map(tool => {
          const ToolIcon = tool.icon;
          return (
            <a
              key={tool.id}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`group bg-slate-800/60 border ${tool.border} rounded-2xl p-4 sm:p-6 flex sm:flex-col items-center sm:items-start gap-4 sm:gap-0 transition hover:border-opacity-60 ${tool.hoverBg}`}
            >
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${tool.bg} border ${tool.border} flex items-center justify-center flex-shrink-0 sm:mb-4 group-hover:scale-105 transition-transform`}>
                <ToolIcon className={`w-5 h-5 sm:w-6 sm:h-6 ${tool.color}`} />
              </div>
              <div className="flex-1 sm:flex-none">
                <h3 className="text-sm sm:text-base font-bold text-white sm:mb-1">{tool.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed hidden sm:block sm:mb-4">{tool.desc}</p>
                <div className="hidden sm:flex flex-wrap gap-1.5 mb-4">
                  {tool.capabilities.map(cap => (
                    <span key={cap} className={`text-[10px] px-2 py-0.5 rounded-full ${tool.bg} ${tool.color} border ${tool.border} font-medium`}>
                      {cap}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 group-hover:text-white transition">
                  <Play className="w-3 h-3" />
                  Abrir
                  <ExternalLink className="w-3 h-3" />
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Quick Prompts Section */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Prompts Rapidos</h3>
            <p className="text-xs text-slate-500">Copie prompts otimizados e use nas ferramentas de IA</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4">
          {QUICK_PROMPTS.map(qp => (
            <button
              key={qp.label}
              onClick={() => setSelectedPrompt(qp.prompt)}
              className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl border transition text-left ${
                selectedPrompt === qp.prompt
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                  : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
              }`}
            >
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                qp.type === 'story' ? 'bg-amber-500/15' : qp.type === 'carousel' ? 'bg-sky-500/15' : qp.type === 'image' ? 'bg-emerald-500/15' : 'bg-rose-500/15'
              }`}>
                {qp.type === 'story' ? <Film className="w-3.5 h-3.5 text-amber-400" /> :
                 qp.type === 'carousel' ? <Type className="w-3.5 h-3.5 text-sky-400" /> :
                 qp.type === 'image' ? <Image className="w-3.5 h-3.5 text-emerald-400" /> :
                 <Video className="w-3.5 h-3.5 text-rose-400" />}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium">{qp.label}</p>
                <p className="text-[9px] sm:text-[10px] opacity-60 hidden sm:block">Clique para selecionar</p>
              </div>
            </button>
          ))}
        </div>

        {selectedPrompt && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Complete o prompt</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Ex: lancamento de colecao de verao..."
                  className="flex-1 bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition"
                />
                <button
                  onClick={async () => {
                    const fullPrompt = selectedPrompt + customPrompt;
                    try { await navigator.clipboard.writeText(fullPrompt); } catch { /* fallback */ }
                  }}
                  disabled={!customPrompt.trim()}
                  className="px-4 sm:px-5 py-3 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl text-sm font-medium hover:bg-amber-500/25 transition disabled:opacity-60"
                >
                  Copiar Prompt
                </button>
              </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Preview:</p>
              <p className="text-sm text-slate-300 line-clamp-3">{selectedPrompt}<span className="text-amber-400">{customPrompt || '...'}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Manual Edit Quick Access */}
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-5">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Edicao Manual Rapida</h3>
            <p className="text-xs text-slate-500">Edite imagens e legendas antes de enviar</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={() => onNavigate('create')}
            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 hover:from-emerald-500/20 hover:to-teal-500/20 transition group text-left"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <Type className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Editar Legenda</p>
              <p className="text-xs text-slate-400">Crie ou edite legendas com IA</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-emerald-400 transition" />
          </button>

          <button
            onClick={() => onNavigate('create')}
            className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-xl bg-gradient-to-r from-sky-500/10 to-cyan-500/10 border border-sky-500/20 hover:from-sky-500/20 hover:to-cyan-500/20 transition group text-left"
          >
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-sky-500/20 flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
              <Image className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Editar Imagem</p>
              <p className="text-xs text-slate-400">Selecione ou gere imagens</p>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 transition" />
          </button>
        </div>
      </div>
    </div>
  );
}
