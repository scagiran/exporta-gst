import React from 'react';
import { NavTab } from './Sidebar';
import { ShieldCheck, ExternalLink, PanelLeftOpen, PanelLeftClose, Plus, LogIn, LogOut, User as UserIcon, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onNewShipmentClick: () => void;
  companyName: string;
  isSidebarCollapsed?: boolean;
  setIsSidebarCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenAuthModal?: () => void;
}

const TAB_NAMES: Record<NavTab, string> = {
  dashboard: 'Genel Bakış',
  shipments: 'Sevkiyat Yönetimi',
  customers: 'Müşteri Portföyü',
  products: 'Ürün Katalog & GTİP',
  documents: 'Belge Merkezi & Şablonlar',
  notes: 'Notlar & İhracat Kontrol Listesi',
  settings: 'Firma & Numaralandırma Ayarları',
  landing: 'ExPorta Tanıtım & Landing Page',
};

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewShipmentClick,
  companyName,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  onOpenAuthModal,
}) => {
  const { user, organization, signOut } = useAuth();
  const displayCompanyName = organization?.name || companyName;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Title & Context Breadcrumb */}
      <div className="flex items-center space-x-3">
        {setIsSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title={isSidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Sakla'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-teal-600" />
            ) : (
              <PanelLeftClose className="w-5 h-5 text-slate-600" />
            )}
          </button>
        )}

        <h1 className="text-lg font-bold text-slate-900 tracking-tight">
          {TAB_NAMES[activeTab] || 'ExPorta'}
        </h1>
        <span className="text-slate-300">|</span>
        <div className="flex items-center text-xs text-slate-500 space-x-1.5">
          {user ? (
            <>
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-semibold text-slate-800">{displayCompanyName}</span>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                Multi-Tenant Cloud Active
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-medium text-slate-700">{displayCompanyName}</span>
              <span className="bg-amber-50 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-amber-200">
                Demo Modu
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Toggle Landing / App view button */}
        {activeTab !== 'landing' ? (
          <button
            onClick={() => setActiveTab('landing')}
            className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center space-x-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            <span>Landing Page</span>
          </button>
        ) : (
          <button
            onClick={() => setActiveTab('dashboard')}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-colors shadow-xs"
          >
            <span>SaaS Paneline Dön</span>
          </button>
        )}

        {/* Topbar CTA */}
        <button
          onClick={onNewShipmentClick}
          className="py-1.5 px-3.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>+ Yeni Sevkiyat</span>
        </button>

        <div className="h-4 w-px bg-slate-200" />

        {/* User Auth Section */}
        {user ? (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
              {user.email ? user.email.substring(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="text-left hidden lg:block">
              <span className="block text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
                {user.email?.split('@')[0]}
              </span>
              <span className="block text-[10px] text-slate-500">Şirket Yöneticisi</span>
            </div>
            <button
              onClick={() => signOut()}
              title="Çıkış Yap"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuthModal}
            className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-lg shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Giriş / Kayıt Ol</span>
          </button>
        )}
      </div>
    </header>
  );
};


