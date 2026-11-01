import { useState } from 'react';
import { Calendar, LayoutDashboard, Settings, PlusCircle, Grid3x3, Bot, Zap, CalendarDays, Menu, X, Smartphone } from 'lucide-react';

type Page = 'dashboard' | 'create' | 'scheduled' | 'grid' | 'settings' | 'ai-tools' | 'quick-edit' | 'planner';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  username?: string;
  onSyncDevices?: () => void;
}

const navItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create' as Page, label: 'Criar Post', icon: PlusCircle },
  { id: 'quick-edit' as Page, label: 'Edicao Manual', icon: Zap },
  { id: 'ai-tools' as Page, label: 'Ferramentas IA', icon: Bot },
  { id: 'planner' as Page, label: 'Planejador', icon: CalendarDays },
  { id: 'grid' as Page, label: 'Cortar Grid', icon: Grid3x3 },
  { id: 'scheduled' as Page, label: 'Agendados', icon: Calendar },
  { id: 'settings' as Page, label: 'Configuracoes', icon: Settings },
];

const mobileTabItems = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'create' as Page, label: 'Criar', icon: PlusCircle },
  { id: 'scheduled' as Page, label: 'Agendados', icon: Calendar },
  { id: 'planner' as Page, label: 'Planner', icon: CalendarDays },
  { id: 'settings' as Page, label: 'Config', icon: Settings },
];

export default function Sidebar({ currentPage, onNavigate, username, onSyncDevices }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function navigate(page: Page) {
    onNavigate(page);
    setMobileOpen(false);
  }

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/uploads/1793558921842-0-IMG_3870.jpeg" alt="Logo" className="w-9 h-9 rounded-xl object-cover border border-slate-700" />
          <div>
            <h1 className="text-base font-bold text-white">Etiquetas Prontuário</h1>
            <p className="text-xs text-slate-500">Gestão de Postagens</p>
          </div>
        </div>
        <button
          className="lg:hidden p-1.5 text-slate-500 hover:text-white transition"
          onClick={() => setMobileOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-sky-500/15 text-sky-400 border border-sky-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        {username && (
          <p className="text-xs text-slate-500 truncate px-3 mb-2">{username}</p>
        )}
        {onSyncDevices && (
          <button
            onClick={onSyncDevices}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/25 hover:bg-sky-500/25 transition mb-3"
          >
            <Smartphone className="w-4 h-4 flex-shrink-0" />
            Sincronizar dispositivos
          </button>
        )}
        <p className="text-[10px] text-slate-700 text-center px-3">
          Desenvolvido por <span className="text-slate-600 font-medium">Francisco Menezes</span>
        </p>
      </div>
    </>
  );

  return (
    <>
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 border-b border-slate-800 ios-blur bg-slate-900/95"
        style={{ paddingTop: `calc(env(safe-area-inset-top, 0px) + 0.75rem)`, paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-2.5">
          <img src="/uploads/1793558921842-0-IMG_3870.jpeg" alt="Logo" className="w-7 h-7 rounded-lg object-cover border border-slate-700" />
          <span className="text-sm font-bold text-white">Prontuário</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 ios-blur bg-slate-900/95 border-t border-slate-800 flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {mobileTabItems.map(item => {
          const Icon = item.icon;
          const active = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-all ${
                active ? 'text-sky-400' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${active ? 'scale-110' : ''}`} />
              <span>{item.label}</span>
              {active && <span className="absolute bottom-0 inset-x-1/4 h-0.5 bg-sky-400 rounded-full" />}
            </button>
          );
        })}
      </nav>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 ios-blur"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ height: '100%', paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {sidebarContent}
      </aside>

      <aside className="hidden lg:flex w-64 bg-slate-900 border-r border-slate-800 flex-col h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
