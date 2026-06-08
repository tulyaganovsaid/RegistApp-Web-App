import React, { useState, useEffect } from 'react';
import { Mail, Inbox, ChevronRight, Trash2, X, FileText, Check, Eye, Badge, BellRing, Sparkles } from 'lucide-react';
import { getSimulatedEmails, saveSimulatedEmails } from '../db';
import { SimulatedEmail } from '../types';

export default function MailSimulationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [emails, setEmails] = useState<SimulatedEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<SimulatedEmail | null>(null);
  const [filter, setFilter] = useState<'all' | 'staff' | 'client'>('all');
  const [activeTab, setActiveTab] = useState<'inbox' | 'outbox'>('inbox');
  const [toastMessage, setToastMessage] = useState<{ id: string; text: string; subtext?: string } | null>(null);

  const syncEmails = () => {
    setEmails(getSimulatedEmails());
  };

  useEffect(() => {
    syncEmails();
    window.addEventListener('emails-updated', syncEmails);
    
    // Also listen to the real-time 'registapp-new-order-alert' and trigger custom in-app visual toast
    const handleNewOrderAlert = (e: Event) => {
      const customEvent = e as CustomEvent;
      const order = customEvent.detail;
      if (order) {
        // Trigger a highly polished visual toast
        const sound = new Audio();
        // Since we are inside iframe we can show a visual notification
        setToastMessage({
          id: `toast-${Date.now()}`,
          text: `🔔 New Order Added: ${order.id}`,
          subtext: `${order.clientName} (${order.country}) — Period: ${order.startDate} to ${order.endDate}. Awaiting verification.`
        });
        
        // Auto dismiss after 8 seconds
        setTimeout(() => {
          setToastMessage(prev => prev && prev.id.startsWith(`toast-${order.id}`) ? null : prev);
        }, 8000);
      }
    };
    
    window.addEventListener('registapp-new-order-alert', handleNewOrderAlert);
    
    return () => {
      window.removeEventListener('emails-updated', syncEmails);
      window.removeEventListener('registapp-new-order-alert', handleNewOrderAlert);
    };
  }, []);

  const clearAllEmails = () => {
    if (window.confirm('Do you want to purge all simulated email system storage? / Очистить архив уведомлений?')) {
      saveSimulatedEmails([]);
      setSelectedEmail(null);
    }
  };

  const deleteEmail = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = emails.filter(em => em.id !== id);
    saveSimulatedEmails(updated);
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }
  };

  const markAsRead = (id: string) => {
    const updated = emails.map(em => em.id === id ? { ...em, isRead: true } : em);
    saveSimulatedEmails(updated);
  };

  const unreadCount = emails.filter(em => !em.isRead).length;

  const filteredEmails = emails.filter(em => {
    if (filter === 'staff') {
      return em.recipient.includes('operator@') || em.recipient.includes('admin@');
    }
    if (filter === 'client') {
      return !em.recipient.includes('operator@') && !em.recipient.includes('admin@');
    }
    return true;
  });

  return (
    <>
      {/* Real-time In-App Floating Toast Notification (Operators and Administrators Alert) */}
      {toastMessage && (
        <div
          id="registapp-bell-toast-popup"
          className="fixed bottom-6 right-6 z-55 max-w-sm bg-[#121616] border border-[#7A9A3C]/75 text-bone rounded-xl shadow-2xl p-4 animate-bounce flex items-start space-x-3 transition-all duration-300 transform"
          style={{ boxShadow: '0 10px 40px rgba(122,154,58,0.25)' }}
        >
          <div className="bg-[#7A9A3C]/20 border border-[#7A9A3C] p-2 rounded-lg text-[#a2e635] flex-shrink-0">
            <BellRing className="h-5 w-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#a2e635] tracking-wide uppercase flex items-center">
                <Sparkles className="h-3 w-3 mr-1 text-[#a2e635]" /> New Order Notification
              </span>
              <button 
                onClick={() => setToastMessage(null)}
                className="text-zinc-500 hover:text-zinc-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h4 className="text-sm font-bold text-white mt-1">{toastMessage.text}</h4>
            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{toastMessage.subtext}</p>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => {
                  setIsOpen(true);
                  setFilter('staff');
                  setToastMessage(null);
                }}
                className="bg-[#7A9A3C] hover:bg-[#688333] text-zinc-950 text-[10px] font-extrabold px-3 py-1.5 rounded-md transition uppercase tracking-wider"
              >
                Open Inbox / Симулятор Email
              </button>
              <button
                onClick={() => setToastMessage(null)}
                className="hover:bg-zinc-800 text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded-md transition border border-zinc-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating System Postbox Launcher Button */}
      <div className="fixed bottom-6 left-6 z-50">
        <button
          id="btn-trigger-email-simulation-center"
          onClick={() => {
            setIsOpen(true);
            syncEmails();
          }}
          className="relative group bg-[#1c2222] hover:bg-[#252d2d] border border-zinc-800 hover:border-[#7A9A3C]/60 text-zinc-300 hover:text-white px-4 py-3 rounded-full flex items-center space-x-2 shadow-xl focus:outline-none transition duration-300 hover:scale-105 active:scale-95"
          title="Open Mail & Notifications Simulator / Симулятор Email"
        >
          <Mail className="h-5 w-5 text-[#a2e635] group-hover:animate-bounce" />
          <span className="text-xs font-semibold tracking-wide hidden md:inline">Mail Simulator</span>
          
          {unreadCount > 0 && (
            <span 
              id="email-simulator-badge-count" 
              className="absolute -top-1.5 -right-1.5 bg-red-600 text-white font-extrabold text-[10px] h-5 w-5 rounded-full flex items-center justify-center animate-pulse border-2 border-zinc-950"
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Simulator Modal UI Viewport */}
      {isOpen && (
        <div id="modal-email-simulator-backdrop" className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            id="modal-email-simulator-box"
            className="bg-[#121616] border border-zinc-800 rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <header className="px-6 py-4 border-b border-zinc-800 bg-[#192020] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="bg-[#7A9A3C]/10 border border-[#7A9A3C]/50 p-2 rounded-xl text-[#a2e635]">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-white tracking-wide text-base">
                    Email Notification & In-App Simulator
                  </h3>
                  <p className="text-xs text-zinc-400">
                    RegistApp® by Jules Verne Hostel — Verification Environment
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {emails.length > 0 && (
                  <button
                    onClick={clearAllEmails}
                    className="flex items-center space-x-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/20 border border-red-900/30 px-3 py-1.5 rounded-lg transition"
                    title="Purge Logs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Logs</span>
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 px-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            {/* Layout Body Split */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* Left Sidebar - Email List Grid */}
              <aside className="w-1/3 border-r border-zinc-800 bg-[#161c1c] flex flex-col overflow-hidden">
                {/* Internal Search / Filter Toolbar */}
                <div className="p-3.5 border-b border-zinc-800 flex space-x-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md transition uppercase tracking-wider ${
                      filter === 'all' ? 'bg-[#7A9A3C] text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                  >
                    All ({emails.length})
                  </button>
                  <button
                    onClick={() => setFilter('staff')}
                    className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md transition uppercase tracking-wider ${
                      filter === 'staff' ? 'bg-[#7A9A3C] text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="Emails sent to Admin and Operators"
                  >
                    Staff
                  </button>
                  <button
                    onClick={() => setFilter('client')}
                    className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-md transition uppercase tracking-wider ${
                      filter === 'client' ? 'bg-[#7A9A3C] text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="Registration Voucher emails sent to clients"
                  >
                    Clients
                  </button>
                </div>

                {/* Email Cards Container */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 custom-scrollbar">
                  {filteredEmails.length === 0 ? (
                    <div className="p-8 text-center text-zinc-500">
                      <Inbox className="h-10 w-10 mx-auto text-zinc-600 mb-2.5" />
                      <p className="text-xs">No email notifications sent yet / Нет отправленных писем</p>
                      <p className="text-[10px] text-zinc-600 mt-1 max-w-xs mx-auto">
                        Create a registration order to trigger Staff alerts, or complete an active order to send client vouchers!
                      </p>
                    </div>
                  ) : (
                    filteredEmails.map((email) => {
                      const isSelected = selectedEmail?.id === email.id;
                      const isUnread = !email.isRead;
                      return (
                        <div
                          key={email.id}
                          className={`p-4 cursor-pointer text-left transition duration-200 relative group ${
                            isSelected ? 'bg-zinc-800/40 border-l-4 border-[#7A9A3C]' : 'hover:bg-zinc-800/25 border-l-4 border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedEmail(email);
                            markAsRead(email.id);
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-500 truncate max-w-[120px]">
                              To: {email.recipient}
                            </span>
                            <span className="text-[9px] font-medium text-zinc-500 shrink-0">
                              {new Date(email.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          
                          <h4 className={`text-xs truncate ${isUnread ? 'font-black text-white' : 'font-medium text-zinc-300'}`}>
                            {email.subject}
                          </h4>
                          
                          <div className="mt-2.5 flex items-center justify-between">
                            {email.attachmentName ? (
                              <span className="inline-flex items-center space-x-1 bg-zinc-800 px-2 py-0.5 rounded-md text-[9px] text-[#a2e635] font-mono border border-zinc-700/50">
                                <FileText className="h-2.5 w-2.5 text-[#7A9A3C]" />
                                <span>{email.attachmentName.substring(0, 18)}...</span>
                              </span>
                            ) : (
                              <span className="text-[9px] text-zinc-600">Info text-only</span>
                            )}
                            
                            <div className="flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={(e) => deleteEmail(email.id, e)}
                                className="p-1 rounded text-red-500 hover:text-red-400 hover:bg-zinc-800 transition"
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                          
                          {isUnread && (
                            <span className="absolute top-4 right-4 h-2 w-2 bg-red-500 rounded-full"></span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </aside>

              {/* Right Viewport - Selected Email Frame Rendered */}
              <main id="email-detail-viewport" className="flex-1 bg-[#101313] flex flex-col overflow-hidden">
                {selectedEmail ? (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Message Header Info */}
                    <div className="p-6 border-b border-zinc-800 bg-[#131717] select-text">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-base font-bold text-white tracking-tight">
                            {selectedEmail.subject}
                          </h2>
                          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs mt-3 text-zinc-400">
                            <span className="font-semibold text-zinc-500">From:</span>
                            <span className="text-zinc-300 font-mono">{selectedEmail.sender}</span>
                            <span className="font-semibold text-zinc-500">To:</span>
                            <span className="text-zinc-300 font-mono">{selectedEmail.recipient}</span>
                            <span className="font-semibold text-zinc-500">Date:</span>
                            <span className="text-zinc-400">
                              {new Date(selectedEmail.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {selectedEmail.attachmentName && (
                          <div className="shrink-0 bg-zinc-800/40 border border-zinc-800 p-2.5 rounded-xl flex flex-col items-center select-none w-44">
                            <FileText className="h-8 w-8 text-[#a2e635] mb-1.5" />
                            <span className="text-[10px] text-zinc-300 truncate max-w-full font-mono font-bold" title={selectedEmail.attachmentName}>
                              {selectedEmail.attachmentName}
                            </span>
                            <a
                              href={selectedEmail.attachmentUrl || '#'}
                              download={selectedEmail.attachmentName}
                              className="mt-2 text-[10px] font-extrabold bg-[#7A9A3C] hover:bg-[#688333] text-zinc-950 px-2 py-1 rounded w-full text-center transition"
                            >
                              Download File
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Formatted HTML Message Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950/20 custom-scrollbar select-text">
                      <div 
                        className="prose prose-invert max-w-none text-zinc-300 bg-[#ffffff] text-zinc-900 rounded-xl overflow-hidden p-6 shadow-lg border border-zinc-200"
                        dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                    <Mail className="h-16 w-16 text-zinc-700 animate-pulse mb-3" />
                    <h3 className="font-semibold text-zinc-300">No Email Selected</h3>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm text-center">
                      Select an incoming email from the sidebar log to inspect its formatted template and client deliverables.
                    </p>
                  </div>
                )}
              </main>

            </div>

            {/* Modal Footer */}
            <footer className="bg-[#131717] px-6 py-3 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 font-semibold">
              <div className="flex items-center space-x-1.5 text-[#a2e635]">
                <Check className="h-3.5 w-3.5" />
                <span>Simulated Mail Deliverability Engine Enabled (Offline-safe)</span>
              </div>
              <div>
                Logged accounts: <span className="font-mono text-white">operator@registapp.uz</span>, <span className="font-mono text-white">admin@registapp.uz</span>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
