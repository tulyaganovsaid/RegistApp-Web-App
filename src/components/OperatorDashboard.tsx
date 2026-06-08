import React, { useState, useEffect } from 'react';
import { 
  Check, FileText, Globe, UploadCloud, AlertCircle, Clock, MapPin, 
  User as UserIcon, CheckCircle, ExternalLink, ShieldAlert, ArrowLeft, Languages,
  AlertTriangle
} from 'lucide-react';
import { Order, User, LanguageCode } from '../types';
import { getOrders, sendViolation, completeOrder, addAuditLog, claimOrder, releaseOrder, rejectPayment, confirmPaymentReceived } from '../db';
import { translations, translateCountry } from '../translations';
import { formatPlacementAndWaiting, formatResponseTimeAndExecution, isUrgentOrder } from './ClientDashboard';
import { BrandLogo } from './BrandLogo';

interface OperatorDashboardProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentUser: User;
  onLogout: () => void;
  onProfileUpdate: (user: User) => void;
}

export default function OperatorDashboard({ currentLanguage, setLanguage, currentUser, onLogout, onProfileUpdate }: OperatorDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<'open' | 'history' | 'blacklist'>('open');
  
  // Processing Form states
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadedDocName, setUploadedDocName] = useState('');
  const [uploadedDocBase64, setUploadedDocBase64] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // CSS Document Viewer overlays
  const [activeViewerTab, setActiveViewerTab] = useState<'passport' | 'stamp' | 'visa' | 'registration'>('passport');

  const t = (key: string) => translations[currentLanguage]?.[key] || key;

  useEffect(() => {
    syncOrders();
  }, [selectedOrder]);

  useEffect(() => {
    window.addEventListener('db-sync', syncOrders);
    return () => {
      window.removeEventListener('db-sync', syncOrders);
    };
  }, []);

  const syncOrders = () => {
    const all = getOrders();
    setOrders(all);
  };

  const openOrders = orders.filter(o => (o.status === 'In Progress' || o.status === 'Paid') && (!o.operatorId || o.operatorId === currentUser.id));
  const historyOrders = orders.filter(o => 
    ((o.status === 'Completed' || o.status === 'Rejected due to violations') && o.operatorId === currentUser.id) ||
    (o.status === 'Payment Pending' && o.rejectedByOperatorId === currentUser.id)
  );
  const blacklistedOrders = orders.filter(o => o.status === 'Rejected due to violations');
  const displayedOrders = activeTab === 'open' ? openOrders : historyOrders;

  const handleSelectOrder = (order: Order) => {
    if (order.status === 'In Progress') {
      try {
        const claimed = claimOrder(order.id, currentUser.id);
        setSelectedOrder(claimed);
      } catch (err: any) {
        setErrorMessage(err.message || 'Could not claim order.');
        return;
      }
    } else {
      setSelectedOrder(order);
    }
    setNotes(order.operatorNotes || '');
    setUploadedDocName('');
    setUploadedDocBase64('');
    setErrorMessage('');
    setSuccessMessage('');
    setRejectionReason('');
    setIsRejecting(false);
    
    // Default document view
    setActiveViewerTab('passport');
    syncOrders();
  };

  const handleBackToQueue = () => {
    if (selectedOrder && selectedOrder.status === 'In Progress') {
      try {
        releaseOrder(selectedOrder.id);
      } catch (e) {}
    }
    setRejectionReason('');
    setIsRejecting(false);
    setSelectedOrder(null);
    syncOrders();
  };

  const handleLogout = () => {
    if (selectedOrder && selectedOrder.status === 'In Progress') {
      try {
        releaseOrder(selectedOrder.id);
      } catch (e) {}
    }
    onLogout();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadedDocName(`${file.name} (Uploading...)`);

    try {
      const { uploadFileToStorage } = await import('../firebase');
      const downloadUrl = await uploadFileToStorage(file, `scans/operator_${currentUser.id}`);
      setUploadedDocBase64(downloadUrl); // Storing download URL instead of Base64
      setUploadedDocName(file.name);
    } catch (err) {
      console.error('File upload failed:', err);
      setUploadedDocName('Upload failed, try again');
    }
  };



  const handleSendViolationClick = () => {
    if (!selectedOrder) return;
    try {
      const updated = sendViolation(selectedOrder.id);
      setSuccessMessage('Migration violation report guide sent to client personal cabinet.');
      
      // Update local state instance
      setSelectedOrder(updated);
      syncOrders();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing violation issuance.');
    }
  };

  const handlePaymentReceivedAction = () => {
    if (!selectedOrder) return;
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const updated = confirmPaymentReceived(selectedOrder.id, currentUser.id);
      setSelectedOrder(updated);
      setSuccessMessage(currentLanguage === 'ru' 
        ? 'Оплата успешно подтверждена! Загрузка файлов регистрации разблокирована.' 
        : 'Payment confirmed successfully! Registration upload is now enabled.');
      syncOrders();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error confirming payment.');
    }
  };

  const handlePaymentNotReceivedAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setErrorMessage('');
    setSuccessMessage('');

    const defaultMsg = currentLanguage === 'ru'
      ? 'Оплата не поступила. Пожалуйста, проверьте платежные реквизиты или прикрепите верную квитанцию и повторите платеж.'
      : 'Payment not received. Please check transaction details, upload the correct receipt, and try again.';

    const msg = rejectionReason.trim() || defaultMsg;

    try {
      rejectPayment(selectedOrder.id, msg, currentUser.id);
      setSuccessMessage(currentLanguage === 'ru'
        ? 'Статус заказа изменен на "Ожидает оплаты". Клиенту отправлено уведомление.'
        : 'Order status set back to Payment Pending. Client notified.');
      
      setTimeout(() => {
        setSuccessMessage('');
        setIsRejecting(false);
        setRejectionReason('');
        setSelectedOrder(null);
        syncOrders();
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error rejecting payment.');
    }
  };

  const handleFinalizeVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedOrder) return;
    if (!uploadedDocBase64) {
      setErrorMessage('Please upload the final registration PDF scan.');
      return;
    }

    try {
      const finalDocName = uploadedDocName || `Registration-Stamp-${selectedOrder.id}.pdf`;
      completeOrder(selectedOrder.id, currentUser.id, uploadedDocBase64, notes, finalDocName);
      
      setSuccessMessage('Registration officially completed and archived!');
      
      setTimeout(() => {
        setSuccessMessage('');
        setSelectedOrder(null);
        syncOrders();
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error transmitting completed verification logs.');
    }
  };

  // Seed documents mock visualizer
  const renderDocumentMockup = (type: 'passport' | 'stamp' | 'visa' | 'registration') => {
    const isSeed = !selectedOrder?.passportScan.startsWith('data:image/');
    
    // User uploaded custom files
    if (!isSeed && type !== 'registration') {
      let src = selectedOrder?.passportScan;
      let label = 'passport';
      if (type === 'stamp') { src = selectedOrder?.arrivalStamp; label = 'stamp'; }
      if (type === 'visa') { src = selectedOrder?.visaScan; label = 'visa'; }
      
      if (src) {
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-center h-80 bg-[#111827] border border-gray-800 rounded-xl overflow-hidden p-2">
              <img src={src} alt="Document Upload Scan Preview" className="max-h-full max-w-full object-contain rounded-lg shadow-lg" referrerPolicy="no-referrer" />
            </div>
            <div className="flex justify-end p-1">
              <button
                type="button"
                onClick={() => {
                  if (!src) return;
                  const link = document.createElement('a');
                  link.href = src;
                  link.download = `${label}-${selectedOrder?.clientName.replace(/\s+/g, '_') || 'doc'}.png`;
                  link.click();
                }}
                className="inline-flex items-center space-x-1.5 rounded-lg bg-gray-800 hover:bg-gray-750 text-xs font-bold text-gray-200 px-3 py-1.5 transition border border-gray-750 shadow"
              >
                <FileText className="h-3.5 w-3.5 text-[#a2e635]" />
                <span>{currentLanguage === 'ru' ? 'Скачать оригинал' : 'Download Original scan'}</span>
              </button>
            </div>
          </div>
        );
      }
    }

    if (type === 'registration') {
      return (
        <div className="relative h-80 bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center font-mono text-[10px] text-gray-400 select-none animate-fade-in">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-green-950/40 border border-green-800/60 text-green-400">
              <FileText className="h-10 w-10 text-green-400 animate-pulse" />
            </div>
            <p className="text-white font-bold text-sm tracking-tight">
              {selectedOrder?.finalDocName || `Registration-Stamp-${selectedOrder?.id || 'doc'}.pdf`}
            </p>
            <p className="text-xs text-gray-500 max-w-xs mt-1 leading-relaxed">
              {currentLanguage === 'ru' 
                ? 'Итоговая выданная регистрация в формате PDF успешно загружена в базу данных.' 
                : 'The finalized certified registration PDF is securely archived on the platform.'}
            </p>
            <button
              id="btn-operator-dl-final-pdf"
              onClick={() => {
                if (!selectedOrder) return;
                if (selectedOrder.finalDocUrl && selectedOrder.finalDocUrl.startsWith('data:')) {
                  const parts = selectedOrder.finalDocUrl.split(',');
                  const mimeMatch = parts[0].match(/:(.*?);/);
                  const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
                  const binary = atob(parts[1]);
                  const array = [];
                  for (let i = 0; i < binary.length; i++) {
                    array.push(binary.charCodeAt(i));
                  }
                  const blob = new Blob([new Uint8Array(array)], { type: mimeType });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = selectedOrder.finalDocName || `Registration-Stamp-${selectedOrder.id}.pdf`;
                  link.click();
                  URL.revokeObjectURL(url);
                } else {
                  const content = `REGISTAPP OFFICIAL REGISTRATION CERTIFICATE\n` +
                                  `Order ID: ${selectedOrder.id}\n` +
                                  `Citizen Name: ${selectedOrder.clientName}\n` +
                                  `Registration dates: ${selectedOrder.startDate} to ${selectedOrder.endDate}\n`;
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `Registration-Stamp-${selectedOrder.id}.txt`;
                  link.click();
                  URL.revokeObjectURL(url);
                }
              }}
              className="inline-flex items-center space-x-2 rounded-xl bg-green-600 hover:bg-green-700 font-bold text-xs text-white px-4 py-2 hover:shadow-lg transition cursor-pointer"
            >
              <FileText className="h-4 w-4" />
              <span>{currentLanguage === 'ru' ? 'Скачать файл PDF' : 'Download PDF File'}</span>
            </button>
          </div>
        </div>
      );
    }

    // Interactive CSS Vector representations for seed data or generic views
    if (type === 'passport') {
      return (
        <div className="relative h-80 bg-gradient-to-br from-[#111827] to-[#1f2937] border border-gray-800 rounded-xl p-5 flex flex-col justify-between font-mono text-[9px] text-gray-300 select-none shadow-2xl animate-fade-in">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-[#a2e635] animate-spin" />
              <span className="font-bold uppercase tracking-wider text-[#a2e635]">PASSPORT OF CITIZEN</span>
            </div>
            <span className="text-[#a2e635] font-bold text-xs">№ AA8942110</span>
          </div>
          
          <div className="flex gap-4 my-3 items-center">
            {/* Passport Photo Frame */}
            <div className="h-28 w-24 bg-[#111827] border-2 border-gray-800 rounded-lg flex flex-col items-center justify-center p-2 relative overflow-hidden shrink-0">
              <UserIcon className="h-10 w-10 text-gray-650 mb-1" />
              <div className="font-bold text-center text-[7px] text-gray-400 capitalize">
                {selectedOrder?.clientName.split(' ')[0]}
              </div>
              <div className="absolute inset-0 bg-[#65a30d]/5 mix-blend-color-burn"></div>
            </div>

            <div className="flex-1 space-y-1.5 leading-snug">
              <div>
                <span className="text-gray-500 block uppercase text-[8px]">Surname</span>
                <span className="text-white font-bold uppercase text-xs">
                  {selectedOrder ? selectedOrder.clientName.split(' ').slice(1).join(' ') : 'SMITH'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block uppercase text-[8px]">Given Names</span>
                <span className="text-white font-bold uppercase text-xs">
                  {selectedOrder ? selectedOrder.clientName.split(' ')[0] : 'JOHN'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 block text-[7px]">CITIZENSHIP</span>
                  <span className="text-gray-250 font-extrabold uppercase">{selectedOrder ? translateCountry(selectedOrder.country, currentLanguage) : 'USA'}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[7px]">DATE OF BIRTH</span>
                  <span className="text-gray-250">14 AUG 1988</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-3 bg-[#111827]/60 p-2 rounded text-[7px] font-mono leading-none tracking-widest text-[#a2e635]/80">
            <p>P&lt;UZB{selectedOrder?.clientName.split(' ').slice(1).join(' ') || 'SMITH'}&lt;&lt;{selectedOrder?.clientName.split(' ')[0] || 'JOHN'}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</p>
            <p className="mt-1">AA89421104USA8808145M2806060&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;02</p>
          </div>
        </div>
      );
    }

    if (type === 'stamp') {
      return (
        <div className="relative h-80 bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col items-center justify-center font-mono text-[10px] text-gray-400 select-none">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-24 w-40 flex-col items-center justify-center rounded border-4 border-dashed border-[#65a30d]/40 p-3 bg-[#65a30d]/5 transform rotate-3 relative">
              <span className="absolute -top-2.5 bg-[#111827] px-1 text-[8px] text-[#a2e635] font-bold tracking-widest">BORDER IMMIGRATION</span>
              <p className="font-extrabold text-[#a2e635] uppercase text-xs tracking-wider">TASHKENT AIRPORT</p>
              <p className="text-white font-bold text-sm my-1">{selectedOrder?.startDate || '2026-06-03'}</p>
              <p className="text-[8px] text-[#a2e635]/80 tracking-widest uppercase">⚠️ ENTRY PERMITTED - CONTROL K-18</p>
            </div>
            <p className="text-xs text-gray-500 max-w-xs mt-2 leading-relaxed">
              Consolidated stamp of arrival at Tashkent Airport frontier crossing passport control.
            </p>
          </div>
        </div>
      );
    }

    if (type === 'visa') {
      return (
        <div className="relative h-80 bg-gradient-to-br from-[#1f2937] to-[#111827] border border-gray-800 rounded-xl p-5 flex flex-col justify-between font-mono text-[9px] text-gray-305 select-none shadow-xl">
          <div className="flex justify-between items-center border-b border-[#65a30d]/30 pb-2">
            <span className="text-[#a2e635] font-bold tracking-widest">REPUBLIC OF UZBEKISTAN VISA</span>
            <span className="text-[#a2e635] font-bold text-xs">№ EV-8830113</span>
          </div>

          <div className="grid grid-cols-2 gap-4 my-2 text-xs leading-normal">
            <div>
              <span className="text-gray-500 block uppercase text-[7px]">Full Name</span>
              <span className="text-white font-bold uppercase">{selectedOrder?.clientName || 'SMITH JOHN'}</span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase text-[7px]">Passport No.</span>
              <span className="text-white font-bold uppercase">AA8942110</span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase text-[7px]">Visa Class</span>
              <span className="text-white font-bold text-[#a2e635] uppercase">T-Tourist Single Entry</span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase text-[7px]">Valid From / To</span>
              <span className="text-white font-bold font-mono">2026-06-01 / 2026-07-01</span>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
            <div className="text-[7px] text-gray-550 leading-snug">
              <p>UZBEKISTAN MINISTRY OF FOREIGN AFFAIRS</p>
              <p>ISSUED VIA DIGITAL E-PORTAL PROCESS</p>
            </div>
            <div className="h-10 w-10 border border-[#65a30d]/30 bg-[#111827] flex items-center justify-center text-gray-500 font-sans text-[7px]">
              [ QR CODE ]
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div id="div-operator-dashboard-root" className="min-h-screen bg-[#111827] text-gray-100 font-sans p-4 sm:p-6 md:p-8 selection:bg-[#65a30d]/40 selection:text-white">
      <div id="div-operator-main-shell" className="max-w-7xl mx-auto">
        
        {/* Header bar */}
        <header id="header-operator-panel" className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-800 pb-6 mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <BrandLogo id="operator-header-logo" iconOnly={true} />
            <div>
              <p className="text-xs text-gray-500 font-mono tracking-widest uppercase">RegistApp® by Jules Verne Hostel</p>
              <h1 className="text-2xl font-bold tracking-tight text-white mt-0.5">{t('operatorTitle')}</h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-200">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-xs text-[#a2e635] font-mono font-bold">RegistApp® Operator ({currentUser.id})</p>
            </div>

            {/* Language Switcher */}
            <div className="flex items-center space-x-1.5 border border-gray-800 bg-[#1f2937]/40 px-3 py-2 rounded-xl">
              <Languages className="h-3.5 w-3.5 text-gray-400" />
              <select
                id="select-operator-language"
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
              id="btn-operator-logout"
              onClick={handleLogout}
              className="flex items-center space-x-2 rounded-xl border border-gray-800 bg-[#1f2937] px-4 py-2 text-xs text-gray-400 hover:border-red-900 hover:text-red-400 transition"
            >
              <Clock className="h-4 w-4" />
              <span>{t('logOut')}</span>
            </button>
          </div>
        </header>

        {/* Back navigation button if evaluating an order */}
        {selectedOrder && (
          <button
            id="btn-back-to-queue"
            onClick={handleBackToQueue}
            className="inline-flex items-center space-x-1.5 text-xs text-[#a2e635] font-bold hover:text-white bg-[#1f2937]/60 hover:bg-[#1f2937] border border-gray-800 px-3 py-1.5 rounded-xl mb-6 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{currentLanguage === 'ru' ? 'Вернуться к очереди' : 'Back to Queue'}</span>
          </button>
        )}

        {/* Two layout modes: 1. Main Queue List, 2. Dynamic Processing terminal */}
        {!selectedOrder ? (
          <div id="section-queue-terminal" className="space-y-6">
            
            {/* Elegant tabs switcher */}
            <div className="flex border-b border-gray-800" id="operator-tabs-container">
              <button
                id="btn-tab-open"
                onClick={() => setActiveTab('open')}
                className={`flex items-center space-x-2 px-5 py-3 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition duration-200 ${
                  activeTab === 'open'
                    ? 'border-[#a2e635] text-[#a2e635]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{t('openOrders')}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'open' ? 'bg-[#a2e635]/20 text-[#a2e635]' : 'bg-gray-800 text-gray-500'
                }`}>
                  {openOrders.length}
                </span>
              </button>
              <button
                id="btn-tab-history"
                onClick={() => setActiveTab('history')}
                className={`flex items-center space-x-2 px-5 py-3 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition duration-200 ${
                  activeTab === 'history'
                    ? 'border-[#a2e635] text-[#a2e635]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Check className="h-4 w-4" />
                <span>{t('operatorHistory')}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'history' ? 'bg-[#a2e635]/20 text-[#a2e635]' : 'bg-gray-800 text-gray-500'
                }`}>
                  {historyOrders.length}
                </span>
              </button>
              <button
                id="btn-tab-blacklist"
                onClick={() => setActiveTab('blacklist')}
                className={`flex items-center space-x-2 px-5 py-3 text-xs md:text-sm font-semibold tracking-wide border-b-2 transition duration-300 ${
                  activeTab === 'blacklist'
                    ? 'border-red-500 text-red-500 font-bold'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-800'
                }`}
              >
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{currentLanguage === 'ru' ? 'Чёрный список' : 'Blacklist'}</span>
              </button>
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight flex items-center space-x-2 pt-2">
              <span>
                {activeTab === 'open' 
                  ? t('pendingVerification')
                  : activeTab === 'history'
                  ? t('operatorHistory')
                  : (currentLanguage === 'ru' ? 'Чёрный список нарушителей миграционного контроля' : 'Immigration Compliance Violation Blacklist')}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold border ${
                activeTab === 'blacklist'
                  ? 'bg-red-950/40 border-red-900 text-red-400 animate-pulse'
                  : 'bg-[#65a30d]/20 border-[#65a30d]/40 text-[#a2e635]'
              }`}>
                {activeTab === 'blacklist' ? blacklistedOrders.length : displayedOrders.length} {activeTab === 'blacklist' ? (currentLanguage === 'ru' ? 'Нарушителей' : 'Violators') : activeTab === 'open' ? (currentLanguage === 'ru' ? 'Активных' : 'Open') : (currentLanguage === 'ru' ? 'Обработанных вами' : 'Done by you')}
              </span>
            </h3>

            {activeTab === 'blacklist' ? (
              <div id="view-operator-blacklist-section" className="space-y-4 animate-fade-in">
                <div className="rounded-xl border border-red-900/60 bg-red-950/15 p-5 text-xs text-red-300 flex items-start space-x-3 leading-relaxed">
                  <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider block text-red-400 mb-1">
                      {currentLanguage === 'ru' ? 'СИСТЕМНЫЙ ЧЕРНЫЙ СПИСК МИГРАЦИОННОЙ СЛУЖБЫ' : 'STATE SECURITY MIGRANT MONITORING BLACKLIST'}
                    </span>
                    <p className="text-gray-450">
                      {currentLanguage === 'ru' 
                        ? 'Этот список содержит иностранных граждан, в отношении которых операторами был составлен рапорт о нарушении правил пребывания (отправлен Violation Guide). Нарушители автоматически блокируются системой: они больше не могут подавать заявления на регистрацию в RegistApp по любым паспортам, привязанным к их электронной почте.'
                        : 'Identifies foreign citizens flagged for residency exceedance guidelines under Article 224 during verification checks. Associated accounts are permanently blacklisted; future registration pipelines for these verified emails are fully blocked in real-time.'}
                    </p>
                  </div>
                </div>

                {blacklistedOrders.length === 0 ? (
                  <div id="card-operator-blacklist-empty" className="rounded-2xl border border-dashed border-gray-800 bg-[#1f2937]/20 p-12 text-center text-gray-500">
                    <CheckCircle className="mx-auto h-12 w-12 text-zinc-650 mb-4" />
                    <p className="text-sm max-w-sm mx-auto leading-relaxed">
                      {currentLanguage === 'ru' ? 'Нарушителей в системе не зарегистрировано. Отличный показатель комплаенса.' : 'Excellent compliant records! No travelers have been blacklisted.'}
                    </p>
                  </div>
                ) : (
                  <div id="table-operator-blacklist-container" className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1f2937]/40">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#111827]/80 border-b border-gray-800 text-gray-400 font-mono tracking-wider">
                          <th className="p-4">{t('orderId')}</th>
                          <th className="p-4">{currentLanguage === 'ru' ? 'ФИО Нарушителя' : 'Tourist Name'}</th>
                          <th className="p-4">{currentLanguage === 'ru' ? 'Электронная почта' : 'Email Address'}</th>
                          <th className="p-4">{currentLanguage === 'ru' ? 'Гражданство / Страна' : 'Citizenship'}</th>
                          <th className="p-4">{currentLanguage === 'ru' ? 'Дата блокировки' : 'Date Penalized'}</th>
                          <th className="p-4 text-right">{currentLanguage === 'ru' ? 'Решение службы' : 'Operator Decision'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850 text-gray-300">
                        {blacklistedOrders.map((o) => (
                          <tr key={o.id} className="hover:bg-[#111827]/30 transition">
                            <td className="p-4 font-mono text-red-400 font-semibold">{o.id}</td>
                            <td className="p-4 font-bold text-gray-100">{o.clientName}</td>
                            <td className="p-4 font-mono text-gray-400">{o.clientEmail}</td>
                            <td className="p-4">{translateCountry(o.country, currentLanguage)}</td>
                            <td className="p-4 text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</td>
                            <td className="p-4 text-right">
                              <span className="inline-flex items-center rounded-full bg-red-950/50 border border-red-900/60 text-red-400 px-3 py-1 text-[9px] font-bold tracking-wider uppercase font-mono">
                                {currentLanguage === 'ru' ? 'Отказ: Нарушение' : 'Rejected: Infraction'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              displayedOrders.length === 0 ? (
                <div id="card-operator-queue-empty" className="rounded-2xl border border-dashed border-gray-800 bg-[#1f2937]/20 p-12 text-center animate-fade-in">
                  <CheckCircle className="mx-auto h-12 w-12 text-lime-600 mb-4 animate-bounce" />
                  <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                    {activeTab === 'open' 
                      ? (currentLanguage === 'ru' ? 'Отлично! В очереди нет невыполненных регистраций иностранных туристов. Все каналы соответствуют требованиям.' : 'Excellent ! No pending foreign tourist registrations in queue. State channels are fully compliant in real-time.')
                      : t('noHistoryOrders')
                    }
                  </p>
                </div>
              ) : (
                <div id="table-operator-queue-container" className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1f2937]/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#111827]/80 border-b border-gray-800 text-gray-400 font-mono tracking-wider">
                        <th className="p-4">{t('orderId')}</th>
                        <th className="p-4">{t('clientDetails')}</th>
                        <th className="p-4">
                          {activeTab === 'history'
                            ? (currentLanguage === 'ru' ? 'Ответ (Выполнение)' : currentLanguage === 'fr' ? 'Réponse (Exécution)' : 'Response (Execution)')
                            : (currentLanguage === 'ru' ? 'Размещено (Ожидание)' : currentLanguage === 'fr' ? 'Dépôt (Attente)' : 'Placement (Waiting)')
                          }
                        </th>
                        <th className="p-4">{currentLanguage === 'ru' ? 'Срок и календарь' : 'Duration & Calendar'}</th>
                        <th className="p-4">{currentLanguage === 'ru' ? 'Валюта платежа и сбор' : 'Paid Currency & Fee'}</th>
                        <th className="p-4">{currentLanguage === 'ru' ? 'Статус верификации' : 'Verification Check'}</th>
                        <th className="p-4 text-right">{currentLanguage === 'ru' ? 'Панель верификации' : 'Verification Terminal'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {displayedOrders.map((o) => {
                        const isUrgent = isUrgentOrder(o.createdAt, o.status);
                        return (
                          <tr 
                            id={`row-operator-queue-${o.id}`} 
                            key={o.id} 
                            className={`transition ${
                              isUrgent 
                                ? 'bg-red-950/10 hover:bg-red-950/20 border-l-[4px] border-l-red-500 shadow-[inset_4px_0_12px_rgba(239,68,68,0.06)]' 
                                : 'hover:bg-[#1f2937]/40 border-l-[4px] border-l-transparent'
                            }`}
                          >
                            <td className="p-4 font-mono font-bold text-white select-all">{o.id}</td>
                            <td className="p-4">
                              <p className="font-semibold text-gray-200">{o.clientName}</p>
                              <p className="text-[10px] text-gray-500">{o.clientEmail}</p>
                            </td>
                            <td className="p-4 font-mono font-medium text-gray-300 select-all whitespace-nowrap">
                              {activeTab === 'history'
                                ? formatResponseTimeAndExecution(o.createdAt, o.completedAt || o.confirmedAt, currentLanguage)
                                : (
                                  <div>
                                    <div>{formatPlacementAndWaiting(o.createdAt, o.status, o.completedAt, currentLanguage)}</div>
                                    {isUrgent && (
                                      <div className="mt-1.5 flex items-center space-x-1.5 px-2 py-0.5 rounded bg-red-950/95 text-red-300 border border-red-500/50 w-fit text-[9px] font-bold font-mono tracking-wider animate-pulse uppercase select-none">
                                        <span className="relative flex h-2 w-2">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                        <span>{currentLanguage === 'ru' ? 'СРОЧНО И СИРЕНА (>12 Ч)' : currentLanguage === 'fr' ? 'URGENT (>12 H)' : 'URGENT (>12H)'}</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              }
                            </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-1 font-mono text-gray-200">
                              <span>{o.startDate}</span>
                              <span className="text-gray-600">~</span>
                              <span>{o.endDate}</span>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-0.5">{o.totalDays} {currentLanguage === 'ru' ? 'раб. дней в Узбекистане' : 'business days in Uzbekistan'}</p>
                          </td>
                          <td className="p-4 font-bold text-white font-mono">
                            {o.currency === 'UZS' ? `${o.totalPrice.toLocaleString()} UZS` : o.currency === 'EUR' ? `€${o.totalPrice}` : o.currency === 'RUB' ? `${o.totalPrice} RUB` : `$${o.totalPrice} USD`}
                            <span className="text-[9px] text-[#a2e635] block uppercase font-sans tracking-wide mt-0.5">
                              {currentLanguage === 'ru' ? 'Квитанция: ' : 'Reference: '}{o.paymentTxId || (currentLanguage === 'ru' ? 'Ручная проверка' : 'Manual Check')}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex max-w-fit items-center rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                o.status === 'Completed'
                                  ? 'bg-lime-950/40 border border-lime-800 text-[#a2e635]'
                                  : o.status === 'Paid'
                                  ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-400'
                                  : o.status === 'Payment Pending'
                                  ? 'bg-red-950/40 border border-red-900 text-red-100'
                                  : o.status === 'Rejected due to violations'
                                  ? 'bg-red-950/40 border border-red-900 text-red-400 font-extrabold'
                                  : 'bg-amber-950/40 border border-amber-800 text-amber-400'
                              }`}>
                                {o.status === 'Completed' 
                                  ? (currentLanguage === 'ru' ? 'Завершен' : 'Completed') 
                                  : o.status === 'Paid' 
                                  ? (currentLanguage === 'ru' ? 'Оплачено' : 'Paid') 
                                  : o.status === 'Rejected due to violations'
                                  ? (currentLanguage === 'ru' ? 'Отказано (нарушение)' : 'Rejected due to violations')
                                  : o.status === 'Payment Pending' 
                                  ? (currentLanguage === 'ru' ? 'Отказ по оплате' : 'Payment Pending')
                                  : (currentLanguage === 'ru' ? 'В работе' : 'In Progress')}
                              </span>
                              {o.violationReportUrl && (
                                  <span className="inline-flex max-w-fit items-center rounded-full bg-red-950/40 border border-red-800 px-2 py-0.5 text-[9px] font-bold text-red-300">
                                    {currentLanguage === 'ru' ? 'Заявление о нарушении' : 'Warning Flagged'}
                                  </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              id={`btn-review-${o.id}`}
                              onClick={() => handleSelectOrder(o)}
                              className={`inline-flex items-center space-x-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition duration-300 ${
                                (o.status === 'Completed' || o.status === 'Payment Pending' || o.status === 'Rejected due to violations')
                                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                  : 'bg-[#65a30d] text-[#111827] hover:bg-[#4d7c0f] hover:text-white'
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>{(o.status === 'Completed' || o.status === 'Payment Pending' || o.status === 'Rejected due to violations') ? (currentLanguage === 'ru' ? 'Посмотреть детали' : 'View Details') : (currentLanguage === 'ru' ? 'Проверить заказ' : 'Verify Order')}</span>
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        ) : (
          /* Process Order Workstation Screen */
          <div id="layout-verification-station" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Column: Document review slider & client details (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Client specifications Card */}
              <div id="card-operator-client-meta" className="rounded-2xl border border-gray-800 bg-[#1f2937]/60 p-6 shadow-2xl">
                <h3 className="text-md font-bold text-gray-200 tracking-tight border-b border-gray-800 pb-3 mb-4">{t('clientDetails')}</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs leading-relaxed">
                  <div>
                    <span className="text-gray-500 block font-mono uppercase tracking-wide text-[9px]">{currentLanguage === 'ru' ? 'Полное имя' : 'Full Name'}</span>
                    <span className="text-white font-bold text-sm block mt-0.5">{selectedOrder.clientName}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-mono uppercase tracking-wide text-[9px]">{t('countryLabel')}</span>
                    <span className="text-gray-100 font-bold block mt-0.5">{translateCountry(selectedOrder.country, currentLanguage)} (<span className="text-[#a2e635]">{selectedOrder.visaType === 'Visa' ? (currentLanguage === 'ru' ? 'визовый' : 'Visa status') : (currentLanguage === 'ru' ? 'безвизовый' : 'Visa-free status')}</span>)</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-mono uppercase tracking-wide text-[9px]">{currentLanguage === 'ru' ? 'Период регистрации' : 'Registration Calendar'}</span>
                    <span className="text-gray-200 font-mono font-bold block mt-0.5">{selectedOrder.startDate} {currentLanguage === 'ru' ? 'по' : 'to'} {selectedOrder.endDate} ({selectedOrder.totalDays})</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-mono uppercase tracking-wide text-[9px]">{currentLanguage === 'ru' ? 'Связанная сумма' : 'Settlement Amount'}</span>
                    <span className="text-[#a2e635] font-mono font-extrabold block mt-0.5">
                      {selectedOrder.currency === 'UZS' ? `${selectedOrder.totalPrice.toLocaleString()} UZS` : selectedOrder.currency === 'EUR' ? `€${selectedOrder.totalPrice} EUR` : selectedOrder.currency === 'RUB' ? `${selectedOrder.totalPrice} RUB` : `$${selectedOrder.totalPrice} USD`}
                    </span>
                  </div>
                </div>
              </div>

              {/* High-Fidelity Documents verification station */}
              <div id="card-document-verification-dock" className="rounded-2xl border border-gray-800 bg-[#1f2937]/60 p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-5">
                  <h3 className="text-md font-bold text-gray-200 tracking-tight">{t('uploadedDocs')}</h3>
                  
                  {/* Selector tabs between different scans */}
                  <div className="flex space-x-1.5" id="tabs-doc-viewer">
                    <button
                      id="btn-view-passport-tab"
                      onClick={() => setActiveViewerTab('passport')}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                        activeViewerTab === 'passport' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {t('viewPassport')}
                    </button>
                    <button
                      id="btn-view-stamp-tab"
                      onClick={() => setActiveViewerTab('stamp')}
                      className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                        activeViewerTab === 'stamp' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {t('viewStamp')}
                    </button>
                    {selectedOrder.visaType === 'Visa' && (
                      <button
                        id="btn-view-visa-tab"
                        onClick={() => setActiveViewerTab('visa')}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                          activeViewerTab === 'visa' ? 'bg-[#65a30d] text-[#111827] font-extrabold' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {t('viewVisa')}
                      </button>
                    )}
                    {selectedOrder.finalDocUrl && (
                      <button
                        id="btn-view-registration-tab"
                        onClick={() => setActiveViewerTab('registration')}
                        className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                          activeViewerTab === 'registration' ? 'bg-green-600 text-white font-extrabold' : 'bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                      >
                        {currentLanguage === 'ru' ? 'Регистрация (PDF)' : 'Registration (PDF)'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-renderer */}
                {renderDocumentMockup(activeViewerTab)}
              </div>

            </div>

            {/* Right Column: Processing Terminal controls (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              
              <div id="card-verification-validation-terminal" className="rounded-2xl border border-gray-800 bg-gradient-to-b from-[#1f2937] to-[#111827] p-6 shadow-3xl">
                <h3 className="text-sm font-bold text-white font-mono tracking-widest uppercase mb-4 text-[#a2e635]">{t('actionsTerminal')}</h3>
                
                {/* 1. Payment verification status and actions */}
                {selectedOrder.status === 'In Progress' && (
                  <div className="border border-amber-900 bg-amber-950/10 rounded-2xl p-4 mb-5 space-y-3 animate-fade-in" id="operator-payment-verify-dock">
                    <div className="text-xs font-black text-amber-400 font-mono flex items-center space-x-1.5 uppercase tracking-wide">
                      <Clock className="h-4 w-4 text-amber-505 animate-pulse" />
                      <span>{currentLanguage === 'ru' ? 'Верификация оплаты' : 'Payment Verification'}</span>
                    </div>
                    <p className="text-[11px] text-gray-300 leading-snug">
                      {currentLanguage === 'ru' 
                        ? 'Проверьте поступление оплаты по указ. ID чека. Подтвердите поступление или отклоните его.' 
                        : 'Verify receipt of resources for this order. Confirm payment or declare as unreceived.'}
                    </p>

                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-3 text-xs space-y-1">
                      <div className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">{currentLanguage === 'ru' ? 'Идентификатор транзакции / чек' : 'Transaction ID / Receipt Reference'}:</div>
                      <div className="font-mono font-bold text-amber-400 select-all">{selectedOrder.paymentTxId || 'N/A'}</div>
                    </div>

                    {!isRejecting ? (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          id="btn-confirm-payment"
                          type="button"
                          onClick={handlePaymentReceivedAction}
                          className="flex items-center justify-center space-x-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-extrabold text-white transition shadow-md shadow-emerald-950/20"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{t('paymentReceived')}</span>
                        </button>
                        <button
                          id="btn-reject-payment"
                          type="button"
                          onClick={() => setIsRejecting(true)}
                          className="flex items-center justify-center space-x-1 rounded-xl bg-red-950/40 border border-red-850 hover:bg-red-900 px-1 py-2.5 text-xs font-bold text-red-400 hover:text-white transition"
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>{t('paymentNotReceived')}</span>
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handlePaymentNotReceivedAction} className="space-y-2.5 pt-1.5 border-t border-gray-800 animate-fade-in" id="form-rejection-msg">
                        <div className="text-[9px] font-bold text-red-500 uppercase tracking-wider">
                          {currentLanguage === 'ru' ? 'Причина отклонения (клиент её увидит' : 'Rejection reason (client will see this)'}
                        </div>
                        <textarea
                          rows={2}
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder={t('paymentFailedMsgPlaceholder')}
                          className="w-full rounded-lg border border-gray-800 bg-[#111827] px-2.5 py-2 text-xs text-white placeholder-gray-750 outline-none focus:border-red-850 transition resize-none"
                        />
                        <div className="flex space-x-2">
                          <button
                            id="btn-submit-rejection"
                            type="submit"
                            className="flex-1 bg-red-700 hover:bg-red-800 text-white rounded-lg py-1.5 text-xs font-bold transition"
                          >
                            {currentLanguage === 'ru' ? 'Отклонить оплату' : 'Reject & Notify'}
                          </button>
                          <button
                            id="btn-cancel-rejection"
                            type="button"
                            onClick={() => { setIsRejecting(false); setRejectionReason(''); }}
                            className="bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg px-3 py-1.5 text-xs font-bold transition"
                          >
                            {currentLanguage === 'ru' ? 'Назад' : 'Back'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {selectedOrder.status === 'Payment Pending' && (
                  <div className="mb-5 flex flex-col gap-1.5 text-red-400 bg-red-950/20 border border-red-900/60 px-3.5 py-3 rounded-2xl text-xs font-sans animate-fade-in" id="operator-payment-rejected-dock">
                    <div className="flex items-center space-x-2 font-mono font-bold">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{currentLanguage === 'ru' ? 'Оплата Отклонена' : 'Payment Rejected (Pending)'}</span>
                    </div>
                    {selectedOrder.paymentFailedMessage && (
                      <p className="text-gray-400 text-[11px] leading-relaxed select-text italic">
                        "{selectedOrder.paymentFailedMessage}"
                      </p>
                    )}
                  </div>
                )}

                {(selectedOrder.status === 'Paid' || selectedOrder.status === 'Completed') && (
                  <div className="mb-5 flex items-center space-x-2.5 text-emerald-450 bg-emerald-950/20 border border-emerald-900/60 px-3.5 py-3 rounded-2xl text-xs font-mono font-bold animate-fade-in" id="operator-payment-success-dock">
                    <CheckCircle className="h-4.5 w-4.5 text-emerald-500 shrink-0 animate-bounce" />
                    <span>{currentLanguage === 'ru' ? 'Оплата Полностью Подтверждена' : 'Payment Verified & Confirmed'}</span>
                  </div>
                )}

                {/* 2. Send warning guide flag */}
                <div className="border-b border-gray-800 pb-5 mb-5 space-y-3">
                  <div className="flex items-start space-x-2 text-gray-400 text-xs">
                    <AlertCircle className="h-4.5 w-4.5 shrink-0 text-amber-500 mt-0.5" />
                    <p className="leading-snug">
                      {currentLanguage === 'ru' 
                        ? 'Отправляйте предупреждения о превышении срока пребывания или ошибках в документах прямо на устройство клиента.' 
                        : 'Flag overstay warnings or documentation errors directly onto the client\'s device.'}
                    </p>
                  </div>
                  
                  <button
                    id="btn-flag-law-violation"
                    type="button"
                    onClick={handleSendViolationClick}
                    disabled={!!selectedOrder.violationReportUrl}
                    className={`w-full flex items-center justify-center space-x-2 rounded-xl py-2.5 text-xs font-bold transition ${
                      selectedOrder.violationReportUrl
                        ? 'bg-gray-800 text-gray-500 border border-gray-750 cursor-not-allowed'
                        : 'bg-red-950/40 border border-red-800 text-red-400 hover:bg-red-850 hover:text-white'
                    }`}
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>{selectedOrder.violationReportUrl ? (currentLanguage === 'ru' ? 'Памятка нарушителя отправлена' : 'Violation Guide Sent') : t('violationReportBtn')}</span>
                  </button>
                </div>

                {/* 3. Process on official e-mehmon linking (Only active once paid/completed) */}
                <div className={`border-b border-gray-800 pb-5 mb-5 space-y-3 ${(selectedOrder.status !== 'Paid' && selectedOrder.status !== 'Completed') ? 'opacity-30 pointer-events-none select-none' : ''}`}>
                  <div className="flex items-start space-x-2 text-gray-400 text-xs">
                    <ExternalLink className="h-4.5 w-4.5 shrink-0 text-[#a2e635] mt-0.5" />
                    <p className="leading-snug">
                      {currentLanguage === 'ru' 
                        ? 'Войдите и обработайте эти списки паспортов в государственной базе данных.' 
                        : 'Log in and process these synchronized passport arrays on the government database.'}
                    </p>
                  </div>

                  <a
                    id="btn-link-e-mehmon"
                    href="https://emehmon.uz/selflistok"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 rounded-xl bg-[#111827]/80 border border-gray-800 text-gray-300 hover:border-[#65a30d] hover:text-[#a2e635] py-2.5 text-xs font-bold transition"
                  >
                    <span>{t('processEmehmon')}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                {/* 4. Upload or generate final certified registration stamp */}
                {selectedOrder.status === 'In Progress' ? (
                  <div className="rounded-2xl border border-dashed border-gray-800 bg-[#111827]/30 p-5 text-center text-xs text-gray-500 font-sans" id="upload-locked-notice">
                    <div className="font-bold flex items-center justify-center space-x-1.5 text-amber-500 mb-1.5">
                      <Clock className="h-4 w-4" />
                      <span>{currentLanguage === 'ru' ? 'Ожидание верификации оплаты' : 'Awaiting Payment Verification'}</span>
                    </div>
                    {currentLanguage === 'ru' 
                      ? 'Подтвердите получение оплаты выше, чтобы разблокировать доступ к выдаче документации.' 
                      : 'Confirm that money was received to unlock e-Mehmon actions and registration issuance.'}
                  </div>
                ) : selectedOrder.status === 'Payment Pending' ? (
                  <div className="rounded-2xl border border-dashed border-red-900 bg-red-950/10 p-5 text-center text-xs text-gray-400 font-sans" id="upload-rejected-notice">
                    <div className="font-bold flex items-center justify-center space-x-1.5 text-red-500 mb-1.5">
                      <AlertCircle className="h-4 w-4" />
                      <span>{currentLanguage === 'ru' ? 'Отказ по оплате' : 'Payment Rejected'}</span>
                    </div>
                    {currentLanguage === 'ru' 
                      ? 'Заказ находится в истории ваших отказов. Ожидание исправления и повторной оплаты от клиента.' 
                      : 'This order is in your rejection history. Awaiting correction and resubmission.'}
                  </div>
                ) : selectedOrder.status === 'Completed' ? (
                  <div className="rounded-2xl border border-lime-900 bg-lime-950/10 p-5 space-y-4 animate-fade-in" id="operator-completed-display">
                    <div className="font-bold flex items-center justify-center space-x-1.5 text-lime-450 text-xs">
                      <CheckCircle className="h-4 w-4 text-[#a2e635]" />
                      <span>{currentLanguage === 'ru' ? 'Регистрация официально выдана' : 'Registration Certificate Issued'}</span>
                    </div>
                    
                    <div className="bg-[#111827] border border-gray-800 rounded-xl p-3 text-[11px] space-y-1.5 text-gray-300">
                      <div className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">{currentLanguage === 'ru' ? 'Наименование файла' : 'Uploaded File Name'}:</div>
                      <div className="font-mono font-bold text-gray-200 truncate">{selectedOrder.finalDocName || `Registration-Stamp-${selectedOrder.id}.pdf`}</div>
                    </div>

                    {selectedOrder.operatorNotes && (
                      <div className="bg-[#111827] border border-gray-800 rounded-xl p-3 text-[11px] space-y-1.5 text-gray-300">
                        <div className="text-gray-500 font-mono text-[9px] uppercase tracking-wider">{currentLanguage === 'ru' ? 'Ваши заметки' : 'Your Notes'}:</div>
                        <p className="font-sans text-gray-200 select-text bg-[#1f2937]/30 p-2 rounded border border-gray-850/60 leading-relaxed italic">"{selectedOrder.operatorNotes}"</p>
                      </div>
                    )}

                    <button
                      id="btn-operator-dl-final-pdf-block"
                      type="button"
                      onClick={() => {
                        if (selectedOrder.finalDocUrl && selectedOrder.finalDocUrl.startsWith('data:')) {
                          const parts = selectedOrder.finalDocUrl.split(',');
                          const mimeMatch = parts[0].match(/:(.*?);/);
                          const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
                          const binary = atob(parts[1]);
                          const array = [];
                          for (let i = 0; i < binary.length; i++) {
                            array.push(binary.charCodeAt(i));
                          }
                          const blob = new Blob([new Uint8Array(array)], { type: mimeType });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = selectedOrder.finalDocName || `Registration-Stamp-${selectedOrder.id}.pdf`;
                          link.click();
                          URL.revokeObjectURL(url);
                        } else {
                          const content = `REGISTAPP OFFICIAL REGISTRATION CERTIFICATE\n` +
                                          `Order ID: ${selectedOrder.id}\n` +
                                          `Citizen Name: ${selectedOrder.clientName}\n` +
                                          `Registration dates: ${selectedOrder.startDate} to ${selectedOrder.endDate}\n`;
                          const blob = new Blob([content], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `Registration-Stamp-${selectedOrder.id}.txt`;
                          link.click();
                          URL.revokeObjectURL(url);
                        }
                      }}
                      className="w-full flex items-center justify-center space-x-2 rounded-xl bg-green-600 hover:bg-green-700 py-3 text-xs font-bold text-white transition shadow-lg shadow-green-950/20 cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      <span>{currentLanguage === 'ru' ? 'Скачать файл PDF' : 'Download Registered PDF'}</span>
                    </button>
                  </div>
                ) : (
                  <form id="form-operator-finalize" onSubmit={handleFinalizeVerificationSubmit} className="space-y-4 animate-fade-in">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1">{t('operatorUploadReg')}</label>
                      <label id="label-upload-box" className={`flex flex-col items-center justify-center border rounded-xl p-4 cursor-pointer transition ${
                        uploadedDocName 
                          ? 'border-green-500/85 bg-green-950/30 hover:bg-green-950/40' 
                          : 'border-gray-800 bg-[#111827] hover:border-gray-750'
                      }`}>
                        <UploadCloud className={`h-6 w-6 mb-1 ${uploadedDocName ? 'text-green-400 animate-pulse' : 'text-gray-500'}`} />
                        <span className={`text-[10px] text-center font-mono font-bold ${uploadedDocName ? 'text-green-300' : 'text-gray-400'}`}>
                          {uploadedDocName ? `${currentLanguage === 'ru' ? 'Файл: ' : 'File: '}${uploadedDocName.slice(0, 18)}...` : (currentLanguage === 'ru' ? 'Выберите итоговый сертификат PDF' : 'Select final certification PDF')}
                        </span>
                        <input
                          id="input-file-final-doc"
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </label>
                    </div>

                    <div>
                      <label htmlFor="textarea-notes" className="block text-xs text-gray-400 mb-1">{currentLanguage === 'ru' ? 'Заметки оператора' : 'Operator Notes'}</label>
                      <textarea
                        id="textarea-notes"
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t('operatorNotesPlaceholder')}
                        className="w-full rounded-xl border border-gray-800 bg-[#111827] px-3 py-2 text-xs text-white placeholder-gray-700 outline-none focus:border-[#65a30d] transition resize-none"
                      />
                    </div>

                    {errorMessage && (
                      <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400 font-sans" id="alert-operator-error">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {successMessage && (
                      <div className="flex items-center space-x-2 rounded-lg bg-lime-950/45 border border-lime-800 px-3 py-2 text-xs text-[#a2e635] animate-pulse" id="alert-operator-success">
                        <CheckCircle className="h-4 w-4 shrink-0 text-lime-450" />
                        <span>{successMessage}</span>
                      </div>
                    )}

                    <button
                      id="btn-operator-finalize-submit"
                      type="submit"
                      disabled={selectedOrder.status === 'Completed'}
                      className={`w-full py-3 rounded-xl text-xs font-bold transition duration-300 ${
                        selectedOrder.status === 'Completed'
                          ? 'bg-gray-800 text-gray-500 border border-gray-750 cursor-not-allowed text-center'
                          : uploadedDocName
                          ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/30 font-black'
                          : 'bg-[#65a30d] text-[#111827] hover:bg-[#4d7c0f] hover:text-white shadow-lg shadow-[#65a30d]/10 font-black'
                      }`}
                    >
                      {selectedOrder.status === 'Completed' ? (currentLanguage === 'ru' ? 'Уже проверено и архивировано' : 'Already Verified & Archived') : t('completeProcessingBtn')}
                    </button>
                  </form>
                )}

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
