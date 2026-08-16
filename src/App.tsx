import React, { useState, useEffect } from 'react';
import { NavTab, Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ShipmentsView } from './components/ShipmentsView';
import { ShipmentDetailView } from './components/ShipmentDetailView';
import { CustomersView } from './components/CustomersView';
import { ProductsView } from './components/ProductsView';
import { DocumentsHubView } from './components/DocumentsHubView';
import { DocumentEditorModal } from './components/DocumentEditorModal';
import { SettingsView } from './components/SettingsView';
import { NotesView } from './components/NotesView';
import { ExcelImportModal } from './components/ExcelImportModal';
import { AuthModal } from './components/AuthModal';

import { AuthProvider, useAuth } from './context/AuthContext';
import {
  fetchOrgData,
  saveCustomer,
  deleteCustomer as dbDeleteCustomer,
  saveProduct,
  deleteProduct as dbDeleteProduct,
  saveShipment,
  deleteShipment as dbDeleteShipment,
  saveCompanySettings,
  fetchOrgPreferences,
  saveOrgPreferences,
} from './lib/supabaseService';

import {
  Customer,
  Product,
  MasterShipment,
  CompanySettings,
  CustomField,
  OnboardingStep,
  DocType,
  DocTemplate,
  DocStatus,
  DocNumberFormat,
  DocNumberHistory,
  NoteItem,
  OrgPreferences,
} from './types/exporta';

import {
  INITIAL_COMPANY_SETTINGS,
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_CUSTOM_FIELDS,
  INITIAL_SHIPMENTS,
  INITIAL_ONBOARDING_STEPS,
  INITIAL_NOTES,
} from './data/initialDemoData';

import { DEFAULT_NUMBER_FORMATS, generateDocNumber } from './lib/numbering';

function MainAppContent() {
  const { user, organization } = useAuth();

  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Application Data States
  const [companySettings, setCompanySettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [customers, setCustomers] = useState<Customer[]>(INITIAL_CUSTOMERS);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [customFields, setCustomFields] = useState<CustomField[]>(INITIAL_CUSTOM_FIELDS);
  const [shipments, setShipments] = useState<MasterShipment[]>(INITIAL_SHIPMENTS);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>(INITIAL_ONBOARDING_STEPS);
  const [docNumberFormats, setDocNumberFormats] = useState<Record<DocType, DocNumberFormat>>(DEFAULT_NUMBER_FORMATS);
  const [numberHistory, setNumberHistory] = useState<DocNumberHistory[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>(INITIAL_NOTES);

  // Modal States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalMode, setExcelModalMode] = useState<'customer' | 'product'>('customer');

  const [isDocEditorOpen, setIsDocEditorOpen] = useState(false);
  const [docEditorShipmentId, setDocEditorShipmentId] = useState<string | null>(null);
  const [docEditorDocType, setDocEditorDocType] = useState<DocType>('commercial_invoice');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync Supabase Org Data when organization changes
  useEffect(() => {
    if (organization?.id) {
      fetchOrgData(organization.id).then((data) => {
        if (data) {
          if (data.customers && data.customers.length > 0) setCustomers(data.customers);
          if (data.products && data.products.length > 0) setProducts(data.products);
          if (data.shipments && data.shipments.length > 0) setShipments(data.shipments);
          if (data.companySettings) setCompanySettings(data.companySettings);
        }
      });

      fetchOrgPreferences(organization.id).then((prefs) => {
        if (!prefs) return;
        if (prefs.docNumberFormats) {
          // Merge over the defaults so a newly added DocType never comes back undefined.
          setDocNumberFormats({ ...DEFAULT_NUMBER_FORMATS, ...prefs.docNumberFormats });
        }
        if (prefs.customFields) setCustomFields(prefs.customFields);
        if (prefs.numberHistory) setNumberHistory(prefs.numberHistory);
        if (prefs.notes) setNotes(prefs.notes);
        if (prefs.onboardingSteps) setOnboardingSteps(prefs.onboardingSteps);
      });
    } else {
      // Revert to demo data if logged out
      setCompanySettings(INITIAL_COMPANY_SETTINGS);
      setCustomers(INITIAL_CUSTOMERS);
      setProducts(INITIAL_PRODUCTS);
      setShipments(INITIAL_SHIPMENTS);
      setCustomFields(INITIAL_CUSTOM_FIELDS);
      setOnboardingSteps(INITIAL_ONBOARDING_STEPS);
      setDocNumberFormats(DEFAULT_NUMBER_FORMATS);
      setNumberHistory([]);
      setNotes(INITIAL_NOTES);
    }
  }, [organization?.id]);

  /**
   * Writes the organization preference blob (numbering, custom fields, notes,
   * onboarding, numbering audit log) back to Supabase. Callers pass only the
   * slice they just changed; the rest is taken from current state.
   */
  const persistPrefs = (overrides: Partial<OrgPreferences>) => {
    if (!organization?.id) {
      console.warn('[ExPorta] Organizasyon yüklenmediği için tercihler kaydedilmedi.');
      alert('Ayarlar kaydedilemedi: oturumunuza bağlı bir organizasyon bulunamadı. Lütfen çıkış yapıp tekrar giriş yapın.');
      return;
    }

    saveOrgPreferences(organization.id, {
      docNumberFormats,
      customFields,
      numberHistory,
      notes,
      onboardingSteps,
      ...overrides,
    }).then(({ error }) => {
      if (error) {
        alert(`Ayarlar veritabanına kaydedilemedi:\n\n${error.message}\n\nDeğişiklik sayfayı yenileyince kaybolacak.`);
      }
    });
  };

  // Customer Actions
  const handleAddCustomer = (newCust: Customer) => {
    setCustomers((prev) => [newCust, ...prev]);
    if (organization?.id) saveCustomer(organization.id, newCust);
  };

  const handleUpdateCustomer = (updatedCust: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
    if (organization?.id) saveCustomer(organization.id, updatedCust);
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    if (organization?.id) dbDeleteCustomer(organization.id, id);
  };

  const handleImportCustomers = (imported: Customer[]) => {
    setCustomers((prev) => [...imported, ...prev]);
    if (organization?.id) {
      imported.forEach((c) => saveCustomer(organization.id, c));
    }
  };

  // Product Actions
  const handleAddProduct = (newPrd: Product) => {
    setProducts((prev) => [newPrd, ...prev]);
    if (organization?.id) saveProduct(organization.id, newPrd);
  };

  const handleUpdateProduct = (updatedPrd: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedPrd.id ? updatedPrd : p)));
    if (organization?.id) saveProduct(organization.id, updatedPrd);
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    if (organization?.id) dbDeleteProduct(organization.id, id);
  };

  const handleImportProducts = (imported: Product[]) => {
    setProducts((prev) => [...imported, ...prev]);
    if (organization?.id) {
      imported.forEach((p) => saveProduct(organization.id, p));
    }
  };

  // Master Shipment Actions
  const handleAddShipment = (newShp: MasterShipment) => {
    setShipments((prev) => [newShp, ...prev]);
    if (organization?.id) saveShipment(organization.id, newShp);
  };

  const handleUpdateShipment = (updatedShp: MasterShipment) => {
    setShipments((prev) => prev.map((s) => (s.id === updatedShp.id ? updatedShp : s)));
    if (organization?.id) saveShipment(organization.id, updatedShp);
  };

  const handleDeleteShipment = (id: string) => {
    setShipments((prev) => prev.filter((s) => s.id !== id));
    if (organization?.id) dbDeleteShipment(organization.id, id);
  };

  // Company Settings Action
  const handleUpdateCompanySettings = (updated: CompanySettings) => {
    setCompanySettings(updated);
    if (organization?.id) saveCompanySettings(organization.id, updated);
  };

  // Custom Field Actions
  const handleAddCustomField = (field: CustomField) => {
    const next = [...customFields, field];
    setCustomFields(next);
    persistPrefs({ customFields: next });
  };

  const handleDeleteCustomField = (id: string) => {
    const next = customFields.filter((cf) => cf.id !== id);
    setCustomFields(next);
    persistPrefs({ customFields: next });
  };

  // Numbering Format Actions — records an audit entry for every format change
  const handleUpdateNumberFormat = (docType: DocType, format: DocNumberFormat, reason: string) => {
    const previous = docNumberFormats[docType];
    const sampleCustomer = { code: 'ELEK' };

    const entry: DocNumberHistory = {
      id: `nh-${Date.now()}`,
      docType,
      oldNumber: generateDocNumber(previous, sampleCustomer),
      newNumber: generateDocNumber(format, sampleCustomer),
      changedBy: user?.email || 'Anonim kullanıcı',
      changedAt: new Date().toISOString().split('T')[0],
      reason,
    };

    const nextFormats = { ...docNumberFormats, [docType]: format };
    const nextHistory = [entry, ...numberHistory];

    setDocNumberFormats(nextFormats);
    setNumberHistory(nextHistory);
    persistPrefs({ docNumberFormats: nextFormats, numberHistory: nextHistory });
  };

  /** Advances nextSeq for every document type after a shipment consumed the current numbers. */
  const handleConsumeDocNumberSeqs = () => {
    const nextFormats = { ...docNumberFormats };
    (Object.keys(nextFormats) as DocType[]).forEach((dt) => {
      nextFormats[dt] = { ...nextFormats[dt], nextSeq: nextFormats[dt].nextSeq + 1 };
    });

    setDocNumberFormats(nextFormats);
    persistPrefs({ docNumberFormats: nextFormats });
  };

  // Notes Actions
  const handleAddNote = (note: NoteItem) => {
    const next = [note, ...notes];
    setNotes(next);
    persistPrefs({ notes: next });
  };

  const handleToggleNote = (id: string) => {
    const next = notes.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n));
    setNotes(next);
    persistPrefs({ notes: next });
  };

  const handleDeleteNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    persistPrefs({ notes: next });
  };

  // Onboarding Toggle
  const handleToggleOnboardingStep = (id: number) => {
    const next = onboardingSteps.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
    setOnboardingSteps(next);
    persistPrefs({ onboardingSteps: next });
  };

  // Open Document Editor Modal
  const handleOpenDocEditor = (shipmentId: string, docType: DocType) => {
    setDocEditorShipmentId(shipmentId);
    setDocEditorDocType(docType);
    setIsDocEditorOpen(true);
  };

  // Update Template for a Document
  const handleUpdateDocTemplate = (shipmentId: string, docType: DocType, template: DocTemplate) => {
    setShipments((prev) =>
      prev.map((shp) => {
        if (shp.id === shipmentId) {
          const updatedShp = {
            ...shp,
            documents: {
              ...shp.documents,
              [docType]: {
                ...shp.documents[docType],
                template,
                updatedAt: new Date().toISOString().split('T')[0],
              },
            },
          };
          if (organization?.id) saveShipment(organization.id, updatedShp);
          return updatedShp;
        }
        return shp;
      })
    );
  };

  // Update Status for a Document
  const handleUpdateDocStatus = (shipmentId: string, docType: DocType, status: DocStatus) => {
    setShipments((prev) =>
      prev.map((shp) => {
        if (shp.id === shipmentId) {
          const updatedShp = {
            ...shp,
            documents: {
              ...shp.documents,
              [docType]: {
                ...shp.documents[docType],
                status,
                updatedAt: new Date().toISOString().split('T')[0],
              },
            },
          };
          if (organization?.id) saveShipment(organization.id, updatedShp);
          return updatedShp;
        }
        return shp;
      })
    );
  };

  // Update Custom Notes for a Document
  const handleUpdateDocNotes = (shipmentId: string, docType: DocType, notes: string) => {
    setShipments((prev) =>
      prev.map((shp) => {
        if (shp.id === shipmentId) {
          const updatedShp = {
            ...shp,
            documents: {
              ...shp.documents,
              [docType]: {
                ...shp.documents[docType],
                customNotes: notes,
                updatedAt: new Date().toISOString().split('T')[0],
              },
            },
          };
          if (organization?.id) saveShipment(organization.id, updatedShp);
          return updatedShp;
        }
        return shp;
      })
    );
  };

  // Reset Document State
  const handleResetDocument = (shipmentId: string, docType: DocType) => {
    setShipments((prev) =>
      prev.map((shp) => {
        if (shp.id === shipmentId) {
          const updatedShp = {
            ...shp,
            documents: {
              ...shp.documents,
              [docType]: {
                docType,
                status: 'eksik' as DocStatus,
                template: 'classic' as DocTemplate,
                updatedAt: new Date().toISOString().split('T')[0],
              },
            },
          };
          if (organization?.id) saveShipment(organization.id, updatedShp);
          return updatedShp;
        }
        return shp;
      })
    );
  };

  // Selected Shipment for Detail View or Document Editor
  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId) || null;
  const docEditorShipment = shipments.find((s) => s.id === docEditorShipmentId) || null;

  if (activeTab === 'landing') {
    return (
      <div className="min-h-screen bg-slate-950 text-white font-sans antialiased selection:bg-teal-500 selection:text-slate-950">
        <LandingPage onStartDemo={() => setActiveTab('dashboard')} />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewShipmentClick={() => {
          setActiveTab('shipments');
          setSelectedShipmentId(null);
        }}
        companyName={companySettings.companyName || 'ExPorta Dış Ticaret'}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNewShipmentClick={() => {
            setActiveTab('shipments');
            setSelectedShipmentId(null);
          }}
          shipmentCount={shipments.length}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {activeTab === 'dashboard' && (
            <DashboardView
              shipments={shipments}
              onboardingSteps={onboardingSteps}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onToggleOnboardingStep={handleToggleOnboardingStep}
              onSelectShipment={(id) => {
                setActiveTab('shipments');
                setSelectedShipmentId(id);
              }}
              onNewShipmentClick={() => {
                setActiveTab('shipments');
                setSelectedShipmentId(null);
              }}
            />
          )}

          {activeTab === 'shipments' && !selectedShipmentId && (
            <ShipmentsView
              shipments={shipments}
              customers={customers}
              products={products}
              customFields={customFields}
              docNumberFormats={docNumberFormats}
              onSelectShipment={(id) => setSelectedShipmentId(id)}
              onAddShipment={handleAddShipment}
              onConsumeDocNumberSeqs={handleConsumeDocNumberSeqs}
            />
          )}

          {activeTab === 'shipments' && selectedShipmentId && selectedShipment && (
            <ShipmentDetailView
              shipment={selectedShipment}
              customers={customers}
              products={products}
              customFields={customFields}
              onBack={() => setSelectedShipmentId(null)}
              onUpdateShipment={handleUpdateShipment}
              onOpenDocEditor={(shipmentId, docType) => handleOpenDocEditor(shipmentId, docType)}
              onUpdateDocNotes={handleUpdateDocNotes}
              onResetDocument={handleResetDocument}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              customers={customers}
              customFields={customFields.filter((cf) => cf.module === 'customer')}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onOpenExcelImport={() => {
                setExcelModalMode('customer');
                setIsExcelModalOpen(true);
              }}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              products={products}
              customFields={customFields.filter((cf) => cf.module === 'product')}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onOpenExcelImport={() => {
                setExcelModalMode('product');
                setIsExcelModalOpen(true);
              }}
            />
          )}

          {activeTab === 'documents' && (
            <DocumentsHubView
              shipments={shipments}
              companySettings={companySettings}
              onOpenDocEditor={(shipmentId, docType) => {
                setActiveTab('shipments');
                setSelectedShipmentId(shipmentId);
                handleOpenDocEditor(shipmentId, docType);
              }}
              onUpdateDocNotes={handleUpdateDocNotes}
              onResetDocument={handleResetDocument}
            />
          )}

          {activeTab === 'notes' && (
            <NotesView
              notes={notes}
              onAddNote={handleAddNote}
              onToggleNote={handleToggleNote}
              onDeleteNote={handleDeleteNote}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              companySettings={companySettings}
              onUpdateCompanySettings={handleUpdateCompanySettings}
              customFields={customFields}
              onAddCustomField={handleAddCustomField}
              onDeleteCustomField={handleDeleteCustomField}
              docNumberFormats={docNumberFormats}
              onUpdateNumberFormat={handleUpdateNumberFormat}
              numberHistory={numberHistory}
            />
          )}
        </main>
      </div>

      {/* Global Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        mode={excelModalMode}
        onImportCustomers={handleImportCustomers}
        onImportProducts={handleImportProducts}
      />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Global Document Editor & Template Preview Modal */}
      {docEditorShipment && (
        <DocumentEditorModal
          isOpen={isDocEditorOpen}
          onClose={() => setIsDocEditorOpen(false)}
          shipment={docEditorShipment}
          docType={docEditorDocType}
          companySettings={companySettings}
          onUpdateTemplate={handleUpdateDocTemplate}
          onUpdateStatus={handleUpdateDocStatus}
          onUpdateDocNotes={handleUpdateDocNotes}
          onResetDocument={handleResetDocument}
          onUpdateShipmentItems={(shipmentId, updatedItems) => {
            setShipments((prev) => {
              const updatedList = prev.map((s) =>
                s.id === shipmentId ? { ...s, items: updatedItems } : s
              );
              const targetShp = updatedList.find((s) => s.id === shipmentId);
              if (targetShp && organization?.id) saveShipment(organization.id, targetShp);
              return updatedList;
            });
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
