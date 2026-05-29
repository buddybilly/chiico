import { useState, useRef, useCallback } from 'react';
import { Grid3x3, Grid2x2, Upload, Download, RotateCcw, ZoomIn, Image as ImageIcon, LayoutGrid, Rows3, Square, Smartphone, Crop, CheckCircle2 } from 'lucide-react';

type GridLayout = '1x1' | '2x2' | '3x1' | '3x3';
type AspectFormat = 'square' | '9:16' | '3:4';

interface GridConfig {
  id: GridLayout;
  label: string;
  cols: number;
  rows: number;
  icon: typeof Grid3x3;
}

interface AspectConfig {
  id: AspectFormat;
  label: string;
  desc: string;
  w: number;
  h: number;
  icon: typeof Smartphone;
}

const GRID_OPTIONS: GridConfig[] = [
  { id: '3x3', label: '3x3 (9 fatias)', cols: 3, rows: 3, icon: Grid3x3 },
  { id: '2x2', label: '2x2 (4 fatias)', cols: 2, rows: 2, icon: Grid2x2 },
  { id: '3x1', label: '3x1 (carrossel)', cols: 3, rows: 1, icon: Rows3 },
  { id: '1x1', label: '1x1 (quadrado)', cols: 1, rows: 1, icon: Square },
];

const ASPECT_OPTIONS: AspectConfig[] = [
  { id: 'square', label: '1:1 Quadrado', desc: 'Feed padrao', w: 1080, h: 1080, icon: Square },
  { id: '3:4', label: '3:4 Retrato', desc: 'Feed vertical', w: 1080, h: 1350, icon: Crop },
  { id: '9:16', label: '9:16 Story', desc: 'Stories e Reels', w: 1080, h: 1920, icon: Smartphone },
];

export default function GridCutter() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageName, setImageName] = useState('');
  const [gridLayout, setGridLayout] = useState<GridLayout>('3x3');
  const [aspectFormat, setAspectFormat] = useState<AspectFormat>('square');
  const [slices, setSlices] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [approved, setApproved] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const gridConfig = GRID_OPTIONS.find(g => g.id === gridLayout)!;
  const aspectConfig = ASPECT_OPTIONS.find(a => a.id === aspectFormat)!;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageName(file.name.replace(/\.[^.]+$/, ''));
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target?.result as string);
      setSlices([]);
      setApproved(false);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageName(file.name.replace(/\.[^.]+$/, ''));
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageSrc(ev.target?.result as string);
        setSlices([]);
        setApproved(false);
      };
      reader.readAsDataURL(file);
    }
  }

  const cutImage = useCallback(() => {
    if (!imageSrc) return;
    setProcessing(true);
    setApproved(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const { cols, rows } = gridConfig;
      const outW = aspectConfig.w;
      const outH = aspectConfig.h;

      // Determine source crop: fit grid (cols x rows) cells into target aspect ratio
      // Total grid aspect: cols * outW / (rows * outH)
      const totalTargetW = cols * outW;
      const totalTargetH = rows * outH;
      const targetAspect = totalTargetW / totalTargetH;
      const imgAspect = img.width / img.height;

      let srcX: number, srcY: number, srcW: number, srcH: number;
      if (imgAspect > targetAspect) {
        // image wider than target — crop sides
        srcH = img.height;
        srcW = img.height * targetAspect;
        srcX = (img.width - srcW) / 2;
        srcY = 0;
      } else {
        // image taller than target — crop top/bottom
        srcW = img.width;
        srcH = img.width / targetAspect;
        srcX = 0;
        srcY = (img.height - srcH) / 2;
      }

      const sourceSliceW = srcW / cols;
      const sourceSliceH = srcH / rows;

      const canvas = canvasRef.current!;
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d')!;

      const results: string[] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.clearRect(0, 0, outW, outH);
          ctx.drawImage(
            img,
            srcX + col * sourceSliceW,
            srcY + row * sourceSliceH,
            sourceSliceW,
            sourceSliceH,
            0,
            0,
            outW,
            outH
          );
          results.push(canvas.toDataURL('image/png'));
        }
      }

      setSlices(results);
      setProcessing(false);
    };
    img.src = imageSrc;
  }, [imageSrc, gridConfig, aspectConfig]);

  function downloadAll() {
    slices.forEach((dataUrl, i) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${imageName}_${gridConfig.cols}x${gridConfig.rows}_${aspectFormat}_${i + 1}.png`;
      link.click();
    });
  }

  function downloadOne(index: number) {
    const link = document.createElement('a');
    link.href = slices[index];
    link.download = `${imageName}_${gridConfig.cols}x${gridConfig.rows}_${aspectFormat}_${index + 1}.png`;
    link.click();
  }

  function handleApproveAndDownload() {
    setApproved(true);
    downloadAll();
  }

  function reset() {
    setImageSrc(null);
    setImageName('');
    setSlices([]);
    setApproved(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  const sliceAspectClass = aspectFormat === '9:16'
    ? 'aspect-[9/16]'
    : aspectFormat === '3:4'
    ? 'aspect-[3/4]'
    : 'aspect-square';

  // Preview overlay viewBox adapts to total grid aspect
  const previewAspect = (gridConfig.cols * aspectConfig.w) / (gridConfig.rows * aspectConfig.h);
  const overlayH = 100 / previewAspect;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">Cortar Grid</h2>
        <p className="text-slate-400 mt-1 text-sm">Divida imagens em fatias para grid do Instagram com formato automatico</p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!imageSrc ? (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="bg-slate-800/60 border-2 border-dashed border-slate-600/50 hover:border-sky-500/50 rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer transition group"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-4 group-hover:bg-sky-500/15 transition">
            <Upload className="w-7 h-7 text-slate-500 group-hover:text-sky-400 transition" />
          </div>
          <p className="text-white font-medium">Arraste uma imagem ou clique para selecionar</p>
          <p className="text-slate-500 text-sm mt-1">PNG, JPG, WEBP</p>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Preview */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  Imagem Original
                </h3>
                <button onClick={reset} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition">
                  <RotateCcw className="w-3 h-3" />Trocar
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-slate-900" style={{ aspectRatio: `${gridConfig.cols * aspectConfig.w} / ${gridConfig.rows * aspectConfig.h}` }}>
                <img src={imageSrc} alt="Preview" className="w-full h-full object-cover" />
                {/* Grid overlay */}
                {gridConfig.id !== '1x1' && (
                  <svg
                    viewBox={`0 0 100 ${overlayH}`}
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {Array.from({ length: gridConfig.cols - 1 }, (_, i) => (
                      <line key={`v${i}`}
                        x1={`${((i + 1) / gridConfig.cols) * 100}`} y1="0"
                        x2={`${((i + 1) / gridConfig.cols) * 100}`} y2={`${overlayH}`}
                        stroke="rgba(14,165,233,0.7)" strokeWidth="0.4" strokeDasharray="1.5,1.5"
                      />
                    ))}
                    {Array.from({ length: gridConfig.rows - 1 }, (_, i) => (
                      <line key={`h${i}`}
                        x1="0" y1={`${((i + 1) / gridConfig.rows) * overlayH}`}
                        x2="100" y2={`${((i + 1) / gridConfig.rows) * overlayH}`}
                        stroke="rgba(14,165,233,0.7)" strokeWidth="0.4" strokeDasharray="1.5,1.5"
                      />
                    ))}
                  </svg>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2 text-center">
                Recorte: {gridConfig.cols * aspectConfig.w}x{gridConfig.rows * aspectConfig.h}px total
              </p>
            </div>

            {/* Controls */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-5 space-y-5">
              {/* Formato de saida */}
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <Crop className="w-4 h-4 text-amber-400" />
                  Formato de Saida
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {ASPECT_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => { setAspectFormat(opt.id); setSlices([]); setApproved(false); }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-xs font-medium transition border ${
                          aspectFormat === opt.id
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-slate-900/40 text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{opt.label}</span>
                        <span className="text-[10px] opacity-60">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tipo de corte */}
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                  <LayoutGrid className="w-4 h-4 text-emerald-400" />
                  Divisao do Grid
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {GRID_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => { setGridLayout(opt.id); setSlices([]); setApproved(false); }}
                        className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium transition border ${
                          gridLayout === opt.id
                            ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                            : 'bg-slate-900/40 text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div className="bg-slate-900/40 border border-slate-700/30 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Resolucao por fatia</span>
                  <span className="text-slate-300 font-medium">{aspectConfig.w}x{aspectConfig.h}px</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total de fatias</span>
                  <span className="text-slate-300 font-medium">{gridConfig.cols * gridConfig.rows}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Aspecto</span>
                  <span className="text-slate-300 font-medium">{aspectFormat === 'square' ? '1:1' : aspectFormat}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Formato</span>
                  <span className="text-slate-300 font-medium">PNG</span>
                </div>
              </div>

              <button
                onClick={cutImage}
                disabled={processing}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-sky-500/20 disabled:opacity-60 text-sm"
              >
                <ZoomIn className="w-4 h-4" />
                {processing ? 'Processando...' : 'Cortar Imagem'}
              </button>
            </div>
          </div>

          {/* Slices Result */}
          {slices.length > 0 && (
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Grid3x3 className="w-4 h-4 text-sky-400" />
                  Fatias Geradas ({slices.length}) &middot; {aspectFormat === 'square' ? '1:1' : aspectFormat}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadAll}
                    className="flex items-center gap-2 bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:bg-slate-700 px-4 py-2 rounded-xl text-sm font-medium transition"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Todas
                  </button>
                  <button
                    onClick={handleApproveAndDownload}
                    disabled={approved}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                      approved
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 cursor-default'
                        : 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-500 shadow-lg shadow-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {approved ? 'Grid Aprovado!' : 'Aprovar e Baixar'}
                  </button>
                </div>
              </div>

              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${gridConfig.cols}, 1fr)` }}
              >
                {slices.map((dataUrl, i) => (
                  <div key={i} className="group relative">
                    <div
                      className={`${sliceAspectClass} rounded-xl overflow-hidden border border-slate-700/50 hover:border-sky-500/40 transition cursor-pointer`}
                      onClick={() => downloadOne(i)}
                    >
                      <img src={dataUrl} alt={`Fatia ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <span className="absolute top-1.5 left-1.5 bg-slate-900/80 text-slate-300 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      {i + 1}
                    </span>
                    <button
                      onClick={() => downloadOne(i)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-slate-900/50 rounded-xl transition"
                    >
                      <Download className="w-5 h-5 text-white" />
                    </button>
                  </div>
                ))}
              </div>

              {approved && (
                <div className="mt-4 flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>Grid aprovado e salvo! {slices.length} fatias em formato {aspectFormat === 'square' ? '1:1' : aspectFormat} ({aspectConfig.w}x{aspectConfig.h}px cada) foram baixadas.</span>
                </div>
              )}

              <div className="mt-4 bg-slate-900/40 border border-slate-700/30 rounded-xl p-3">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {gridLayout === '3x3'
                    ? <><strong className="text-slate-400">Dica:</strong> Para grid 3x3 no Instagram, publique as fatias na ordem inversa (9→1). O Instagram exibe a foto mais recente primeiro.</>
                    : gridLayout === '3x1'
                    ? <><strong className="text-slate-400">Dica:</strong> Para carrossel, publique as fatias em ordem (1→3) para manter a continuidade da imagem.</>
                    : <><strong className="text-slate-400">Dica:</strong> Cada fatia esta em resolucao {aspectConfig.w}x{aspectConfig.h}px, otimizada para o Instagram.</>
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
