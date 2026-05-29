import { useState } from 'react';
import { supabase, PostType } from '../lib/supabase';
import { Image, Type, Hash, Send, Calendar, Check, Loader2, Film, Columns, RotateCcw, Upload, X, Plus, Clock } from 'lucide-react';

interface Props {
  userId: string;
  onDone: () => void;
}

const SAMPLE_IMAGES = [
  'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/11035580/pexels-photo-11035580.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/11035488/pexels-photo-11035488.jpeg?auto=compress&cs=tinysrgb&w=600',
];

export default function QuickEditor({ userId, onDone }: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtagInput, setHashtagInput] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [postType, setPostType] = useState<PostType>('carousel');
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setUploadedPreview(dataUrl);
      setImageUrl('');
      setCustomImageUrl('');
    };
    reader.readAsDataURL(file);
  }

  function addHashtag() {
    const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`;
    if (tag.length > 1 && !hashtags.includes(tag)) {
      setHashtags(prev => [...prev, tag]);
    }
    setHashtagInput('');
  }

  function removeHashtag(tag: string) {
    setHashtags(prev => prev.filter(h => h !== tag));
  }

  function reset() {
    setImageUrl('');
    setCustomImageUrl('');
    setUploadedPreview(null);
    setCaption('');
    setHashtags([]);
    setHashtagInput('');
    setScheduledAt('');
    setError('');
  }

  async function savePost(asDraft = false) {
    setSaving(true);
    setError('');
    const finalImage = uploadedPreview || customImageUrl || imageUrl;

    if (!caption.trim() && !finalImage) {
      setError('Adicione uma legenda ou imagem');
      setSaving(false);
      return;
    }

    const { error: dbErr } = await supabase.from('scheduled_posts').insert({
      user_id: userId,
      prompt: '[Edicao manual]',
      generated_caption: caption,
      image_url: finalImage,
      hashtags,
      post_type: postType,
      auto_slot: false,
      status: asDraft ? 'draft' : scheduledAt ? 'scheduled' : 'draft',
      scheduled_at: scheduledAt || null,
    });

    if (dbErr) {
      setError(dbErr.message);
    } else {
      setSaved(true);
      setTimeout(() => { onDone(); }, 1000);
    }
    setSaving(false);
  }

  const finalImageSrc = uploadedPreview || customImageUrl || imageUrl;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Edicao Manual</h2>
          <p className="text-slate-400 mt-1 text-sm">Edite imagem e legenda antes de enviar</p>
        </div>
        <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-2 rounded-xl border border-slate-700 hover:border-slate-500 transition">
          <RotateCcw className="w-3 h-3" />Limpar
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">{error}</div>
      )}

      {saved && (
        <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />Post salvo com sucesso!
        </div>
      )}

      <div className="space-y-5">
        {/* Image Section */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
            <Image className="w-4 h-4 text-sky-400" />Imagem
          </label>

          {finalImageSrc ? (
            <div className="relative">
              <img
                src={finalImageSrc}
                alt="Preview"
                className="w-full max-h-72 object-cover rounded-xl border border-slate-700"
              />
              <button
                onClick={() => { setUploadedPreview(null); setImageUrl(''); setCustomImageUrl(''); }}
                className="absolute top-2 right-2 p-1.5 bg-slate-900/80 text-slate-400 hover:text-red-400 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {SAMPLE_IMAGES.map(img => (
                <button key={img} onClick={() => { setImageUrl(img); setCustomImageUrl(''); setUploadedPreview(null); }} className="aspect-square rounded-xl overflow-hidden border-2 border-slate-700 hover:border-sky-500 transition">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/30 text-sm font-medium hover:bg-sky-500/25 transition cursor-pointer">
              <Upload className="w-4 h-4" />Upload
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            <input
              type="url"
              value={customImageUrl}
              onChange={e => { setCustomImageUrl(e.target.value); if (e.target.value) { setImageUrl(''); setUploadedPreview(null); } }}
              placeholder="Ou cole uma URL de imagem..."
              className="flex-1 bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition"
            />
          </div>
        </div>

        {/* Caption Section */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
            <Type className="w-4 h-4 text-emerald-400" />Legenda
          </label>
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            rows={5}
            placeholder="Escreva sua legenda aqui..."
            className="w-full bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition"
          />
          <p className="text-xs text-slate-600">{caption.length}/2200 caracteres</p>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4 text-sky-400" />Hashtags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {hashtags.map(tag => (
                <span key={tag} onClick={() => removeHashtag(tag)} className="px-3 py-1 bg-sky-500/15 text-sky-400 border border-sky-500/20 rounded-full text-xs font-medium cursor-pointer hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/20 transition" title="Clique para remover">{tag}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={hashtagInput} onChange={e => setHashtagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHashtag())} placeholder="Adicionar hashtag..." className="flex-1 bg-slate-900/60 border border-slate-600/50 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition" />
              <button onClick={addHashtag} className="px-4 py-2 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-xl text-sm font-medium hover:bg-sky-500/25 transition"><Plus className="w-4 h-4" /></button>
            </div>
          </div>
        </div>

        {/* Post Type & Schedule */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">Tipo de Post</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPostType('story')} className={`flex items-center gap-3 p-3 rounded-xl border transition ${postType === 'story' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
              <Film className="w-4 h-4" /><span className="text-sm font-medium">Story</span>
            </button>
            <button onClick={() => setPostType('carousel')} className={`flex items-center gap-3 p-3 rounded-xl border transition ${postType === 'carousel' ? 'bg-sky-500/15 border-sky-500/30 text-sky-400' : 'border-slate-700 text-slate-400 hover:text-white'}`}>
              <Columns className="w-4 h-4" /><span className="text-sm font-medium">Carrossel</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />Agendar (opcional)
            </label>
            <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} min={new Date().toISOString().slice(0, 16)} className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 transition [color-scheme:dark]" />
            <p className="text-xs text-slate-600 mt-1">Deixe vazio para salvar como rascunho</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => savePost(true)} disabled={saving || (!caption.trim() && !finalImageSrc)} className="px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-sm font-medium transition disabled:opacity-60">
            Salvar Rascunho
          </button>
          <button onClick={() => savePost(false)} disabled={saving || !scheduledAt || (!caption.trim() && !finalImageSrc)} className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold py-2.5 rounded-xl transition shadow-lg shadow-sky-500/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm">
            {saved ? <><Check className="w-4 h-4" />Salvo!</> : saving ? <><Loader2 className="w-4 h-4 animate-spin" />Salvando...</> : <><Send className="w-4 h-4" />Agendar Post</>}
          </button>
        </div>
      </div>
    </div>
  );
}
