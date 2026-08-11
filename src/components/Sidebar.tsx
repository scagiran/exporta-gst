import React from 'react';
import { ExPortaLogo } from './ExPortaLogo';
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  StickyNote,
  Settings,
  PlusCircle,
  Sparkles,
  Globe,
  Ship,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'shipments'
  | 'customers'
  | 'products'
  | 'documents'
  | 'notes'
  | 'settings'
  | 'landing';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onNewShipmentClick: () => void;
  shipmentCount: number;
  isCollapsed: boolean;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onNewShipmentClick,
  shipmentCount,
  isCollapsed,
  setIsCollapsed,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'shipments', label: 'Sevkiyatlar', icon: Ship, badge: shipmentCount },
    { id: 'customers', label: 'Müşteriler', icon: Users },
    { id: 'products', label: 'Ürünler', icon: Package },
    { id: 'documents', label: 'Belgeler', icon: FileText },
    { id: 'notes', label: 'Notlar', icon: StickyNote },
    { id: 'settings', label: 'Ayarlar', icon: Settings },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16 sm:w-20' : 'w-64'
      } bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800 shrink-0 sticky top-0 transition-all duration-300 ease-in-out z-40`}
    >
      {/* Brand Logo & Name & Collapse Toggle */}
      <div className={`p-3.5 flex items-center border-b border-slate-800 ${isCollapsed ? 'justify-center flex-col space-y-2' : 'justify-between'}`}>
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center cursor-pointer group shrink-0"
          title="ExPorta B2B Export OS"
        >
          {isCollapsed ? (
            <ExPortaLogo isCollapsedMark={true} variant="light" />
          ) : (
            <ExPortaLogo variant="light" size="md" showSubtitle={true} />
          )}
        </div>

        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5 text-teal-400" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>
      </div>

      {/* Primary CTA */}
      <div className="p-3">
        <button
          onClick={onNewShipmentClick}
          title="+ Yeni Sevkiyat"
          className={`w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-lg shadow-md shadow-teal-900/30 flex items-center justify-center transition-all transform active:scale-[0.98] ${
            isCollapsed ? 'px-2' : 'px-4 space-x-2'
          }`}
        >
          <PlusCircle className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">+ Yeni Sevkiyat</span>}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {!isCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            ANA MENÜ
          </div>
        )}
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3.5 py-2.5'
              } rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/10 text-teal-400 font-semibold border-l-2 border-teal-500'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
              </div>
              {!isCollapsed && item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                  isActive ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Landing Page Preview Link */}
      <div className="p-2 border-t border-slate-800">
        <button
          onClick={() => setActiveTab('landing')}
          title={isCollapsed ? 'Tanıtım / Landing Page' : undefined}
          className={`w-full flex items-center ${
            isCollapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
          } rounded-lg text-xs font-medium transition-colors ${
            activeTab === 'landing' ? 'bg-teal-900/40 text-teal-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-2'}`}>
            <Globe className="w-5 h-5 text-teal-400 shrink-0" />
            {!isCollapsed && <span>Landing Page</span>}
          </div>
          {!isCollapsed && (
            <span className="text-[10px] bg-slate-800 text-teal-400 px-1.5 py-0.5 rounded">
              Tanıtım
            </span>
          )}
        </button>
      </div>

      {/* Active Exporter Footer info */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-teal-400 font-bold text-xs border border-slate-700 shrink-0">
            Aİ
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">Anadolu Dış Ticaret</p>
              <p className="text-[10px] text-slate-500 truncate">VN: 0680123456</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

