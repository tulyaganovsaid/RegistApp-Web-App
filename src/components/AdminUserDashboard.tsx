import React, { useState, useEffect } from 'react';
import { 
  Users, FileText, ShieldAlert, Download, LogOut, Calendar, Mail, 
  UserCheck, X, Eye, FileDigit, ZoomIn, RefreshCw
} from 'lucide-react';
import { User, Order, LanguageCode } from '../types';
import AppFooter from './AppFooter';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface AdminUserDashboardProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentUser: User;
  onLogout: () => void;
  onProfileUpdate: (user: User) => void;
}

export default function AdminUserDashboard({ 
  currentLanguage, 
  setLanguage, 
  currentUser, 
  onLogout 
}: AdminUserDashboardProps) {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorText, setErrorText] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<{ name: string; content: string } | null>(null);

  // Load resources from Firestore in real-time
  useEffect(() => {
    setLoading(true);
    setErrorText('');

    // Real-time subscribe to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users: User[] = [];
      snapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() } as User);
      });
      setUsersList(users);
      setLoading(false);
    }, (err) => {
      console.error('Failed to listen to users collection:', err);
      setErrorText('Access Denied or Firestore Error: Cannot fetch users database.');
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    // Real-time subscribe to orders to count and display files
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      setOrdersList(orders);
    }, (err) => {
      console.error('Failed to listen to orders collection:', err);
      handleFirestoreError(err, OperationType.GET, 'orders');
    });

    return () => {
      unsubUsers();
      unsubOrders();
    };
  }, []);

  // Filter or grab user orders
  const getUserOrders = (userEmail: string, userId: string): Order[] => {
    return ordersList.filter(o => 
      (o.userId === userId || o.clientEmail?.toLowerCase() === userEmail?.toLowerCase())
    );
  };

  // Extract a list of uploaded files for a user with preview metadata
  const getUserFiles = (userEmail: string, userId: string) => {
    const orders = getUserOrders(userEmail, userId);
    const filesList: Array<{
      id: string;
      orderId: string;
      fileType: string;
      fileName: string;
      content: string;
      createdAt: string;
    }> = [];

    orders.forEach((o) => {
      if (o.passportScan && o.passportScan.length > 20) {
        filesList.push({
          id: `${o.id}-passport`,
          orderId: o.id,
          fileType: 'Passport Scan',
          fileName: `Passport_Scan_${o.clientName?.replace(/\s+/g, '_') || 'document'}.png`,
          content: o.passportScan,
          createdAt: o.createdAt || 'N/A'
        });
      }
      if (o.arrivalStamp && o.arrivalStamp.length > 20) {
        filesList.push({
          id: `${o.id}-stamp`,
          orderId: o.id,
          fileType: 'Arrival Stamp',
          fileName: `Arrival_Stamp_${o.clientName?.replace(/\s+/g, '_') || 'document'}.png`,
          content: o.arrivalStamp,
          createdAt: o.createdAt || 'N/A'
        });
      }
      if (o.visaScan && o.visaScan.length > 20) {
        filesList.push({
          id: `${o.id}-visa`,
          orderId: o.id,
          fileType: 'Visa Scan',
          fileName: `Visa_Scan_${o.clientName?.replace(/\s+/g, '_') || 'document'}.png`,
          content: o.visaScan,
          createdAt: o.createdAt || 'N/A'
        });
      }
    });

    return filesList;
  };

  // Helper to format creation dates nicely
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Pre-existing / Seeded';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString(currentLanguage === 'ru' ? 'ru-RU' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  // Downloader
  const handleDownload = (content: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = content;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="admin-user-dashboard-container" className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 md:p-8">
      <div id="admin-user-dashboard-shell" className="max-w-7xl mx-auto space-y-8">
        
        {/* Header section with explicit Admin identity badge */}
        <header id="admin-user-header" className="flex flex-col sm:flex-row items-center justify-between border-b border-zinc-800 pb-6 gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-xl shadow-orange-950/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white m-0">
                  {currentLanguage === 'ru' ? 'Панель Главного Администратора' : 'Super Admin Command center'}
                </h1>
                <span 
                  id="admin-indicator-badge" 
                  className="bg-orange-500/10 border border-orange-500/30 text-orange-400 font-mono text-[10px] uppercase font-bold tracking-widest px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-ping" />
                  ADMIN VIEW ACTIVE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {currentLanguage === 'ru' 
                  ? 'Конфиденциальный аудит учетных записей пользователей и файлов документов из Firestore'
                  : 'Confidential read-audit of client registrations and document scans retrieved from Firestore'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              id="admin-refresh-btn"
              onClick={() => window.location.reload()}
              title={currentLanguage === 'ru' ? 'Обновить страницу' : 'Refresh page'}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl bg-gradient-to-r from-[#65a30d] to-[#84cc16] hover:from-[#84cc16] hover:to-[#a2e635] px-4 py-2.5 text-xs font-bold text-gray-950 border border-[#a2e635]/60 shadow-md shadow-[#65a30d]/25 hover:shadow-lg hover:shadow-[#a2e635]/30 transition-all duration-150 cursor-pointer active:scale-95"
            >
              <RefreshCw className="h-3.5 w-3.5 text-gray-950" />
              <span>Refresh</span>
            </button>

            <button 
              id="admin-logout-btn"
              onClick={onLogout}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs text-zinc-400 hover:border-red-900 hover:text-red-400 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>{currentLanguage === 'ru' ? 'Выйти' : 'Sign Out'}</span>
            </button>
          </div>
        </header>

        {errorText && (
          <div id="admin-error-notice" className="rounded-xl border border-red-800 bg-red-950/20 p-4 text-xs text-red-400 flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4" />
            <span>{errorText}</span>
          </div>
        )}

        {/* Overview high contrast metrics */}
        <section id="admin-overview-metrics" className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between text-zinc-450 mb-2">
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold">
                {currentLanguage === 'ru' ? 'ВСЕГО ПОЛЬЗОВАТЕЛЕЙ' : 'TOTAL FIRE_USERS'}
              </span>
              <Users className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-3xl font-bold font-mono text-white tracking-tight">{usersList.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between text-zinc-450 mb-2">
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold">
                {currentLanguage === 'ru' ? 'ЗАГРУЖЕНО ФАЙЛОВ' : 'TOTAL SCANNED FILES'}
              </span>
              <FileText className="h-4 w-4 text-orange-500" />
            </div>
            <p className="text-3xl font-bold font-mono text-white tracking-tight">
              {usersList.reduce((sum, u) => sum + getUserFiles(u.email ?? '', u.id).length, 0)}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/40 p-5">
            <div className="flex items-center justify-between text-zinc-450 mb-2">
              <span className="text-[10px] tracking-widest uppercase font-mono font-bold">
                {currentLanguage === 'ru' ? 'УРОВЕНЬ ДОСТУПА' : 'CLEARED ID ROLE'}
              </span>
              <UserCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-base font-bold font-mono text-emerald-400 uppercase tracking-widest">
              SUPERMIND_EXEC (OK)
            </p>
          </div>
        </section>

        {/* Master details Split View */}
        {loading ? (
          <div id="admin-loading" className="flex flex-col items-center justify-center p-20 space-y-3 bg-zinc-900/10 rounded-2xl border border-zinc-900">
            <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <p className="text-xs text-zinc-400 font-mono uppercase tracking-wider">Syncing Firestore ledger...</p>
          </div>
        ) : (
          <div id="admin-grid-main" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Users list (takes 7 columns) */}
            <div id="panel-users-collection" className="lg:col-span-7 bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-zinc-900 bg-zinc-900/40 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  <h2 className="text-sm font-semibold text-white tracking-tight">
                    {currentLanguage === 'ru' ? 'Пользователи Системы' : 'Registered Users Ledger'}
                  </h2>
                </div>
                <span className="bg-zinc-800 text-zinc-350 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                  {usersList.length} total
                </span>
              </div>

              <div className="divide-y divide-zinc-900 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-950 text-zinc-400 font-mono tracking-wider font-semibold">
                      <th className="p-4">{currentLanguage === 'ru' ? 'Пользователь / Email' : 'User profile'}</th>
                      <th className="p-4">{currentLanguage === 'ru' ? 'Дата Создания' : 'Account Creation Date'}</th>
                      <th className="p-4 text-center">{currentLanguage === 'ru' ? 'Файлы' : 'Files'}</th>
                      <th className="p-4 text-right">{currentLanguage === 'ru' ? 'Действие' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {usersList.map((u) => {
                      const userFiles = getUserFiles(u.email ?? '', u.id);
                      const isSelected = selectedUser?.id === u.id;
                      return (
                        <tr 
                          key={u.id}
                          id={`row-user-${u.id}`}
                          onClick={() => setSelectedUser(u)}
                          className={`cursor-pointer transition hover:bg-zinc-900/60 ${isSelected ? 'bg-orange-950/10 border-l-2 border-orange-500' : ''}`}
                        >
                          <td className="p-4">
                            <div className="font-semibold text-white">{u.firstName} {u.lastName}</div>
                            <div className="text-zinc-400 text-xs font-mono mt-0.5 flex items-center gap-1">
                              <Mail className="h-3 w-3 inline text-zinc-500" />
                              {u.email}
                            </div>
                            <div className="mt-1">
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                u.role === 'Admin' ? 'bg-red-950 text-red-400 border border-red-900/40' :
                                u.role === 'Operator' ? 'bg-blue-950 text-blue-400 border border-blue-900/45' :
                                'bg-zinc-850 text-zinc-400'
                              }`}>
                                {u.role}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-zinc-350 font-mono">
                            {formatDate(u.createdAt)}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 font-mono font-bold text-xs px-2.5 py-1 rounded-full ${
                              userFiles.length > 0 ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'bg-zinc-800/40 text-zinc-500'
                            }`}>
                              <FileText className="h-3.5 w-3.5" />
                              {userFiles.length}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button 
                              id={`btn-user-inspect-${u.id}`}
                              type="button"
                              className="px-3 py-1.5 bg-zinc-805 hover:bg-orange-600 hover:text-white rounded-lg transition text-xs font-semibold flex items-center gap-1.5 ml-auto border border-zinc-800"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{currentLanguage === 'ru' ? 'Аудит' : 'Inspect'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column: User details, folders, and uploaded file scans (takes 5 columns) */}
            <div id="panel-user-auditing" className="lg:col-span-5 bg-zinc-900/30 border border-zinc-900 rounded-2xl overflow-hidden shadow-2xl min-h-[400px]">
              {selectedUser ? (() => {
                const userFiles = getUserFiles(selectedUser.email ?? '', selectedUser.id);
                return (
                  <div key={selectedUser.id} className="animate-fade-in flex flex-col h-full">
                    <div className="p-5 border-b border-zinc-900 bg-zinc-900/40 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-orange-400 uppercase tracking-widest font-mono font-bold">
                          {currentLanguage === 'ru' ? 'КАБИНЕТ ПРОВЕРКИ' : 'FILES CONSOLE'}
                        </span>
                        <h3 className="text-sm font-semibold text-white tracking-tight">
                          {selectedUser.firstName} {selectedUser.lastName}
                        </h3>
                      </div>
                      <button 
                        id="btn-close-auditor"
                        onClick={() => setSelectedUser(null)}
                        className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <div className="p-5 space-y-6">
                      
                      {/* Detailed Metadata details list */}
                      <div className="bg-zinc-950/40 border border-zinc-900 rounded-xl p-4 space-y-2.5 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                          <span className="text-zinc-550">User UID</span>
                          <span className="font-mono text-zinc-300 select-all">{selectedUser.id}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-zinc-900/50">
                          <span className="text-zinc-550">Email Address</span>
                          <span className="font-mono text-zinc-300 text-right">{selectedUser.email}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-zinc-550">Timestamp</span>
                          <span className="text-zinc-300 font-mono text-right">{formatDate(selectedUser.createdAt)}</span>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono mb-3">
                          {currentLanguage === 'ru' ? `Доступные Файлы (${userFiles.length})` : `Uploaded scans (${userFiles.length})`}
                        </h4>

                        {userFiles.length === 0 ? (
                          <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center text-zinc-550">
                            <FileDigit className="h-8 w-8 mx-auto mb-2.5 opacity-40 text-zinc-500" />
                            <p className="text-xs font-medium">No files have been uploaded yet by this tourist.</p>
                          </div>
                        ) : (
                          <div className="space-y-3.5">
                            {userFiles.map((f) => (
                              <div 
                                key={f.id} 
                                className="border border-zinc-850 rounded-xl p-3.5 bg-zinc-950/50 flex items-center justify-between gap-4 hover:border-orange-500/30 transition group"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-block h-2 w-2 rounded-full bg-orange-400 group-hover:animate-pulse" />
                                    <span className="text-xs font-semibold text-white truncate">{f.fileType}</span>
                                  </div>
                                  <p className="text-[10px] text-zinc-400 font-mono truncate">{f.fileName}</p>
                                  <p className="text-[9px] text-zinc-550 font-mono">Order ID: <span className="text-zinc-400">{f.orderId.slice(-8)}</span> ({formatDate(f.createdAt)})</p>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    id={`btn-view-scan-${f.id}`}
                                    onClick={() => setPreviewFile({ name: f.fileType, content: f.content })}
                                    className="p-2 bg-zinc-900 hover:bg-orange-650 rounded-lg text-zinc-400 hover:text-white border border-zinc-800 transition"
                                    title="View inline"
                                  >
                                    <ZoomIn className="h-4 w-4" />
                                  </button>
                                  <button
                                    id={`btn-download-scan-${f.id}`}
                                    onClick={() => handleDownload(f.content, f.fileName)}
                                    className="p-2 bg-zinc-900 hover:bg-orange-650 rounded-lg text-zinc-400 hover:text-white border border-zinc-800 transition"
                                    title="Download raw file"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })() : (
                <div className="flex flex-col items-center justify-center p-20 text-center text-zinc-500 select-none">
                  <ShieldAlert className="h-10 w-10 mb-3 opacity-30 text-orange-400" />
                  <h3 className="text-sm font-semibold text-zinc-400">
                    {currentLanguage === 'ru' ? 'Выберите пользователя' : 'Select a user account'}
                  </h3>
                  <p className="text-xs text-zinc-550 max-w-xs mt-1">
                    {currentLanguage === 'ru' 
                      ? 'Нажмите на любую строку в реестре для проведения конфиденциального аудита загрузок' 
                      : 'Click any user row to view details, metadata metrics, and preview/download custom scan uploads.'}
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

      {/* Elegant lightbox image preview utility */}
      {previewFile && (
        <div 
          id="preview-lightbox-modal" 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="relative bg-zinc-900 border border-zinc-800 max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-zinc-850 flex items-center justify-between bg-zinc-900/55">
              <h4 className="text-xs font-semibold text-zinc-300 font-mono tracking-wider">{previewFile.name} Live Scan Preview</h4>
              <button 
                id="preview-close-modal-btn"
                onClick={() => setPreviewFile(null)}
                className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-6 bg-zinc-950 flex justify-center items-center min-h-[300px]">
              {previewFile.content.startsWith('data:image/') || previewFile.content.startsWith('data:application/pdf') ? (
                <img 
                  referrerPolicy="no-referrer" 
                  src={previewFile.content} 
                  alt={previewFile.name} 
                  className="max-h-[70vh] rounded-lg shadow-xl object-contain border border-zinc-800"
                />
              ) : (
                <div className="text-center space-y-2">
                  <FileText className="h-12 w-12 mx-auto text-zinc-650" />
                  <p className="text-xs text-zinc-450">This file is stored as pure raw string payload:</p>
                  <textarea 
                    readOnly 
                    value={previewFile.content} 
                    className="w-80 h-32 bg-zinc-900/60 font-mono text-[9px] text-zinc-500 rounded p-2 outline-none border border-zinc-850"
                  />
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-zinc-855 flex justify-end bg-zinc-900/55">
              <button
                id="preview-download-modal-btn"
                onClick={() => {
                  handleDownload(previewFile.content, `${previewFile.name.replace(/\s+/g, '_')}_document.png`);
                }}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Download className="h-4 w-4" />
                <span>Download Scan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shared Footer with Legal Navigation and Requisites */}
      <AppFooter
        id="footer-admin-user-dashboard"
        currentLanguage={currentLanguage}
        className="mt-16"
      />

    </div>
  );
}
