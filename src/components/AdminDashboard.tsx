import React, { useState, useEffect } from 'react';
import { 
  BarChart, Users, FileText, Key, Trash2, Plus, 
  HelpCircle, CheckCircle, AlertTriangle, Coins, RefreshCw, Eye, Languages 
} from 'lucide-react';
import { Order, User, SystemConfig, LanguageCode, UserRole } from '../types';
import { 
  getOrders, getUsers, getConfig, saveConfig, addStaffUser, 
  deleteStaffUser, resetStaffPassword, updateStaffUser, getAuditLogs, AuditLog 
} from '../db';
import { translations, translateCountry } from '../translations';
import { formatPlacementAndWaiting, formatResponseTimeAndExecution, isUrgentOrder } from './ClientDashboard';

interface AdminDashboardProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentUser: User;
  onLogout: () => void;
  onProfileUpdate: (user: User) => void;
}

export default function AdminDashboard({ currentLanguage, setLanguage, currentUser, onLogout, onProfileUpdate }: AdminDashboardProps) {
  // Navigation tabs: 'stats' | 'users' | 'content' | 'audit' | 'orders' | 'blacklist'
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'content' | 'audit' | 'orders' | 'blacklist'>('stats');

  const [orders, setOrders] = useState<Order[]>([]);
  const blacklistedOrders = orders.filter(o => o.status === 'Rejected due to violations');
  const [staff, setStaff] = useState<Array<User & { passwordHash: string }>>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<SystemConfig>(getConfig());

  // Edit states for content management
  const [supportAiScript, setSupportAiScript] = useState('');
  const [publicOfferText, setPublicOfferText] = useState('');
  const [publicOfferTextFR, setPublicOfferTextFR] = useState('');
  const [publicOfferTextRU, setPublicOfferTextRU] = useState('');
  const [migrationViolationGuide, setMigrationViolationGuide] = useState('');
  
  // Card inputs
  const [cardUSD, setCardUSD] = useState('');
  const [cardUZS, setCardUZS] = useState('');
  const [cardEUR, setCardEUR] = useState('');
  const [cardRUB, setCardRUB] = useState('');

  // New staff creation form states
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffFirst, setNewStaffFirst] = useState('');
  const [newStaffLast, setNewStaffLast] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('Operator');
  const [newStaffPass, setNewStaffPass] = useState('');
  
  // Reset password states
  const [resetEmail, setResetEmail] = useState('');
  const [resetNewPass, setResetNewPass] = useState('');
  const [resetFirstName, setResetFirstName] = useState('');
  const [resetLastName, setResetLastName] = useState('');
  const [resetNewEmail, setResetNewEmail] = useState('');

  // Status triggers
  const [terminalMessage, setTerminalMessage] = useState({ text: '', isError: false });

  // Selected order for the detailed audit review popup
  const [selectedAuditOrder, setSelectedAuditOrder] = useState<Order | null>(null);

  // Tab within Immigration Orders Audit Record (open vs closed)
  const [ordersSubTab, setOrdersSubTab] = useState<'open' | 'closed'>('open');

  // Month selection for RegistApp Command Center
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const t = (key: string) => translations[currentLanguage]?.[key] || key;

  const getOperatorText = (opId?: string) => {
    if (!opId) return '—';
    const found = staff.find(s => s.id === opId);
    if (found) {
      return `${found.firstName} ${found.lastName} (${found.id.slice(-5)})`;
    }
    // Fallback for default seed operator or other instances
    if (opId === 'user-operator' || opId === '28194') {
      return `${currentLanguage === 'ru' ? 'Оператор Поддержки' : 'Support Operator'} (28194)`;
    }
    return opId;
  };

  useEffect(() => {
    syncAllData();
  }, [activeTab]);

  useEffect(() => {
    window.addEventListener('db-sync', syncAllData);
    return () => {
      window.removeEventListener('db-sync', syncAllData);
    };
  }, []);

  const syncAllData = () => {
    setOrders(getOrders());
    setStaff(getUsers().filter(u => u.role === 'Operator' || u.role === 'Admin'));
    setAuditLogs(getAuditLogs());
    
    const freshConfig = getConfig();
    setConfig(freshConfig);
    setSupportAiScript(freshConfig.supportAiScript);
    setPublicOfferText(freshConfig.publicOfferText);
    setPublicOfferTextFR(freshConfig.publicOfferTextFR || '');
    setPublicOfferTextRU(freshConfig.publicOfferTextRU || '');
    setMigrationViolationGuide(freshConfig.migrationViolationGuide);
    
    setCardUSD(freshConfig.bankCards.USD);
    setCardUZS(freshConfig.bankCards.UZS);
    setCardEUR(freshConfig.bankCards.EUR);
    setCardRUB(freshConfig.bankCards.RUB);
  };

  const showFeedback = (text: string, isError = false) => {
    setTerminalMessage({ text, isError });
    setTimeout(() => setTerminalMessage({ text: '', isError: false }), 4500);
  };

  // Content Management: Save Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated: SystemConfig = {
        supportAiScript,
        publicOfferText,
        publicOfferTextFR,
        publicOfferTextRU,
        migrationViolationGuide,
        bankCards: {
          USD: cardUSD,
          UZS: cardUZS,
          EUR: cardEUR,
          RUB: cardRUB,
        }
      };
      saveConfig(updated);
      setConfig(updated);
      showFeedback('Completed live content synchronization across all tourist modules.');
    } catch (err: any) {
      showFeedback(err.message || 'Error occurred while deploying file updates.', true);
    }
  };

  // User Management: Create Staff account (Operator/Admin)
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffEmail || !newStaffFirst || !newStaffLast || !newStaffPass) {
      showFeedback('Please fill out all employee fields.', true);
      return;
    }

    try {
      addStaffUser(newStaffEmail, newStaffFirst, newStaffLast, newStaffRole, newStaffPass);
      setNewStaffEmail('');
      setNewStaffFirst('');
      setNewStaffLast('');
      setNewStaffPass('');
      syncAllData();
      showFeedback(`Successfully added ${newStaffRole} account in secure system directories.`);
    } catch (err: any) {
      showFeedback(err.message || 'Error executing employee provision.', true);
    }
  };

  // User Management: Remove Staff permissions
  const handleRemoveStaff = (email: string) => {
    try {
      deleteStaffUser(email);
      syncAllData();
      showFeedback(`Successfully revoked credentials and system access for: ${email}`);
    } catch (err: any) {
      showFeedback(err.message || 'Permission denied.', true);
    }
  };

  // User Management: Handle select employee
  const handleSelectEmployeeToReset = (email: string) => {
    setResetEmail(email);
    if (!email) {
      setResetFirstName('');
      setResetLastName('');
      setResetNewEmail('');
      setResetNewPass('');
      return;
    }
    const found = staff.find(s => s.email === email);
    if (found) {
      setResetFirstName(found.firstName);
      setResetLastName(found.lastName);
      setResetNewEmail(found.email);
      setResetNewPass('');
    }
  };

  // User Management: Update staff details and password
  const handleUpdateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      showFeedback('Please select an employee.', true);
      return;
    }
    if (!resetNewEmail || !resetFirstName || !resetLastName) {
      showFeedback('Please fill out all required fields (First Name, Last Name, and Email).', true);
      return;
    }
    try {
      updateStaffUser(resetEmail, resetNewEmail, resetFirstName, resetLastName, resetNewPass || undefined);
      setResetEmail('');
      setResetNewEmail('');
      setResetFirstName('');
      setResetLastName('');
      setResetNewPass('');
      syncAllData();
      showFeedback('Successfully updated staff details and saved new data.');
    } catch (err: any) {
      showFeedback(err.message || 'Error updating staff details.', true);
    }
  };

  const getSelectedMonthName = (monthStr: string) => {
    if (!monthStr) {
      return currentLanguage === 'ru' ? 'все время' : currentLanguage === 'fr' ? 'tous les temps' : 'All Time';
    }
    const [year, m] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1, 1);
    
    try {
      const locale = currentLanguage === 'ru' ? 'ru-RU' : currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
      const formatted = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
      // Capitalize first letter of month
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch (e) {
      return monthStr;
    }
  };

  // Statistics calculation helpers
  const getStatistics = () => {
    // Filter orders if selectedMonth matches YYYY-MM prefix
    const filteredOrders = selectedMonth 
      ? orders.filter(o => o.createdAt && o.createdAt.startsWith(selectedMonth))
      : orders;

    // Currencies sum
    let totalUSD = 0;
    let totalEUR = 0;
    let totalRUB = 0;
    let totalUZS = 0;

    // Successful vs violation
    let successfulCount = 0;
    let violationCount = 0;

    filteredOrders.forEach(o => {
      if (o.status === 'Completed') {
        successfulCount++;
        if (o.currency === 'USD') totalUSD += o.totalPrice;
        if (o.currency === 'EUR') totalEUR += o.totalPrice;
        if (o.currency === 'RUB') totalRUB += o.totalPrice;
        if (o.currency === 'UZS') totalUZS += o.totalPrice;
      }
      if (o.status === 'Violation' || o.status === 'Rejected due to violations' || o.violationReportUrl) {
        violationCount++;
      }
    });

    // Payment Statistics per payment currency/gateway (success vs failure rates)
    const paymentGatewayStats = {
      USD: { label: 'USD P2P Gate (Visa/MC)', success: 0, fail: 0 },
      EUR: { label: 'EUR SEPA Processing', success: 0, fail: 0 },
      RUB: { label: 'RUB Sber/Mir Terminal', success: 0, fail: 0 },
      UZS: { label: 'UZS Humo/Uzcard P2P', success: 0, fail: 0 }
    };

    filteredOrders.forEach(o => {
      const curr = (o.currency || 'USD') as 'USD' | 'EUR' | 'RUB' | 'UZS';
      if (paymentGatewayStats[curr]) {
        if (o.status === 'Completed' || o.status === 'In Progress' || o.status === 'Paid' || o.status === 'Violation' || o.status === 'Rejected due to violations') {
          paymentGatewayStats[curr].success++;
        } else if (o.status === 'Payment Pending' && o.paymentFailedMessage) {
          paymentGatewayStats[curr].fail++;
        }
      }
    });

    // Operator logs KPI calculations
    // Filter for Operator role to retrieve all active operator accounts
    const operators = staff.filter(u => u.role === 'Operator');
    const kpis = operators.map(op => {
      const completedCount = filteredOrders.filter(o => o.status === 'Completed' && o.operatorId === op.id).length;
      // Senior baseline of 18 processed items for Zafar only if selectedMonth is '2026-06' (since senior seed items are in June 2026) or if All Time is shown
      const baseCount = (op.id === '28194' && (!selectedMonth || selectedMonth === '2026-06')) ? 18 : 0;
      const totalCount = baseCount + completedCount;
      const speed = op.id === '28194' ? '12 mins' : '15 mins';

      return {
        id: op.id,
        name: `${op.firstName} ${op.lastName}`,
        count: totalCount,
        speed: speed
      };
    });

    return {
      totalUSD,
      totalEUR,
      totalRUB,
      totalUZS,
      successfulCount,
      violationCount,
      kpis,
      paymentGatewayStats
    };
  };

  const stats = getStatistics();

  return (
    <div id="div-admin-dashboard-root" className="min-h-screen bg-[#111827] text-gray-100 font-sans p-4 sm:p-6 md:p-8 selection:bg-[#65a30d]/40 selection:text-white">
      <div id="div-admin-main-shell" className="max-w-7xl mx-auto">
        
        {/* Header bar */}
        <header id="header-admin-panel" className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-800 pb-6 mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#65a30d] text-white shadow-lg saturate-120 p-1">
              <svg 
                viewBox="0 0 100 100" 
                className="h-full w-full" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                id="brand-logo-svg"
              >
                {/* Document Base */}
                <path d="M22 14h42l18 18v52a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z" />
                {/* Flap */}
                <path d="M64 14v18h18" />
                
                {/* Checklist on the left */}
                <path d="M29 27l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
                <path d="M29 41l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
                <path d="M29 55l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
                <path d="M29 69l2.5 2.5 5.5-5.5" strokeWidth="3" stroke="#a2e635" />
                
                {/* Horizontal line pills */}
                <rect x="58" y="34" width="16" height="5" rx="2.5" strokeWidth="1.5" />
                <rect x="58" y="44" width="16" height="5" rx="2.5" strokeWidth="1.5" />
                <rect x="58" y="54" width="10" height="5" rx="2.5" strokeWidth="1.5" />

                {/* Minaret Tower base */}
                <path d="M47 84l1-38h6l1 38" />
                {/* Balcony/slots */}
                <path d="M45 46h10v-6H45v6z" rx="1" strokeWidth="1.5" />
                <line x1="48" y1="42" x2="48" y2="44" strokeWidth="1" />
                <line x1="50" y1="42" x2="50" y2="44" strokeWidth="1" />
                <line x1="52" y1="42" x2="52" y2="44" strokeWidth="1" />
                {/* Tower Spire */}
                <path d="M47 40c0-4 3-5 3-9 0 4 3 5 3 9" />
                <circle cx="50" cy="27" r="1" fill="currentColor" stroke="none" />

                {/* Mosque Dome */}
                <path d="M51 84c0-12 7-18 15-18s15 6 15 18H51z" fill="#65a30d" />
                <line x1="66" y1="66" x2="66" y2="60" strokeWidth="2" />
                {/* Crescent Moon */}
                <path d="M68.5 59.5a2.5 2.5 0 1 1-1-3.5 2 2 0 1 0 1 3.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">REGISTAPP SYSTEM CONTROL</p>
                <span id="badge-admin-dashboard" className="bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635] px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider animate-pulse">
                  Admin Dashboard
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">{t('adminTitle')}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-200">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-xs text-gray-500 font-mono">Principal Admin</p>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center space-x-1.5 border border-gray-800 bg-[#1f2937]/40 px-3 py-2 rounded-xl">
              <Languages className="h-3.5 w-3.5 text-gray-400" />
              <select
                id="select-admin-language"
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-xs text-gray-300 outline-none cursor-pointer pr-1"
              >
                <option value="en" className="bg-[#111827]">EN</option>
                <option value="ru" className="bg-[#111827]">RU</option>
                <option value="fr" className="bg-[#111827]">FR</option>
              </select>
            </div>

            <button
              id="btn-admin-logout"
              onClick={onLogout}
              className="flex items-center space-x-2 rounded-xl border border-gray-800 bg-[#1f2937] px-4 py-2 text-xs text-gray-400 hover:border-red-900 hover:text-red-400 transition"
            >
              <Key className="h-4 w-4" />
              <span>{t('logOut')}</span>
            </button>
          </div>
        </header>

        {/* Global Action response alert */}
        {terminalMessage.text && (
          <div 
            id="alert-admin-terminal-toast" 
            className={`mb-6 rounded-xl border p-4 text-xs font-semibold flex items-center space-x-2 ${
              terminalMessage.isError 
                ? 'bg-red-950/40 border-red-800 text-red-400' 
                : 'bg-lime-950/40 border-lime-800 text-[#a2e635] animate-pulse'
            }`}
          >
            {terminalMessage.isError ? <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> : <CheckCircle className="h-4.5 w-4.5 shrink-0 text-lime-400" />}
            <span>{terminalMessage.text}</span>
          </div>
        )}

        {/* Outer Tabs control */}
        <div id="tabs-admin-control" className="flex flex-wrap gap-2 mb-8 bg-[#1f2937]/45 p-1.5 rounded-xl border border-gray-800 max-w-fit select-none">
          <button
            id="btn-admin-tab-stats"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'stats' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <BarChart className="h-4 w-4" />
            <span>{t('statsTab')}</span>
          </button>
          <button
            id="btn-admin-tab-content"
            onClick={() => setActiveTab('content')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'content' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{t('contentTab')}</span>
          </button>
          <button
            id="btn-admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'users' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>{t('userTab')}</span>
          </button>
          <button
            id="btn-admin-tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'orders' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Реестр заказов' : 'Order Registry'}</span>
          </button>
          <button
            id="btn-admin-tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'audit' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>{t('auditTab')}</span>
          </button>
          <button
            id="btn-admin-tab-blacklist"
            onClick={() => setActiveTab('blacklist')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'blacklist' 
                ? 'bg-red-650 text-white font-extrabold shadow-lg shadow-red-650/20' 
                : 'text-zinc-400 hover:text-red-400 hover:bg-red-950/20'
            }`}
          >
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>{currentLanguage === 'ru' ? 'Чёрный список' : 'Blacklist'}</span>
            {blacklistedOrders.length > 0 && (
              <span className="text-[9px] bg-red-600 text-white font-mono rounded px-1.5 py-0.5 ml-1">
                {blacklistedOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Active sub-views */}

        {/* TABS A: Statistics, Visual Analytics dashboards */}
        {activeTab === 'stats' && (
          <div id="view-admin-stats" className="space-y-8 animate-fade-in">
            {/* Command Center Period Selector Bar */}
            <div id="div-command-center-period-selector" className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#1f2937]/35 border border-gray-800 p-5 rounded-2xl w-full">
              <div className="space-y-1">
                <span className="text-[10px] text-[#a2e635] font-mono tracking-widest uppercase font-bold">
                  {currentLanguage === 'ru' ? 'СИСТЕМА УПРАВЛЕНИЯ ПЕРИОДОМ' : 'COMMAND CENTER FINANCIAL LEDGER'}
                </span>
                <h3 className="text-base font-bold text-gray-100 flex items-center space-x-2">
                  <BarChart className="h-4.5 w-4.5 text-[#a2e635]" />
                  <span>
                    {currentLanguage === 'ru' 
                      ? `Аналитика за: ${getSelectedMonthName(selectedMonth)}` 
                      : `Analytics for: ${getSelectedMonthName(selectedMonth)}`}
                  </span>
                </h3>
                <p className="text-xs text-gray-400">
                  {currentLanguage === 'ru' 
                    ? 'Аналитика транзакций, выданных регистраций и эффективности работы всех операторов' 
                    : 'Real-time metrics for payment volumes, compliance ratios, and operator service speeds.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center space-x-2 bg-[#111827] border border-gray-800 px-3.5 py-2 rounded-xl w-full sm:w-auto">
                  <span className="text-xs text-gray-400 font-medium">
                    {currentLanguage === 'ru' ? 'Месяц:' : 'Period:'}
                  </span>
                  <input
                    id="stats-month-picker"
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                    }}
                    className="bg-transparent text-xs text-white font-mono font-bold outline-none border-none cursor-pointer focus:ring-0 focus:outline-none [color-scheme:dark]"
                  />
                </div>

                <button
                  id="btn-stats-all-time"
                  type="button"
                  onClick={() => {
                    if (selectedMonth) {
                      setSelectedMonth('');
                    } else {
                      const d = new Date();
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      setSelectedMonth(`${year}-${month}`);
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 w-full sm:w-auto justify-center ${
                    !selectedMonth 
                      ? 'bg-[#65a30d] text-[#111827] font-extrabold shadow-md saturate-110' 
                      : 'bg-[#111827] border border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'
                  }`}
                >
                  <span>
                    {currentLanguage === 'ru' ? 'За всё время' : 'All Time'}
                  </span>
                </button>
              </div>
            </div>

            {/* Top overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-gray-800 bg-[#1f2937]/45 w-full p-4">
                <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                  {currentLanguage === 'ru' ? 'Выдано успешно' : 'Successful Issued'}
                </span>
                <p className="text-2xl font-bold font-mono text-white mt-1">{stats.successfulCount} <span className="text-xs text-[#a2e635] font-sans">{currentLanguage === 'ru' ? 'рег.' : 'IDs'}</span></p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-[#1f2937]/45 w-full p-4">
                <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                  {currentLanguage === 'ru' ? 'Активные нарушения' : 'Active Violations'}
                </span>
                <p className="text-2xl font-bold font-mono text-white mt-1">{stats.violationCount} <span className="text-xs text-red-405 font-sans">{currentLanguage === 'ru' ? 'дел' : 'cases'}</span></p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-[#1f2937]/45 w-full p-4">
                <span className="text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                  {currentLanguage === 'ru' ? 'Очередь на верификацию' : 'Pending Queue'}
                </span>
                <p className="text-2xl font-bold font-mono text-[#a2e635] mt-1">
                  {orders.filter(o => o.status === 'In Progress').length} <span className="text-xs text-gray-400">{currentLanguage === 'ru' ? 'зак.' : 'orders'}</span>
                </p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-[#65a30d]/5 p-4">
                <span className="text-[10px] text-[#a2e635] font-mono tracking-wider uppercase">
                  {currentLanguage === 'ru' ? 'Активные сотрудники' : 'Active System Officers'}
                </span>
                <p className="text-2xl font-bold font-mono text-white mt-1">{staff.length} <span className="text-xs text-gray-450 font-sans">{currentLanguage === 'ru' ? 'акк.' : 'accounts'}</span></p>
              </div>
            </div>

            {/* Visual Charts section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Payment Volume split bar charts */}
              <div id="card-stats-payment-bar" className="rounded-xl border border-gray-800 bg-[#1f2937]/40 p-6">
                <h4 className="text-sm font-semibold text-gray-200 tracking-tight flex items-center space-x-1.5 border-b border-gray-800 pb-3 mb-5">
                  <Coins className="h-4.5 w-4.5 text-[#a2e635]" />
                  <span>{t('paymentSplit')}</span>
                </h4>

                {/* Zero dependency customized responsive SVG graph bars */}
                <div className="space-y-4">
                  {/* Bar USD */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{currentLanguage === 'ru' ? 'Объем USD' : 'USD Volume'}</span>
                      <span className="font-mono font-bold text-white">${stats.totalUSD} USD</span>
                    </div>
                    <div className="h-2.5 bg-[#111827] rounded-full overflow-hidden border border-gray-800 relative">
                      <div className="h-full bg-lime-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalUSD / 500) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Bar EUR */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{currentLanguage === 'ru' ? 'Объем EUR' : 'EUR Volume'}</span>
                      <span className="font-mono font-bold text-white font-mono">€{stats.totalEUR} EUR</span>
                    </div>
                    <div className="h-2.5 bg-[#111827] rounded-full overflow-hidden border border-gray-800 relative">
                      <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalEUR / 500) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Bar RUB */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{currentLanguage === 'ru' ? 'Объем RUB' : 'RUB Volume'}</span>
                      <span className="font-mono font-bold text-white font-mono">{stats.totalRUB} RUB</span>
                    </div>
                    <div className="h-2.5 bg-[#111827] rounded-full overflow-hidden border border-gray-800 relative">
                      <div className="h-full bg-sky-500 rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalRUB / 10000) * 100)}%` }} />
                    </div>
                  </div>

                  {/* Bar UZS */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>{currentLanguage === 'ru' ? 'Объем UZS' : 'UZS Volume'}</span>
                      <span className="font-mono font-bold text-white font-mono">{stats.totalUZS.toLocaleString()} UZS</span>
                    </div>
                    <div className="h-2.5 bg-[#111827] rounded-full overflow-hidden border border-gray-800 relative">
                      <div className="h-full bg-[#65a30d] rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (stats.totalUZS / 1000000) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Success Ratio Donut Chart details */}
              <div id="card-stats-ratio-donut" className="rounded-xl border border-gray-800 bg-[#1f2937]/40 p-6">
                <h4 className="text-sm font-semibold text-gray-200 tracking-tight flex items-center space-x-1.5 border-b border-gray-800 pb-3 mb-5">
                  <CheckCircle className="h-4.5 w-4.5 text-[#a2e635]" />
                  <span>{t('orderStatusRatio')}</span>
                </h4>

                <div className="flex items-center justify-around py-2">
                  {/* Clean SVG Donut Chart */}
                  <div className="relative h-28 w-28 shrink-0">
                    <svg viewBox="0 0 36 36" className="h-full w-full transform -rotate-90">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#374151" strokeWidth="3" />
                      <circle 
                        cx="18" 
                        cy="18" 
                        r="15.915" 
                        fill="none" 
                        stroke="#65a30d" 
                        strokeWidth="3.5" 
                        strokeDasharray={`${(stats.successfulCount / Math.max(1, stats.successfulCount + stats.violationCount)) * 100} ${100 - (stats.successfulCount / Math.max(1, stats.successfulCount + stats.violationCount)) * 100}`}
                        strokeDashoffset="0" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center font-mono font-bold">
                      <span className="text-base font-bold text-white">
                        {Math.round((stats.successfulCount / Math.max(1, stats.successfulCount + stats.violationCount)) * 100)}%
                      </span>
                      <span className="text-[7px] text-gray-500 uppercase tracking-wider font-bold">Pass rate</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-[11px] text-gray-400">
                    <div className="flex items-center space-x-2">
                      <span className="h-3.5 w-3.5 rounded bg-[#65a30d] border border-[#65a30d]/30" />
                      <span>{t('successFullCount')}: <strong>{stats.successfulCount}</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="h-3.5 w-3.5 rounded bg-gray-800 border border-gray-700" />
                      <span>{t('violationCount')}: <strong>{stats.violationCount}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Statistics (Success vs Failure Rates per gateway) */}
              <div id="card-stats-payment-rates" className="rounded-xl border border-gray-800 bg-[#1f2937]/45 p-6 md:col-span-2">
                <h4 className="text-sm font-semibold text-gray-200 tracking-tight flex items-center space-x-1.5 border-b border-gray-800 pb-3 mb-5">
                  <Coins className="h-4.5 w-4.5 text-[#a2e635]" />
                  <span>{currentLanguage === 'ru' ? 'Верификация платежных шлюзов (Успех vs Отказ)' : 'Payment Statistics (Success vs. Failure Rates per System)'}</span>
                </h4>
                
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#111827] font-mono text-gray-500 tracking-wider">
                        <th className="p-3">Payment System Gateway</th>
                        <th className="p-3">Approved Transact (Success)</th>
                        <th className="p-3">Rejected Transact (Failed)</th>
                        <th className="p-3">Conversion Rate</th>
                        <th className="p-3 text-right">Gateway Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {Object.entries(stats.paymentGatewayStats || {}).map(([key, item]) => {
                        const total = item.success + item.fail;
                        const rate = total > 0 ? Math.round((item.success / total) * 100) : 100;
                        return (
                          <tr key={key} className="hover:bg-[#111827]/40 transition">
                            <td className="p-3 font-semibold text-white">{item.label}</td>
                            <td className="p-3 font-mono text-[#a2e635] font-bold">✔ {item.success} items</td>
                            <td className="p-3 font-mono text-red-400 font-bold">✖ {item.fail} items</td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-900 border border-gray-800 h-1.5 rounded-full overflow-hidden shrink-0">
                                  <div className="h-full bg-gradient-to-r from-lime-500 to-emerald-500 transition-all duration-500" style={{ width: `${rate}%` }} />
                                </div>
                                <span className="font-mono font-bold text-gray-200">{rate}%</span>
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-bold ${
                                rate >= 90 
                                  ? 'bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635]' 
                                  : 'bg-red-950/20 border border-red-900/40 text-red-400'
                              }`}>
                                {rate >= 90 ? 'ONLINE / OPTIMAL' : 'DEGRADED LATENCY'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Operator KPIs section */}
              <div id="card-stats-operator-kpi" className="rounded-xl border border-gray-800 bg-[#1f2937]/45 p-6 md:col-span-2">
                <h4 className="text-sm font-semibold text-gray-200 tracking-tight border-b border-gray-800 pb-3 mb-4">Uzbekistan Operator Civil KPI Logs</h4>
                
                <div className="overflow-x-auto rounded-lg border border-gray-800">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead>
                      <tr className="bg-[#111827] font-mono text-gray-500 tracking-wider">
                        <th className="p-3">Operator Officer</th>
                        <th className="p-3">{t('kpiProcessed')}</th>
                        <th className="p-3">{t('kpiAvgSpeed')}</th>
                        <th className="p-3">Compliance Score</th>
                        <th className="p-3 text-right">System Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {stats.kpis.map((k, idx) => (
                        <tr key={k.id} className="hover:bg-[#111827]/40 transition">
                          <td className="p-3 font-semibold text-white">{k.name}</td>
                          <td className="p-3 font-mono font-bold">{k.count} items</td>
                          <td className="p-3 font-mono text-[#a2e635] font-bold">{k.speed}</td>
                          <td className="p-3 text-[#a2e635] font-semibold font-mono">100.0% Perfect</td>
                          <td className="p-3 text-right">
                            <span className="inline-flex items-center rounded-full bg-[#65a30d]/10 border border-[#65a30d]/30 px-2 py-0.5 text-[9px] font-bold text-[#a2e635]">
                              ACTIVE OFFICER
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TABS B: Content Management panels */}
        {activeTab === 'content' && (
          <form id="form-admin-content-config" onSubmit={handleSaveConfig} className="space-y-6 max-w-4xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 font-sans">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">{t('systemFilesTitle')}</h3>
                <p className="text-xs text-gray-400 mt-1">Configure and modify live legal offerings, prompt guides, and peer credit cards.</p>
              </div>
              <button
                id="btn-save-configs-submit"
                type="submit"
                className="rounded-xl bg-[#65a30d] px-5 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#a2e635] transition"
              >
                {t('saveConfigBtn')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Support AI bot matrix instructions */}
              <div id="wrapper-edit-support-ai" className="space-y-1.5">
                <label htmlFor="textarea-support-script" className="block text-xs font-semibold text-gray-300 font-mono tracking-wide">
                  {t('editAiPrompt')} <span className="text-[10px] text-gray-550 font-normal">(Markdown Plain text)</span>
                </label>
                <textarea
                  id="textarea-support-script"
                  required
                  rows={6}
                  value={supportAiScript}
                  onChange={(e) => setSupportAiScript(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] p-4 text-xs text-gray-200 outline-none focus:border-[#65a30d] transition font-sans leading-relaxed"
                />
                
                {/* File Upload Slot for Support AI script */}
                <div className="mt-2 text-xs text-gray-400 bg-gray-900/60 border border-dashed border-gray-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 hover:border-[#65a30d]/50 transition">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-300">Upload Script File (.txt / .md)</span>
                    <span className="text-[10px] text-gray-550">Instantly import regulatory guidance instructions</span>
                  </div>
                  <label className="cursor-pointer bg-[#65a30d] hover:bg-[#a2e635] text-[#111827] font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition inline-flex items-center shrink-0">
                    Import File
                    <input 
                      type="file" 
                      accept=".txt,.md" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const val = evt.target?.result as string;
                          if (val) {
                            setSupportAiScript(val);
                            showFeedback('Successfully imported and parsed Support AI prompt matrix.');
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Pricing Cards edit text */}
              <div id="wrapper-edit-cards-config" className="space-y-3">
                <span className="block text-xs font-semibold text-gray-300 font-mono tracking-wide">{t('editCards')}</span>
                
                <div id="input-cards-bento" className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#111827] border border-gray-850 p-4 rounded-xl">
                  <div>
                    <label htmlFor="input-card-usd" className="block text-[10px] uppercase text-gray-500 mb-1">USD Credit Card</label>
                    <input
                      id="input-card-usd"
                      required
                      type="text"
                      value={cardUSD}
                      onChange={(e) => setCardUSD(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#65a30d] font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-card-uzs" className="block text-[10px] uppercase text-gray-500 mb-1">UZS Credit Card</label>
                    <input
                      id="input-card-uzs"
                      required
                      type="text"
                      value={cardUZS}
                      onChange={(e) => setCardUZS(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#65a30d] font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-card-eur" className="block text-[10px] uppercase text-gray-500 mb-1">EUR Credit Card</label>
                    <input
                      id="input-card-eur"
                      required
                      type="text"
                      value={cardEUR}
                      onChange={(e) => setCardEUR(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#65a30d] font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-card-rub" className="block text-[10px] uppercase text-gray-500 mb-1">RUB Credit Card</label>
                    <input
                      id="input-card-rub"
                      required
                      type="text"
                      value={cardRUB}
                      onChange={(e) => setCardRUB(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-white outline-none focus:border-[#65a30d] font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Public Offer detailed text editing */}
              <div id="wrapper-edit-public-offer" className="space-y-1.5 md:col-span-2">
                <label htmlFor="textarea-public-offer" className="block text-xs font-semibold text-gray-300 font-mono tracking-wide">
                  {t('editPublicOffer')} (EN) <span className="text-[10px] text-gray-550 font-normal">(Editable client-facing legal terms in English)</span>
                </label>
                <textarea
                  id="textarea-public-offer"
                  required
                  rows={8}
                  value={publicOfferText}
                  onChange={(e) => setPublicOfferText(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] p-4 text-xs text-gray-200 outline-none focus:border-[#65a30d] transition font-sans leading-relaxed"
                />

                {/* File Upload Slot for Public Offer EN */}
                <div className="mt-2 text-xs text-gray-400 bg-gray-900/60 border border-dashed border-gray-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 hover:border-[#65a30d]/50 transition">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-300">Upload Public Offer File / Contract (.txt / .md)</span>
                    <span className="text-[10px] text-gray-550">Imports custom legal guidelines directly to the English offering copy</span>
                  </div>
                  <label className="cursor-pointer bg-[#65a30d] hover:bg-[#a2e635] text-[#111827] font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition inline-flex items-center shrink-0">
                    Import Contract
                    <input 
                      type="file" 
                      accept=".txt,.md" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const val = evt.target?.result as string;
                          if (val) {
                            setPublicOfferText(val);
                            showFeedback('Successfully imported and parsed Public Offer contract terms.');
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Public Offer French detailed text editing */}
              <div id="wrapper-edit-public-offer-fr" className="space-y-1.5 md:col-span-2">
                <label htmlFor="textarea-public-offer-fr" className="block text-xs font-semibold text-gray-300 font-mono tracking-wide">
                  {t('editPublicOffer')} (FR) <span className="text-[10px] text-gray-550 font-normal">(In French language)</span>
                </label>
                <textarea
                  id="textarea-public-offer-fr"
                  required
                  rows={8}
                  value={publicOfferTextFR}
                  onChange={(e) => setPublicOfferTextFR(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] p-4 text-xs text-gray-200 outline-none focus:border-[#65a30d] transition font-sans leading-relaxed"
                />
              </div>

              {/* Public Offer Russian detailed text editing */}
              <div id="wrapper-edit-public-offer-ru" className="space-y-1.5 md:col-span-2">
                <label htmlFor="textarea-public-offer-ru" className="block text-xs font-semibold text-gray-300 font-mono tracking-wide">
                  {t('editPublicOffer')} (RU) <span className="text-[10px] text-gray-550 font-normal">(In Russian language)</span>
                </label>
                <textarea
                  id="textarea-public-offer-ru"
                  required
                  rows={8}
                  value={publicOfferTextRU}
                  onChange={(e) => setPublicOfferTextRU(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] p-4 text-xs text-gray-200 outline-none focus:border-[#65a30d] transition font-sans leading-relaxed"
                />
              </div>

              {/* Migration Violation guide text editing */}
              <div id="wrapper-edit-violation-guide" className="space-y-1.5 md:col-span-2">
                <label htmlFor="textarea-violation-guide" className="block text-xs font-semibold text-gray-300 font-mono tracking-wide">
                  {t('editViolationGuide')} <span className="text-[10px] text-gray-550 font-normal">(Advisory warning checklist file)</span>
                </label>
                <textarea
                  id="textarea-violation-guide"
                  required
                  rows={8}
                  value={migrationViolationGuide}
                  onChange={(e) => setMigrationViolationGuide(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] p-4 text-xs text-gray-200 outline-none focus:border-[#65a30d] transition font-sans leading-relaxed"
                />

                {/* File Upload Slot for Violation Guide PDF */}
                <div className="mt-2 text-xs text-gray-400 bg-gray-900/60 border border-dashed border-gray-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 hover:border-[#65a30d]/50 transition">
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-300">Upload Violation Guide (.pdf / .txt)</span>
                    <span className="text-[10px] text-gray-550">Uploads the official warning PDF or checklist file for guidelines</span>
                  </div>
                  <label className="cursor-pointer bg-[#65a30d] hover:bg-[#a2e635] text-[#111827] font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition inline-flex items-center shrink-0">
                    Upload PDF / Guide
                    <input 
                      type="file" 
                      accept=".pdf,.txt" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.name.endsWith('.pdf')) {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const base64 = evt.target?.result as string;
                            // Save PDF representation or text info to guideline
                            setMigrationViolationGuide(`[GUIDE_FILE_ACTIVATED_METADATA_LINK]\nName: ${file.name}\nSize: ${Math.round(file.size / 1024)} KB\nPayload: ${base64}`);
                            showFeedback(`Deployed PDF violation guide file: ${file.name}`);
                          };
                          reader.readAsDataURL(file);
                        } else {
                          const reader = new FileReader();
                          reader.onload = (evt) => {
                            const text = evt.target?.result as string;
                            setMigrationViolationGuide(text);
                            showFeedback('Parsed and imported guidelines text file.');
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

            </div>
          </form>
        )}

        {/* TABS C: User/Staff directories Management panels */}
        {activeTab === 'users' && (
          <div id="view-admin-users" className="space-y-8 animate-fade-in font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Left Column: Register New staff form */}
              <div id="card-admin-add-officer" className="rounded-xl border border-gray-800 bg-[#1f2937]/45 w-full p-6">
                <h4 className="text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3 mb-5 flex items-center space-x-1.5">
                  <Plus className="h-4.5 w-4.5 text-[#a2e635]" />
                  <span>{t('addStaffBtn')}</span>
                </h4>

                <form id="form-add-staff" onSubmit={handleAddStaffSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="input-staff-first" className="block text-[11px] text-gray-400 mb-1">{t('firstNameLabel')}</label>
                      <input
                        id="input-staff-first"
                        required
                        type="text"
                        value={newStaffFirst}
                        onChange={(e) => setNewStaffFirst(e.target.value)}
                        placeholder="Dilshod"
                        className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                      />
                    </div>
                    <div>
                      <label htmlFor="input-staff-last" className="block text-[11px] text-gray-400 mb-1">{t('lastNameLabel')}</label>
                      <input
                        id="input-staff-last"
                        required
                        type="text"
                        value={newStaffLast}
                        onChange={(e) => setNewStaffLast(e.target.value)}
                        placeholder="Alimov"
                        className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="input-staff-email" className="block text-[11px] text-gray-400 mb-1">{t('staffEmailLabel')}</label>
                    <input
                      id="input-staff-email"
                      required
                      type="email"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      placeholder="officer@registapp.uz"
                      className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="select-staff-role" className="block text-[11px] text-gray-400 mb-1">{t('staffRoleLabel')}</label>
                      <select
                        id="select-staff-role"
                        value={newStaffRole}
                        onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                        className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                      >
                        <option value="Operator">Operator</option>
                        <option value="Admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="input-staff-pass" className="block text-[11px] text-gray-400 mb-1">{t('passwordLabel')}</label>
                      <input
                        id="input-staff-pass"
                        required
                        type="password"
                        value={newStaffPass}
                        onChange={(e) => setNewStaffPass(e.target.value)}
                        placeholder="••••••••"
                        className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                      />
                    </div>
                  </div>

                  <button
                    id="btn-add-staff-submit"
                    type="submit"
                    className="w-full rounded-xl bg-[#65a30d] text-[#111827] hover:bg-[#a2e635] py-2.5 text-xs font-bold transition font-extrabold"
                  >
                    Authorize Employee
                  </button>
                </form>
              </div>

              {/* Admin credentials password reset box */}
              <div id="card-admin-reset-pw" className="rounded-xl border border-gray-800 bg-[#1f2937]/45 w-full p-6">
                <h4 className="text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3 mb-5 flex items-center space-x-1.5">
                  <RefreshCw className="h-4.5 w-4.5 text-[#a2e635]" />
                  <span>{currentLanguage === 'ru' ? 'Редактировать данные сотрудника' : 'Update Employee Information'}</span>
                </h4>

                <form id="form-reset-password" onSubmit={handleUpdateStaff} className="space-y-4">
                  <div>
                    <label htmlFor="select-reset-employee" className="block text-[11px] text-gray-400 mb-1">
                      {currentLanguage === 'ru' ? 'Выбрать аккаунт' : 'Select Employee Email'}
                    </label>
                    <select
                      id="select-reset-employee"
                      required
                      value={resetEmail}
                      onChange={(e) => handleSelectEmployeeToReset(e.target.value)}
                      className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                    >
                      <option value="">-- {currentLanguage === 'ru' ? 'Выберите сотрудника' : 'Choose employee account'} --</option>
                      {staff.map(s => (
                        <option key={s.email} value={s.email}>{s.email} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                  {resetEmail && (
                    <div className="space-y-3 pt-2 animate-fade-in font-sans">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="input-reset-first" className="block text-[11px] text-gray-400 mb-1">
                            {currentLanguage === 'ru' ? 'Имя' : 'First Name'}
                          </label>
                          <input
                            id="input-reset-first"
                            required
                            type="text"
                            value={resetFirstName}
                            onChange={(e) => setResetFirstName(e.target.value)}
                            placeholder="Zafar"
                            className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                          />
                        </div>
                        <div>
                          <label htmlFor="input-reset-last" className="block text-[11px] text-gray-400 mb-1">
                            {currentLanguage === 'ru' ? 'Фамилия' : 'Last Name'}
                          </label>
                          <input
                            id="input-reset-last"
                            required
                            type="text"
                            value={resetLastName}
                            onChange={(e) => setResetLastName(e.target.value)}
                            placeholder="Karimov"
                            className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="input-reset-email" className="block text-[11px] text-gray-400 mb-1">
                          {currentLanguage === 'ru' ? 'Электронная почта (Email)' : 'Email Address'}
                        </label>
                        <input
                          id="input-reset-email"
                          required
                          type="email"
                          disabled={resetEmail === 'admin@registapp.uz' || resetEmail === 'operator@registapp.uz'}
                          value={resetNewEmail}
                          onChange={(e) => setResetNewEmail(e.target.value)}
                          placeholder="operator@registapp.uz"
                          className="w-full rounded-lg border border-gray-800 bg-[#111827] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                        />
                        {(resetEmail === 'admin@registapp.uz' || resetEmail === 'operator@registapp.uz') && (
                          <span className="text-[10px] text-amber-500 block mt-1">
                            {currentLanguage === 'ru' ? 'Зарезервированный системный адрес' : 'System-reserved seeding email address'}
                          </span>
                        )}
                      </div>

                      <div>
                        <label htmlFor="input-reset-pass" className="block text-[11px] text-gray-400 mb-1">
                          {currentLanguage === 'ru' ? 'Новый пароль (необязательно)' : 'New Secure Password (optional)'}
                        </label>
                        <input
                          id="input-reset-pass"
                          type="password"
                          value={resetNewPass}
                          onChange={(e) => setResetNewPass(e.target.value)}
                          placeholder={currentLanguage === 'ru' ? 'Оставь пустым, чтобы не менять' : 'Leave blank to keep current password'}
                          className="w-full rounded-lg border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    id="btn-reset-pass-submit"
                    type="submit"
                    disabled={!resetEmail}
                    className="w-full rounded-xl bg-[#65a30d] disabled:opacity-40 disabled:hover:bg-[#111827] hover:bg-[#a2e635] text-[#111827] disabled:text-gray-400 py-2.5 text-xs font-extrabold transition"
                  >
                    Save New Data
                  </button>
                </form>
              </div>

              {/* Bottom Row listing staff list directories */}
              <div id="card-admin-staff-roster" className="rounded-xl border border-gray-800 bg-[#1f2937]/40 p-6 md:col-span-2">
                <h4 className="text-sm font-semibold text-gray-200 border-b border-gray-800 pb-3 mb-4">{t('staffList')}</h4>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#111827] font-mono text-gray-500 tracking-wider">
                        <th className="p-3">{currentLanguage === 'ru' ? 'ID Сотрудника' : 'Staff ID'}</th>
                        <th className="p-3">Staff Member</th>
                        <th className="p-3">Email Address</th>
                        <th className="p-3">System role</th>
                        <th className="p-3">Security Level</th>
                        <th className="p-3 text-right">Revoke Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {staff.map(s => (
                        <tr key={s.id} className="hover:bg-[#111827]/40 transition">
                          <td className="p-3 font-mono text-[#a2e635] font-bold select-all">{s.id}</td>
                          <td className="p-3 font-semibold text-white">{s.firstName} {s.lastName}</td>
                          <td className="p-3 font-mono">{s.email}</td>
                          <td className="p-3">
                            <span className={`inline-flex items-center rounded bg-gray-900 border px-1.5 py-0.5 text-[9px] font-bold ${
                              s.role === 'Admin' ? 'border-[#65a30d] text-[#a2e635]' : 'border-gray-800 text-gray-400'
                            }`}>
                              {s.role}
                            </span>
                          </td>
                          <td className="p-3 text-gray-450 font-mono">Tier {s.role === 'Admin' ? '1' : '2'} Control</td>
                          <td className="p-3 text-right">
                            <button
                              id={`btn-revoke-${s.id}`}
                              disabled={s.email === 'admin@registapp.uz' || s.email === 'operator@registapp.uz'}
                              onClick={() => handleRemoveStaff(s.email)}
                              className={`p-1.5 rounded transition ${
                                s.email === 'admin@registapp.uz' || s.email === 'operator@registapp.uz'
                                  ? 'text-gray-700 cursor-not-allowed'
                                  : 'text-gray-400 hover:text-red-405 hover:bg-red-955/40'
                              }`}
                              title={t('removeStaffBtn')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TABS D: Order Auditing and Review registry */}
        {activeTab === 'orders' && (
          <div id="view-admin-orders" className="space-y-6 animate-fade-in font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-lg font-bold text-white tracking-tight">Immigration Orders Audit Record</h3>
              
              {/* Sub-tabs division */}
              <div id="tabs-admin-orders-sub-control" className="flex bg-[#111827] p-1 rounded-lg border border-gray-800 select-none text-[11px] font-bold">
                <button
                  id="btn-admin-orders-subtab-open"
                  onClick={() => setOrdersSubTab('open')}
                  className={`rounded px-3 py-1.5 transition ${
                    ordersSubTab === 'open' 
                      ? 'bg-[#65a30d] text-[#111827]' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {currentLanguage === 'ru' ? 'Открытые' : 'Open'} ({orders.filter(o => o.status !== 'Completed').length})
                </button>
                <button
                  id="btn-admin-orders-subtab-closed"
                  onClick={() => setOrdersSubTab('closed')}
                  className={`rounded px-3 py-1.5 transition ${
                    ordersSubTab === 'closed' 
                      ? 'bg-[#65a30d] text-[#111827]' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {currentLanguage === 'ru' ? 'Закрытые' : 'Closed'} ({orders.filter(o => o.status === 'Completed').length})
                </button>
              </div>
            </div>
            
            {(() => {
              const displayedOrders = orders.filter(o => 
                ordersSubTab === 'open' ? o.status !== 'Completed' : o.status === 'Completed'
              );

              if (displayedOrders.length === 0) {
                return (
                  <div className="rounded-xl border border-gray-800 bg-[#1f2937]/45 p-12 text-center text-gray-450 font-sans">
                    <p className="text-sm">
                      {currentLanguage === 'ru' 
                        ? 'Никакие записи заказов не найдены в этой категории.' 
                        : 'No order records found in this category.'}
                    </p>
                  </div>
                );
              }

              return (
                <div id="table-admin-order-registry-container" className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1f2937]/45">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#111827] border-b border-gray-800 text-gray-400 font-mono tracking-wider">
                        <th className="p-4">{t('orderId')}</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">
                          {ordersSubTab === 'closed'
                            ? (currentLanguage === 'ru' ? 'Выполнение' : 'Execution')
                            : (currentLanguage === 'ru' ? 'Размещено (Ожидание)' : 'Placement (Waiting)')
                          }
                        </th>
                        <th className="p-4">Citizen Country</th>
                        <th className="p-4">Period</th>
                        <th className="p-4">Fee Charged</th>
                        {ordersSubTab === 'closed' && (
                          <th className="p-4">{currentLanguage === 'ru' ? 'Оператор' : 'Operator'}</th>
                        )}
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Document Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {displayedOrders.map(o => {
                        const isUrgent = isUrgentOrder(o.createdAt, o.status);
                        return (
                          <tr 
                            id={`row-admin-order-${o.id}`} 
                            key={o.id} 
                            className={`transition border-b border-gray-800 ${
                              isUrgent 
                                ? 'bg-red-950/10 hover:bg-red-950/20 border-l-[4px] border-l-red-500 shadow-[inset_4px_0_12px_rgba(239,68,68,0.06)]' 
                                : 'hover:bg-[#111827]/40 border-l-[4px] border-l-transparent'
                            }`}
                          >
                            <td className="p-4 font-mono font-bold text-[#a2e635]">{o.id}</td>
                            <td className="p-4">
                              <p className="font-semibold text-white">{o.clientName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{o.clientEmail}</p>
                            </td>
                            <td className="p-4 font-mono text-gray-300 select-all font-medium">
                              {ordersSubTab === 'closed' ? (
                                <div className="text-[11px] text-[#a2e635] pt-0.5">
                                  <span className="text-gray-500 font-sans font-normal uppercase text-[8px] block tracking-wide">
                                    {currentLanguage === 'ru' ? 'Ответ и исполнение' : 'Response & execution'}:
                                  </span>
                                  <span>{formatResponseTimeAndExecution(o.createdAt, o.completedAt, currentLanguage)}</span>
                                </div>
                              ) : (
                                <div>
                                  <div>{formatPlacementAndWaiting(o.createdAt, o.status, o.completedAt, currentLanguage)}</div>
                                  {isUrgent && (
                                    <div className="mt-1.5 flex items-center space-x-1.5 px-2 py-0.5 rounded bg-red-950/95 text-red-300 border border-red-500/50 w-fit text-[9px] font-bold font-mono tracking-wider animate-pulse uppercase select-none">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                      </span>
                                      <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                      <span>{currentLanguage === 'ru' ? 'СРОЧНО И СИРЕНА (>12 Ч)' : 'URGENT (>12H)'}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="p-4">{translateCountry(o.country, currentLanguage)} <span className="text-[10px] text-gray-400 block mt-0.5 font-sans">{o.visaType} category</span></td>
                            <td className="p-4 font-mono">{o.startDate} ~ {o.endDate} ({o.totalDays} Days)</td>
                            <td className="p-4 font-bold text-white font-mono">
                              {o.currency === 'UZS' ? `${o.totalPrice.toLocaleString()} UZS` : o.currency === 'EUR' ? `€${o.totalPrice}` : o.currency === 'RUB' ? `${o.totalPrice} RUB` : `$${o.totalPrice} USD`}
                            </td>
                            {ordersSubTab === 'closed' && (
                              <td className="p-4">
                                <span className="font-semibold text-white px-2.5 py-1 rounded-md bg-[#111827] border border-gray-800 text-[10px] inline-block font-mono">
                                  {getOperatorText(o.operatorId)}
                                </span>
                              </td>
                            )}
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                o.status === 'Completed'
                                  ? 'bg-lime-950/40 border border-lime-850 text-[#a2e635]'
                                  : o.status === 'In Progress'
                                  ? 'bg-amber-955/40 border border-amber-850 text-amber-400'
                                  : 'bg-gray-805 border border-gray-755 text-gray-400'
                              }`}>
                                <span className={`mr-1.5 h-1 w-1 rounded-full ${o.status === 'Completed' ? 'bg-[#65a30d]' : 'bg-red-500'}`} />
                                {o.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                id={`btn-audit-order-details-${o.id}`}
                                onClick={() => setSelectedAuditOrder(o)}
                                className="p-1 px-2.5 rounded bg-[#111827] border border-gray-800 hover:border-[#65a30d] text-gray-300 hover:text-[#a2e635] transition font-bold font-mono text-[10px]"
                              >
                                Review All Scans
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* TABS E: Raw System Activity Logs panel */}
        {activeTab === 'audit' && (
          <div id="view-admin-audit" className="space-y-6 animate-fade-in font-sans">
            <h3 className="text-lg font-bold text-white tracking-tight">Secured Chronological Operations Ledger</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1f2937]/45">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#111827] text-gray-400 border-b border-gray-800 tracking-wider">
                    <th className="p-4">Log Index</th>
                    <th className="p-4">Timestamp (UTC)</th>
                    <th className="p-4">Acting Officer</th>
                    <th className="p-4">Action Committed</th>
                    <th className="p-4">Operations Parameters details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300">
                  {auditLogs.map((log) => (
                    <tr id={`audit-log-line-${log.id}`} key={log.id} className="hover:bg-[#111827]/50 transition">
                      <td className="p-4 font-bold text-white">{log.id}</td>
                      <td className="p-4 text-gray-400 text-[10px]">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-gray-200 font-sans">{log.userEmail}</td>
                      <td className="p-4">
                        <span className="inline-flex rounded bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635] px-1.5 py-0.5 text-[9px] font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 text-[10px] uppercase font-sans font-medium">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABS F: Blacklist of Violators view */}
        {activeTab === 'blacklist' && (
          <div id="view-admin-blacklist" className="space-y-6 animate-fade-in font-sans pb-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2">
                  <span className="text-red-500 font-bold font-mono">☠</span>
                  <span>{currentLanguage === 'ru' ? 'Чёрный список нарушителей миграционного контроля' : 'Immigration Compliance Violation Blacklist'}</span>
                </h3>
                <p className="text-gray-400 text-xs mt-1">
                  {currentLanguage === 'ru' 
                    ? 'Панель административного мониторинга заблокированных учетных записей иностранных туристов.' 
                    : 'Administrative panel for monitoring dynamically blacklisted tourist accounts and registration locks.'}
                </p>
              </div>
              <div className="bg-red-950/20 border border-red-900/60 text-red-400 text-xs px-3 py-1.5 rounded-xl font-mono font-bold">
                {currentLanguage === 'ru' ? 'ВСЕГО НАКАЗАНО: ' : 'TOTAL LOCKED: '} {blacklistedOrders.length}
              </div>
            </div>

            <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-5 text-sm text-red-300 leading-relaxed font-sans">
              <span className="font-bold block uppercase mb-1 tracking-wider text-red-400 text-xs">
                {currentLanguage === 'ru' ? 'ИНФОРМАЦИЯ О СТАТУСЕ БЛОКИРОВКИ' : 'REGISTRATION LOCK DIRECTIVE'}
              </span>
              <p className="text-gray-400 text-xs">
                {currentLanguage === 'ru'
                  ? 'Присвоение заявке статуса «Отказано в связи с нарушениями» (например, при превышении разрешенного срока пребывания без выезда) автоматически вносит электронный адрес заявителя в черный список. Новые заказы с этого адреса полностью отклоняются базой данных.'
                  : 'Setting order status to "Rejected due to violations" permanently flags the associated tourist mail coordinate. Standard database trigger filters refuse any new document wizard creation forms automatically.'}
              </p>
            </div>

            {blacklistedOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-800 bg-[#1f2937]/10 p-12 text-center text-gray-500">
                <AlertTriangle className="mx-auto h-12 w-12 text-zinc-650 mb-4 animate-pulse" />
                <p className="text-sm max-w-sm mx-auto leading-relaxed">
                  {currentLanguage === 'ru' ? 'Нарушителей не зарегистрировано.' : 'No compliance violations have logged yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1f2937]/45">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#111827] text-gray-400 border-b border-gray-800 tracking-wider font-mono">
                      <th className="p-4">{currentLanguage === 'ru' ? 'ID Заказа' : 'Order ID'}</th>
                      <th className="p-4">{currentLanguage === 'ru' ? 'ФИО Нарушителя' : 'Tourist Full Name'}</th>
                      <th className="p-4">{currentLanguage === 'ru' ? 'Адрес почты' : 'Email Address'}</th>
                      <th className="p-4">{currentLanguage === 'ru' ? 'Паспорт' : 'Passport Number'}</th>
                      <th className="p-4">{currentLanguage === 'ru' ? 'Страна' : 'Country'}</th>
                      <th className="p-4">{currentLanguage === 'ru' ? 'Дата отказа' : 'Infraction Date'}</th>
                      <th className="p-4 text-right">{currentLanguage === 'ru' ? 'Памятка нарушителя' : 'Status Lock'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850 text-gray-300">
                    {blacklistedOrders.map((o) => (
                      <tr id={`admin-blacklist-row-${o.id}`} key={o.id} className="hover:bg-red-950/5 transition">
                        <td className="p-4 font-mono text-red-500 font-bold">{o.id}</td>
                        <td className="p-4 font-bold text-gray-100">{o.clientName}</td>
                        <td className="p-4 font-mono text-gray-400 select-all">{o.clientEmail}</td>
                        <td className="p-4 font-mono text-gray-300">{o.passportNumber || 'N/A'}</td>
                        <td className="p-4 text-gray-300">{translateCountry(o.country, currentLanguage)}</td>
                        <td className="p-4 text-gray-400 font-mono">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          <span className="inline-flex rounded-full bg-red-950/50 border border-red-900/60 text-red-400 px-3 py-1 text-[9px] font-mono tracking-widest font-black uppercase">
                            {currentLanguage === 'ru' ? 'Отказ по нарушениям' : 'Infraction Block'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Audit modal popup for document review */}
      {selectedAuditOrder && (
        <div id="modal-audit-order-details" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827]/85 backdrop-blur-sm font-sans">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-[#1f2937] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-[#111827] flex justify-between items-center select-none">
              <div className="flex items-center space-x-2">
                <FileText className="h-4.5 w-4.5 text-[#a2e635]" />
                <span className="text-sm font-bold text-white font-mono tracking-tight">Order Audit: {selectedAuditOrder.id}</span>
              </div>
              <button
                id="btn-close-audit-modal"
                onClick={() => setSelectedAuditOrder(null)}
                className="text-gray-400 hover:text-white text-xs py-1 px-2.5 border border-gray-800 rounded bg-[#111827] transition hover:bg-gray-800"
              >
                {t('close')}
              </button>
            </div>

            {/* Content list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-mono mb-0.5">Applicant</span>
                  <span className="text-white font-bold block">{selectedAuditOrder.clientName}</span>
                  <span className="text-gray-400 font-mono text-[10px]">{selectedAuditOrder.clientEmail}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-mono mb-0.5">Citizenship</span>
                  <span className="text-white font-bold block">{translateCountry(selectedAuditOrder.country, currentLanguage)} ({selectedAuditOrder.visaType})</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-mono mb-0.5">Registration Dates</span>
                  <span className="text-white font-bold font-mono block">{selectedAuditOrder.startDate} to {selectedAuditOrder.endDate}</span>
                  <span className="text-gray-400 text-[10px]">{selectedAuditOrder.totalDays} Total Days</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase font-mono mb-0.5">Settlement Fee / Tx ID</span>
                  <span className="text-[#a2e635] font-bold font-mono block">
                    {selectedAuditOrder.currency === 'UZS' ? `${selectedAuditOrder.totalPrice.toLocaleString()} UZS` : selectedAuditOrder.currency === 'EUR' ? `€${selectedAuditOrder.totalPrice}` : selectedAuditOrder.currency === 'RUB' ? `${selectedAuditOrder.totalPrice} RUB` : `$${selectedAuditOrder.totalPrice} USD`}
                  </span>
                  <span className="text-gray-400 font-mono text-[10px] block mt-0.5">Receipt: {selectedAuditOrder.paymentTxId || 'Unpaid'}</span>
                </div>
              </div>

              {/* Scanned files previews */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-white border-b border-gray-800 pb-2">Archived Document Attachment Scans</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Passport scan preview */}
                  <div className="bg-[#111827] p-3 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block mb-2 font-mono uppercase font-bold text-[#a2e635]">{t('passportScanLabel')}</span>
                    {selectedAuditOrder.passportScan.startsWith('data:image/') ? (
                      <img src={selectedAuditOrder.passportScan} alt="Passport Scan audit file" className="h-32 w-full object-contain bg-[#111827] rounded" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-32 bg-[#1f2937] flex items-center justify-center rounded text-gray-500 font-mono text-[9px] uppercase font-bold">[ Passport Mock ID AA8942110 ]</div>
                    )}
                  </div>

                  {/* Stamp entry scan preview */}
                  <div className="bg-[#111827] p-3 rounded-xl border border-gray-800">
                    <span className="text-[10px] text-gray-400 block mb-2 font-mono uppercase font-bold text-[#a2e635]">{t('arrivalStampLabel')}</span>
                    {selectedAuditOrder.arrivalStamp.startsWith('data:image/') ? (
                      <img src={selectedAuditOrder.arrivalStamp} alt="Entry boundary stamp scanner file" className="h-32 w-full object-contain bg-[#111827] rounded" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="h-32 bg-[#1f2937] flex items-center justify-center rounded text-gray-500 font-mono text-[9px] uppercase font-bold">[ Border Stamp Stamp_seed.png ]</div>
                    )}
                  </div>

                  {/* Optional Visa scan */}
                  {selectedAuditOrder.visaType === 'Visa' && selectedAuditOrder.visaScan && (
                    <div className="bg-[#111827] p-3 rounded-xl border border-gray-800 sm:col-span-2">
                      <span className="text-[10px] text-gray-400 block mb-2 font-mono uppercase font-bold text-[#a2e635]">{t('visaScanLabel')}</span>
                      {selectedAuditOrder.visaScan.startsWith('data:image/') ? (
                        <img src={selectedAuditOrder.visaScan} alt="eVisa confirmation entry file" className="h-32 w-full object-contain bg-[#111827] rounded" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-32 bg-[#1f2937] flex items-center justify-center rounded text-gray-500 font-mono text-[9px] uppercase font-bold">[ Visa sticker eVisa-8830113 ]</div>
                      )}
                    </div>
                  )}

                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#111827] text-right select-none">
              <button
                id="btn-audit-modal-ok"
                onClick={() => setSelectedAuditOrder(null)}
                className="rounded-xl bg-[#65a30d] hover:bg-[#a2e635] text-[#111827] font-extrabold px-5 py-2 text-xs transition"
              >
                Verification Audited OK ✔
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
