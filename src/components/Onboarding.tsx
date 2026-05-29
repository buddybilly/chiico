import { useState } from 'react';
import { Sparkles, Instagram, ArrowRight, Check, X, Zap, CalendarDays, Bot } from 'lucide-react';

interface Props {
  onComplete: () => void;
  onNavigate: (page: string) => void;
}

const STEPS = [
  {
    id: 'welcome',
    icon: Sparkles,
    color: 'text-sky-400',
    bg: 'bg-sky-500/15',
    border: 'border-sky-500/20',
    title: 'Bem-vindo ao PostFlow IA',
    desc: 'Seu assistente de conteudo para Instagram com inteligencia artificial. Em 2 passos voce estara pronto para criar e agendar posts incriveis.',
    action: null,
  },
  {
    id: 'instagram',
    icon: Instagram,
    color: 'text-pink-400',
    bg: 'bg-pink-500/15',
    border: 'border-pink-500/20',
    title: 'Conecte seu Instagram',
    desc: 'Conecte sua conta do Instagram Business para publicar e agendar posts diretamente pelo app.',
    action: 'settings',
    actionLabel: 'Conectar Instagram',
  },
  {
    id: 'create',
    icon: Zap,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/20',
    title: 'Crie seu primeiro post',
    desc: 'Agora e so descrever o assunto e deixar os 3 agentes Gemini gerarem tema, legenda e imagem automaticamente para voce.',
    action: 'create',
    actionLabel: 'Criar Primeiro Post',
  },
];

export default function Onboarding({ onComplete, onNavigate }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;
  const isLast = currentStep === STEPS.length - 1;

  function handleAction() {
    if (step.action === 'create') {
      onComplete();
      onNavigate('create');
    } else if (step.action === 'settings') {
      onNavigate('settings');
      if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
    } else {
      if (currentStep < STEPS.length - 1) setCurrentStep(c => c + 1);
    }
  }

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(c => c + 1);
    }
  }

  return (
    <div className="mb-8 bg-slate-800/70 border border-slate-700/60 rounded-2xl overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-slate-700/60">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`w-12 h-12 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${step.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Passo {currentStep + 1} de {STEPS.length}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-1.5">{step.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>

              <div className="flex items-center gap-3 mt-4">
                {step.action && (
                  <button
                    onClick={handleAction}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${step.bg} ${step.border} border ${step.color} hover:opacity-80`}
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                    {step.actionLabel}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${step.action ? 'text-slate-400 hover:text-white' : `bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20`}`}
                >
                  {isLast ? (
                    <><Check className="w-3.5 h-3.5" /> Concluir</>
                  ) : (
                    step.action ? 'Pular este passo' : <><ArrowRight className="w-3.5 h-3.5" /> Proximo</>
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setDismissed(true); onComplete(); }}
            className="p-1.5 text-slate-600 hover:text-slate-400 hover:bg-slate-700 rounded-lg transition flex-shrink-0"
            title="Fechar onboarding"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-slate-700/40">
          {STEPS.map((s, i) => {
            const SIcon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => setCurrentStep(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  i === currentStep
                    ? `${s.bg} ${s.color} border ${s.border}`
                    : i < currentStep
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-slate-600 hover:text-slate-400'
                }`}
              >
                {i < currentStep ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <SIcon className="w-3 h-3" />
                )}
                <span className="hidden sm:inline">{s.title.split(' ')[0]}</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-slate-600" />
            <CalendarDays className="w-3 h-3 text-slate-600" />
            <span className="text-xs text-slate-600">PostFlow IA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
