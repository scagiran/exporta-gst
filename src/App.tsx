import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NavTab, Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { ShipmentsView, NewShipmentDraft } from './components/ShipmentsView';
import { ShipmentDetailView } from './components/ShipmentDetailView';
import { CustomersView } from './components/CustomersView';
import { ProductsView } from './components/ProductsView';
import { DocumentsHubView } from './components/DocumentsHubView';
import { DocumentEditorModal } from './components/DocumentEditorModal';
import { SettingsView } from './components/SettingsView';
import { NotesView } from './components/NotesView';
import { ExcelImportModal } from './components/ExcelImportModal';
import { AuthModal } from './components/AuthModal';
import { AppNotice } from './components/AppNotice';
import { LangProvider, useLang } from './i18n';
import { ErrorBoundary } from './components/ErrorBoundary';

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
  WriteResult,
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
  DocumentInfo,
  NoteItem,
  OrgPreferences,
  ShipmentItem,
} from './types/exporta';

import { EMPTY_COMPANY_SETTINGS, INITIAL_ONBOARDING_STEPS } from './data/initialDemoData';
import { buildDemo } from './data/demo';
import { DEFAULT_NUMBER_FORMATS, generateDocNumber, takenDocNumbers } from './lib/numbering';
import { allocateShipmentNumbers, DOC_ORDER } from './lib/numberingService';
import { approveDocument, buildDocContent, reviseDocument, ApprovalBlockedError, DOC_QTY_BASIS } from './lib/commerce';
import { dayInZone } from './lib/schedule';
import { rememberHomeCity } from './lib/homeCity';
import type { SaveOutcome, SaveStateView, StatusChangeResult, CreateShipmentResult } from './lib/saveTypes';

type DataState = 'demo' | 'loading' | 'ready' | 'error';

function MainAppContent() {
  const { user, organization, loading } = useAuth();
  const { t, lang } = useLang();
  const orgId = organization?.id ?? null;
  const orgIdRef = useRef(orgId);
  orgIdRef.current = orgId;

  // The public demo, in the visitor's language, with dates around today.
  const demo = useMemo(() => buildDemo(lang), [lang]);

  // Navigation State. Visitors land on the public site; signed-in users are
  // moved to the dashboard by the effect below.
  const [activeTab, setActiveTab] = useState<NavTab>('landing');

  // `loading` also flips during every sign-in attempt, so the first resolved
  // session check is remembered separately. Until then nothing is rendered,
  // which keeps a returning user from seeing the public site flash past.
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => {
    if (!loading) setAuthReady(true);
  }, [loading]);

  // Whenever a session appears (returning visit, sign-in or sign-up from the
  // public site), open the dashboard.
  const prevUserId = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    if (id && id !== prevUserId.current) {
      setActiveTab((tab) => {
        if (tab !== 'landing') return tab;
        window.scrollTo(0, 0);
        return 'dashboard';
      });
    }
    prevUserId.current = id;
  }, [user?.id]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  // On a phone the menu starts folded, so the content keeps the screen.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);
  /** Set to ask the shipments screen to open the new-shipment form; cleared once it is open. */
  const [wizardRequested, setWizardRequested] = useState(false);

  // Application Data States
  const [dataState, setDataState] = useState<DataState>(orgId ? 'loading' : 'demo');
  const [reloadKey, setReloadKey] = useState(0);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(demo.companySettings);
  const [customers, setCustomers] = useState<Customer[]>(demo.customers);
  const [products, setProducts] = useState<Product[]>(demo.products);
  const [customFields, setCustomFields] = useState<CustomField[]>(demo.customFields);
  const [shipments, setShipmentsState] = useState<MasterShipment[]>(demo.shipments);
  const [onboardingSteps, setOnboardingSteps] = useState<OnboardingStep[]>(INITIAL_ONBOARDING_STEPS);
  const [docNumberFormats, setDocNumberFormats] = useState<Record<DocType, DocNumberFormat>>(DEFAULT_NUMBER_FORMATS);
  const [numberHistory, setNumberHistory] = useState<DocNumberHistory[]>([]);
  const [shipmentHighWater, setShipmentHighWater] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<NoteItem[]>(demo.notes);
  /** The visitor changed something in the demo; a language switch then keeps their data. */
  const [demoTouched, setDemoTouched] = useState(false);

  // Shipments are changed by several quick, consecutive calls (the document
  // editor saves notes, template, language and status in one go). A ref holds
  // the latest list so each call builds on the previous one instead of on a
  // stale render.
  const shipmentsRef = useRef(shipments);
  const setShipments = useCallback((next: MasterShipment[]) => {
    shipmentsRef.current = next;
    setShipmentsState(next);
  }, []);

  // Modal States
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [excelModalMode, setExcelModalMode] = useState<'customer' | 'product'>('customer');

  const [isDocEditorOpen, setIsDocEditorOpen] = useState(false);
  const [docEditorShipmentId, setDocEditorShipmentId] = useState<string | null>(null);
  const [docEditorDocType, setDocEditorDocType] = useState<DocType>('commercial_invoice');

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // Loading an organisation's data. The screen is emptied first, so a slow or
  // failed load never shows the demo company (or the previous organisation) as
  // if it were this account's data. A response that arrives after the user
  // switched organisation is discarded.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    if (orgId) {
      setDataState('loading');
      setCustomers([]);
      setProducts([]);
      setShipments([]);
      setCompanySettings(EMPTY_COMPANY_SETTINGS);
      setCustomFields([]);
      setNotes([]);
      setNumberHistory([]);
      setDocNumberFormats(DEFAULT_NUMBER_FORMATS);
      setShipmentHighWater({});
      setOnboardingSteps(INITIAL_ONBOARDING_STEPS);

      Promise.all([fetchOrgData(orgId), fetchOrgPreferences(orgId)]).then(([data, prefs]) => {
        if (cancelled || orgIdRef.current !== orgId) return;
        if (!data) {
          setDataState('error');
          return;
        }
        setCustomers(data.customers ?? []);
        setProducts(data.products ?? []);
        setShipments(data.shipments ?? []);
        setCompanySettings(data.companySettings ?? EMPTY_COMPANY_SETTINGS);
        // The public map marks this city on the next visit from this browser.
        rememberHomeCity(data.companySettings?.city);
        if (prefs) {
          // Merge over the defaults so a newly added DocType never comes back undefined.
          if (prefs.docNumberFormats) setDocNumberFormats({ ...DEFAULT_NUMBER_FORMATS, ...prefs.docNumberFormats });
          if (prefs.customFields) setCustomFields(prefs.customFields);
          if (prefs.numberHistory) setNumberHistory(prefs.numberHistory);
          if (prefs.notes) setNotes(prefs.notes);
          if (prefs.onboardingSteps) setOnboardingSteps(prefs.onboardingSteps);
          if (prefs.shipmentSeqHighWater) setShipmentHighWater(prefs.shipmentSeqHighWater);
        }
        setDataState('ready');
      });
    } else {
      setDataState('demo');
      setCompanySettings(demo.companySettings);
      setCustomers(demo.customers);
      setProducts(demo.products);
      setShipments(demo.shipments);
      setCustomFields(demo.customFields);
      setOnboardingSteps(INITIAL_ONBOARDING_STEPS);
      setDocNumberFormats(DEFAULT_NUMBER_FORMATS);
      setNumberHistory([]);
      setShipmentHighWater({});
      setNotes(demo.notes);
      setDemoTouched(false);
    }
    return () => {
      cancelled = true;
    };
    // demo is read only when the organisation changes; language switches are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, reloadKey]);

  // A language switch shows the untouched demo in the new language. Once the
  // visitor has changed something, their data is kept as it is.
  const demoLang = useRef(lang);
  useEffect(() => {
    if (demoLang.current === lang) return;
    demoLang.current = lang;
    if (orgIdRef.current || demoTouched) return;
    setCompanySettings(demo.companySettings);
    setCustomers(demo.customers);
    setProducts(demo.products);
    setShipments(demo.shipments);
    setCustomFields(demo.customFields);
    setNotes(demo.notes);
  }, [lang, demo, demoTouched, setShipments]);

  // ---------------------------------------------------------------------------
  // Saving. Every write reports back: saving, saved, or failed with a retry.
  // Writes for the same record run one after another and always send the
  // latest version, so a late response cannot overwrite a newer change.
  // ---------------------------------------------------------------------------
  const [saveView, setSaveView] = useState<SaveStateView>({ pending: 0, failed: [], lastSavedAt: null, demo: !orgId });
  const chains = useRef(new Map<string, Promise<SaveOutcome>>());
  const failedOps = useRef(new Map<string, () => Promise<WriteResult>>());

  useEffect(() => {
    setSaveView({ pending: 0, failed: [], lastSavedAt: null, demo: !orgId });
    failedOps.current.clear();
  }, [orgId]);

  const track = useCallback(
    (key: string, op: () => Promise<WriteResult>): Promise<SaveOutcome> => {
      const startOrg = orgIdRef.current;
      if (!startOrg) {
        setDemoTouched(true);
        return Promise.resolve('demo');
      }
      setSaveView((v) => ({ ...v, pending: v.pending + 1 }));
      const run = async (): Promise<SaveOutcome> => {
        const r = await op();
        if (orgIdRef.current !== startOrg) return 'failed';
        setSaveView((v) => {
          const failed = v.failed.filter((f) => f.key !== key);
          if (r.error) failed.push({ key, message: r.error.message });
          return { ...v, pending: Math.max(0, v.pending - 1), failed, lastSavedAt: r.error ? v.lastSavedAt : Date.now() };
        });
        if (r.error) failedOps.current.set(key, op);
        else failedOps.current.delete(key);
        return r.error ? 'failed' : 'saved';
      };
      const prev = chains.current.get(key) ?? Promise.resolve<SaveOutcome>('saved');
      const next = prev.then(run, run);
      chains.current.set(key, next);
      return next;
    },
    []
  );

  const retryFailed = useCallback(() => {
    const ops = [...failedOps.current.entries()];
    ops.forEach(([key, op]) => track(key, op));
  }, [track]);

  /** Organisation preferences (numbering, custom fields, notes, onboarding, audit log) in one record. */
  const prefsRef = useRef<OrgPreferences>({ docNumberFormats, customFields, numberHistory, notes, onboardingSteps, shipmentSeqHighWater: shipmentHighWater });
  prefsRef.current = { docNumberFormats, customFields, numberHistory, notes, onboardingSteps, shipmentSeqHighWater: shipmentHighWater };
  const persistPrefs = (overrides: Partial<OrgPreferences>): Promise<SaveOutcome> => {
    prefsRef.current = { ...prefsRef.current, ...overrides };
    return track('prefs', () => saveOrgPreferences(orgIdRef.current!, prefsRef.current));
  };

  const today = () => dayInZone();

  // Customer Actions
  const handleAddCustomer = (newCust: Customer) => {
    setCustomers((prev) => [newCust, ...prev]);
    return track(`customer:${newCust.id}`, () => saveCustomer(orgIdRef.current!, newCust));
  };
  const handleUpdateCustomer = (updatedCust: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updatedCust.id ? updatedCust : c)));
    return track(`customer:${updatedCust.id}`, () => saveCustomer(orgIdRef.current!, updatedCust));
  };
  const handleDeleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    return track(`customer:${id}`, () => dbDeleteCustomer(orgIdRef.current!, id));
  };
  const handleImportCustomers = (imported: Customer[]) => {
    setCustomers((prev) => [...imported, ...prev]);
    imported.forEach((c) => track(`customer:${c.id}`, () => saveCustomer(orgIdRef.current!, c)));
  };

  // Product Actions
  const handleAddProduct = (newPrd: Product) => {
    setProducts((prev) => [newPrd, ...prev]);
    return track(`product:${newPrd.id}`, () => saveProduct(orgIdRef.current!, newPrd));
  };
  const handleUpdateProduct = (updatedPrd: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updatedPrd.id ? updatedPrd : p)));
    return track(`product:${updatedPrd.id}`, () => saveProduct(orgIdRef.current!, updatedPrd));
  };
  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    return track(`product:${id}`, () => dbDeleteProduct(orgIdRef.current!, id));
  };
  const handleImportProducts = (imported: Product[]) => {
    setProducts((prev) => [...imported, ...prev]);
    imported.forEach((p) => track(`product:${p.id}`, () => saveProduct(orgIdRef.current!, p)));
  };

  // ---------------------------------------------------------------------------
  // Shipments and their documents
  // ---------------------------------------------------------------------------
  const saveShipmentById = (id: string) =>
    track(`shipment:${id}`, () => {
      const latest = shipmentsRef.current.find((s) => s.id === id);
      return latest ? saveShipment(orgIdRef.current!, latest) : Promise.resolve({ error: null });
    });

  const mutateShipment = (id: string, fn: (s: MasterShipment) => MasterShipment): Promise<SaveOutcome> => {
    const cur = shipmentsRef.current.find((s) => s.id === id);
    if (!cur) return Promise.resolve('failed');
    const next = { ...fn(cur), updatedAt: today() };
    setShipments(shipmentsRef.current.map((s) => (s.id === id ? next : s)));
    return saveShipmentById(id);
  };

  const patchDoc = (shipmentId: string, docType: DocType, patch: (d: DocumentInfo) => DocumentInfo) =>
    mutateShipment(shipmentId, (s) => ({ ...s, documents: { ...s.documents, [docType]: { ...patch(s.documents[docType]), updatedAt: today() } } }));

  const handleUpdateShipment = (updatedShp: MasterShipment) => mutateShipment(updatedShp.id, () => updatedShp);

  const handleDeleteShipment = (id: string) => {
    setShipments(shipmentsRef.current.filter((s) => s.id !== id));
    return track(`shipment:${id}`, () => dbDeleteShipment(orgIdRef.current!, id));
  };

  /**
   * Creates a shipment: numbers are allocated first (by the database when
   * available), then the record is written. The form waits for this, so a
   * double click cannot create two shipments.
   */
  const handleCreateShipment = async (draft: NewShipmentDraft): Promise<CreateShipmentResult> => {
    const now = new Date();
    const day = today();
    try {
      const numbers = await allocateShipmentNumbers({
        orgId: orgIdRef.current,
        date: now,
        customer: draft.customer,
        formats: docNumberFormats,
        existingShipmentCodes: shipmentsRef.current.map((s) => s.shipmentCode),
        takenDocNumbers: takenDocNumbers(shipmentsRef.current),
        shipmentHighWater: shipmentHighWater[String(now.getFullYear())] ?? 0,
      });
      const documents = {} as Record<DocType, DocumentInfo>;
      for (const dt of DOC_ORDER) {
        documents[dt] = {
          docType: dt,
          docNumber: numbers.docNumbers[dt],
          // Loading documents wait for the actual loading.
          status: DOC_QTY_BASIS[dt] === 'ordered' ? 'taslak' : 'eksik',
          template: companySettings.defaultTemplates?.[dt] ?? 'classic',
          createdAt: day,
          updatedAt: day,
          revision: 0,
        };
      }
      const shipment: MasterShipment = {
        ...draft,
        id: `shp-${now.getTime()}`,
        shipmentCode: numbers.shipmentCode,
        documents,
        createdAt: day,
        updatedAt: day,
      };
      setShipments([shipment, ...shipmentsRef.current]);

      const nextFormats = { ...docNumberFormats };
      for (const dt of DOC_ORDER) nextFormats[dt] = { ...nextFormats[dt], nextSeq: Math.max(nextFormats[dt].nextSeq, numbers.usedSeqs[dt] + 1) };
      const nextHigh = { ...shipmentHighWater, [String(numbers.year)]: Math.max(shipmentHighWater[String(numbers.year)] ?? 0, numbers.shipmentSeq) };
      setDocNumberFormats(nextFormats);
      setShipmentHighWater(nextHigh);

      const outcome = await saveShipmentById(shipment.id);
      persistPrefs({ docNumberFormats: nextFormats, shipmentSeqHighWater: nextHigh });
      return { ok: outcome !== 'failed', shipmentId: shipment.id, outcome, numbering: numbers.source };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };

  const handleUpdateDocLang = (shipmentId: string, docType: DocType, docLang: 'tr' | 'en' | 'fr') =>
    patchDoc(shipmentId, docType, (d) => ({ ...d, lang: docLang }));

  const handleUpdateDocTemplate = (shipmentId: string, docType: DocType, template: DocTemplate) =>
    patchDoc(shipmentId, docType, (d) => ({ ...d, template }));

  const handleUpdateDocNotes = (shipmentId: string, docType: DocType, docNotes: string) =>
    patchDoc(shipmentId, docType, (d) => ({ ...d, notes: docNotes || undefined }));

  /**
   * Status changes follow the document's life: approving freezes the content
   * (refused while the figures are unusable), leaving "approved" files the
   * approved version in the history and opens the next revision.
   */
  const handleUpdateDocStatus = async (shipmentId: string, docType: DocType, status: DocStatus): Promise<StatusChangeResult> => {
    const shipment = shipmentsRef.current.find((s) => s.id === shipmentId);
    if (!shipment) return { ok: true };
    const cur = shipment.documents[docType];
    if (status === cur.status && status !== 'onaylandi') return { ok: true };
    if (status === 'onaylandi') {
      if (cur.status === 'onaylandi' && cur.approved) return { ok: true };
      try {
        const approved = approveDocument(cur, buildDocContent(shipment, docType, companySettings), today());
        await patchDoc(shipmentId, docType, () => approved);
        return { ok: true };
      } catch (e) {
        if (e instanceof ApprovalBlockedError) return { ok: false, reason: 'blocked', issues: e.issues };
        throw e;
      }
    }
    if (cur.status === 'onaylandi') {
      await patchDoc(shipmentId, docType, (d) => ({ ...reviseDocument(d, t.editor2.reasonStatus, today()), status }));
      return { ok: true };
    }
    await patchDoc(shipmentId, docType, (d) => ({ ...d, status }));
    return { ok: true };
  };

  const handleReviseDocument = (shipmentId: string, docType: DocType) =>
    patchDoc(shipmentId, docType, (d) => reviseDocument(d, t.editor2.reasonRevision, today()));

  /** Clears the document's own settings. The number, the language and any approved history are kept. */
  const handleResetDocument = (shipmentId: string, docType: DocType) =>
    patchDoc(shipmentId, docType, (d) => {
      const base = d.status === 'onaylandi' ? reviseDocument(d, t.editor2.reasonReset, today()) : d;
      return {
        ...base,
        status: 'taslak',
        template: companySettings.defaultTemplates?.[docType] ?? 'classic',
        notes: undefined,
        showImages: undefined,
      };
    });

  const handleUpdateShipmentItems = (shipmentId: string, updatedItems: ShipmentItem[]) =>
    mutateShipment(shipmentId, (s) => ({ ...s, items: updatedItems }));

  // Company Settings Action
  const handleUpdateCompanySettings = (updated: CompanySettings) => {
    setCompanySettings(updated);
    if (orgIdRef.current) rememberHomeCity(updated.city);
    return track('company', () => saveCompanySettings(orgIdRef.current!, updated));
  };

  // Custom Field Actions
  const handleAddCustomField = (field: CustomField) => {
    const next = [...customFields, field];
    setCustomFields(next);
    return persistPrefs({ customFields: next });
  };
  const handleDeleteCustomField = (id: string) => {
    const next = customFields.filter((cf) => cf.id !== id);
    setCustomFields(next);
    return persistPrefs({ customFields: next });
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
      changedBy: user?.email || t.common.anonymous,
      changedAt: today(),
      reason,
    };
    const nextFormats = { ...docNumberFormats, [docType]: format };
    const nextHistory = [entry, ...numberHistory];
    setDocNumberFormats(nextFormats);
    setNumberHistory(nextHistory);
    return persistPrefs({ docNumberFormats: nextFormats, numberHistory: nextHistory });
  };

  // Notes Actions
  const handleAddNote = (note: NoteItem) => {
    const next = [note, ...notes];
    setNotes(next);
    return persistPrefs({ notes: next });
  };
  const handleToggleNote = (id: string) => {
    const next = notes.map((n) => (n.id === id ? { ...n, completed: !n.completed } : n));
    setNotes(next);
    return persistPrefs({ notes: next });
  };
  const handleDeleteNote = (id: string) => {
    const next = notes.filter((n) => n.id !== id);
    setNotes(next);
    return persistPrefs({ notes: next });
  };

  const handleToggleOnboardingStep = (id: number) => {
    const next = onboardingSteps.map((s) => (s.id === id ? { ...s, completed: !s.completed } : s));
    setOnboardingSteps(next);
    return persistPrefs({ onboardingSteps: next });
  };

  // Open Document Editor Modal
  const handleOpenDocEditor = (shipmentId: string, docType: DocType) => {
    setDocEditorShipmentId(shipmentId);
    setDocEditorDocType(docType);
    setIsDocEditorOpen(true);
  };

  const openNewShipment = () => {
    setActiveTab('shipments');
    setSelectedShipmentId(null);
    setWizardRequested(true);
  };

  // Selected Shipment for Detail View or Document Editor
  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId) || null;
  const docEditorShipment = shipments.find((s) => s.id === docEditorShipmentId) || null;
  const isDemo = !orgId;

  if (!authReady) {
    return <div className="min-h-screen bg-slate-950" aria-busy="true" />;
  }

  if (activeTab === 'landing') {
    return (
      <LandingPage
        onStartDemo={() => {
          setActiveTab('dashboard');
          window.scrollTo(0, 0);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewShipmentClick={openNewShipment}
        companyName={companySettings.companyName || (isDemo ? t.common.demoCompany : '')}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        saveView={saveView}
        onRetrySave={retryFailed}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onNewShipmentClick={openNewShipment}
          shipmentCount={shipments.length}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          companyName={companySettings.companyName || (isDemo ? t.common.demoCompany : '')}
          taxNo={companySettings.taxNo}
        />

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 overflow-y-auto p-1 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          {isDemo && <AppNotice kind="demo" />}
          {dataState === 'loading' && <AppNotice kind="loading" />}
          {dataState === 'error' && <AppNotice kind="loadError" onRetry={() => setReloadKey((k) => k + 1)} />}

          {dataState !== 'loading' && dataState !== 'error' && (
            <>
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
                  onNewShipmentClick={openNewShipment}
                />
              )}

              {activeTab === 'shipments' && !selectedShipmentId && (
                <ShipmentsView
                  shipments={shipments}
                  customers={customers}
                  products={products}
                  companySettings={companySettings}
                  wizardRequested={wizardRequested}
                  onWizardRequestHandled={() => setWizardRequested(false)}
                  onSelectShipment={(id) => setSelectedShipmentId(id)}
                  onCreateShipment={handleCreateShipment}
                />
              )}

              {activeTab === 'shipments' && selectedShipmentId && selectedShipment && (
                <ShipmentDetailView
                  shipment={selectedShipment}
                  companySettings={companySettings}
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
                <NotesView notes={notes} onAddNote={handleAddNote} onToggleNote={handleToggleNote} onDeleteNote={handleDeleteNote} />
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
            </>
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
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Global Document Editor & Template Preview Modal */}
      {docEditorShipment && (
        <DocumentEditorModal
          key={`${docEditorShipment.id}-${docEditorDocType}-${isDocEditorOpen}`}
          isOpen={isDocEditorOpen}
          onClose={() => setIsDocEditorOpen(false)}
          shipment={docEditorShipment}
          docType={docEditorDocType}
          companySettings={companySettings}
          onUpdateTemplate={handleUpdateDocTemplate}
          onUpdateLang={handleUpdateDocLang}
          onUpdateStatus={handleUpdateDocStatus}
          onReviseDocument={handleReviseDocument}
          onUpdateDocNotes={handleUpdateDocNotes}
          onResetDocument={handleResetDocument}
          onUpdateShipmentItems={handleUpdateShipmentItems}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <ErrorBoundary>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </ErrorBoundary>
    </LangProvider>
  );
}
