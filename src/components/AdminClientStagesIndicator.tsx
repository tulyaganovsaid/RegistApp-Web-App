import React, { useState, useMemo } from 'react';
import { 
  Users, AlertCircle, CheckCircle2, Clock, CreditCard, Eye, 
  Search, Filter, FileText, ArrowRight, ShieldCheck, ChevronRight, 
  Sparkles, X, Calendar, UserCheck, MapPin, DollarSign, AlertTriangle,
  Trash2
} from 'lucide-react';
import { User, Order, LanguageCode } from '../types';
import { translateCountry } from '../translations';
import { deleteClient, deleteMultipleClients } from '../db';

export interface AdminClientStagesIndicatorProps {
  clients: User[];
  orders: Order[];
  currentLanguage: LanguageCode;
  onSelectAuditOrder?: (order: Order) => void;
  onClientDeleted?: () => void;
  className?: string;
}

export type StageFilterKey = 
  | 'all' 
  | 'uploaded_unpaid' 
  | 'step_1' 
  | 'draft_filling' 
  | 'paid' 
  | 'in_progress' 
  | 'completed' 
  | 'no_orders'
  | 'violation';

export interface EvaluatedClient {
  client: User;
  stageKey: 'all_uploaded_unpaid' | 'step_1' | 'step_2' | 'step_3' | 'paid' | 'in_progress' | 'completed' | 'violation' | 'no_orders';
  stepNumber: number; // 0 to 5
  stageLabel: string;
  stageBadgeBg: string;
  stageBadgeText: string;
  stageBadgeBorder: string;
  stageDot: string;
  description: string;
  clientOrders: Order[];
  latestOrder?: Order;
  hasUnpaidUpload: boolean;
  registrationDateFormatted: string;
}

export default function AdminClientStagesIndicator({
  clients,
  orders,
  currentLanguage,
  onSelectAuditOrder,
  onClientDeleted,
  className = ''
}: AdminClientStagesIndicatorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StageFilterKey>('all');
  const [selectedClientForModal, setSelectedClientForModal] = useState<EvaluatedClient | null>(null);

  // Client Deletion & Selection States
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [clientToDelete, setClientToDelete] = useState<EvaluatedClient | null>(null);
  const [deleteOrdersWithClient, setDeleteOrdersWithClient] = useState(true);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [deleteOrdersWithBatch, setDeleteOrdersWithBatch] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Evaluate each client's exact order stage
  const evaluatedClients: EvaluatedClient[] = useMemo(() => {
    return clients.map(client => {
      // Find orders matching this client ID or client email
      const clientEmail = (client.email || '').toLowerCase();
      const clientOrders = orders
        .filter(o => o.userId === client.id || (o.clientEmail && o.clientEmail.toLowerCase() === clientEmail))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      const latestOrder = clientOrders[0];

      // Check draft step from client profile or local storage fallback
      let draftStep = client.draftStep;
      if (draftStep === undefined || draftStep === null) {
        try {
          const lsStep1 = localStorage.getItem(`registapp_client_draft_step_${client.id}`);
          const lsStep2 = localStorage.getItem(`registapp_client_draft_step_${clientEmail}`);
          const stepVal = lsStep1 || lsStep2;
          if (stepVal) {
            draftStep = parseInt(stepVal, 10);
          }
        } catch (_) {}
      }

      // Format registration date
      let registrationDateFormatted = '—';
      if (client.createdAt) {
        try {
          const d = new Date(client.createdAt);
          registrationDateFormatted = d.toLocaleDateString(currentLanguage === 'ru' ? 'ru-RU' : 'en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } catch (_) {
          registrationDateFormatted = client.createdAt.slice(0, 10);
        }
      }

      // Case A: Client has placed at least one order
      if (latestOrder) {
        if (latestOrder.status === 'Completed') {
          return {
            client,
            stageKey: 'completed',
            stepNumber: 5,
            stageLabel: currentLanguage === 'ru' ? 'Регистрация выдана (Завершено)' : 'Registration Issued (Completed)',
            stageBadgeBg: 'bg-emerald-500/10',
            stageBadgeText: 'text-emerald-400',
            stageBadgeBorder: 'border-emerald-500/30',
            stageDot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
            description: currentLanguage === 'ru' 
              ? 'Официальный QR-сертификат E-Mehmon успешно сформирован и доступен туристу'
              : 'Official E-Mehmon QR certificate has been generated and issued to the tourist',
            clientOrders,
            latestOrder,
            hasUnpaidUpload: false,
            registrationDateFormatted
          };
        }

        if (latestOrder.status === 'In Progress') {
          return {
            client,
            stageKey: 'in_progress',
            stepNumber: 5,
            stageLabel: currentLanguage === 'ru' ? 'В миграционной службе МВД' : 'In Migration Dept. Review',
            stageBadgeBg: 'bg-purple-500/10',
            stageBadgeText: 'text-purple-300',
            stageBadgeBorder: 'border-purple-500/30',
            stageDot: 'bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]',
            description: currentLanguage === 'ru'
              ? 'Оператор проверил документы и передал в обработку миграционной службы'
              : 'Operator approved documents and dispatched order to the state migration department',
            clientOrders,
            latestOrder,
            hasUnpaidUpload: false,
            registrationDateFormatted
          };
        }

        if (latestOrder.status === 'Paid') {
          return {
            client,
            stageKey: 'paid',
            stepNumber: 4,
            stageLabel: currentLanguage === 'ru' ? 'Оплачено: ожидает проверки' : 'Paid: Awaiting Operator Review',
            stageBadgeBg: 'bg-sky-500/10',
            stageBadgeText: 'text-sky-300',
            stageBadgeBorder: 'border-sky-500/30',
            stageDot: 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]',
            description: currentLanguage === 'ru'
              ? 'Оплата поступила. Находится в очереди оператора на сверку сканов'
              : 'Payment confirmed. In operator queue for biometric & visa verification',
            clientOrders,
            latestOrder,
            hasUnpaidUpload: false,
            registrationDateFormatted
          };
        }

        if (latestOrder.status === 'Payment Pending') {
          return {
            client,
            stageKey: 'all_uploaded_unpaid',
            stepNumber: 4,
            stageLabel: currentLanguage === 'ru' ? 'Все загружено, не оплачено' : 'All Uploaded, Payment Pending',
            stageBadgeBg: 'bg-amber-500/15',
            stageBadgeText: 'text-amber-400 font-bold',
            stageBadgeBorder: 'border-amber-500/40',
            stageDot: 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]',
            description: currentLanguage === 'ru'
              ? 'Паспорт, въездной штамп и даты загружены; ожидает проведение оплаты'
              : 'Passport scan, arrival stamp, and dates verified; waiting for payment execution',
            clientOrders,
            latestOrder,
            hasUnpaidUpload: true,
            registrationDateFormatted
          };
        }

        if (latestOrder.status === 'Rejected due to violations' || latestOrder.status === 'Violation') {
          return {
            client,
            stageKey: 'violation',
            stepNumber: 0,
            stageLabel: currentLanguage === 'ru' ? 'Отклонено / Нарушение сроков' : 'Rejected / Violation Flagged',
            stageBadgeBg: 'bg-red-500/15',
            stageBadgeText: 'text-red-400',
            stageBadgeBorder: 'border-red-500/30',
            stageDot: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]',
            description: currentLanguage === 'ru'
              ? 'Заказ отклонен из-за нарушения регламента или несовпадения паспортных данных'
              : 'Order rejected due to visa breach, late entry window, or document discrepancy',
            clientOrders,
            latestOrder,
            hasUnpaidUpload: false,
            registrationDateFormatted
          };
        }
      }

      // Case B: No orders submitted yet, check draft wizard steps
      if (draftStep === 3) {
        return {
          client,
          stageKey: 'step_3',
          stepNumber: 3,
          stageLabel: currentLanguage === 'ru' ? 'Шаг 3: Въездной штамп и даты' : 'Step 3: Entry Stamp & Dates',
          stageBadgeBg: 'bg-blue-500/10',
          stageBadgeText: 'text-blue-300',
          stageBadgeBorder: 'border-blue-500/30',
          stageDot: 'bg-blue-400',
          description: currentLanguage === 'ru'
            ? 'Турист загружает штамп КПП и выбирает период пребывания в календаре'
            : 'Tourist is uploading entry border stamp and picking stay window in calendar',
          clientOrders,
          latestOrder: undefined,
          hasUnpaidUpload: false,
          registrationDateFormatted
        };
      }

      if (draftStep === 2) {
        return {
          client,
          stageKey: 'step_2',
          stepNumber: 2,
          stageLabel: currentLanguage === 'ru' ? 'Шаг 2: Загрузка паспорта' : 'Step 2: Passport Upload',
          stageBadgeBg: 'bg-indigo-500/10',
          stageBadgeText: 'text-indigo-300',
          stageBadgeBorder: 'border-indigo-500/30',
          stageDot: 'bg-indigo-400',
          description: currentLanguage === 'ru'
            ? 'Турист заполняет паспортные данные и прикрепляет фото разворота'
            : 'Tourist is entering passport identity and attaching bio scan',
          clientOrders,
          latestOrder: undefined,
          hasUnpaidUpload: false,
          registrationDateFormatted
        };
      }

      if (draftStep === 1) {
        return {
          client,
          stageKey: 'step_1',
          stepNumber: 1,
          stageLabel: currentLanguage === 'ru' ? 'Шаг 1: Информирование и согласие' : 'Step 1: Info & Consent',
          stageBadgeBg: 'bg-yellow-500/10',
          stageBadgeText: 'text-yellow-300',
          stageBadgeBorder: 'border-yellow-500/30',
          stageDot: 'bg-yellow-400',
          description: currentLanguage === 'ru'
            ? 'Турист начал процесс и подтверждает статус самостоятельного туриста'
            : 'Tourist started process and is agreeing to independent tourist regime',
          clientOrders,
          latestOrder: undefined,
          hasUnpaidUpload: false,
          registrationDateFormatted
        };
      }

      // Case C: Just registered, order not started
      return {
        client,
        stageKey: 'no_orders',
        stepNumber: 0,
        stageLabel: currentLanguage === 'ru' ? 'Зарегистрирован (заказ не начат)' : 'Registered (No orders started)',
        stageBadgeBg: 'bg-zinc-800/60',
        stageBadgeText: 'text-zinc-400',
        stageBadgeBorder: 'border-zinc-700/50',
        stageDot: 'bg-zinc-500',
        description: currentLanguage === 'ru'
          ? 'Аккаунт подтвержден в системе, но оформление заявки еще не начато'
          : 'Client verified credentials in system, but has not initiated registration wizard yet',
        clientOrders,
        latestOrder: undefined,
        hasUnpaidUpload: false,
        registrationDateFormatted
      };
    });
  }, [clients, orders, currentLanguage]);

  // Aggregate Stage Counts
  const counts = useMemo(() => {
    let allCount = evaluatedClients.length;
    let uploadedUnpaidCount = 0;
    let step1Count = 0;
    let draftFillingCount = 0; // Steps 2 & 3
    let paidCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let noOrdersCount = 0;
    let violationCount = 0;

    evaluatedClients.forEach(c => {
      if (c.stageKey === 'all_uploaded_unpaid') uploadedUnpaidCount++;
      else if (c.stageKey === 'step_1') step1Count++;
      else if (c.stageKey === 'step_2' || c.stageKey === 'step_3') draftFillingCount++;
      else if (c.stageKey === 'paid') paidCount++;
      else if (c.stageKey === 'in_progress') inProgressCount++;
      else if (c.stageKey === 'completed') completedCount++;
      else if (c.stageKey === 'no_orders') noOrdersCount++;
      else if (c.stageKey === 'violation') violationCount++;
    });

    return {
      allCount,
      uploadedUnpaidCount,
      step1Count,
      draftFillingCount,
      paidCount,
      inProgressCount,
      completedCount,
      noOrdersCount,
      violationCount
    };
  }, [evaluatedClients]);

  // Filtered & Searched List
  const filteredClients = useMemo(() => {
    return evaluatedClients.filter(item => {
      // 1. Stage filter
      if (activeFilter === 'uploaded_unpaid' && item.stageKey !== 'all_uploaded_unpaid') return false;
      if (activeFilter === 'step_1' && item.stageKey !== 'step_1') return false;
      if (activeFilter === 'draft_filling' && item.stageKey !== 'step_2' && item.stageKey !== 'step_3') return false;
      if (activeFilter === 'paid' && item.stageKey !== 'paid') return false;
      if (activeFilter === 'in_progress' && item.stageKey !== 'in_progress') return false;
      if (activeFilter === 'completed' && item.stageKey !== 'completed') return false;
      if (activeFilter === 'no_orders' && item.stageKey !== 'no_orders') return false;
      if (activeFilter === 'violation' && item.stageKey !== 'violation') return false;

      // 2. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const name = `${item.client.firstName || ''} ${item.client.lastName || ''}`.toLowerCase();
        const email = (item.client.email || '').toLowerCase();
        const orderId = (item.latestOrder?.id || '').toLowerCase();
        const country = (item.latestOrder?.country || '').toLowerCase();
        const passport = (item.latestOrder?.passportNumber || '').toLowerCase();

        return (
          name.includes(q) ||
          email.includes(q) ||
          orderId.includes(q) ||
          country.includes(q) ||
          passport.includes(q)
        );
      }

      return true;
    });
  }, [evaluatedClients, activeFilter, searchQuery]);

  // Funnel percentages
  const total = Math.max(1, counts.allCount);
  const pctNoOrders = Math.round((counts.noOrdersCount / total) * 100);
  const pctStep1 = Math.round((counts.step1Count / total) * 100);
  const pctDraft = Math.round((counts.draftFillingCount / total) * 100);
  const pctUnpaid = Math.round((counts.uploadedUnpaidCount / total) * 100);
  const pctActive = Math.round(((counts.paidCount + counts.inProgressCount) / total) * 100);
  const pctDone = Math.round((counts.completedCount / total) * 100);

  return (
    <div id="section-admin-client-stages-indicator" className={`space-y-6 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#1f2937]/40 border border-gray-800 p-5 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#a2e635] font-mono tracking-widest uppercase font-bold">
              {currentLanguage === 'ru' ? 'ВОРОНКА КЛИЕНТОВ И СТАДИИ ЗАКАЗОВ' : 'CLIENT LIFECYCLE & ORDER PIPELINE'}
            </span>
            <span className="bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635] px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">
              {counts.allCount} {currentLanguage === 'ru' ? 'клиентов' : 'clients'}
            </span>
          </div>
          <h3 className="text-base font-bold text-white flex items-center gap-2 mt-1">
            <Users className="h-4.5 w-4.5 text-[#a2e635]" />
            <span>
              {currentLanguage === 'ru' 
                ? 'Реестр всех зарегистрированных клиентов по стадиям' 
                : 'All Registered Clients by Order Processing Stage'}
            </span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {currentLanguage === 'ru'
              ? 'Контроль продвижения туристов: от регистрации и заполнения данных до загрузки документов, статуса оплаты и выпуска сертификатов'
              : 'Real-time tracking of tourists across onboarding: from registration to document submission, payment completion, and issuance'}
          </p>
        </div>

        {/* Action badge */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>
              {currentLanguage === 'ru' 
                ? `${counts.uploadedUnpaidCount} ждут оплаты` 
                : `${counts.uploadedUnpaidCount} pending payment`}
            </span>
          </div>
        </div>
      </div>

      {/* Top 6 KPI Cards with interactive click filter */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* 1. All Clients */}
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-[#1f2937] border-[#65a30d] ring-1 ring-[#65a30d]/40'
              : 'bg-[#1f2937]/35 border-gray-800 hover:border-gray-700'
          }`}
        >
          <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider block truncate">
            {currentLanguage === 'ru' ? 'Все клиенты' : 'Total Clients'}
          </span>
          <p className="text-xl font-bold font-mono text-white mt-1">
            {counts.allCount}
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5">100% {currentLanguage === 'ru' ? 'в базе' : 'in system'}</span>
        </button>

        {/* 2. Registered / Step 1 */}
        <button
          type="button"
          onClick={() => setActiveFilter('step_1')}
          className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
            activeFilter === 'step_1'
              ? 'bg-yellow-500/10 border-yellow-500 ring-1 ring-yellow-500/40'
              : 'bg-[#1f2937]/35 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-yellow-400/90 font-mono uppercase tracking-wider block truncate">
              {currentLanguage === 'ru' ? 'На шаге 1' : 'On Step 1'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />
          </div>
          <p className="text-xl font-bold font-mono text-yellow-300 mt-1">
            {counts.step1Count}
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
            {currentLanguage === 'ru' ? 'Выбор условий' : 'Informing stage'}
          </span>
        </button>

        {/* 3. Steps 2 & 3 (Draft filling) */}
        <button
          type="button"
          onClick={() => setActiveFilter('draft_filling')}
          className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
            activeFilter === 'draft_filling'
              ? 'bg-blue-500/10 border-blue-500 ring-1 ring-blue-500/40'
              : 'bg-[#1f2937]/35 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-blue-400/90 font-mono uppercase tracking-wider block truncate">
              {currentLanguage === 'ru' ? 'Шаги 2–3 (Данные)' : 'Steps 2–3 (Data)'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          </div>
          <p className="text-xl font-bold font-mono text-blue-300 mt-1">
            {counts.draftFillingCount}
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
            {currentLanguage === 'ru' ? 'Паспорт и штамп' : 'Passport & stamp'}
          </span>
        </button>

        {/* 4. All Uploaded, Payment Pending (CRITICAL HIGHLIGHT) */}
        <button
          type="button"
          onClick={() => setActiveFilter('uploaded_unpaid')}
          className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
            activeFilter === 'uploaded_unpaid'
              ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-500/50'
              : 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-amber-400 font-mono uppercase tracking-wider block font-bold truncate">
              {currentLanguage === 'ru' ? 'Загружено, без оплаты' : 'Uploaded, Unpaid'}
            </span>
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-300 mt-1">
            {counts.uploadedUnpaidCount}
          </p>
          <span className="text-[10px] text-amber-400/90 font-medium block mt-0.5 truncate">
            {currentLanguage === 'ru' ? '⚠️ Ждут оплаты' : '⚠️ Pending card pay'}
          </span>
        </button>

        {/* 5. Paid & In Migration Review */}
        <button
          type="button"
          onClick={() => setActiveFilter('paid')}
          className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
            activeFilter === 'paid' || activeFilter === 'in_progress'
              ? 'bg-purple-500/10 border-purple-500 ring-1 ring-purple-500/40'
              : 'bg-[#1f2937]/35 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-purple-300 font-mono uppercase tracking-wider block truncate">
              {currentLanguage === 'ru' ? 'Оплачено / В МВД' : 'Paid / In Review'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
          </div>
          <p className="text-xl font-bold font-mono text-purple-300 mt-1">
            {counts.paidCount + counts.inProgressCount}
          </p>
          <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
            {currentLanguage === 'ru' ? `${counts.paidCount} нов. / ${counts.inProgressCount} в МВД` : `${counts.paidCount} paid / ${counts.inProgressCount} dept.`}
          </span>
        </button>

        {/* 6. Completed / Issued */}
        <button
          type="button"
          onClick={() => setActiveFilter('completed')}
          className={`p-3.5 rounded-xl border text-left transition relative cursor-pointer ${
            activeFilter === 'completed'
              ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500/40'
              : 'bg-[#1f2937]/35 border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider block truncate">
              {currentLanguage === 'ru' ? 'Выдано (Готово)' : 'Issued (Done)'}
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-300 mt-1">
            {counts.completedCount}
          </p>
          <span className="text-[10px] text-emerald-400/80 block mt-0.5 truncate">
            {currentLanguage === 'ru' ? 'QR E-Mehmon выдан' : 'QR issued successfully'}
          </span>
        </button>

      </div>

      {/* Visual Pipeline Funnel Segment Bar */}
      <div className="bg-[#1f2937]/35 border border-gray-800 p-4 rounded-xl space-y-2.5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-xs">
          <span className="text-gray-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[#a2e635]" />
            <span>{currentLanguage === 'ru' ? 'Динамическая конверсия стадий воронки:' : 'Dynamic Pipeline Conversion Ratio:'}</span>
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            {currentLanguage === 'ru' 
              ? `${counts.completedCount} из ${counts.allCount} клиентов успешно получили регистрацию (${pctDone}%)`
              : `${counts.completedCount} of ${counts.allCount} clients successfully completed (${pctDone}%)`}
          </span>
        </div>

        {/* Segmented Bar */}
        <div className="h-3 bg-gray-900 rounded-full overflow-hidden flex border border-gray-800 w-full">
          {counts.noOrdersCount > 0 && (
            <div 
              title={`Заказ не начат: ${counts.noOrdersCount}`}
              style={{ width: `${(counts.noOrdersCount / total) * 100}%` }}
              className="h-full bg-zinc-600 transition-all duration-700" 
            />
          )}
          {counts.step1Count > 0 && (
            <div 
              title={`Шаг 1: ${counts.step1Count}`}
              style={{ width: `${(counts.step1Count / total) * 100}%` }}
              className="h-full bg-yellow-500 transition-all duration-700" 
            />
          )}
          {counts.draftFillingCount > 0 && (
            <div 
              title={`Шаги 2–3 (Заполнение): ${counts.draftFillingCount}`}
              style={{ width: `${(counts.draftFillingCount / total) * 100}%` }}
              className="h-full bg-blue-500 transition-all duration-700" 
            />
          )}
          {counts.uploadedUnpaidCount > 0 && (
            <div 
              title={`Все загружено, не оплачено: ${counts.uploadedUnpaidCount}`}
              style={{ width: `${(counts.uploadedUnpaidCount / total) * 100}%` }}
              className="h-full bg-amber-500 transition-all duration-700" 
            />
          )}
          {counts.paidCount > 0 && (
            <div 
              title={`Оплачено: ${counts.paidCount}`}
              style={{ width: `${(counts.paidCount / total) * 100}%` }}
              className="h-full bg-sky-500 transition-all duration-700" 
            />
          )}
          {counts.inProgressCount > 0 && (
            <div 
              title={`В МВД: ${counts.inProgressCount}`}
              style={{ width: `${(counts.inProgressCount / total) * 100}%` }}
              className="h-full bg-purple-500 transition-all duration-700" 
            />
          )}
          {counts.completedCount > 0 && (
            <div 
              title={`Завершено: ${counts.completedCount}`}
              style={{ width: `${(counts.completedCount / total) * 100}%` }}
              className="h-full bg-emerald-500 transition-all duration-700" 
            />
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-600" />
            <span>{currentLanguage === 'ru' ? 'Не начали' : 'Not started'} ({counts.noOrdersCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-yellow-500" />
            <span>{currentLanguage === 'ru' ? 'Шаг 1' : 'Step 1'} ({counts.step1Count})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>{currentLanguage === 'ru' ? 'Шаги 2–3 (Данные)' : 'Steps 2–3'} ({counts.draftFillingCount})</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>{currentLanguage === 'ru' ? 'Все загружено, не оплачено' : 'Uploaded, unpaid'} ({counts.uploadedUnpaidCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            <span>{currentLanguage === 'ru' ? 'Оплачено / В МВД' : 'Paid / In review'} ({counts.paidCount + counts.inProgressCount})</span>
          </span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>{currentLanguage === 'ru' ? 'Выдано' : 'Completed'} ({counts.completedCount})</span>
          </span>
        </div>
      </div>

      {/* Top Toast Feedback Banner */}
      {toastMessage && (
        <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-fade-in ${
          toastMessage.isError 
            ? 'bg-red-500/10 border-red-500/30 text-red-300' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.isError ? <AlertTriangle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="font-semibold">{toastMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setToastMessage(null)}
            className="text-gray-400 hover:text-white p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              currentLanguage === 'ru'
                ? 'Поиск по имени клиента, email, стране, номеру заказа (#ORD-...) или паспорту...'
                : 'Search client by name, email, country, order ID (#ORD-...) or passport...'
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#111827] border border-gray-800 text-xs text-white placeholder-gray-500 outline-none focus:border-[#65a30d] transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter dropdown / toggle badge */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-gray-400 font-medium whitespace-nowrap flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" />
            <span>{currentLanguage === 'ru' ? 'Фильтр:' : 'Filter:'}</span>
          </span>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as StageFilterKey)}
            className="bg-[#111827] border border-gray-800 text-xs text-gray-200 py-2 px-3 rounded-xl outline-none focus:border-[#65a30d] cursor-pointer"
          >
            <option value="all">{currentLanguage === 'ru' ? `Все клиенты (${counts.allCount})` : `All Clients (${counts.allCount})`}</option>
            <option value="uploaded_unpaid">{currentLanguage === 'ru' ? `⚠️ Все загружено, не оплачено (${counts.uploadedUnpaidCount})` : `⚠️ Uploaded, Unpaid (${counts.uploadedUnpaidCount})`}</option>
            <option value="step_1">{currentLanguage === 'ru' ? `Шаг 1: Информирование (${counts.step1Count})` : `Step 1: Info (${counts.step1Count})`}</option>
            <option value="draft_filling">{currentLanguage === 'ru' ? `Шаги 2–3: Заполнение данных (${counts.draftFillingCount})` : `Steps 2–3: Data Input (${counts.draftFillingCount})`}</option>
            <option value="paid">{currentLanguage === 'ru' ? `Оплачено, на проверке (${counts.paidCount})` : `Paid, In Review (${counts.paidCount})`}</option>
            <option value="in_progress">{currentLanguage === 'ru' ? `В миграционной службе МВД (${counts.inProgressCount})` : `In Migration Dept. (${counts.inProgressCount})`}</option>
            <option value="completed">{currentLanguage === 'ru' ? `Регистрация выдана (${counts.completedCount})` : `Completed (${counts.completedCount})`}</option>
            <option value="no_orders">{currentLanguage === 'ru' ? `Заказ не начат (${counts.noOrdersCount})` : `No Orders Started (${counts.noOrdersCount})`}</option>
            {counts.violationCount > 0 && (
              <option value="violation">{currentLanguage === 'ru' ? `Отклонено / Нарушения (${counts.violationCount})` : `Violations (${counts.violationCount})`}</option>
            )}
          </select>
        </div>
      </div>

      {/* Batch Action Toolbar when clients are selected */}
      {selectedClientIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-red-950/30 border border-red-800/60 shadow-lg animate-fade-in">
          <div className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-ping" />
            <span className="text-xs text-red-200 font-bold">
              {currentLanguage === 'ru' 
                ? `Выбрано клиентов: ${selectedClientIds.size} из ${filteredClients.length}` 
                : `Selected clients: ${selectedClientIds.size} of ${filteredClients.length}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedClientIds(new Set())}
              className="px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition cursor-pointer"
            >
              {currentLanguage === 'ru' ? 'Снять выбор' : 'Deselect all'}
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteOrdersWithBatch(true);
                setShowBatchDeleteModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>
                {currentLanguage === 'ru' 
                  ? `Удалить выбранных (${selectedClientIds.size})` 
                  : `Delete selected (${selectedClientIds.size})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Clients Stages Table */}
      <div className="rounded-xl border border-gray-800 bg-[#1f2937]/35 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#111827] font-mono text-gray-400 border-b border-gray-800 tracking-wider">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    aria-label="Select all filtered clients"
                    checked={filteredClients.length > 0 && filteredClients.every(c => selectedClientIds.has(c.client.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedClientIds(new Set(filteredClients.map(c => c.client.id)));
                      } else {
                        setSelectedClientIds(new Set());
                      }
                    }}
                    className="rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500 h-4 w-4 cursor-pointer"
                  />
                </th>
                <th className="p-3.5">{currentLanguage === 'ru' ? 'Клиент' : 'Client Profile'}</th>
                <th className="p-3.5">{currentLanguage === 'ru' ? 'Текущая стадия заказа' : 'Current Order Stage'}</th>
                <th className="p-3.5">{currentLanguage === 'ru' ? 'Детали заявки' : 'Application Details'}</th>
                <th className="p-3.5">{currentLanguage === 'ru' ? 'Зарегистрирован' : 'Registered Date'}</th>
                <th className="p-3.5 text-right">{currentLanguage === 'ru' ? 'Действие' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-gray-300">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    <p className="text-sm font-medium">
                      {currentLanguage === 'ru' ? 'Клиентов по выбранному фильтру не найдено' : 'No clients matched the current filter or search'}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {currentLanguage === 'ru' ? 'Попробуйте сбросить поисковый запрос или выбрать «Все клиенты»' : 'Try clearing your query or reset the filter to "All Clients"'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((item) => {
                  const client = item.client;
                  const latest = item.latestOrder;
                  const initials = `${(client.firstName || '')[0] || 'C'}${(client.lastName || '')[0] || ''}`.toUpperCase();

                  return (
                    <tr 
                      key={client.id || client.email}
                      className={`hover:bg-[#111827]/50 transition ${item.hasUnpaidUpload ? 'bg-amber-950/10' : ''} ${selectedClientIds.has(client.id) ? 'bg-red-950/15' : ''}`}
                    >
                      {/* Column 0: Selection Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          aria-label={`Select client ${client.email}`}
                          checked={selectedClientIds.has(client.id)}
                          onChange={(e) => {
                            const next = new Set(selectedClientIds);
                            if (e.target.checked) {
                              next.add(client.id);
                            } else {
                              next.delete(client.id);
                            }
                            setSelectedClientIds(next);
                          }}
                          className="rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Column 1: Client info */}
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className={`h-8 w-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                            item.hasUnpaidUpload 
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                              : item.stageKey === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-gray-800 text-gray-300 border border-gray-700'
                          }`}>
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-white truncate text-xs">
                                {client.firstName} {client.lastName}
                              </span>
                              {client.isVerified && (
                                <span title="Verified" className="text-emerald-400 text-[10px]">✔</span>
                              )}
                            </div>
                            <span className="text-[11px] text-gray-400 block truncate font-mono">
                              {client.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Exact Stage Badge & Description */}
                      <td className="p-3.5">
                        <div className="space-y-1 max-w-[320px]">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${item.stageBadgeBg} ${item.stageBadgeText} ${item.stageBadgeBorder}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${item.stageDot}`} />
                              <span>{item.stageLabel}</span>
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-snug">
                            {item.description}
                          </p>
                        </div>
                      </td>

                      {/* Column 3: Application Details */}
                      <td className="p-3.5">
                        {latest ? (
                          <div className="space-y-1 font-sans text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[#a2e635] font-bold">#{latest.id}</span>
                              <span className="text-gray-400">•</span>
                              <span className="text-gray-200 font-medium">
                                {translateCountry(latest.country, currentLanguage)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-400">
                              <span className="font-mono text-gray-300">
                                {latest.totalDays} {currentLanguage === 'ru' ? 'дн.' : 'days'}
                              </span>
                              <span>•</span>
                              <span className="font-mono font-bold text-white">
                                {latest.currency === 'UZS' ? `${latest.totalPrice.toLocaleString()} UZS` : `${latest.totalPrice} ${latest.currency}`}
                              </span>
                            </div>
                            {/* Document indicators */}
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-0.5">
                              <span className={latest.passportScan ? 'text-emerald-400' : 'text-gray-500'}>
                                {latest.passportScan ? '✔ Паспорт' : '— Паспорт'}
                              </span>
                              <span>•</span>
                              <span className={latest.arrivalStamp ? 'text-emerald-400' : 'text-gray-500'}>
                                {latest.arrivalStamp ? '✔ Штамп КПП' : '— Штамп'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500 italic">
                            {item.stageKey === 'step_1' 
                              ? (currentLanguage === 'ru' ? 'Форма начата (Шаг 1)' : 'Form in progress (Step 1)')
                              : item.stageKey === 'step_2'
                              ? (currentLanguage === 'ru' ? 'Загружает паспорт (Шаг 2)' : 'Uploading passport (Step 2)')
                              : item.stageKey === 'step_3'
                              ? (currentLanguage === 'ru' ? 'Выбирает даты (Шаг 3)' : 'Selecting dates (Step 3)')
                              : (currentLanguage === 'ru' ? 'Заказ еще не создан' : 'No orders initiated yet')}
                          </div>
                        )}
                      </td>

                      {/* Column 4: Registration date */}
                      <td className="p-3.5 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                        {item.registrationDateFormatted}
                        <div className="text-[10px] text-gray-500">
                          {item.clientOrders.length} {currentLanguage === 'ru' ? 'заказ(ов)' : 'order(s)'}
                        </div>
                      </td>

                      {/* Column 5: Action */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => setSelectedClientForModal(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-700 bg-gray-800/80 hover:bg-[#65a30d] hover:text-[#111827] hover:border-[#65a30d] text-gray-300 text-xs font-bold transition cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>{currentLanguage === 'ru' ? 'Карточка' : 'Profile'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setClientToDelete(item);
                              setDeleteOrdersWithClient(true);
                            }}
                            title={currentLanguage === 'ru' ? 'Удалить клиента' : 'Delete client'}
                            className="p-1.5 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 transition cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Full Details Modal */}
      {selectedClientForModal && (
        <div 
          id="modal-admin-client-stage-details"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedClientForModal(null);
          }}
        >
          <div className="relative w-full max-w-2xl rounded-2xl border border-gray-800 bg-[#111827] shadow-2xl overflow-hidden text-gray-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-800 bg-[#1f2937]/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635] flex items-center justify-center font-bold text-sm">
                  {selectedClientForModal.client.firstName[0]}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>{selectedClientForModal.client.firstName} {selectedClientForModal.client.lastName}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${selectedClientForModal.stageBadgeBg} ${selectedClientForModal.stageBadgeText} ${selectedClientForModal.stageBadgeBorder}`}>
                      {selectedClientForModal.stageLabel}
                    </span>
                  </h4>
                  <p className="text-xs text-gray-400 font-mono">
                    {selectedClientForModal.client.email} • ID: {selectedClientForModal.client.id}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedClientForModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Stage Progress Timeline Card */}
              <div className="p-4 rounded-xl bg-[#1f2937]/35 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#a2e635] font-bold uppercase tracking-wider">
                    {currentLanguage === 'ru' ? 'ТРЕКИНГ СТАДИИ КЛИЕНТА' : 'CLIENT PROGRESS TRACKER'}
                  </span>
                  <span className="text-xs text-gray-400">
                    {selectedClientForModal.stageLabel}
                  </span>
                </div>

                {/* Visual Steps Pipeline */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {[
                    { step: 1, labelRu: 'Шаг 1', descRu: 'Информирование', labelEn: 'Step 1', descEn: 'Consent' },
                    { step: 2, labelRu: 'Шаг 2', descRu: 'Паспорт', labelEn: 'Step 2', descEn: 'Passport' },
                    { step: 3, labelRu: 'Шаг 3', descRu: 'Штамп и даты', labelEn: 'Step 3', descEn: 'Stamp/Dates' },
                    { step: 4, labelRu: 'Шаг 4', descRu: 'Оплата', labelEn: 'Step 4', descEn: 'Payment' },
                    { step: 5, labelRu: 'Шаг 5', descRu: 'Выдача QR', labelEn: 'Step 5', descEn: 'Issued' },
                  ].map(s => {
                    const isPassed = selectedClientForModal.stepNumber >= s.step;
                    const isCurrent = selectedClientForModal.stepNumber === s.step;
                    return (
                      <div 
                        key={s.step} 
                        className={`p-2 rounded-lg border text-center transition ${
                          isCurrent 
                            ? 'bg-[#65a30d]/20 border-[#65a30d] text-white font-bold' 
                            : isPassed 
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
                            : 'bg-gray-900 border-gray-800 text-gray-500'
                        }`}
                      >
                        <span className="text-[10px] font-mono block">
                          {currentLanguage === 'ru' ? s.labelRu : s.labelEn}
                        </span>
                        <span className="text-[9px] block truncate">
                          {currentLanguage === 'ru' ? s.descRu : s.descEn}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="text-xs text-gray-300 leading-relaxed bg-[#111827] p-3 rounded-lg border border-gray-800">
                  <span className="text-[#a2e635] font-semibold">
                    {currentLanguage === 'ru' ? 'Текущий статус: ' : 'Current State: '}
                  </span>
                  {selectedClientForModal.description}
                </div>
              </div>

              {/* Order Details if any */}
              {selectedClientForModal.clientOrders.length > 0 ? (
                <div className="space-y-3">
                  <h5 className="text-xs font-mono text-gray-400 uppercase tracking-wider font-bold">
                    {currentLanguage === 'ru' 
                      ? `Все заказы туриста (${selectedClientForModal.clientOrders.length}):` 
                      : `All Orders by this Tourist (${selectedClientForModal.clientOrders.length}):`}
                  </h5>

                  <div className="space-y-2.5">
                    {selectedClientForModal.clientOrders.map(order => (
                      <div key={order.id} className="p-4 rounded-xl border border-gray-800 bg-[#1f2937]/25 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-[#a2e635]">#{order.id}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            order.status === 'Completed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : order.status === 'Payment Pending'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-300 pt-1">
                          <div>
                            <span className="text-gray-500 text-[10px] block">{currentLanguage === 'ru' ? 'Гражданство' : 'Country'}</span>
                            <span>{translateCountry(order.country, currentLanguage)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-[10px] block">{currentLanguage === 'ru' ? 'Период пребывания' : 'Stay Dates'}</span>
                            <span>{order.startDate} → {order.endDate} ({order.totalDays} дн.)</span>
                          </div>
                          <div>
                            <span className="text-gray-500 text-[10px] block">{currentLanguage === 'ru' ? 'Стоимость' : 'Price'}</span>
                            <span className="font-mono font-bold text-white">
                              {order.currency === 'UZS' ? `${order.totalPrice.toLocaleString()} UZS` : `${order.totalPrice} ${order.currency}`}
                            </span>
                          </div>
                        </div>

                        {/* Scans preview flags */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/60 text-[11px]">
                          <span className="text-gray-400">{currentLanguage === 'ru' ? 'Документы:' : 'Documents:'}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${order.passportScan ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-gray-800 text-gray-500'}`}>
                            {order.passportScan ? '✔ Паспорт загружен' : '✖ Паспорт отсутствует'}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${order.arrivalStamp ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40' : 'bg-gray-800 text-gray-500'}`}>
                            {order.arrivalStamp ? '✔ Штамп КПП загружен' : '✖ Штамп отсутствует'}
                          </span>
                          {order.paymentTxId && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950/40 text-sky-300 border border-sky-800/40 font-mono">
                              TX: {order.paymentTxId}
                            </span>
                          )}
                        </div>

                        {onSelectAuditOrder && (
                          <div className="pt-2 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                onSelectAuditOrder(order);
                                setSelectedClientForModal(null);
                              }}
                              className="text-xs text-[#a2e635] hover:underline font-bold inline-flex items-center gap-1"
                            >
                              <span>{currentLanguage === 'ru' ? 'Открыть детальный аудит заказа' : 'Open Order Audit'}</span>
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-gray-900/50 rounded-xl border border-gray-800 text-gray-400 text-xs">
                  <p className="font-semibold text-gray-300">
                    {currentLanguage === 'ru' ? 'Заказ еще не сформирован' : 'No orders submitted yet'}
                  </p>
                  <p className="mt-1 text-gray-500">
                    {currentLanguage === 'ru' 
                      ? 'Клиент прошел регистрацию аккаунта в системе, но пока не дошел до отправки формы заявки.'
                      : 'The client created an account in the system, but has not completed the submission yet.'}
                  </p>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#1f2937]/50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const toDel = selectedClientForModal;
                  setSelectedClientForModal(null);
                  setClientToDelete(toDel);
                  setDeleteOrdersWithClient(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{currentLanguage === 'ru' ? 'Удалить тестового клиента' : 'Delete Client'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedClientForModal(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold transition cursor-pointer"
              >
                {currentLanguage === 'ru' ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Client Deletion Confirmation Modal */}
      {clientToDelete && (
        <div
          id="modal-confirm-delete-client"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setClientToDelete(null);
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-red-900/60 bg-[#111827] shadow-2xl overflow-hidden text-gray-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-800 bg-red-950/25 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center font-bold">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {currentLanguage === 'ru' ? 'Удаление клиента' : 'Delete Client Account'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {currentLanguage === 'ru' ? 'Подтвердите безвозвратное удаление учетной записи' : 'Confirm irreversible client account deletion'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setClientToDelete(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Client Info Card */}
              <div className="p-4 rounded-xl bg-[#1f2937]/50 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    {clientToDelete.client.firstName} {clientToDelete.client.lastName}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${clientToDelete.stageBadgeBg} ${clientToDelete.stageBadgeText} ${clientToDelete.stageBadgeBorder}`}>
                    {clientToDelete.stageLabel}
                  </span>
                </div>
                <div className="text-gray-400 font-mono text-[11px]">
                  {clientToDelete.client.email}
                </div>
                <div className="flex items-center gap-4 text-gray-400 text-[11px] pt-2 border-t border-gray-800/60">
                  <span>
                    {currentLanguage === 'ru' ? 'Регистрация:' : 'Registered:'} <strong className="text-gray-200">{clientToDelete.registrationDateFormatted}</strong>
                  </span>
                  <span>
                    {currentLanguage === 'ru' ? 'Заказов в системе:' : 'Orders:'} <strong className="text-gray-200">{clientToDelete.clientOrders.length} шт.</strong>
                  </span>
                </div>
              </div>

              {/* Checkbox: Also delete orders */}
              {clientToDelete.clientOrders.length > 0 && (
                <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
                  <input
                    type="checkbox"
                    checked={deleteOrdersWithClient}
                    onChange={(e) => setDeleteOrdersWithClient(e.target.checked)}
                    className="mt-0.5 rounded border-gray-700 bg-gray-950 text-red-500 focus:ring-red-500 h-4 w-4 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span className="font-semibold text-gray-200 block">
                      {currentLanguage === 'ru' 
                        ? `Также удалить все связанные заказы клиента (${clientToDelete.clientOrders.length} шт.)`
                        : `Also delete all linked orders for this client (${clientToDelete.clientOrders.length})`}
                    </span>
                    <span className="text-[11px] text-gray-500 block">
                      {currentLanguage === 'ru' 
                        ? 'Номера заказов: ' + clientToDelete.clientOrders.map(o => '#' + o.id).join(', ')
                        : 'Order IDs: ' + clientToDelete.clientOrders.map(o => '#' + o.id).join(', ')}
                    </span>
                  </div>
                </label>
              )}

              {/* Warning note */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-amber-200/90 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {currentLanguage === 'ru' 
                    ? 'Тестовый клиент будет удален из локальной базы и облачного хранилища. Данные не восстановятся при перезагрузке страницы.'
                    : 'The client account will be purged from local and cloud storage. It will not reappear on reload.'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#1f2937]/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition cursor-pointer"
              >
                {currentLanguage === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    deleteClient(clientToDelete.client.id, deleteOrdersWithClient);
                    setToastMessage({
                      text: currentLanguage === 'ru' 
                        ? `Клиент ${clientToDelete.client.firstName} ${clientToDelete.client.lastName} (${clientToDelete.client.email}) успешно удален.`
                        : `Client ${clientToDelete.client.email} successfully deleted.`
                    });
                    setTimeout(() => setToastMessage(null), 4000);
                    setSelectedClientIds(prev => {
                      const next = new Set(prev);
                      next.delete(clientToDelete.client.id);
                      return next;
                    });
                    setClientToDelete(null);
                    onClientDeleted?.();
                  } catch (err: any) {
                    setToastMessage({
                      text: err?.message || 'Ошибка при удалении клиента',
                      isError: true
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? (currentLanguage === 'ru' ? 'Удаление...' : 'Deleting...') : (currentLanguage === 'ru' ? 'Подтвердить удаление' : 'Confirm Delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Client Deletion Confirmation Modal */}
      {showBatchDeleteModal && (
        <div
          id="modal-confirm-batch-delete-clients"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) setShowBatchDeleteModal(false);
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-red-900/60 bg-[#111827] shadow-2xl overflow-hidden text-gray-200">
            {/* Header */}
            <div className="p-5 border-b border-gray-800 bg-red-950/25 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 flex items-center justify-center font-bold">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    {currentLanguage === 'ru' ? 'Массовое удаление клиентов' : 'Bulk Delete Clients'}
                  </h4>
                  <p className="text-xs text-gray-400">
                    {currentLanguage === 'ru' ? `Удаление ${selectedClientIds.size} выбранных учетных записей` : `Purging ${selectedClientIds.size} selected accounts`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowBatchDeleteModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              <p className="text-gray-300">
                {currentLanguage === 'ru' 
                  ? `Вы собираетесь безвозвратно удалить ${selectedClientIds.size} клиентов:` 
                  : `You are about to permanently delete ${selectedClientIds.size} client accounts:`}
              </p>

              {/* Selected List Preview */}
              <div className="max-h-40 overflow-y-auto rounded-xl bg-gray-900/80 border border-gray-800 p-3 space-y-1.5 font-mono text-[11px]">
                {filteredClients
                  .filter(c => selectedClientIds.has(c.client.id))
                  .map(c => (
                    <div key={c.client.id} className="flex items-center justify-between text-gray-300">
                      <span className="truncate">{c.client.firstName} {c.client.lastName} ({c.client.email})</span>
                      <span className="text-gray-500 text-[10px] ml-2 shrink-0">{c.clientOrders.length} зак.</span>
                    </div>
                  ))}
              </div>

              {/* Checkbox: Also delete orders */}
              <label className="flex items-start gap-3 p-3 rounded-xl bg-gray-900 border border-gray-800 cursor-pointer hover:border-gray-700 transition">
                <input
                  type="checkbox"
                  checked={deleteOrdersWithBatch}
                  onChange={(e) => setDeleteOrdersWithBatch(e.target.checked)}
                  className="mt-0.5 rounded border-gray-700 bg-gray-950 text-red-500 focus:ring-red-500 h-4 w-4 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <span className="font-semibold text-gray-200 block">
                    {currentLanguage === 'ru' 
                      ? 'Также удалить все связанные заказы этих клиентов' 
                      : 'Also delete all associated orders of these clients'}
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    {currentLanguage === 'ru' 
                      ? 'Все созданные ими заявки будут удалены из системы и архивов' 
                      : 'All orders submitted by these accounts will also be purged'}
                  </span>
                </div>
              </label>

              {/* Warning note */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-amber-200/90 text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {currentLanguage === 'ru' 
                    ? 'Тестовые учетные записи будут удалены из системы и не вернутся при перезагрузке.' 
                    : 'Accounts will be permanently removed and will not be resurrected on reload.'}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#1f2937]/50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowBatchDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition cursor-pointer"
              >
                {currentLanguage === 'ru' ? 'Отмена' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  try {
                    setIsDeleting(true);
                    const ids = Array.from(selectedClientIds);
                    const count = deleteMultipleClients(ids, deleteOrdersWithBatch);
                    setToastMessage({
                      text: currentLanguage === 'ru' 
                        ? `Успешно удалено ${count} клиентов.` 
                        : `Successfully deleted ${count} clients.`
                    });
                    setTimeout(() => setToastMessage(null), 4000);
                    setSelectedClientIds(new Set());
                    setShowBatchDeleteModal(false);
                    onClientDeleted?.();
                  } catch (err: any) {
                    setToastMessage({
                      text: err?.message || 'Ошибка при массовом удалении клиентов',
                      isError: true
                    });
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>
                  {isDeleting 
                    ? (currentLanguage === 'ru' ? 'Удаление...' : 'Deleting...') 
                    : (currentLanguage === 'ru' ? `Удалить ${selectedClientIds.size} клиентов` : `Delete ${selectedClientIds.size} Clients`)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
