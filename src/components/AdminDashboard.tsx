import React, { useState, useEffect } from 'react';
import { 
  BarChart, Users, FileText, Key, Trash2, Plus, 
  HelpCircle, CheckCircle, AlertTriangle, Coins, RefreshCw, Eye, Languages,
  Newspaper, Scale, UploadCloud, Edit3, Image as ImageIcon, Send, Sparkles, BookOpen, ExternalLink, Star, Download, Search,
  ArrowRight, ShieldCheck, Copy, Check, Calendar, History, FileCode
} from 'lucide-react';
import { Order, User, SystemConfig, LanguageCode, UserRole, TouristNews, ConsentRecord } from '../types';
import { 
  getOrders, getUsers, getConfig, saveConfig, addStaffUser, 
  deleteStaffUser, resetStaffPassword, updateStaffUser, getAuditLogs, AuditLog,
  getNews, addNewsArticle, updateNewsArticle, deleteNewsArticle, toggleNewsFeatured,
  getLegalKnowledgeBase, saveLegalKnowledgeBase, seedDefaultNews,
  deleteOrder, deleteMultipleOrders, getConsents, addAuditLog
} from '../db';
import { DEFAULT_LEGAL_KNOWLEDGE_BASE } from '../defaultContent';
import { getActiveDocumentVersions } from '../locales/legal';
import { translations, translateCountry } from '../translations';
import { formatPlacementAndWaiting, formatResponseTimeAndExecution, isUrgentOrder } from './ClientDashboard';
import { BrandLogo } from './BrandLogo';
import AppFooter from './AppFooter';
import AdminClientStagesIndicator from './AdminClientStagesIndicator';

interface AdminDashboardProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentUser: User;
  onLogout: () => void;
  onProfileUpdate: (user: User) => void;
  onNavigate?: (path: string) => void;
}

export default function AdminDashboard({ currentLanguage, setLanguage, currentUser, onLogout, onProfileUpdate, onNavigate }: AdminDashboardProps) {
  // Navigation tabs: 'stats' | 'users' | 'content' | 'news' | 'legal_db' | 'audit' | 'orders' | 'blacklist' | 'clients' | 'consents'
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'content' | 'news' | 'legal_db' | 'audit' | 'orders' | 'blacklist' | 'clients' | 'consents'>('stats');

  const [orders, setOrders] = useState<Order[]>([]);
  const blacklistedOrders = orders.filter(o => o.status === 'Rejected due to violations');
  const [staff, setStaff] = useState<Array<User & { passwordHash: string }>>([]);
  const [clients, setClients] = useState<User[]>(() => getUsers().filter(u => u.role === 'Client'));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [config, setConfig] = useState<SystemConfig>(getConfig());
  const [consentsList, setConsentsList] = useState<ConsentRecord[]>(() => getConsents());
  const [consentSearchQuery, setConsentSearchQuery] = useState('');
  const [inspectedConsent, setInspectedConsent] = useState<ConsentRecord | null>(null);
  const [copiedConsentId, setCopiedConsentId] = useState<string | null>(null);

  // Document versioning modal state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionBumpDoc, setVersionBumpDoc] = useState<'privacy' | 'terms' | 'cookies'>('privacy');
  const [newDocVersion, setNewDocVersion] = useState('');
  const [newDocEffectiveDate, setNewDocEffectiveDate] = useState('');
  const [versionBumpReason, setVersionBumpReason] = useState('');

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  // News Management States
  const [newsList, setNewsList] = useState<TouristNews[]>(() => getNews());
  const [newsTitle, setNewsTitle] = useState('');
  const [newsIllustration, setNewsIllustration] = useState('');
  const [newsBody, setNewsBody] = useState('');
  const [newsSummary, setNewsSummary] = useState('');
  const [newsCategory, setNewsCategory] = useState('Законодательство');
  const [newsAuthor, setNewsAuthor] = useState('Администрация RegistApp');
  const [newsIsFeatured, setNewsIsFeatured] = useState(true);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [showNewsForm, setShowNewsForm] = useState(false);

  // Legal Knowledge Base Management States
  const [legalDbText, setLegalDbText] = useState(() => getLegalKnowledgeBase());
  const [testQuery, setTestQuery] = useState('');
  const [testQueryReply, setTestQueryReply] = useState('');
  const [isTestingQuery, setIsTestingQuery] = useState(false);

  // Selected order for the detailed audit review popup
  const [selectedAuditOrder, setSelectedAuditOrder] = useState<Order | null>(null);

  // Tab within Immigration Orders Audit Record (open vs closed)
  const [ordersSubTab, setOrdersSubTab] = useState<'open' | 'closed'>('open');

  // Order deletion and management states
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [orderDeleteFeedback, setOrderDeleteFeedback] = useState<string | null>(null);

  // Month selection for RegistApp Command Center
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });

  const handleDeleteSingleOrder = async (orderId: string) => {
    setIsDeletingOrder(true);
    try {
      const ok = deleteOrder(orderId, currentUser.email);
      if (ok) {
        setOrders(prev => prev.filter(o => o.id !== orderId));
        setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
        setOrderToDelete(null);
        if (selectedAuditOrder?.id === orderId) {
          setSelectedAuditOrder(null);
        }
        setOrderDeleteFeedback(
          currentLanguage === 'ru' 
            ? `Заказ #${orderId} успешно удален из реестра` 
            : `Order #${orderId} successfully deleted`
        );
        setTimeout(() => setOrderDeleteFeedback(null), 4000);
      }
    } catch (err) {
      console.error('Delete order error:', err);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  const handleDeleteMultipleOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsDeletingOrder(true);
    try {
      const count = deleteMultipleOrders(selectedOrderIds, currentUser.email);
      const deletedSet = new Set(selectedOrderIds);
      setOrders(prev => prev.filter(o => !deletedSet.has(o.id)));
      setSelectedOrderIds([]);
      setShowBatchDeleteModal(false);
      setOrderDeleteFeedback(
        currentLanguage === 'ru'
          ? `Успешно удалено ${count} заказов из реестра`
          : `Successfully deleted ${count} orders`
      );
      setTimeout(() => setOrderDeleteFeedback(null), 4000);
    } catch (err) {
      console.error('Bulk delete orders error:', err);
    } finally {
      setIsDeletingOrder(false);
    }
  };

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
    setClients(getUsers().filter(u => u.role === 'Client'));
    setAuditLogs(getAuditLogs());
    setConsentsList(getConsents());
    
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
    setNewsList(getNews());
    setLegalDbText(getLegalKnowledgeBase());
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    syncAllData();
    setTimeout(() => {
      window.location.reload();
    }, 150);
  };

  const showFeedback = (text: string, isError = false) => {
    setTerminalMessage({ text, isError });
    setTimeout(() => setTerminalMessage({ text: '', isError: false }), 4500);
  };

  // News Handlers
  const handleSaveNews = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle.trim() || !newsBody.trim()) {
      showFeedback('Заполните заголовок и текст новости.', true);
      return;
    }
    const finalIllustration = newsIllustration.trim() || 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop';
    const finalSummary = newsSummary.trim() || (newsBody.trim().length > 160 ? newsBody.trim().slice(0, 160) + '...' : newsBody.trim());

    if (editingNewsId) {
      updateNewsArticle(editingNewsId, {
        title: newsTitle.trim(),
        illustration: finalIllustration,
        body: newsBody.trim(),
        summary: finalSummary,
        category: newsCategory,
        author: newsAuthor.trim() || 'Администрация RegistApp',
        isFeatured: newsIsFeatured
      });
      showFeedback('Новость успешно обновлена!');
    } else {
      addNewsArticle({
        title: newsTitle.trim(),
        illustration: finalIllustration,
        body: newsBody.trim(),
        summary: finalSummary,
        category: newsCategory,
        author: newsAuthor.trim() || 'Администрация RegistApp',
        isFeatured: newsIsFeatured
      });
      showFeedback('Новость успешно опубликована в ленте!');
    }

    // Reset form
    setNewsTitle('');
    setNewsIllustration('');
    setNewsBody('');
    setNewsSummary('');
    setEditingNewsId(null);
    setShowNewsForm(false);
    setNewsList(getNews());
  };

  const handleEditNews = (item: TouristNews) => {
    setEditingNewsId(item.id);
    setNewsTitle(item.title);
    setNewsIllustration(item.illustration);
    setNewsBody(item.body);
    setNewsSummary(item.summary);
    setNewsCategory(item.category);
    setNewsAuthor(item.author || '');
    setNewsIsFeatured(item.isFeatured ?? true);
    setShowNewsForm(true);
  };

  const handleDeleteNews = (id: string) => {
    if (window.confirm('Вы действительно хотите удалить эту новость?')) {
      deleteNewsArticle(id);
      setNewsList(getNews());
      showFeedback('Новость удалена.');
    }
  };

  const handleToggleFeatured = (id: string) => {
    toggleNewsFeatured(id);
    setNewsList(getNews());
  };

  const handleFileUploadIllustration = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        setNewsIllustration(dataUrl);
        showFeedback(`Иллюстрация "${file.name}" загружена!`);
      }
    };
    reader.readAsDataURL(file);
  };

  // Legal Knowledge Base Handlers
  const handleSaveLegalDb = () => {
    try {
      saveLegalKnowledgeBase(legalDbText);
      showFeedback('База правовой информации для ИИ саппорта успешно сохранена!');
    } catch (e: any) {
      showFeedback(e.message || 'Ошибка сохранения базы знаний.', true);
    }
  };

  const handleResetLegalDb = () => {
    if (window.confirm('Сбросить базу знаний к официальному эталону законодательства Республики Узбекистан?')) {
      setLegalDbText(DEFAULT_LEGAL_KNOWLEDGE_BASE);
      saveLegalKnowledgeBase(DEFAULT_LEGAL_KNOWLEDGE_BASE);
      showFeedback('База знаний сброшена к официальному эталону РУз.');
    }
  };

  const handleFileUploadLegalDb = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        setLegalDbText(text);
        saveLegalKnowledgeBase(text);
        showFeedback(`Файл "${file.name}" успешно загружен и применен в базу знаний!`);
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadLegalDb = () => {
    const blob = new Blob([legalDbText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uzbekistan-legal-knowledge-base-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTestAiQuery = async () => {
    if (!testQuery.trim() || isTestingQuery) return;
    setIsTestingQuery(true);
    setTestQueryReply('');
    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: testQuery,
          language: currentLanguage,
          legalKnowledgeBase: legalDbText
        })
      });
      const data = await res.json();
      setTestQueryReply(data.reply || 'Ответ не получен.');
    } catch (err: any) {
      setTestQueryReply(`Ошибка теста: ${err.message}`);
    } finally {
      setIsTestingQuery(false);
    }
  };

  // Content Management: Save Config
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated: SystemConfig = {
        ...config,
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
        },
        legalDocumentVersions: config.legalDocumentVersions,
        legalKnowledgeBase: config.legalKnowledgeBase,
        legalKnowledgeBaseUpdatedAt: config.legalKnowledgeBaseUpdatedAt,
      };
      saveConfig(updated);
      setConfig(updated);
      showFeedback('Completed live content synchronization across all tourist modules.');
    } catch (err: any) {
      showFeedback(err.message || 'Error occurred while deploying file updates.', true);
    }
  };

  const openVersionModalFor = (docType: 'privacy' | 'terms' | 'cookies') => {
    const activeVersions = getActiveDocumentVersions(config);
    setVersionBumpDoc(docType);
    let curVer = '1.0';
    if (docType === 'privacy') curVer = activeVersions.privacyVersion;
    else if (docType === 'terms') curVer = activeVersions.termsVersion;
    else curVer = activeVersions.cookiesVersion;

    const parts = curVer.split('.');
    let nextVer = '1.1';
    if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
      nextVer = `${parts[0]}.${parseInt(parts[1]) + 1}`;
    } else {
      nextVer = `${curVer}.1`;
    }

    setNewDocVersion(nextVer);
    setNewDocEffectiveDate(new Date().toISOString().slice(0, 10));
    setVersionBumpReason('');
    setIsVersionModalOpen(true);
  };

  const handleBumpDocumentVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocVersion.trim() || !newDocEffectiveDate.trim()) {
      showFeedback(currentLanguage === 'ru' ? 'Заполните номер версии и дату вступления в силу' : 'Please provide version and date', true);
      return;
    }

    try {
      const activeVersions = getActiveDocumentVersions(config);
      const currentVersions = config.legalDocumentVersions || {
        privacyVersion: activeVersions.privacyVersion,
        privacyDate: activeVersions.effectiveDates.privacy,
        termsVersion: activeVersions.termsVersion,
        termsDate: activeVersions.effectiveDates.terms,
        cookiesVersion: activeVersions.cookiesVersion,
        cookiesDate: activeVersions.effectiveDates.cookies,
      };

      const updatedVersions = {
        ...currentVersions,
        ...(versionBumpDoc === 'privacy' ? { privacyVersion: newDocVersion.trim(), privacyDate: newDocEffectiveDate.trim() } : {}),
        ...(versionBumpDoc === 'terms' ? { termsVersion: newDocVersion.trim(), termsDate: newDocEffectiveDate.trim() } : {}),
        ...(versionBumpDoc === 'cookies' ? { cookiesVersion: newDocVersion.trim(), cookiesDate: newDocEffectiveDate.trim() } : {}),
      };

      const updatedConfig: SystemConfig = {
        ...config,
        legalDocumentVersions: updatedVersions,
      };

      saveConfig(updatedConfig);
      setConfig(updatedConfig);

      const docName = versionBumpDoc === 'privacy' 
        ? (currentLanguage === 'ru' ? 'Политики конфиденциальности' : 'Privacy Policy')
        : versionBumpDoc === 'terms' 
        ? (currentLanguage === 'ru' ? 'Публичной оферты' : 'Public Offer')
        : (currentLanguage === 'ru' ? 'Политики cookies' : 'Cookies Policy');

      addAuditLog(
        currentUser.email,
        'Legal Document Version Bumped',
        `Увеличена редакция ${docName} до v${newDocVersion.trim()} (вступает в силу: ${newDocEffectiveDate.trim()}). Причина: ${versionBumpReason.trim() || 'Плановое обновление'}`
      );

      setIsVersionModalOpen(false);
      showFeedback(
        currentLanguage === 'ru'
          ? `Версия ${docName} успешно обновлена до v${newDocVersion.trim()}! Все новые заказы будут фиксировать согласие с этой редакцией.`
          : `Version for ${docName} updated to v${newDocVersion.trim()}! New orders will bind consents to this version.`
      );
    } catch (err: any) {
      showFeedback(err?.message || 'Error updating document version', true);
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
            <BrandLogo id="admin-header-logo" iconOnly={true} />
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

            {/* Refresh Button */}
            <button
              id="btn-admin-refresh"
              onClick={handleRefresh}
              title={currentLanguage === 'ru' ? 'Обновить страницу' : currentLanguage === 'fr' ? 'Actualiser la page' : 'Refresh page'}
              className="flex items-center space-x-1.5 sm:space-x-2 rounded-xl bg-gradient-to-r from-[#65a30d] to-[#84cc16] hover:from-[#84cc16] hover:to-[#a2e635] px-3.5 py-2 text-xs font-bold text-gray-950 border border-[#a2e635]/60 shadow-md shadow-[#65a30d]/25 hover:shadow-lg hover:shadow-[#a2e635]/30 transition-all duration-150 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-gray-950 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

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
                : 'bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635] animate-pulse'
            }`}
          >
            {terminalMessage.isError ? <AlertTriangle className="h-4.5 w-4.5 shrink-0" /> : <CheckCircle className="h-4.5 w-4.5 shrink-0 text-[#a2e635]" />}
            <span>{terminalMessage.text}</span>
          </div>
        )}

        {/* Outer Tabs control */}
        <div id="tabs-admin-control" className="flex flex-wrap gap-2 mb-8 bg-[#1f2937]/45 p-1.5 rounded-xl border border-gray-800 max-w-fit select-none">
          <button
            id="btn-admin-tab-stats"
            onClick={() => setActiveTab('stats')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'stats' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <BarChart className="h-4 w-4" />
            <span>{t('statsTab')}</span>
          </button>
          <button
            id="btn-admin-tab-news"
            onClick={() => setActiveTab('news')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'news' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Newspaper className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Новости туризма' : currentLanguage === 'fr' ? 'Actualités' : 'Tourism News'}</span>
            <span className="text-[9px] bg-black/30 text-white font-mono rounded px-1.5 py-0.5 ml-1">
              {newsList.length}
            </span>
          </button>
          <button
            id="btn-admin-tab-legal-db"
            onClick={() => setActiveTab('legal_db')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'legal_db' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Scale className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Правовая база ИИ' : currentLanguage === 'fr' ? 'Base Juridique IA' : 'AI Legal DB'}</span>
          </button>
          <button
            id="btn-admin-tab-content"
            onClick={() => setActiveTab('content')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'content' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{t('contentTab')}</span>
          </button>
          <button
            id="btn-admin-tab-users"
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'users' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>{t('userTab')}</span>
          </button>
          <button
            id="btn-admin-tab-orders"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'orders' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Реестр заказов' : 'Order Registry'}</span>
          </button>
          <button
            id="btn-admin-tab-clients"
            onClick={() => setActiveTab('clients')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'clients' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Клиенты и стадии заказов' : 'Clients & Order Funnel'}</span>
            <span className="text-[9px] bg-black/30 text-white font-mono rounded px-1.5 py-0.5 ml-1">
              {clients.length}
            </span>
          </button>
          <button
            id="btn-admin-tab-audit"
            onClick={() => setActiveTab('audit')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'audit' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
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
          <button
            id="btn-admin-tab-consents"
            onClick={() => setActiveTab('consents')}
            className={`flex items-center space-x-2 rounded-lg px-4 py-2 text-xs font-bold transition ${
              activeTab === 'consents' ? 'bg-[#7A9A3C] text-[#111827] font-extrabold' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Реестр согласий' : 'Consents'}</span>
            <span className="text-[9px] bg-black/30 text-white font-mono rounded px-1.5 py-0.5 ml-1">
              {consentsList.length}
            </span>
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

            {/* Registered Clients & Order Stages Pipeline Section */}
            <AdminClientStagesIndicator
              clients={clients}
              orders={orders}
              currentLanguage={currentLanguage}
              onSelectAuditOrder={(order) => {
                setSelectedAuditOrder(order);
                setActiveTab('audit');
              }}
              onClientDeleted={syncAllData}
            />
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

        {/* TABS: Tourist News Management Panel */}
        {activeTab === 'news' && (
          <div id="view-admin-news" className="space-y-6 animate-fade-in font-sans">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#171A1A] border border-[#2B3232] rounded-2xl p-5">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Newspaper className="h-5 w-5 text-[#90B24A]" />
                  <span>{currentLanguage === 'ru' ? 'Управление новостями туризма Узбекистана' : currentLanguage === 'fr' ? 'Gestion des actualités touristiques' : 'Uzbekistan Tourism News Management'}</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                  {currentLanguage === 'ru' 
                    ? 'Публикация новостей для иностранных гостей. Главные 3 новости автоматически выводятся на стартовой странице клиентов, остальные доступны в архиве.' 
                    : 'Publish news updates for foreign guests. Top 3 featured stories appear on the client dashboard; others remain in the archive.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  id="btn-admin-seed-10-news"
                  onClick={() => {
                    const seeded = seedDefaultNews(true);
                    setNewsList(seeded);
                    showFeedback(currentLanguage === 'ru' ? '✨ Успешно сгенерировано 10 официальных новостей о туризме в Узбекистане с 10 иллюстрациями!' : '✨ Successfully generated 10 tourist news articles with 10 illustrations!');
                  }}
                  className="flex items-center space-x-1.5 bg-[#23292A] hover:bg-[#2B3232] text-[#90B24A] border border-[#7A9A3C]/40 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition"
                  title="Сгенерировать 10 новостей о туризме в Узбекистане с иллюстрациями"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{currentLanguage === 'ru' ? 'Сгенерировать 10 новостей' : 'Generate 10 News'}</span>
                </button>

                <button
                  id="btn-admin-toggle-news-form"
                  onClick={() => {
                    if (showNewsForm && editingNewsId) {
                      setEditingNewsId(null);
                      setNewsTitle('');
                      setNewsIllustration('');
                      setNewsBody('');
                      setNewsSummary('');
                    }
                    setShowNewsForm(!showNewsForm);
                  }}
                  className="flex items-center space-x-2 bg-[#7A9A3C] hover:bg-[#5E7A2A] text-black font-bold px-4 py-2.5 rounded-xl text-xs transition duration-200"
                >
                  {showNewsForm ? (
                    <span>{currentLanguage === 'ru' ? 'Скрыть форму' : 'Close Form'}</span>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>{currentLanguage === 'ru' ? 'Добавить публикацию' : 'Create Article'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* News Creation / Edit Form */}
            {showNewsForm && (
              <form 
                id="form-admin-news-upload" 
                onSubmit={handleSaveNews} 
                className="bg-[#171A1A] border border-[#7A9A3C]/40 rounded-2xl p-6 space-y-5 shadow-xl shadow-black/50"
              >
                <div className="flex items-center justify-between border-b border-[#2B3232] pb-3">
                  <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                    <Edit3 className="h-4 w-4 text-[#90B24A]" />
                    <span>{editingNewsId ? (currentLanguage === 'ru' ? 'Редактирование новости' : 'Edit Article') : (currentLanguage === 'ru' ? 'Загрузка новой публикации' : 'New Publication Form')}</span>
                  </h4>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {editingNewsId ? `ID: ${editingNewsId}` : (currentLanguage === 'ru' ? 'Новая запись' : 'Draft')}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Left Column: Title, Category, Author, Featured */}
                  <div className="md:col-span-2 space-y-4">
                    {/* Title */}
                    <div>
                      <label htmlFor="input-news-title" className="block text-xs font-semibold text-gray-300 mb-1.5">
                        {currentLanguage === 'ru' ? 'Заголовок новости' : 'Article Title'} <span className="text-red-400">*</span>
                      </label>
                      <input
                        id="input-news-title"
                        type="text"
                        required
                        value={newsTitle}
                        onChange={(e) => setNewsTitle(e.target.value)}
                        placeholder={currentLanguage === 'ru' ? 'Например: Безвизовый въезд продлен до 30 дней для 90+ стран' : 'e.g. Visa-free corridor updated for international guests'}
                        className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] px-4 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Category */}
                      <div>
                        <label htmlFor="select-news-category" className="block text-xs font-semibold text-gray-300 mb-1.5">
                          {currentLanguage === 'ru' ? 'Категория' : 'Category'}
                        </label>
                        <select
                          id="select-news-category"
                          value={newsCategory}
                          onChange={(e) => setNewsCategory(e.target.value)}
                          className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#7A9A3C] transition"
                        >
                          <option value="Законодательство">Законодательство (Regulations)</option>
                          <option value="Визы и границы">Визы и границы (Visas & Borders)</option>
                          <option value="Транспорт и поезда">Транспорт и поезда (Transport)</option>
                          <option value="Туризм и культура">Туризм и культура (Tourism & Culture)</option>
                          <option value="События">События и праздники (Events)</option>
                        </select>
                      </div>

                      {/* Author */}
                      <div>
                        <label htmlFor="input-news-author" className="block text-xs font-semibold text-gray-300 mb-1.5">
                          {currentLanguage === 'ru' ? 'Источник / Автор' : 'Author / Agency'}
                        </label>
                        <input
                          id="input-news-author"
                          type="text"
                          value={newsAuthor}
                          onChange={(e) => setNewsAuthor(e.target.value)}
                          placeholder="Администрация RegistApp"
                          className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] px-3.5 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                        />
                      </div>
                    </div>

                    {/* Summary */}
                    <div>
                      <label htmlFor="input-news-summary" className="block text-xs font-semibold text-gray-300 mb-1.5">
                        {currentLanguage === 'ru' ? 'Краткое содержание (аннотация)' : 'Short Summary'}
                      </label>
                      <textarea
                        id="input-news-summary"
                        rows={2}
                        value={newsSummary}
                        onChange={(e) => setNewsSummary(e.target.value)}
                        placeholder={currentLanguage === 'ru' ? 'Одно-два предложения для карточки новости в общем списке...' : 'Brief 1-2 sentence preview for cards...'}
                        className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] p-3 text-xs text-white placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Right Column: Illustration Upload & Presets */}
                  <div className="space-y-3">
                    <label className="block text-xs font-semibold text-gray-300">
                      {currentLanguage === 'ru' ? 'Иллюстрация новости' : 'Article Illustration'}
                    </label>

                    {/* Preview box */}
                    <div className="relative rounded-xl overflow-hidden border border-[#2B3232] bg-[#0E1010] h-36 flex items-center justify-center group">
                      {newsIllustration ? (
                        <>
                          <img 
                            src={newsIllustration} 
                            alt="Preview" 
                            className="w-full h-full object-cover" 
                          />
                          <button
                            type="button"
                            onClick={() => setNewsIllustration('')}
                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-red-900 text-white rounded-lg text-xs transition"
                            title="Удалить иллюстрацию"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center p-3 text-gray-500">
                          <ImageIcon className="h-8 w-8 mx-auto mb-1 text-gray-600" />
                          <span className="text-[11px] block">{currentLanguage === 'ru' ? 'Иллюстрация не выбрана' : 'No image selected'}</span>
                          <span className="text-[10px] text-gray-600 block">{currentLanguage === 'ru' ? 'Будет использовано фото по умолчанию' : 'Default photo will apply'}</span>
                        </div>
                      )}
                    </div>

                    {/* Upload button */}
                    <label className="flex items-center justify-center space-x-2 border border-dashed border-[#2B3232] hover:border-[#7A9A3C] bg-[#1F2424]/60 hover:bg-[#1F2424] text-gray-300 rounded-xl py-2 px-3 text-xs cursor-pointer transition">
                      <UploadCloud className="h-4 w-4 text-[#90B24A]" />
                      <span>{currentLanguage === 'ru' ? 'Загрузить файл с устройства' : 'Upload image file'}</span>
                      <input
                        id="input-file-news-illustration"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUploadIllustration}
                      />
                    </label>

                    {/* Direct URL input */}
                    <input
                      id="input-news-illustration-url"
                      type="url"
                      value={newsIllustration}
                      onChange={(e) => setNewsIllustration(e.target.value)}
                      placeholder="Или вставьте URL картинки..."
                      className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] px-3 py-1.5 text-[11px] text-white placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                    />

                    {/* Quick photo presets */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-500 font-mono block">{currentLanguage === 'ru' ? 'Быстрые фото Узбекистана:' : 'Presets:'}</span>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setNewsIllustration('https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=1200&auto=format&fit=crop')}
                          className="text-[10px] bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] px-2 py-0.5 rounded transition"
                        >
                          Регистан
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewsIllustration('https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?q=80&w=1200&auto=format&fit=crop')}
                          className="text-[10px] bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] px-2 py-0.5 rounded transition"
                        >
                          Бухара
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewsIllustration('https://images.unsplash.com/photo-1596484552834-6a58f850e0a1?q=80&w=1200&auto=format&fit=crop')}
                          className="text-[10px] bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] px-2 py-0.5 rounded transition"
                        >
                          Хива
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewsIllustration('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200&auto=format&fit=crop')}
                          className="text-[10px] bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] px-2 py-0.5 rounded transition"
                        >
                          Чимган
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body Text */}
                <div>
                  <label htmlFor="textarea-news-body" className="block text-xs font-semibold text-gray-300 mb-1.5">
                    {currentLanguage === 'ru' ? 'Тело новости (полный текст)' : 'Article Body (Full text)'} <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="textarea-news-body"
                    required
                    rows={8}
                    value={newsBody}
                    onChange={(e) => setNewsBody(e.target.value)}
                    placeholder={currentLanguage === 'ru' ? 'Введите подробный текст публикации. Поддерживаются абзацы, выдержки из законов и инструкции для туристов...' : 'Enter the complete article content...'}
                    className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] p-4 text-xs text-white placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition font-sans leading-relaxed"
                  />
                </div>

                {/* Featured toggle & Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-[#2B3232]">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      id="checkbox-news-featured"
                      type="checkbox"
                      checked={newsIsFeatured}
                      onChange={(e) => setNewsIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded accent-[#7A9A3C]"
                    />
                    <span className="text-xs text-gray-300 flex items-center space-x-1.5">
                      <Star className={`h-3.5 w-3.5 ${newsIsFeatured ? 'text-amber-400 fill-amber-400' : 'text-gray-500'}`} />
                      <span>{currentLanguage === 'ru' ? 'Главная новость (включать в топ-3 на стартовой странице)' : 'Featured Story (display in Top 3)'}</span>
                    </span>
                  </label>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewsForm(false);
                        setEditingNewsId(null);
                      }}
                      className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-[#23292A] transition"
                    >
                      {currentLanguage === 'ru' ? 'Отмена' : 'Cancel'}
                    </button>
                    <button
                      id="btn-admin-submit-news"
                      type="submit"
                      className="flex items-center space-x-2 bg-[#7A9A3C] hover:bg-[#5E7A2A] text-black font-bold px-5 py-2 rounded-xl text-xs transition duration-200"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{editingNewsId ? (currentLanguage === 'ru' ? 'Сохранить изменения' : 'Save Changes') : (currentLanguage === 'ru' ? 'Опубликовать новость' : 'Publish Article')}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* List of News Articles */}
            <div className="bg-[#171A1A] border border-[#2B3232] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2B3232] pb-3">
                <span className="text-xs font-semibold text-gray-300 font-mono uppercase tracking-wider">
                  {currentLanguage === 'ru' ? `Все публикации (${newsList.length})` : `All News Publications (${newsList.length})`}
                </span>
                <span className="text-[11px] text-gray-400">
                  {currentLanguage === 'ru' ? 'Топ-3 отмеченные звездой выводятся на стартовой странице' : 'Top 3 marked with star are featured on client dashboard'}
                </span>
              </div>

              {newsList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Newspaper className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                  <p className="text-xs">{currentLanguage === 'ru' ? 'Список новостей пуст. Нажмите «Добавить публикацию» выше.' : 'No news found. Click "Create Article" above.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newsList.map((item) => (
                    <div 
                      key={item.id} 
                      className="rounded-xl border border-[#2B3232] bg-[#0E1010] overflow-hidden flex flex-col justify-between hover:border-[#7A9A3C]/40 transition group"
                    >
                      <div>
                        {/* Illustration */}
                        <div className="h-36 w-full relative overflow-hidden bg-[#171A1A]">
                          <img 
                            src={item.illustration} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                            <span className="text-[10px] bg-black/80 backdrop-blur-md text-[#90B24A] font-semibold px-2 py-0.5 rounded border border-[#2B3232]">
                              {item.category}
                            </span>
                            {item.isFeatured && (
                              <span className="text-[10px] bg-amber-500/90 text-black font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                                <Star className="h-2.5 w-2.5 fill-black" />
                                <span>TOP 3</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-4 space-y-2">
                          <span className="text-[10px] text-gray-500 font-mono block">{item.publishedAt} • {item.author || 'RegistApp'}</span>
                          <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-[#90B24A] transition-colors leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">
                            {item.summary || item.body}
                          </p>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-3 border-t border-[#2B3232] flex items-center justify-between bg-[#171A1A]/50">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(item.id)}
                          className={`text-[11px] flex items-center space-x-1 px-2 py-1 rounded transition ${
                            item.isFeatured 
                              ? 'text-amber-400 bg-amber-500/10 hover:bg-amber-500/20' 
                              : 'text-gray-400 hover:text-amber-300 hover:bg-[#23292A]'
                          }`}
                          title={item.isFeatured ? 'Снять статус главной' : 'Сделать главной'}
                        >
                          <Star className={`h-3 w-3 ${item.isFeatured ? 'fill-amber-400' : ''}`} />
                          <span>{item.isFeatured ? 'В топе' : 'В архив'}</span>
                        </button>

                        <div className="flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => handleEditNews(item)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#23292A] rounded-lg transition"
                            title="Редактировать новость"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteNews(item.id)}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-lg transition"
                            title="Удалить новость"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TABS: Legal Knowledge Base for Tourist AI Support */}
        {activeTab === 'legal_db' && (
          <div id="view-admin-legal-db" className="space-y-6 animate-fade-in font-sans">
            {/* Header banner */}
            <div className="bg-[#171A1A] border border-[#2B3232] rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center space-x-2">
                    <Scale className="h-5 w-5 text-[#90B24A]" />
                    <span>{currentLanguage === 'ru' ? 'База данных правовой информации для ИИ саппорта' : currentLanguage === 'fr' ? 'Base de données juridique pour l\'IA d\'assistance' : 'Legal Knowledge Base for Tourist AI Support'}</span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-3xl leading-relaxed">
                    {currentLanguage === 'ru'
                      ? 'Официальный нормативно-правовой корпус законодательства Республики Узбекистан по миграционному учету иностранных граждан (ПКМ № 433 от 10.07.2020 г., Закон «О туризме», статья 224 КоАП РУз). Наш серверный ИИ консультирует туристов строго на основе этих данных.'
                      : 'Official legal corpus of the Republic of Uzbekistan migration regulations. The server-side Gemini AI consults foreign visitors strictly grounded in these articles.'}
                  </p>
                </div>

                {/* Metrics */}
                <div className="flex items-center space-x-4 bg-[#0E1010] border border-[#2B3232] px-4 py-2 rounded-xl shrink-0">
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase font-mono block">Объём базы</span>
                    <span className="text-xs font-mono font-bold text-[#90B24A]">
                      {legalDbText.length.toLocaleString()} симв. (~{Math.round(legalDbText.length / 5)} сл.)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171A1A] border border-[#2B3232] p-3.5 rounded-xl">
              <div className="flex flex-wrap items-center gap-2">
                {/* File Upload Button */}
                <label className="flex items-center space-x-2 bg-[#23292A] hover:bg-[#2B3232] text-white border border-[#3E4747] px-3.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition">
                  <UploadCloud className="h-4 w-4 text-[#90B24A]" />
                  <span>{currentLanguage === 'ru' ? 'Загрузить файл (.txt / .md / .json)' : 'Upload DB File'}</span>
                  <input
                    id="input-file-legal-db"
                    type="file"
                    accept=".txt,.md,.json,.doc,.docx"
                    className="hidden"
                    onChange={handleFileUploadLegalDb}
                  />
                </label>

                {/* Download Backup */}
                <button
                  type="button"
                  onClick={handleDownloadLegalDb}
                  className="flex items-center space-x-1.5 bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] px-3 py-2 rounded-xl text-xs transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{currentLanguage === 'ru' ? 'Скачать копию' : 'Export .md'}</span>
                </button>

                {/* Reset to standard */}
                <button
                  type="button"
                  onClick={handleResetLegalDb}
                  className="flex items-center space-x-1.5 bg-[#0E1010] hover:bg-amber-950/40 text-amber-400 border border-amber-900/40 px-3 py-2 rounded-xl text-xs transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{currentLanguage === 'ru' ? 'Сбросить к эталону РУз' : 'Reset to Official Standard'}</span>
                </button>
              </div>

              {/* Save Button */}
              <button
                id="btn-admin-save-legal-db"
                type="button"
                onClick={handleSaveLegalDb}
                className="flex items-center space-x-2 bg-[#7A9A3C] hover:bg-[#5E7A2A] text-black font-bold px-5 py-2 rounded-xl text-xs transition shadow-lg shadow-[#7A9A3C]/20"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{currentLanguage === 'ru' ? 'Сохранить базу знаний' : 'Save Knowledge Base'}</span>
              </button>
            </div>

            {/* Two-Column Editor & AI Interactive Testing Bench */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Legal Text Editor (7 cols) */}
              <div className="lg:col-span-7 bg-[#171A1A] border border-[#2B3232] rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[#2B3232] pb-3">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="h-4 w-4 text-[#90B24A]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {currentLanguage === 'ru' ? 'Редактор правовой базы' : 'Legal Knowledge Base Corpus'}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 font-mono">
                    Markdown / Text format
                  </span>
                </div>

                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {currentLanguage === 'ru' 
                    ? 'Вы можете прямо здесь добавлять новые нормативные акты, изменения штрафов БРВ, правила безвизового въезда или регламенты по электронным визам.'
                    : 'You can directly edit legislation articles, fine matrices, visa exemptions, and border crossing rules.'}
                </p>

                <textarea
                  id="textarea-admin-legal-db"
                  rows={20}
                  value={legalDbText}
                  onChange={(e) => setLegalDbText(e.target.value)}
                  className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] p-4 text-xs font-mono text-gray-200 outline-none focus:border-[#7A9A3C] transition leading-relaxed"
                  placeholder="Вставьте текст законов, постановлений и регламентов..."
                />
              </div>

              {/* Right Column: Interactive AI Test Bench (5 cols) */}
              <div className="lg:col-span-5 bg-[#171A1A] border border-[#2B3232] rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-[#2B3232] pb-3">
                    <Sparkles className="h-4 w-4 text-[#90B24A]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      {currentLanguage === 'ru' ? 'Тестовый стенд ИИ-саппорта' : 'AI Support Live Test Bench'}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {currentLanguage === 'ru'
                      ? 'Проверьте, как ИИ отвечает туристам на основе текущей базы знаний, перед тем как публиковать изменения.'
                      : 'Test tourist questions against the active legal knowledge base to verify answer precision before deploying.'}
                  </p>

                  {/* Preset sample test questions */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-500 font-mono block">
                      {currentLanguage === 'ru' ? 'Быстрые проверочные вопросы:' : 'Sample test queries:'}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTestQuery('Какой срок дается туристу на оформление регистрации после въезда в Узбекистан?')}
                        className="text-left text-[11px] bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] p-2 rounded-lg transition"
                      >
                        ⏱ Срок на регистрацию туриста?
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestQuery('Что грозит иностранному гражданину за просрочку регистрации до 30 дней по КоАП?')}
                        className="text-left text-[11px] bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] p-2 rounded-lg transition"
                      >
                        ⚖ Штрафы по ст. 224 КоАП РУз?
                      </button>
                      <button
                        type="button"
                        onClick={() => setTestQuery('Нужна ли регистрация туристу, если он живет в палатках в горах?')}
                        className="text-left text-[11px] bg-[#0E1010] hover:bg-[#23292A] text-gray-300 border border-[#2B3232] p-2 rounded-lg transition"
                      >
                        ⛺ Правила для палаточного кемпинга?
                      </button>
                    </div>
                  </div>

                  {/* Query input */}
                  <div>
                    <label htmlFor="input-test-ai-query" className="block text-[11px] font-semibold text-gray-300 mb-1">
                      {currentLanguage === 'ru' ? 'Контрольный вопрос' : 'Test Query'}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="input-test-ai-query"
                        type="text"
                        value={testQuery}
                        onChange={(e) => setTestQuery(e.target.value)}
                        placeholder={currentLanguage === 'ru' ? 'Введите вопрос туриста...' : 'Ask a test question...'}
                        className="w-full rounded-xl border border-[#2B3232] bg-[#0E1010] px-3.5 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[#7A9A3C] transition"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleTestAiQuery();
                        }}
                      />
                      <button
                        id="btn-admin-test-ai"
                        type="button"
                        disabled={isTestingQuery || !testQuery.trim()}
                        onClick={handleTestAiQuery}
                        className="flex items-center space-x-1.5 bg-[#7A9A3C] hover:bg-[#5E7A2A] disabled:opacity-40 text-black font-bold px-3.5 py-2 rounded-xl text-xs transition shrink-0"
                      >
                        {isTestingQuery ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        <span>{currentLanguage === 'ru' ? 'Проверить' : 'Test'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Result Box */}
                  <div className="rounded-xl border border-[#2B3232] bg-[#0E1010] p-3.5 min-h-[160px] max-h-[300px] overflow-y-auto">
                    <span className="text-[10px] text-gray-500 font-mono block mb-1.5 uppercase">
                      {currentLanguage === 'ru' ? 'Ответ ИИ-саппорта' : 'AI Output'}
                    </span>
                    {isTestingQuery ? (
                      <div className="flex items-center space-x-2 text-xs text-[#90B24A] py-6 justify-center">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Генерация юридического ответа на основе базы...</span>
                      </div>
                    ) : testQueryReply ? (
                      <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                        {testQueryReply}
                      </p>
                    ) : (
                      <span className="text-xs text-gray-600 italic block py-6 text-center">
                        {currentLanguage === 'ru' ? 'Задайте вопрос и нажмите «Проверить» для инспекции ответа модели.' : 'Enter a query and run verification.'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-[#0E1010] border border-[#2B3232] rounded-xl text-[11px] text-gray-400">
                  <span className="text-[#90B24A] font-semibold block mb-0.5">ℹ Поддержка 3 языков:</span>
                  ИИ автоматически адаптирует ответы под язык туриста (русский, английский, французский), соблюдая юридическую точность терминов.
                </div>
              </div>
            </div>
          </div>
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
                        placeholder="Саид"
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
                        placeholder="Туляганов"
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
                          disabled={
                            resetEmail === 'admin@registapp.uz' || 
                            resetEmail === 'operator@registapp.uz' ||
                            resetEmail === 'admin@registapp.online' ||
                            resetEmail === 'operator1@registapp.online' ||
                            resetEmail === 'operator2@registapp.online' ||
                            resetEmail === 'info@registapp.online'
                          }
                          value={resetNewEmail}
                          onChange={(e) => setResetNewEmail(e.target.value)}
                          placeholder="operator1@registapp.online"
                          className="w-full rounded-lg border border-gray-800 bg-[#111827] disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 text-xs text-white outline-none focus:border-[#65a30d]"
                        />
                        {(resetEmail === 'admin@registapp.uz' || 
                          resetEmail === 'operator@registapp.uz' ||
                          resetEmail === 'admin@registapp.online' ||
                          resetEmail === 'operator1@registapp.online' ||
                          resetEmail === 'operator2@registapp.online' ||
                          resetEmail === 'info@registapp.online') && (
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
                            {(() => {
                              const isProtected = s.email === 'admin@registapp.uz' || 
                                                  s.email === 'operator@registapp.uz' ||
                                                  s.email === 'admin@registapp.online' ||
                                                  s.email === 'operator1@registapp.online' ||
                                                  s.email === 'operator2@registapp.online' ||
                                                  s.email === 'info@registapp.online';
                              return (
                                <button
                                  id={`btn-revoke-${s.id}`}
                                  disabled={isProtected}
                                  onClick={() => handleRemoveStaff(s.email)}
                                  className={`p-1.5 rounded transition ${
                                    isProtected
                                      ? 'text-gray-700 cursor-not-allowed'
                                      : 'text-gray-400 hover:text-red-405 hover:bg-red-955/40'
                                  }`}
                                  title={isProtected ? 'Защищенный системный аккаунт' : t('removeStaffBtn')}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick access card for Client and Test Account Management */}
              <div id="card-admin-clients-quick-access" className="rounded-xl border border-gray-800 bg-[#1f2937]/40 p-6 md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#a2e635]" />
                    <h4 className="text-sm font-semibold text-gray-200">
                      {currentLanguage === 'ru' ? 'Реестр клиентов и тестовых аккаунтов' : 'Client Registry & Test Accounts'}
                    </h4>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-mono">
                      {clients.length}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {currentLanguage === 'ru' 
                      ? 'Просмотр стадий заказов, воронки оформления, а также быстрое удаление тестовых клиентов' 
                      : 'View order stages, funnel progression, and purge test clients'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('clients')}
                  className="px-4 py-2 rounded-xl bg-[#65a30d] hover:bg-[#84cc16] text-black text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <Users className="h-4 w-4" />
                  <span>{currentLanguage === 'ru' ? 'Управление клиентами' : 'Manage Clients'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* TABS D: Order Auditing and Review registry */}
        {activeTab === 'orders' && (
          <div id="view-admin-orders" className="space-y-6 animate-fade-in font-sans">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {currentLanguage === 'ru' ? 'Реестр и аудит иммиграционных заказов' : 'Immigration Orders Audit Record'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {currentLanguage === 'ru' 
                    ? 'Управление регистрационными делами туристов, аудит сканов и удаление недействительных заказов'
                    : 'Management of tourist registrations, scan auditing, and deletion of order records'}
                </p>
              </div>
              
              {/* Sub-tabs division */}
              <div id="tabs-admin-orders-sub-control" className="flex bg-[#111827] p-1 rounded-lg border border-gray-800 select-none text-[11px] font-bold self-start sm:self-auto">
                <button
                  id="btn-admin-orders-subtab-open"
                  onClick={() => {
                    setOrdersSubTab('open');
                    setSelectedOrderIds([]);
                  }}
                  className={`rounded px-3 py-1.5 transition cursor-pointer ${
                    ordersSubTab === 'open' 
                      ? 'bg-[#65a30d] text-[#111827]' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {currentLanguage === 'ru' ? 'Открытые' : 'Open'} ({orders.filter(o => o.status !== 'Completed').length})
                </button>
                <button
                  id="btn-admin-orders-subtab-closed"
                  onClick={() => {
                    setOrdersSubTab('closed');
                    setSelectedOrderIds([]);
                  }}
                  className={`rounded px-3 py-1.5 transition cursor-pointer ${
                    ordersSubTab === 'closed' 
                      ? 'bg-[#65a30d] text-[#111827]' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {currentLanguage === 'ru' ? 'Закрытые' : 'Closed'} ({orders.filter(o => o.status === 'Completed').length})
                </button>
              </div>
            </div>

            {/* Action Bar: Search & Batch Deletion */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#111827] p-3 rounded-xl border border-gray-800">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  id="input-admin-order-search"
                  type="text"
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder={
                    currentLanguage === 'ru'
                      ? 'Поиск по ID, клиенту, email, стране...'
                      : 'Search by ID, customer, email, country...'
                  }
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-[#1f2937]/70 border border-gray-700/60 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#65a30d]"
                />
                {orderSearchQuery && (
                  <button
                    onClick={() => setOrderSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {selectedOrderIds.length > 0 && (
                  <button
                    id="btn-admin-bulk-delete-orders"
                    onClick={() => setShowBatchDeleteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>
                      {currentLanguage === 'ru'
                        ? `Удалить выбранные (${selectedOrderIds.length})`
                        : `Delete selected (${selectedOrderIds.length})`}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Notification toast if order was deleted */}
            {orderDeleteFeedback && (
              <div id="toast-order-delete-feedback" className="flex items-center justify-between p-3 rounded-xl bg-[#65a30d]/15 border border-[#65a30d]/40 text-[#a2e635] text-xs font-semibold animate-fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  <span>{orderDeleteFeedback}</span>
                </div>
                <button onClick={() => setOrderDeleteFeedback(null)} className="text-gray-400 hover:text-white cursor-pointer ml-2">✕</button>
              </div>
            )}
            
            {(() => {
              const displayedOrders = orders.filter(o => 
                ordersSubTab === 'open' ? o.status !== 'Completed' : o.status === 'Completed'
              );

              const filteredOrders = displayedOrders.filter(o => {
                if (!orderSearchQuery.trim()) return true;
                const q = orderSearchQuery.toLowerCase();
                return (
                  o.id.toLowerCase().includes(q) ||
                  o.clientName.toLowerCase().includes(q) ||
                  o.clientEmail.toLowerCase().includes(q) ||
                  o.country.toLowerCase().includes(q) ||
                  o.status.toLowerCase().includes(q)
                );
              });

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

              if (filteredOrders.length === 0) {
                return (
                  <div className="rounded-xl border border-gray-800 bg-[#1f2937]/45 p-8 text-center text-gray-400 font-sans">
                    <p className="text-sm">
                      {currentLanguage === 'ru'
                        ? `Заказов по запросу «${orderSearchQuery}» не найдено.`
                        : `No orders matched the filter "${orderSearchQuery}".`}
                    </p>
                    <button
                      onClick={() => setOrderSearchQuery('')}
                      className="mt-2 text-xs text-[#a2e635] hover:underline cursor-pointer"
                    >
                      {currentLanguage === 'ru' ? 'Сбросить фильтр' : 'Clear filter'}
                    </button>
                  </div>
                );
              }

              const isAllVisibleSelected = filteredOrders.length > 0 && filteredOrders.every(o => selectedOrderIds.includes(o.id));

              return (
                <div id="table-admin-order-registry-container" className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1f2937]/45">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#111827] border-b border-gray-800 text-gray-400 font-mono tracking-wider">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            id="checkbox-select-all-orders"
                            checked={isAllVisibleSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const idsToAdd = filteredOrders.map(o => o.id);
                                setSelectedOrderIds(prev => Array.from(new Set([...prev, ...idsToAdd])));
                              } else {
                                const idsToRemove = new Set(filteredOrders.map(o => o.id));
                                setSelectedOrderIds(prev => prev.filter(id => !idsToRemove.has(id)));
                              }
                            }}
                            className="rounded border-gray-700 bg-gray-900 text-[#65a30d] focus:ring-0 cursor-pointer"
                            title={currentLanguage === 'ru' ? 'Выбрать все заказы' : 'Select all orders'}
                          />
                        </th>
                        <th className="p-3">{t('orderId')}</th>
                        <th className="p-3">{currentLanguage === 'ru' ? 'Клиент' : 'Customer'}</th>
                        <th className="p-3">
                          {ordersSubTab === 'closed'
                            ? (currentLanguage === 'ru' ? 'Выполнение' : 'Execution')
                            : (currentLanguage === 'ru' ? 'Размещено (Ожидание)' : 'Placement (Waiting)')
                          }
                        </th>
                        <th className="p-3">{currentLanguage === 'ru' ? 'Гражданство' : 'Citizen Country'}</th>
                        <th className="p-3">{currentLanguage === 'ru' ? 'Период' : 'Period'}</th>
                        <th className="p-3">{currentLanguage === 'ru' ? 'Сумма' : 'Fee Charged'}</th>
                        {ordersSubTab === 'closed' && (
                          <th className="p-3">{currentLanguage === 'ru' ? 'Оператор' : 'Operator'}</th>
                        )}
                        <th className="p-3">{t('status')}</th>
                        <th className="p-3 text-right">{currentLanguage === 'ru' ? 'Аудит и Управление' : 'Audit & Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {filteredOrders.map(o => {
                        const isUrgent = isUrgentOrder(o.createdAt, o.status);
                        const isSelected = selectedOrderIds.includes(o.id);
                        return (
                          <tr 
                            id={`row-admin-order-${o.id}`} 
                            key={o.id} 
                            className={`transition border-b border-gray-800 ${
                              isSelected
                                ? 'bg-red-950/20'
                                : isUrgent 
                                ? 'bg-red-950/10 hover:bg-red-950/20 border-l-[4px] border-l-red-500 shadow-[inset_4px_0_12px_rgba(239,68,68,0.06)]' 
                                : 'hover:bg-[#111827]/40 border-l-[4px] border-l-transparent'
                            }`}
                          >
                            <td className="p-3 w-10 text-center">
                              <input
                                type="checkbox"
                                id={`checkbox-select-order-${o.id}`}
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedOrderIds(prev => [...prev, o.id]);
                                  } else {
                                    setSelectedOrderIds(prev => prev.filter(id => id !== o.id));
                                  }
                                }}
                                className="rounded border-gray-700 bg-gray-900 text-[#65a30d] focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-mono font-bold text-[#a2e635]">#{o.id}</td>
                            <td className="p-3">
                              <p className="font-semibold text-white">{o.clientName}</p>
                              <p className="text-[10px] text-gray-400 font-mono">{o.clientEmail}</p>
                            </td>
                            <td className="p-3 font-mono text-gray-300 select-all font-medium">
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
                            <td className="p-3">{translateCountry(o.country, currentLanguage)} <span className="text-[10px] text-gray-400 block mt-0.5 font-sans">{o.visaType} category</span></td>
                            <td className="p-3 font-mono">{o.startDate} ~ {o.endDate} ({o.totalDays} {currentLanguage === 'ru' ? 'дн.' : 'Days'})</td>
                            <td className="p-3 font-bold text-white font-mono">
                              {o.currency === 'UZS' ? `${o.totalPrice.toLocaleString()} UZS` : o.currency === 'EUR' ? `€${o.totalPrice}` : o.currency === 'RUB' ? `${o.totalPrice} RUB` : `$${o.totalPrice} USD`}
                            </td>
                            {ordersSubTab === 'closed' && (
                              <td className="p-3">
                                <span className="font-semibold text-white px-2.5 py-1 rounded-md bg-[#111827] border border-gray-800 text-[10px] inline-block font-mono">
                                  {getOperatorText(o.operatorId)}
                                </span>
                              </td>
                            )}
                            <td className="p-3">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                o.status === 'Completed'
                                  ? 'bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635]'
                                  : o.status === 'In Progress'
                                  ? 'bg-amber-950/40 border border-amber-800 text-amber-400'
                                  : 'bg-gray-800 border border-gray-700 text-gray-400'
                              }`}>
                                <span className={`mr-1.5 h-1 w-1 rounded-full ${o.status === 'Completed' ? 'bg-[#65a30d]' : 'bg-red-500'}`} />
                                {o.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  id={`btn-audit-order-details-${o.id}`}
                                  onClick={() => setSelectedAuditOrder(o)}
                                  className="p-1 px-2 rounded bg-[#111827] border border-gray-800 hover:border-[#65a30d] text-gray-300 hover:text-[#a2e635] transition font-bold font-mono text-[10px] cursor-pointer"
                                  title={currentLanguage === 'ru' ? 'Аудит сканов' : 'Review All Scans'}
                                >
                                  {currentLanguage === 'ru' ? 'Сканы' : 'Scans'}
                                </button>
                                <button
                                  id={`btn-delete-order-${o.id}`}
                                  onClick={() => setOrderToDelete(o)}
                                  className="p-1 px-2 rounded bg-red-950/20 border border-red-900/40 hover:border-red-500 text-red-400 hover:bg-red-900/40 transition text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                                  title={currentLanguage === 'ru' ? 'Удалить заказ' : 'Delete order'}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span className="hidden sm:inline">{currentLanguage === 'ru' ? 'Удалить' : 'Delete'}</span>
                                </button>
                              </div>
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

        {/* TABS: Registered Clients & Order Stages Pipeline Standalone View */}
        {activeTab === 'clients' && (
          <div id="view-admin-clients-standalone" className="space-y-6 animate-fade-in">
            <AdminClientStagesIndicator
              clients={clients}
              orders={orders}
              currentLanguage={currentLanguage}
              onSelectAuditOrder={(order) => {
                setSelectedAuditOrder(order);
                setActiveTab('audit');
              }}
              onClientDeleted={syncAllData}
            />
          </div>
        )}

        {/* TABS: Consents Registry & Legal Document Versioning */}
        {activeTab === 'consents' && (
          <div id="view-admin-consents-registry" className="space-y-6 animate-fade-in font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-[#7A9A3C]/15 border border-[#7A9A3C]/30 text-[#90B24A] shrink-0 mt-0.5">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                      {currentLanguage === 'ru' ? 'Реестр юридических согласий (Consents Ledger)' : 'Legal Consents Ledger'}
                    </h3>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ЗРУ-547 & GDPR Ready
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 max-w-2xl">
                    {currentLanguage === 'ru'
                      ? 'Официальный журнал согласий на обработку ПДн, трансграничную передачу и принятие условий (ст. 15 ЗРУ-547). Каждая запись фиксируется в момент создания заказа с серверным временем, IP-адресом и версиями документов.'
                      : 'Immutable ledger of personal data processing, cross-border transfer, and offer acceptance consents. Each entry records server timestamp, IP address, user agent, and document versions.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  id="btn-admin-manage-versions"
                  type="button"
                  onClick={() => openVersionModalFor('privacy')}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#7A9A3C] hover:bg-[#5E7A2A] text-black font-bold px-4 py-2.5 text-xs transition duration-200 cursor-pointer shadow-lg shadow-[#7A9A3C]/10"
                >
                  <History className="h-4 w-4" />
                  <span>{currentLanguage === 'ru' ? 'Увеличить версию документов' : 'Bump Document Version'}</span>
                </button>
              </div>
            </div>

            {/* Active Document Versions Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const docVersions = getActiveDocumentVersions(config);
                const docs: Array<{ key: 'privacy' | 'terms' | 'cookies'; title: string; ver: string; date: string }> = [
                  {
                    key: 'privacy',
                    title: currentLanguage === 'ru' ? 'Политика конфиденциальности' : 'Privacy Policy',
                    ver: docVersions.privacyVersion,
                    date: docVersions.effectiveDates.privacy,
                  },
                  {
                    key: 'terms',
                    title: currentLanguage === 'ru' ? 'Публичная оферта' : 'Public Offer',
                    ver: docVersions.termsVersion,
                    date: docVersions.effectiveDates.terms,
                  },
                  {
                    key: 'cookies',
                    title: currentLanguage === 'ru' ? 'Политика файлов cookie' : 'Cookies Policy',
                    ver: docVersions.cookiesVersion,
                    date: docVersions.effectiveDates.cookies,
                  },
                ];

                return docs.map((d) => (
                  <div key={d.key} className="rounded-xl border border-gray-800 bg-[#141923] p-4 flex flex-col justify-between hover:border-gray-700 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase font-bold text-gray-400">
                          {d.key.toUpperCase()}
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#7A9A3C]/15 border border-[#7A9A3C]/30 text-[#a2e635]">
                          v{d.ver}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1.5">{d.title}</h4>
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-gray-500" />
                        <span>{currentLanguage === 'ru' ? 'Действует с:' : 'Effective:'} <strong className="text-gray-300 font-mono">{d.date}</strong></span>
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400 font-mono">● Активна в офертах</span>
                      <button
                        type="button"
                        onClick={() => openVersionModalFor(d.key)}
                        className="text-[11px] font-bold text-[#a2e635] hover:underline cursor-pointer"
                      >
                        {currentLanguage === 'ru' ? 'Изменить версию →' : 'Edit version →'}
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Quick metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-800 bg-[#10141d] p-3">
                <span className="text-[10px] text-gray-400 uppercase font-mono block">Всего согласий</span>
                <span className="text-lg font-bold text-white font-mono">{consentsList.length}</span>
              </div>
              <div className="rounded-xl border border-gray-800 bg-[#10141d] p-3">
                <span className="text-[10px] text-gray-400 uppercase font-mono block">ЗРУ-547 Статус</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">100% Locked</span>
              </div>
              <div className="rounded-xl border border-gray-800 bg-[#10141d] p-3">
                <span className="text-[10px] text-gray-400 uppercase font-mono block">Трансграничные</span>
                <span className="text-lg font-bold text-blue-400 font-mono">
                  {consentsList.filter(c => c.consents?.crossBorderTransfer).length}
                </span>
              </div>
              <div className="rounded-xl border border-gray-800 bg-[#10141d] p-3">
                <span className="text-[10px] text-gray-400 uppercase font-mono block">Маркетинг (opt-in)</span>
                <span className="text-lg font-bold text-purple-400 font-mono">
                  {consentsList.filter(c => c.consents?.marketing).length}
                </span>
              </div>
            </div>

            {/* Search filter */}
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#141923] p-3 rounded-xl border border-gray-800">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={consentSearchQuery}
                  onChange={(e) => setConsentSearchQuery(e.target.value)}
                  placeholder={currentLanguage === 'ru' ? 'Поиск по № заказа, email клиента или IP-адресу...' : 'Search by order ID, email, or IP address...'}
                  className="w-full bg-[#10141d] border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#7A9A3C]"
                />
              </div>
              {consentSearchQuery && (
                <button
                  type="button"
                  onClick={() => setConsentSearchQuery('')}
                  className="text-xs text-gray-400 hover:text-white px-2 py-1"
                >
                  {currentLanguage === 'ru' ? 'Сбросить' : 'Clear'}
                </button>
              )}
            </div>

            {/* Consents Table */}
            <div className="rounded-xl border border-gray-800 bg-[#141923] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 bg-[#10141d] text-gray-400 text-[11px] font-mono">
                      <th className="p-3">Серверное время</th>
                      <th className="p-3">№ Заказа</th>
                      <th className="p-3">Клиент</th>
                      <th className="p-3">IP & Сеть</th>
                      <th className="p-3">Язык</th>
                      <th className="p-3">Версии документов</th>
                      <th className="p-3 text-center">ПДн</th>
                      <th className="p-3 text-center">3-и лица</th>
                      <th className="p-3 text-center">Трансгранич.</th>
                      <th className="p-3 text-center">Оферта</th>
                      <th className="p-3 text-center">Маркетинг</th>
                      <th className="p-3 text-center">Турист</th>
                      <th className="p-3 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-sans">
                    {(() => {
                      const filtered = consentsList.filter((c) => {
                        if (!consentSearchQuery.trim()) return true;
                        const q = consentSearchQuery.toLowerCase();
                        return (
                          c.orderId?.toLowerCase().includes(q) ||
                          c.userEmail?.toLowerCase().includes(q) ||
                          c.ipAddress?.toLowerCase().includes(q)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={13} className="p-8 text-center text-gray-500">
                              <ShieldCheck className="h-8 w-8 mx-auto text-gray-600 mb-2 opacity-50" />
                              <p className="font-semibold text-gray-400">
                                {consentsList.length === 0 
                                  ? (currentLanguage === 'ru' ? 'Записей согласий пока нет в базе Firestore.' : 'No consent records in Firestore yet.')
                                  : (currentLanguage === 'ru' ? 'По данному запросу согласий не найдено.' : 'No matching consent records found.')}
                              </p>
                              <p className="text-[11px] text-gray-500 mt-1">
                                {currentLanguage === 'ru' ? 'Согласие автоматически записывается в коллекцию consents при оформлении каждого заказа.' : 'Consent is recorded into the consents collection automatically on order placement.'}
                              </p>
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((c) => (
                        <tr key={c.orderId} className="hover:bg-[#1a2130]/60 transition">
                          <td className="p-3 font-mono text-[11px] text-gray-300 whitespace-nowrap">
                            {c.timestamp ? new Date(c.timestamp).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) : '—'}
                            <span className="block text-[9px] text-gray-500">Ташкент (UZ)</span>
                          </td>
                          <td className="p-3 font-mono font-bold text-[#a2e635] whitespace-nowrap">
                            #{c.orderId}
                          </td>
                          <td className="p-3">
                            <span className="text-gray-200 font-medium block truncate max-w-[140px]" title={c.userEmail}>
                              {c.userEmail || '—'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                            <span className="text-gray-300 font-semibold">{c.ipAddress || '—'}</span>
                            <span className="block text-[9px] text-gray-500 truncate max-w-[120px]" title={c.userAgent}>
                              {c.userAgent || '—'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                              {c.locale || 'ru'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[10px] text-gray-300 whitespace-nowrap space-y-0.5">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">P:</span>
                              <span className="text-emerald-400 font-bold">v{c.documentsVersion?.privacyVersion || '1.0'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">T:</span>
                              <span className="text-blue-400 font-bold">v{c.documentsVersion?.termsVersion || '1.0'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-gray-500">C:</span>
                              <span className="text-purple-400 font-bold">v{c.documentsVersion?.cookiesVersion || '1.0'}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {c.consents?.dataProcessing ? (
                              <span className="text-emerald-400 font-bold" title="Обработка ПДн: Да">✔</span>
                            ) : (
                              <span className="text-gray-600 font-bold">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {c.consents?.thirdPartyTransfer ? (
                              <span className="text-emerald-400 font-bold" title="3-и лица: Да">✔</span>
                            ) : (
                              <span className="text-gray-600 font-bold">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {c.consents?.crossBorderTransfer ? (
                              <span className="text-emerald-400 font-bold" title="Трансграничная передача: Да">✔</span>
                            ) : (
                              <span className="text-gray-600 font-bold">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {c.consents?.termsAccepted ? (
                              <span className="text-emerald-400 font-bold" title="Оферта принята: Да">✔</span>
                            ) : (
                              <span className="text-gray-600 font-bold">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {c.consents?.marketing ? (
                              <span className="text-purple-400 font-bold" title="Маркетинг: Да">✔</span>
                            ) : (
                              <span className="text-gray-600 font-bold">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {c.consents?.selfTravellerStatus ? (
                              <span className="text-emerald-400 font-bold" title="Самостоятельный турист: Да">✔</span>
                            ) : (
                              <span className="text-gray-600 font-bold">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setInspectedConsent(c)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-300 hover:text-white px-2.5 py-1 rounded bg-[#10141d] border border-gray-700 hover:border-gray-500 transition cursor-pointer"
                            >
                              <FileCode className="w-3.5 h-3.5 text-[#a2e635]" />
                              <span>JSON</span>
                            </button>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
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
            <div className="p-4 border-t border-gray-800 bg-[#111827] flex items-center justify-between select-none">
              <button
                id="btn-audit-modal-delete-order"
                onClick={() => {
                  const target = selectedAuditOrder;
                  setSelectedAuditOrder(null);
                  setOrderToDelete(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 border border-red-500/40 text-red-400 font-bold px-4 py-2 text-xs transition cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{currentLanguage === 'ru' ? 'Удалить этот заказ' : 'Delete this order'}</span>
              </button>

              <button
                id="btn-audit-modal-ok"
                onClick={() => setSelectedAuditOrder(null)}
                className="rounded-xl bg-[#65a30d] hover:bg-[#a2e635] text-[#111827] font-extrabold px-5 py-2 text-xs transition cursor-pointer"
              >
                Verification Audited OK ✔
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation modal for single order deletion */}
      {orderToDelete && (
        <div id="modal-confirm-delete-order" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827]/85 backdrop-blur-sm font-sans">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#1f2937] overflow-hidden shadow-2xl animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-800 bg-red-950/30 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-900/40 border border-red-500/30 text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {currentLanguage === 'ru' ? 'Удаление заказа' : 'Delete Order'} #{orderToDelete.id}
                </h4>
                <p className="text-[11px] text-gray-400">
                  {currentLanguage === 'ru' ? 'Подтвердите безвозвратное удаление' : 'Confirm permanent deletion'}
                </p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-3 text-xs">
              <div className="rounded-xl border border-gray-800 bg-[#111827] p-3.5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">{currentLanguage === 'ru' ? 'Клиент:' : 'Client:'}</span>
                  <span className="text-white font-semibold">{orderToDelete.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-gray-300 font-mono text-[11px]">{orderToDelete.clientEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{currentLanguage === 'ru' ? 'Гражданство:' : 'Country:'}</span>
                  <span className="text-gray-200">{translateCountry(orderToDelete.country, currentLanguage)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{currentLanguage === 'ru' ? 'Период:' : 'Period:'}</span>
                  <span className="text-gray-200 font-mono">{orderToDelete.startDate} ~ {orderToDelete.endDate} ({orderToDelete.totalDays} дн.)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{currentLanguage === 'ru' ? 'Сумма:' : 'Price:'}</span>
                  <span className="text-[#a2e635] font-bold font-mono">
                    {orderToDelete.currency === 'UZS' ? `${orderToDelete.totalPrice.toLocaleString()} UZS` : `${orderToDelete.totalPrice} ${orderToDelete.currency}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{currentLanguage === 'ru' ? 'Статус:' : 'Status:'}</span>
                  <span className="text-amber-400 font-semibold">{orderToDelete.status}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-300 text-[11px] leading-relaxed">
                ⚠️ {currentLanguage === 'ru'
                  ? 'Внимание: Заказ будет безвозвратно удален из базы данных и всех реестров. Это действие нельзя отменить.'
                  : 'Warning: This order will be permanently deleted from the database and all registries. This action cannot be undone.'}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-800 bg-[#111827] flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-delete-order"
                onClick={() => setOrderToDelete(null)}
                disabled={isDeletingOrder}
                className="px-4 py-2 rounded-xl border border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                id="btn-confirm-delete-order"
                onClick={() => handleDeleteSingleOrder(orderToDelete.id)}
                disabled={isDeletingOrder}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingOrder ? t('loading') : (currentLanguage === 'ru' ? 'Да, удалить заказ' : 'Yes, Delete Order')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation modal for bulk order deletion */}
      {showBatchDeleteModal && (
        <div id="modal-confirm-batch-delete-orders" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111827]/85 backdrop-blur-sm font-sans">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-[#1f2937] overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-gray-800 bg-red-950/30 flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-900/40 border border-red-500/30 text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {currentLanguage === 'ru' ? 'Массовое удаление заказов' : 'Bulk Order Deletion'}
                </h4>
                <p className="text-[11px] text-gray-400">
                  {currentLanguage === 'ru' ? `Выбрано заказов для удаления: ${selectedOrderIds.length}` : `Selected orders for deletion: ${selectedOrderIds.length}`}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-gray-300">
                {currentLanguage === 'ru'
                  ? `Вы собираетесь безвозвратно удалить следующие ${selectedOrderIds.length} заказов:`
                  : `You are about to permanently delete the following ${selectedOrderIds.length} orders:`}
              </p>
              
              <div className="max-h-36 overflow-y-auto rounded-xl border border-gray-800 bg-[#111827] p-3 space-y-1.5 font-mono text-[11px]">
                {selectedOrderIds.map(id => {
                  const o = orders.find(ord => ord.id === id);
                  return (
                    <div key={id} className="flex justify-between items-center text-gray-400">
                      <span className="text-[#a2e635]">#{id}</span>
                      <span className="text-gray-300 truncate max-w-[220px]">{o ? `${o.clientName} (${o.country})` : ''}</span>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-xl bg-red-950/20 border border-red-500/20 text-red-300 text-[11px] leading-relaxed">
                ⚠️ {currentLanguage === 'ru'
                  ? 'Внимание: Все выбранные записи будут удалены из базы данных без возможности восстановления.'
                  : 'Warning: All selected records will be permanently deleted from the database.'}
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#111827] flex items-center justify-end gap-2.5">
              <button
                id="btn-cancel-batch-delete"
                onClick={() => setShowBatchDeleteModal(false)}
                disabled={isDeletingOrder}
                className="px-4 py-2 rounded-xl border border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                id="btn-confirm-batch-delete"
                onClick={handleDeleteMultipleOrders}
                disabled={isDeletingOrder}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>
                  {isDeletingOrder
                    ? t('loading')
                    : (currentLanguage === 'ru'
                        ? `Удалить ${selectedOrderIds.length} заказов`
                        : `Delete ${selectedOrderIds.length} orders`)}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Footer with Legal Navigation */}
      {/* 1. Modal for Inspecting Raw Consent JSON */}
      {inspectedConsent && (
        <div id="modal-inspect-consent" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-md animate-fadeIn font-sans">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-800 bg-[#141923] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 sm:p-5 border-b border-gray-800 bg-[#10141d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#7A9A3C]/15 border border-[#7A9A3C]/30 text-[#90B24A]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {currentLanguage === 'ru' ? 'Документ согласия по заказу' : 'Consent Document for Order'} #{inspectedConsent.orderId}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {currentLanguage === 'ru' ? 'Безотзывная фиксация в Firestore (коллекция consents)' : 'Immutable record stored in Firestore consents collection'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(inspectedConsent, null, 2));
                    setCopiedConsentId(inspectedConsent.orderId);
                    setTimeout(() => setCopiedConsentId(null), 2500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-gray-200 text-xs font-bold transition cursor-pointer"
                >
                  {copiedConsentId === inspectedConsent.orderId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Скопировать JSON</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedConsent(null)}
                  className="p-1.5 rounded-lg border border-gray-800 bg-[#1b2230] text-gray-400 hover:text-white transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#10141d] p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Order ID</span>
                  <span className="font-mono font-bold text-[#a2e635]">{inspectedConsent.orderId}</span>
                </div>
                <div className="bg-[#10141d] p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">IP-адрес</span>
                  <span className="font-mono text-gray-200">{inspectedConsent.ipAddress}</span>
                </div>
                <div className="bg-[#10141d] p-2.5 rounded-lg border border-gray-800/80">
                  <span className="text-[10px] text-gray-400 uppercase font-mono block">Язык</span>
                  <span className="font-mono text-gray-200 uppercase">{inspectedConsent.locale}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-gray-400">Сырой JSON документа:</span>
                <pre className="p-3.5 rounded-xl bg-[#0b0e14] border border-gray-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed max-h-80 select-all">
                  {JSON.stringify(inspectedConsent, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 bg-[#10141d] flex items-center justify-between text-xs text-gray-400">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                ● Сертификат фиксации: ст. 15 ЗРУ-547 подтверждена
              </span>
              <button
                type="button"
                onClick={() => setInspectedConsent(null)}
                className="rounded-xl bg-[#7A9A3C] hover:bg-[#5E7A2A] text-black font-bold px-4 py-2 text-xs transition cursor-pointer"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal for Bumping Document Version */}
      {isVersionModalOpen && (
        <div id="modal-bump-version" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/85 backdrop-blur-md animate-fadeIn font-sans">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#141923] shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 border-b border-gray-800 bg-[#10141d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#7A9A3C]/15 border border-[#7A9A3C]/30 text-[#90B24A]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                    {currentLanguage === 'ru' ? 'Увеличение версии документа' : 'Bump Document Version'}
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {currentLanguage === 'ru' ? 'Согласие клиентов в новых заказах будет привязано к новой редакции' : 'Future client orders will record consent bound to this new version'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="p-1.5 rounded-lg border border-gray-800 bg-[#1b2230] text-gray-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBumpDocumentVersion} className="p-5 space-y-4">
              {/* Document selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  {currentLanguage === 'ru' ? 'Юридический документ:' : 'Legal Document:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['privacy', 'terms', 'cookies'] as const).map((docKey) => {
                    const titles = {
                      privacy: 'Политика конфиденциальности',
                      terms: 'Публичная оферта',
                      cookies: 'Файлы cookie',
                    };
                    const isSelected = versionBumpDoc === docKey;
                    return (
                      <button
                        key={docKey}
                        type="button"
                        onClick={() => openVersionModalFor(docKey)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition cursor-pointer ${
                          isSelected
                            ? 'border-[#7A9A3C] bg-[#7A9A3C]/15 text-[#a2e635]'
                            : 'border-gray-800 bg-[#10141d] text-gray-400 hover:text-white'
                        }`}
                      >
                        <span className="block font-bold">{titles[docKey]}</span>
                        <span className="text-[10px] font-mono text-gray-500 uppercase">{docKey}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Version & Date Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {currentLanguage === 'ru' ? 'Новый номер версии:' : 'New Version Number:'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newDocVersion}
                    onChange={(e) => setNewDocVersion(e.target.value)}
                    placeholder="e.g. 1.1 or 2.0"
                    className="w-full bg-[#10141d] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#7A9A3C]"
                  />
                  <div className="flex gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = getActiveDocumentVersions(config);
                        const v = versionBumpDoc === 'privacy' ? cur.privacyVersion : versionBumpDoc === 'terms' ? cur.termsVersion : cur.cookiesVersion;
                        const p = v.split('.');
                        setNewDocVersion(p.length === 2 && !isNaN(parseInt(p[1])) ? `${p[0]}.${parseInt(p[1]) + 1}` : `${v}.1`);
                      }}
                      className="text-[10px] font-mono text-gray-400 hover:text-[#a2e635] bg-gray-800/60 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      +0.1 (Минорная)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = getActiveDocumentVersions(config);
                        const v = versionBumpDoc === 'privacy' ? cur.privacyVersion : versionBumpDoc === 'terms' ? cur.termsVersion : cur.cookiesVersion;
                        const p = v.split('.');
                        setNewDocVersion(`${parseInt(p[0] || '1') + 1}.0`);
                      }}
                      className="text-[10px] font-mono text-gray-400 hover:text-[#a2e635] bg-gray-800/60 px-1.5 py-0.5 rounded cursor-pointer"
                    >
                      +1.0 (Мажорная)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    {currentLanguage === 'ru' ? 'Дата вступления в силу:' : 'Effective Date:'}
                  </label>
                  <input
                    type="date"
                    required
                    value={newDocEffectiveDate}
                    onChange={(e) => setNewDocEffectiveDate(e.target.value)}
                    className="w-full bg-[#10141d] border border-gray-800 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#7A9A3C]"
                  />
                </div>
              </div>

              {/* Changelog / Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  {currentLanguage === 'ru' ? 'Обоснование / примечание к редакции:' : 'Changelog / Reason for Update:'}
                </label>
                <textarea
                  rows={2}
                  value={versionBumpReason}
                  onChange={(e) => setVersionBumpReason(e.target.value)}
                  placeholder={currentLanguage === 'ru' ? 'Например: Уточнение правил хранения ПДн в связи с изменениями ЗРУ-547...' : 'e.g. Updated cross-border data transfer terms...'}
                  className="w-full bg-[#10141d] border border-gray-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#7A9A3C]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-gray-300 text-xs font-bold transition cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#7A9A3C] hover:bg-[#5E7A2A] text-black text-xs font-bold transition cursor-pointer shadow-lg shadow-[#7A9A3C]/10"
                >
                  {currentLanguage === 'ru' ? 'Сохранить и активировать версию' : 'Save & Activate Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Footer with Legal Navigation */}
      <AppFooter
        id="footer-admin-dashboard"
        currentLanguage={currentLanguage}
        onNavigate={onNavigate}
        className="mt-16"
      />

    </div>
  );
}
