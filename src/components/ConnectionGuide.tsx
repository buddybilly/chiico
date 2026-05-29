import { useState } from 'react';
import {
  Instagram, Globe, Linkedin, CheckCircle2, XCircle, ChevronRight,
  ExternalLink, Eye, EyeOff, Save, Loader2, AlertCircle, ArrowLeft,
  Link, Check, Copy
} from 'lucide-react';

export type Platform = 'instagram' | 'google' | 'linkedin';

interface ConnectionValues {
  instagram_username: string;
  instagram_account_id: string;
  instagram_access_token: string;
  google_business_account_name: string;
  google_business_location_id: string;
  google_business_access_token: string;
  linkedin_username: string;
  linkedin_org_id: string;
  linkedin_access_token: string;
}

interface Props {
  platform: Platform;
  values: ConnectionValues;
  onChange: (updates: Partial<ConnectionValues>) => void;
  onSave: () => Promise<void>;
  saving: boolean;
  onConnectFacebook?: () => void;
  igConnecting?: boolean;
  igJustConnected?: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition"
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado!' : 'Copiar'}
    </button>
  );
}

function StepBadge({ n, done }: { n: number; done: boolean }) {
  if (done) {
    return (
      <span className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-slate-300">
      {n}
    </span>
  );
}

/* ─── INSTAGRAM ─────────────────────────────────────────────────────────── */

function InstagramGuide({ values, onChange, onSave, saving }: Omit<Props, 'platform'>) {
  const [step, setStep] = useState(1);
  const [showToken, setShowToken] = useState(false);

  const isConnected = !!(values.instagram_access_token && values.instagram_account_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3, 4].map(s => (
          <button key={s} onClick={() => setStep(s)}
            className={`flex-1 h-1.5 rounded-full transition ${step >= s ? 'bg-pink-500' : 'bg-slate-700'}`} />
        ))}
      </div>

      {/* Step 1 - Pre-requisitos */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Pre-requisitos</h4>
            <p className="text-xs text-slate-400">Confirme estes itens antes de comecar:</p>
          </div>
          <div className="space-y-2">
            {[
              {
                title: 'Conta Instagram Business ou Creator',
                desc: 'Va em Configuracoes > Conta > Mudar para conta profissional. Perfil pessoal nao e suportado pela API do Meta.',
              },
              {
                title: 'Pagina do Facebook vinculada ao Instagram',
                desc: 'No Instagram: Configuracoes > Contas vinculadas > Facebook. Vincule sua Pagina do Facebook (nao o perfil pessoal).',
              },
              {
                title: 'Voce e Administrador da Pagina do Facebook',
                desc: 'Sua conta precisa ter papel de Administrador na Pagina vinculada para autorizar o acesso via API.',
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-3 p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold rounded-xl transition">
              Tenho tudo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 - Graph Explorer: gerar token de usuario */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 2: Gerar token no Graph Explorer</h4>
            <p className="text-xs text-slate-400">Ferramenta oficial do Meta — nao precisa criar app proprio.</p>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">1. Abra o Graph API Explorer</p>
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 transition font-medium">
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">Faca login com a conta Facebook que e admin da Pagina vinculada ao seu Instagram.</p>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-1.5">
              <p className="text-xs font-semibold text-white">2. Configure no canto superior direito</p>
              <ul className="space-y-1 text-xs text-slate-500 list-disc list-inside">
                <li><strong className="text-slate-300">Meta App:</strong> selecione qualquer app listado (ou "Meta App")</li>
                <li><strong className="text-slate-300">User or Page:</strong> selecione sua <strong className="text-slate-300">Pagina do Facebook</strong> (nao perfil pessoal)</li>
              </ul>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">3. Adicione as permissoes clicando em "Add a Permission"</p>
              <div className="grid grid-cols-1 gap-1">
                {['pages_show_list', 'instagram_basic', 'instagram_content_publish', 'pages_read_engagement', 'business_management'].map(p => (
                  <div key={p} className="flex items-center gap-2 bg-slate-800 rounded-lg px-2.5 py-1.5">
                    <code className="text-xs text-pink-300 flex-1">{p}</code>
                    <CopyButton text={p} />
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-1.5">
              <p className="text-xs font-semibold text-white">4. Clique em "Generate Access Token"</p>
              <p className="text-xs text-slate-500">Autorize todas as permissoes solicitadas. O token aparece no campo "Access Token" no topo. <strong className="text-slate-300">Copie e guarde ele</strong> — voce vai usar nos proximos passos.</p>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={() => setStep(3)} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold rounded-xl transition">
              Tenho o token <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 - Pegar o Page Token permanente e o Instagram Account ID */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 3: Pegar o Page Token permanente + Account ID</h4>
            <p className="text-xs text-slate-400">O token gerado pelo Explorer expira em 1h. Vamos pegar o <strong className="text-white">token da Pagina</strong> que nao expira.</p>
          </div>

          <div className="space-y-2">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">1. Ainda no Graph Explorer, cole esta query e clique Submit:</p>
              <div className="flex items-start gap-2 bg-slate-800 rounded-lg px-3 py-2">
                <code className="text-xs text-pink-300 flex-1 break-all leading-relaxed">
                  me/accounts?fields=access_token,id,name,instagram_business_account{'{'}id,username{'}'}
                </code>
                <CopyButton text="me/accounts?fields=access_token,id,name,instagram_business_account{id,username}" />
              </div>
              <p className="text-xs text-slate-500">Certifique-se que em "User or Page" esta selecionado <strong className="text-slate-300">User Token</strong> (nao Page).</p>
            </div>

            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">2. Na resposta JSON, copie estes dois valores:</p>
              <div className="bg-slate-800 rounded-lg px-3 py-2.5 text-xs font-mono leading-relaxed">
                <span className="text-slate-500">{'{'} "data": [{'{'}</span><br />
                <span className="text-slate-500">&nbsp;&nbsp;"name": "Sua Pagina FB",</span><br />
                <span className="text-amber-300">&nbsp;&nbsp;"access_token": "<strong>EAAxxxxx...</strong>",</span>
                <span className="text-amber-400 ml-2 font-sans text-[10px]">← Page Token (permanente!)</span><br />
                <span className="text-slate-500">&nbsp;&nbsp;"instagram_business_account": {'{'}</span><br />
                <span className="text-pink-300">&nbsp;&nbsp;&nbsp;&nbsp;"id": "<strong>17841xxxxxxxxx</strong>",</span>
                <span className="text-pink-400 ml-2 font-sans text-[10px]">← Account ID</span><br />
                <span className="text-pink-300">&nbsp;&nbsp;&nbsp;&nbsp;"username": "<strong>seuperfil</strong>"</span><br />
                <span className="text-slate-500">&nbsp;&nbsp;{'}'}</span><br />
                <span className="text-slate-500">{'}'}]{'}'}</span>
              </div>
              <div className="flex gap-3 mt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 flex-shrink-0" />
                  <span className="text-xs text-slate-400"><strong className="text-amber-300">access_token</strong> = seu token da Pagina (nao expira)</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-pink-400 flex-shrink-0" />
                <span className="text-xs text-slate-400"><strong className="text-pink-300">instagram_business_account.id</strong> = Account ID do Instagram</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={() => setStep(4)} className="flex items-center gap-1.5 px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold rounded-xl transition">
              Tenho os dados <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4 - Inserir credenciais */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 4: Inserir e salvar</h4>
            {isConnected && (
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-400 font-medium">
                  Instagram conectado!{values.instagram_username && ` — @${values.instagram_username}`}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Usuario Instagram <span className="text-slate-600">(sem @)</span>
              </label>
              <input
                type="text"
                value={values.instagram_username}
                onChange={e => onChange({ instagram_username: e.target.value })}
                placeholder="seuperfil"
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Instagram Account ID <span className="text-slate-600">(campo <code className="bg-slate-800 px-1 rounded">instagram_business_account.id</code>)</span>
              </label>
              <input
                type="text"
                value={values.instagram_account_id}
                onChange={e => onChange({ instagram_account_id: e.target.value })}
                placeholder="17841xxxxxxxxx"
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Page Access Token <span className="text-slate-600">(campo <code className="bg-slate-800 px-1 rounded">access_token</code> da Pagina — nao expira)</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={values.instagram_access_token}
                  onChange={e => onChange({ instagram_access_token: e.target.value })}
                  placeholder="EAAxxxxxx..."
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/40 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1">Use o token da <strong className="text-slate-500">Pagina</strong> (campo access_token da query), nao o User Token do topo do Explorer.</p>
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 w-full justify-center py-3 bg-pink-600 hover:bg-pink-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar e conectar
            </button>
          </div>

          <div className="flex justify-start">
            <button onClick={() => setStep(3)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── GOOGLE BUSINESS ────────────────────────────────────────────────────── */

function GoogleGuide({ values, onChange, onSave, saving }: Omit<Props, 'platform'>) {
  const [step, setStep] = useState(1);
  const [showToken, setShowToken] = useState(false);

  const isConnected = !!(values.google_business_access_token && values.google_business_location_id);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3, 4].map(s => (
          <button key={s} onClick={() => setStep(s)} className={`flex-1 h-1.5 rounded-full transition ${step >= s ? 'bg-emerald-500' : 'bg-slate-700'}`} />
        ))}
      </div>

      {/* Step 1 - Criar projeto no Google Cloud */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 1: Google Cloud Console</h4>
            <p className="text-xs text-slate-400">Voce precisa criar um projeto e habilitar as APIs necessarias.</p>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">1. Acesse o Google Cloud Console</p>
                <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition">
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">Faca login com a conta Google que gerencia seu negocio.</p>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">2. Crie um novo projeto</p>
              <p className="text-xs text-slate-500">No menu superior, clique em "Selecionar projeto" &rarr; "Novo projeto". Dê um nome como "Social Media Manager".</p>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">3. Habilite as APIs necessarias</p>
                <a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition">
                  Biblioteca de APIs <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">Busque e ative as seguintes APIs:</p>
              <div className="space-y-1">
                {['My Business Business Information API', 'My Business Account Management API', 'My Business Notifications API'].map(api => (
                  <div key={api} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0" /> {api}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition">
              Proximo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 - Credenciais OAuth */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 2: Criar credenciais OAuth 2.0</h4>
            <p className="text-xs text-slate-400">Necessario para gerar o token de acesso.</p>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">1. Acesse Credenciais</p>
                <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition">
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">Clique em "+ Criar credenciais" &rarr; "ID do cliente OAuth 2.0".</p>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">2. Configure o tipo de aplicativo</p>
              <p className="text-xs text-slate-500">Selecione "Aplicativo da Web". Em "URIs de redirecionamento autorizados" adicione:</p>
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                <code className="text-xs text-emerald-300 flex-1 break-all">https://developers.google.com/oauthplayground</code>
                <CopyButton text="https://developers.google.com/oauthplayground" />
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">3. Anote Client ID e Client Secret</p>
              <p className="text-xs text-slate-500">Voce vai precisar deles no proximo passo.</p>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={() => setStep(3)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition">
              Proximo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 - Gerar token no OAuth Playground */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 3: Gerar token no OAuth Playground</h4>
            <p className="text-xs text-slate-400">Vamos usar o OAuth Playground do Google para gerar um access token.</p>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">1. Abra o OAuth Playground</p>
                <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition">
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">2. Configure com suas credenciais</p>
              <p className="text-xs text-slate-500">Clique no icone de configuracoes (engrenagem no canto superior direito). Marque "Use your own OAuth credentials" e insira seu Client ID e Client Secret.</p>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">3. Autorize os escopos necessarios</p>
              <p className="text-xs text-slate-500">No campo de busca, pesquise "mybusiness" e selecione:</p>
              <div className="space-y-1">
                {[
                  'https://www.googleapis.com/auth/business.manage',
                ].map(scope => (
                  <div key={scope} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                    <code className="text-xs text-emerald-300 flex-1 break-all">{scope}</code>
                    <CopyButton text={scope} />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">4. Troque o codigo pelo token</p>
              <p className="text-xs text-slate-500">Clique "Authorize APIs" &rarr; "Exchange authorization code for tokens". Copie o <strong className="text-white">Access token</strong> gerado.</p>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={() => setStep(4)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition">
              Tenho o token <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4 - Inserir dados */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 4: Inserir suas credenciais</h4>
            {isConnected && (
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-400 font-medium">Google Business conectado! {values.google_business_account_name && `— ${values.google_business_account_name}`}</p>
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-300">Como encontrar o Location ID</p>
              <p className="text-xs text-amber-300/70 mt-0.5">Acesse <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer" className="underline">business.google.com</a>, selecione seu negocio, e na URL voce vera algo como <code className="bg-amber-900/30 px-1 rounded">locations/XXXXXXXXXX</code>. Copie esse valor completo.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Nome da Empresa</label>
              <input type="text" value={values.google_business_account_name} onChange={e => onChange({ google_business_account_name: e.target.value })} placeholder="Minha Empresa Ltda"
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Location ID</label>
              <input type="text" value={values.google_business_location_id} onChange={e => onChange({ google_business_location_id: e.target.value })} placeholder="locations/xxxxxxxxxx"
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Access Token (do OAuth Playground)</label>
              <div className="relative">
                <input type={showToken ? 'text' : 'password'} value={values.google_business_access_token} onChange={e => onChange({ google_business_access_token: e.target.value })} placeholder="ya29.xxxxxx..."
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition" />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="button" onClick={onSave} disabled={saving}
              className="flex items-center gap-2 w-full justify-center py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar e conectar
            </button>
          </div>

          <div className="flex justify-start">
            <button onClick={() => setStep(3)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LINKEDIN ───────────────────────────────────────────────────────────── */

function LinkedInGuide({ values, onChange, onSave, saving }: Omit<Props, 'platform'>) {
  const [step, setStep] = useState(1);
  const [showToken, setShowToken] = useState(false);

  const isConnected = !!(values.linkedin_access_token);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        {[1, 2, 3].map(s => (
          <button key={s} onClick={() => setStep(s)} className={`flex-1 h-1.5 rounded-full transition ${step >= s ? 'bg-sky-500' : 'bg-slate-700'}`} />
        ))}
      </div>

      {/* Step 1 - Criar app no LinkedIn */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 1: Criar app no LinkedIn</h4>
            <p className="text-xs text-slate-400">Voce precisa de um app no LinkedIn Developers para obter um token OAuth.</p>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">1. Acesse o LinkedIn Developers</p>
                <a href="https://www.linkedin.com/developers/apps/new" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition">
                  Criar app <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">Faca login com sua conta LinkedIn e crie um novo aplicativo.</p>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">2. Preencha as informacoes do app</p>
              <div className="space-y-1.5 text-xs text-slate-500">
                <p><strong className="text-slate-300">App name:</strong> qualquer nome (ex: "Social Scheduler")</p>
                <p><strong className="text-slate-300">LinkedIn Page:</strong> selecione sua pagina de empresa</p>
                <p><strong className="text-slate-300">App logo:</strong> pode usar qualquer imagem</p>
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">3. Solicite os produtos necessarios</p>
              <p className="text-xs text-slate-500">Na aba <strong className="text-slate-300">Products</strong>, solicite acesso a:</p>
              <div className="space-y-1">
                {['Share on LinkedIn', 'Sign In with LinkedIn using OpenID Connect'].map(product => (
                  <div key={product} className="flex items-center gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="w-3 h-3 text-sky-400 flex-shrink-0" /> {product}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-600">Pode levar alguns minutos para ser aprovado.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setStep(2)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl transition">
              Proximo <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 - Gerar token OAuth */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 2: Gerar token OAuth</h4>
            <p className="text-xs text-slate-400">Use a ferramenta de teste de tokens do proprio LinkedIn.</p>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">1. Va para a aba "Auth" do seu app</p>
                <a href="https://www.linkedin.com/developers/apps" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition">
                  Meus apps <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">Selecione seu app e clique na aba <strong className="text-slate-300">Auth</strong>.</p>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">2. Adicione a URL de redirecionamento</p>
              <p className="text-xs text-slate-500">Em "OAuth 2.0 Settings", adicione em "Authorized redirect URLs":</p>
              <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
                <code className="text-xs text-sky-300 flex-1">https://www.linkedin.com/developers/tools/oauth/redirect</code>
                <CopyButton text="https://www.linkedin.com/developers/tools/oauth/redirect" />
              </div>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">3. Use o Token Generator</p>
                <a href="https://www.linkedin.com/developers/tools/oauth/token-generator" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition">
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-slate-500">Selecione seu app, marque os escopos <code className="bg-slate-800 px-1 rounded">w_member_social</code> e <code className="bg-slate-800 px-1 rounded">r_liteprofile</code>, e clique em "Request access token".</p>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-700/30 space-y-2">
              <p className="text-xs font-semibold text-white">4. Para pagina de empresa</p>
              <p className="text-xs text-slate-500">Adicione o escopo <code className="bg-slate-800 px-1 rounded">w_organization_social</code> e obtenha o Organization ID na URL da pagina da empresa no LinkedIn (numero no final).</p>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={() => setStep(3)} className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl transition">
              Tenho o token <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3 - Inserir dados */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white mb-1">Passo 3: Inserir suas credenciais</h4>
            {isConnected && (
              <div className="flex items-center gap-2 mt-2 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-xs text-emerald-400 font-medium">LinkedIn conectado! {values.linkedin_username && `— ${values.linkedin_username}`}</p>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Usuario ou Nome da Pagina</label>
              <input type="text" value={values.linkedin_username} onChange={e => onChange({ linkedin_username: e.target.value })} placeholder="@seuperfil ou Empresa SA"
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Organization ID <span className="text-slate-600 font-normal">(opcional — so para publicar em pagina de empresa)</span>
              </label>
              <input type="text" value={values.linkedin_org_id} onChange={e => onChange({ linkedin_org_id: e.target.value })} placeholder="urn:li:organization:xxxxxxxx"
                className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Access Token</label>
              <div className="relative">
                <input type={showToken ? 'text' : 'password'} value={values.linkedin_access_token} onChange={e => onChange({ linkedin_access_token: e.target.value })} placeholder="AQV..."
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/40 transition" />
                <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1">O token do LinkedIn expira em 60 dias. Voce precisara renovar apos esse periodo.</p>
            </div>
            <button type="button" onClick={onSave} disabled={saving}
              className="flex items-center gap-2 w-full justify-center py-3 bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar e conectar
            </button>
          </div>
          <div className="flex justify-start">
            <button onClick={() => setStep(2)} className="flex items-center gap-1 px-3 py-2 text-slate-400 hover:text-white text-sm transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── EXPORT PRINCIPAL ───────────────────────────────────────────────────── */

export default function ConnectionGuide(props: Props) {
  const { platform, ...rest } = props;

  if (platform === 'instagram') return <InstagramGuide {...rest} />;
  if (platform === 'google') return <GoogleGuide {...rest} />;
  if (platform === 'linkedin') return <LinkedInGuide {...rest} />;
  return null;
}
