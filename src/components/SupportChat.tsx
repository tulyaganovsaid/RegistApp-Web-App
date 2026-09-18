import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles, Scale, PhoneCall, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ChatMessage, LanguageCode, UserRole } from '../types';
import { getConfig, getLegalKnowledgeBase } from '../db';
import { translations } from '../translations';
import { QUICK_PILLS_BY_LANG, WELCOME_GREETINGS, translateMessage, findMatchingTopic } from '../utils/chatLocalization';

interface SupportChatProps {
  currentLanguage: LanguageCode;
  embedded?: boolean;
  userRole?: UserRole;
  defaultOpen?: boolean;
}

export default function SupportChat({ 
  currentLanguage, 
  embedded = false, 
  userRole, 
  defaultOpen 
}: SupportChatProps) {
  const isStaff = userRole === 'Operator' || userRole === 'Admin';
  // AI consultant is collapsed by default and never forced open unless explicitly requested
  const [isOpen, setIsOpen] = useState(() => defaultOpen === true);

  // Disclaimer banner shown before the first message in each new session
  // Closed on click, but re-shown in each new session (tracked via sessionStorage)
  const [showSessionDisclaimer, setShowSessionDisclaimer] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem('registapp_chat_disclaimer_dismissed') !== 'true';
      }
    } catch {
      // Fallback
    }
    return true;
  });

  const handleDismissDisclaimer = () => {
    setShowSessionDisclaimer(false);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem('registapp_chat_disclaimer_dismissed', 'true');
      }
    } catch {
      // ignore
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => translations[currentLanguage]?.[key] || key;

  // Ensure collapsed state for staff when role or defaultOpen changes
  useEffect(() => {
    if (defaultOpen !== undefined) {
      setIsOpen(defaultOpen);
    } else if (isStaff) {
      setIsOpen(false);
    }
  }, [userRole, defaultOpen, isStaff]);

  const handleSendMessageRef = useRef<(textToSend?: string, pillId?: string) => Promise<void>>(async () => {});

  // Listen to external triggers to open support chat (with optional pre-set query)
  useEffect(() => {
    const handleOpen = (e?: Event) => {
      setIsOpen(true);
      const customEvt = e as CustomEvent<{ query?: string; pillId?: string }>;
      if (customEvt?.detail?.query) {
        setTimeout(() => {
          handleSendMessageRef.current(customEvt.detail.query, customEvt.detail.pillId);
        }, 150);
      }
    };
    window.addEventListener('open-support-chat', handleOpen);
    return () => window.removeEventListener('open-support-chat', handleOpen);
  }, []);

  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  // Quick prompt topic pills for the visitor
  const quickPills = QUICK_PILLS_BY_LANG[currentLanguage] || QUICK_PILLS_BY_LANG.en;

  // Initialize or translate ALL messages in chat history when language switches!
  useEffect(() => {
    // 1. Immediately update welcome message and predefined pill messages locally
    setMessages(prev => {
      if (prev.length === 0) {
        return [
          {
            id: 'welcome-msg',
            sender: 'ai',
            text: WELCOME_GREETINGS[currentLanguage],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ];
      }
      return prev.map(m => {
        const translatedText = translateMessage(m, currentLanguage);
        return {
          ...m,
          text: translatedText
        };
      });
    });

    // 2. Translate any custom questions and AI replies via the backend translation engine
    const translateExistingChat = async () => {
      try {
        const currentMessages = messagesRef.current;
        if (!currentMessages || currentMessages.length === 0) return;
        const hasCustomAiResponses = currentMessages.some(m => m.sender === 'ai' && m.id !== 'welcome-msg' && !m.queryKey);
        if (!hasCustomAiResponses) return;

        const res = await fetch('/api/support/translate-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: currentMessages,
            targetLanguage: currentLanguage,
            legalKnowledgeBase: getLegalKnowledgeBase()
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            const transMap = new Map<string, string>(
              data.messages.map((m: { id: string; text: string }) => [m.id, String(m.text || '')])
            );
            setMessages(prev =>
              prev.map(m => {
                const newText = transMap.get(m.id);
                if (typeof newText === 'string' && newText && m.sender === 'ai' && m.id !== 'welcome-msg' && !m.queryKey) {
                  return { ...m, text: newText };
                }
                return m;
              })
            );
          }
        }
      } catch (err) {
        console.error('Failed to translate chat history:', err);
      }
    };

    translateExistingChat();
  }, [currentLanguage]);

  // Handle auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAIResponseFallback = (userText: string): string => {
    const topic = findMatchingTopic(userText);
    if (topic) {
      return topic.answers[currentLanguage];
    }

    if (currentLanguage === 'ru') {
      return "Спасибо за вопрос! Напоминаем, что регистрация оформляется в течение 3 рабочих дней со дня въезда в Узбекистан. Единый номер туристической полиции: **1173**.";
    }
    if (currentLanguage === 'fr') {
      return "Merci pour votre message ! L'enregistrement touristique est obligatoire sous 3 jours ouvrables en Ouzbékistan. Police touristique : **1173**.";
    }
    return "Thank you for asking! For foreign tourists, registration in Uzbekistan is required within 3 business days. Tourist Police Helpline: **1173**.";
  };

  const handleSendMessage = async (textToSend?: string, pillId?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isTyping) return;

    // Only associate topicKey if user explicitly triggered a pre-defined pill
    const topicKey = pillId;

    const userMsg: ChatMessage = {
      id: `chat-usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      queryKey: topicKey,
      originalQuery: text
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) {
      setInputText('');
    }
    setIsTyping(true);

    try {
      const legalDb = getLegalKnowledgeBase();
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-5).map(m => ({ sender: m.sender === 'user' ? 'user' : 'model', text: m.text })),
          language: currentLanguage,
          legalKnowledgeBase: legalDb
        })
      });

      let responseText = '';
      if (res.ok) {
        const data = await res.json();
        responseText = data.reply || generateAIResponseFallback(text);
      } else {
        responseText = generateAIResponseFallback(text);
      }

      const aiMsg: ChatMessage = {
        id: `chat-ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        queryKey: topicKey,
        originalQuery: text
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch {
      const responseText = generateAIResponseFallback(text);
      const aiMsg: ChatMessage = {
        id: `chat-ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        queryKey: topicKey,
        originalQuery: text
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  if (embedded) {
    return (
      <div
        id="card-support-chat-window-embedded"
        className="w-full flex flex-col overflow-hidden rounded-2xl border-2 border-[#7A9A3C] bg-gradient-to-b from-[#1C2615] via-[#141C10] to-[#0E150B] shadow-[0_0_35px_rgba(122,154,60,0.3)] ring-1 ring-[#90B24A]/50 transition-all duration-300 font-sans"
      >
        {/* Top Accent Ribbon Tag highlighting the AI block */}
        <div className="bg-gradient-to-r from-[#7A9A3C] via-[#90B24A] to-[#7A9A3C] px-4 py-1.5 flex items-center justify-between text-black font-extrabold text-[11px] tracking-wider uppercase shadow-sm">
          <span className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 fill-black" />
            <span>{currentLanguage === 'ru' ? 'Интерактивный ИИ-консультант' : currentLanguage === 'fr' ? 'Conseiller IA Interactif' : 'Interactive AI Consultant'}</span>
          </span>
          <span className="inline-flex items-center gap-1 bg-black/25 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-normal text-white">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C2E86B] animate-pulse"></span>
            <span>24/7 ONLINE</span>
          </span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-[#243519] via-[#1C2914] to-[#162210] p-4 border-b border-[#7A9A3C]/40">
          <div className="flex items-center space-x-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A9A3C] text-black shadow-md shadow-[#7A9A3C]/40 ring-2 ring-[#90B24A]/60">
              <Bot className="h-5 w-5" id="icon-support-stars" />
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#C2E86B] border-2 border-[#162210]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{currentLanguage === 'ru' ? 'ИИ-консультант RegistApp' : currentLanguage === 'fr' ? 'Conseiller IA RegistApp' : 'RegistApp AI Support'}</span>
                <span className="inline-flex items-center rounded-md bg-[#7A9A3C]/30 border border-[#7A9A3C]/60 px-1.5 py-0.2 text-[9px] font-mono text-[#C2E86B] font-bold">
                  PROACTIVE
                </span>
              </h4>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C2E86B] animate-pulse"></span>
                <p className="text-[10px] text-[#A6CC8E] font-medium">
                  {currentLanguage === 'ru' ? 'В сети • База законов РУз' : currentLanguage === 'fr' ? 'En ligne • Lois Ouzbékistan' : 'Online • Uzbekistan Legal DB'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <a
              href="tel:1173"
              title={currentLanguage === 'ru' ? 'Горячая линия туристической полиции 1173' : 'Tourist Police 1173'}
              className="rounded-xl px-2.5 py-1 text-[#E0EEDA] hover:text-black hover:bg-[#7A9A3C] bg-[#2A3F1D] border border-[#7A9A3C]/50 transition flex items-center gap-1.5 text-[11px] font-mono shadow-sm"
            >
              <PhoneCall className="h-3.5 w-3.5 text-[#C2E86B]" />
              <span className="font-bold">1173</span>
            </a>
            <button
              id="btn-support-chat-embedded-toggle"
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-xl p-1.5 text-[#A6CC8E] transition hover:bg-[#2A3F1D] hover:text-white border border-[#7A9A3C]/40 text-xs font-mono"
              title={isOpen ? t('close') : t('support')}
            >
              {isOpen ? <X className="h-4 w-4" /> : <Bot className="h-4 w-4 text-[#C2E86B]" />}
            </button>
          </div>
        </div>

        {/* When expanded: Subheader + Messages + Input */}
        {isOpen ? (
          <>
            {/* Subheader Notice */}
            <div className="bg-[#7A9A3C]/25 px-4 py-2 border-b border-[#7A9A3C]/35 flex items-center justify-between">
              <p className="text-[11px] text-[#C2E86B] font-semibold flex items-center gap-1.5">
                <Scale className="h-3.5 w-3.5 shrink-0 text-[#A6D448]" />
                <span>
                  {currentLanguage === 'ru'
                    ? 'Консультации по правилу 3 дней, e-mehmon и ст. 224 КоАП'
                    : currentLanguage === 'fr'
                    ? 'Règle des 3 jours, e-mehmon et article 224 du code'
                    : '3-day rule, e-mehmon compliance, & Article 224 guidance'}
                </span>
              </p>
            </div>

            {/* Message List */}
            <div className="h-[340px] overflow-y-auto bg-[#10180D] p-4 space-y-3.5 text-xs">
              {/* Session Disclaimer Banner: Shown before the first message, dismissible, re-appears in each new session */}
              {showSessionDisclaimer && (
                <div
                  id="banner-chat-session-disclaimer-embedded"
                  className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-neutral-900/50 p-3 text-[11px] leading-relaxed text-amber-200/90 shadow-sm relative animate-in fade-in duration-200"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 pr-5">
                      <p className="font-semibold text-amber-300 text-xs mb-1">
                        {currentLanguage === 'ru'
                          ? 'Справочный характер консультаций'
                          : currentLanguage === 'fr'
                          ? 'Informations à titre indicatif'
                          : 'Informational Legal Notice'}
                      </p>
                      <p className="text-amber-100/80 leading-normal text-[11px]">
                        {currentLanguage === 'ru' ? (
                          <>
                            Ответы помощника носят справочный характер и не являются юридической консультацией. За официальными разъяснениями обращайтесь в подразделения миграции и оформления гражданства органов внутренних дел. Диалог обрабатывается системой искусственного интеллекта и может сохраняться — не вводите данные, которые не хотите передавать.
                          </>
                        ) : currentLanguage === 'fr' ? (
                          <>
                            Les réponses de l'assistant sont fournies à titre indicatif et ne constituent pas un conseil juridique officiel. Pour des clarifications officielles, veuillez vous adresser aux services des migrations et de la citoyenneté du ministère des Affaires intérieures. La conversation est traitée par un système d'intelligence artificielle et peut être enregistrée — ne saisissez pas de données que vous ne souhaitez pas transmettre.
                          </>
                        ) : (
                          <>
                            Assistant responses are for reference only and do not constitute formal legal counsel. For official clarifications, please consult the migration and citizenship departments of the internal affairs bodies. The dialogue is processed by artificial intelligence and may be logged — do not enter details you do not wish to share.
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      id="btn-close-session-disclaimer-embedded"
                      onClick={handleDismissDisclaimer}
                      className="absolute top-2.5 right-2.5 text-amber-400/80 hover:text-amber-200 p-1 rounded-lg hover:bg-amber-900/40 transition cursor-pointer"
                      title={currentLanguage === 'ru' ? 'Закрыть уведомление' : 'Dismiss'}
                      aria-label="Dismiss disclaimer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  id={`chat-msg-${msg.id}`}
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.sender === 'ai' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7A9A3C] text-black font-bold shadow-sm mt-0.5">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#7A9A3C] text-black font-semibold rounded-tr-none shadow-md shadow-[#7A9A3C]/30'
                        : 'bg-[#1C2A15] text-[#F0F5EC] border border-[#7A9A3C]/40 rounded-tl-none shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                    <span className={`mt-1 block text-[9px] text-right font-mono ${msg.sender === 'user' ? 'text-black/70' : 'text-[#8EA87D]'}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                  {msg.sender === 'user' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2A3F1D] border border-[#7A9A3C]/50 text-[#C2E86B] mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              ))}

              {/* Quick Prompt Topic Pills: Shown right after greeting */}
              {messages.length <= 2 && (
                <div className="pt-2 pb-1 space-y-1.5">
                  <span className="text-[10px] font-mono text-[#A6CC8E] uppercase tracking-wider block font-bold">
                    {currentLanguage === 'ru' ? '💡 Популярные темы для быстрого ответа:' : currentLanguage === 'fr' ? '💡 Thèmes suggérés :' : '💡 Quick topic suggestions:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPills.map((pill) => (
                      <button
                        key={pill.id}
                        type="button"
                        onClick={() => handleSendMessage(pill.query, pill.id)}
                        disabled={isTyping}
                        className="rounded-lg border border-[#7A9A3C]/40 bg-[#1D2C16] px-2.5 py-1.5 text-[11px] text-[#E0EEDA] hover:border-[#90B24A] hover:bg-[#7A9A3C] hover:text-black transition-all cursor-pointer text-left disabled:opacity-50 font-medium"
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isTyping && (
                <div id="chat-is-typing" className="flex items-start gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7A9A3C] text-black">
                    <Bot className="h-4 w-4 animate-bounce" />
                  </div>
                  <div className="rounded-2xl rounded-tl-none bg-[#1C2A15] border border-[#7A9A3C]/40 px-3.5 py-2.5 text-[#C2E86B] text-xs">
                    <div className="flex items-center space-x-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7A9A3C] animate-bounce"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7A9A3C] animate-bounce [animation-delay:0.2s]"></span>
                      <span className="h-1.5 w-1.5 rounded-full bg-[#7A9A3C] animate-bounce [animation-delay:0.4s]"></span>
                      <span className="text-[10px] ml-1 font-mono text-[#A6CC8E]">
                        {currentLanguage === 'ru' ? 'Поиск в базе законов...' : currentLanguage === 'fr' ? 'Consultation des textes...' : 'Consulting legal DB...'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Form Input */}
            <form
              id="form-support-chat-input"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2 bg-gradient-to-r from-[#1A2813] to-[#14200E] p-3 border-t border-[#7A9A3C]/40"
            >
              <input
                id="input-support-chat-text"
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={currentLanguage === 'ru' ? 'Что вас интересует? Напишите вопрос...' : t('askPlaceholder')}
                className="flex-1 rounded-xl border border-[#7A9A3C]/50 bg-[#0C1309] px-3.5 py-2 text-xs text-white placeholder-[#8FAD78] outline-none focus:border-[#C2E86B] focus:ring-1 focus:ring-[#C2E86B]/50 transition"
              />
              <button
                id="btn-support-chat-submit"
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7A9A3C] text-black font-bold transition hover:bg-[#90B24A] hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 shadow-md shadow-[#7A9A3C]/30"
              >
                <Send className="h-4 w-4" id="icon-support-send" />
              </button>
            </form>

            {/* Permanent bottom disclaimer under input with /privacy link */}
            <div
              id="footer-support-chat-disclaimer-embedded"
              className="bg-[#0C1309] px-3 py-1.5 border-t border-[#7A9A3C]/20 text-[10px] text-[#8FAD78] text-center flex items-center justify-center gap-1.5 flex-wrap font-sans"
            >
              <span>
                {currentLanguage === 'ru'
                  ? 'Справочная информация. Актуально на дату ответа.'
                  : currentLanguage === 'fr'
                  ? 'Information à titre indicatif. Valable à la date de réponse.'
                  : 'Reference information only. Current as of response date.'}
              </span>
              <a
                href="/privacy"
                onClick={(e) => {
                  e.preventDefault();
                  if (typeof window !== 'undefined') {
                    window.history.pushState(null, '', '/privacy');
                    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { path: '/privacy' } }));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="text-[#A6D448] hover:text-white underline underline-offset-2 transition font-medium"
              >
                /privacy
              </a>
            </div>
          </>
        ) : (
          <div className="p-3 bg-gradient-to-r from-[#243519] to-[#1C2914] text-center text-xs text-[#C2E86B]">
            <button
              onClick={() => setIsOpen(true)}
              className="text-[#C2E86B] hover:text-white font-bold flex items-center justify-center gap-1.5 mx-auto"
            >
              <Bot className="h-4 w-4 text-[#7A9A3C]" />
              <span>{currentLanguage === 'ru' ? 'Развернуть диалог с ИИ-консультантом' : currentLanguage === 'fr' ? 'Ouvrir le dialogue avec le conseiller IA' : 'Open AI Support Conversation'}</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Floating Toggle Button (visible at bottom right) */}
      <button
        id="btn-support-chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#7A9A3C] text-black font-bold shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-[#5E7A2A] hover:text-white active:scale-95"
        title={t('support')}
      >
        {isOpen ? <X className="h-6 w-6 text-black" id="icon-support-close" /> : (
          <div className="relative flex items-center justify-center">
            <Bot className="h-7 w-7" id="icon-support-open" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-500"></span>
            </span>
          </div>
        )}
      </button>

      {/* Chat Window Box (opens immediately by default) */}
      {isOpen && (
        <div
          id="card-support-chat-window"
          className="fixed bottom-24 right-4 sm:right-6 z-50 flex h-[520px] max-h-[85vh] w-[calc(100vw-2rem)] sm:w-[420px] flex-col overflow-hidden rounded-2xl border-2 border-[#7A9A3C] bg-gradient-to-b from-[#1C2615] via-[#141C10] to-[#0E150B] shadow-[0_0_40px_rgba(122,154,60,0.35)] ring-1 ring-[#90B24A]/50 transition-all duration-300 font-sans animate-fade-in"
        >
          {/* Top Accent Ribbon Tag highlighting the AI block */}
          <div className="bg-gradient-to-r from-[#7A9A3C] via-[#90B24A] to-[#7A9A3C] px-4 py-1.5 flex items-center justify-between text-black font-extrabold text-[11px] tracking-wider uppercase shadow-sm">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 fill-black" />
              <span>{currentLanguage === 'ru' ? 'Интерактивный ИИ-консультант' : currentLanguage === 'fr' ? 'Conseiller IA Interactif' : 'Interactive AI Consultant'}</span>
            </span>
            <span className="inline-flex items-center gap-1 bg-black/25 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-normal text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C2E86B] animate-pulse"></span>
              <span>24/7 ONLINE</span>
            </span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-[#243519] via-[#1C2914] to-[#162210] p-4 border-b border-[#7A9A3C]/40">
            <div className="flex items-center space-x-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#7A9A3C] text-black shadow-md shadow-[#7A9A3C]/40 ring-2 ring-[#90B24A]/60">
                <Bot className="h-5 w-5" id="icon-support-stars" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[#C2E86B] border-2 border-[#162210]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>{currentLanguage === 'ru' ? 'ИИ-консультант RegistApp' : currentLanguage === 'fr' ? 'Conseiller IA RegistApp' : 'RegistApp AI Support'}</span>
                  <span className="inline-flex items-center rounded-md bg-[#7A9A3C]/30 border border-[#7A9A3C]/60 px-1.5 py-0.2 text-[9px] font-mono text-[#C2E86B] font-bold">
                    PROACTIVE
                  </span>
                </h4>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C2E86B] animate-pulse"></span>
                  <p className="text-[10px] text-[#A6CC8E] font-medium">
                    {currentLanguage === 'ru' ? 'В сети • База законов РУз' : currentLanguage === 'fr' ? 'En ligne • Lois Ouzbékistan' : 'Online • Uzbekistan Legal DB'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-1">
              <a
                href="tel:1173"
                title={currentLanguage === 'ru' ? 'Горячая линия туристической полиции 1173' : 'Tourist Police 1173'}
                className="rounded-xl px-2.5 py-1 text-[#E0EEDA] hover:text-black hover:bg-[#7A9A3C] bg-[#2A3F1D] border border-[#7A9A3C]/50 transition flex items-center gap-1.5 text-[11px] font-mono shadow-sm"
              >
                <PhoneCall className="h-3.5 w-3.5 text-[#C2E86B]" />
                <span className="hidden xs:inline font-bold">1173</span>
              </a>
              <button
                id="btn-support-chat-inner-close"
                onClick={() => setIsOpen(false)}
                className="rounded-xl p-1.5 text-[#A6CC8E] transition hover:bg-[#2A3F1D] hover:text-white border border-[#7A9A3C]/40 text-xs font-mono"
                title={t('close')}
              >
                <X className="h-4 w-4" id="icon-inner-close" />
              </button>
            </div>
          </div>

          {/* Subheader Notice */}
          <div className="bg-[#7A9A3C]/25 px-4 py-2 border-b border-[#7A9A3C]/35 flex items-center justify-between">
            <p className="text-[11px] text-[#C2E86B] font-semibold flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 shrink-0 text-[#A6D448]" />
              <span>
                {currentLanguage === 'ru'
                  ? 'Консультации по правилу 3 дней, e-mehmon и ст. 224 КоАП'
                  : currentLanguage === 'fr'
                  ? 'Règle des 3 jours, e-mehmon et article 224 du code'
                  : '3-day rule, e-mehmon compliance, & Article 224 guidance'}
              </span>
            </p>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto bg-[#10180D] p-4 space-y-3.5 text-xs">
            {/* Session Disclaimer Banner: Shown before the first message, dismissible, re-appears in each new session */}
            {showSessionDisclaimer && (
              <div
                id="banner-chat-session-disclaimer-floating"
                className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-neutral-900/50 p-3 text-[11px] leading-relaxed text-amber-200/90 shadow-sm relative animate-in fade-in duration-200"
              >
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1 pr-5">
                    <p className="font-semibold text-amber-300 text-xs mb-1">
                      {currentLanguage === 'ru'
                        ? 'Справочный характер консультаций'
                        : currentLanguage === 'fr'
                        ? 'Informations à titre indicatif'
                        : 'Informational Legal Notice'}
                    </p>
                    <p className="text-amber-100/80 leading-normal text-[11px]">
                      {currentLanguage === 'ru' ? (
                        <>
                          Ответы помощника носят справочный характер и не являются юридической консультацией. За официальными разъяснениями обращайтесь в подразделения миграции и оформления гражданства органов внутренних дел. Диалог обрабатывается системой искусственного интеллекта и может сохраняться — не вводите данные, которые не хотите передавать.
                        </>
                      ) : currentLanguage === 'fr' ? (
                        <>
                          Les réponses de l'assistant sont fournies à titre indicatif et ne constituent pas un conseil juridique officiel. Pour des clarifications officielles, veuillez vous adresser aux services des migrations et de la citoyenneté du ministère des Affaires intérieures. La conversation est traitée par un système d'intelligence artificielle et peut être enregistrée — ne saisissez pas de données que vous ne souhaitez pas transmettre.
                        </>
                      ) : (
                        <>
                          Assistant responses are for reference only and do not constitute formal legal counsel. For official clarifications, please consult the migration and citizenship departments of the internal affairs bodies. The dialogue is processed by artificial intelligence and may be logged — do not enter details you do not wish to share.
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    id="btn-close-session-disclaimer-floating"
                    onClick={handleDismissDisclaimer}
                    className="absolute top-2.5 right-2.5 text-amber-400/80 hover:text-amber-200 p-1 rounded-lg hover:bg-amber-900/40 transition cursor-pointer"
                    title={currentLanguage === 'ru' ? 'Закрыть уведомление' : 'Dismiss'}
                    aria-label="Dismiss disclaimer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                id={`chat-msg-${msg.id}`}
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}
              >
                {msg.sender === 'ai' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#7A9A3C] text-black font-bold shadow-sm mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#7A9A3C] text-black font-semibold rounded-tr-none shadow-md shadow-[#7A9A3C]/30'
                      : 'bg-[#1C2A15] text-[#F0F5EC] border border-[#7A9A3C]/40 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                  <span className={`mt-1 block text-[9px] text-right font-mono ${msg.sender === 'user' ? 'text-black/70' : 'text-[#8EA87D]'}`}>
                    {msg.timestamp}
                  </span>
                </div>
                {msg.sender === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2A3F1D] border border-[#7A9A3C]/50 text-[#C2E86B] mt-0.5">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Quick Prompt Topic Pills: Shown right after greeting so visitor can click immediately */}
            {messages.length <= 2 && (
              <div className="pt-2 pb-1 space-y-1.5">
                <span className="text-[10px] font-mono text-[#A6CC8E] uppercase tracking-wider block font-bold">
                  {currentLanguage === 'ru' ? '💡 Популярные темы для быстрого ответа:' : currentLanguage === 'fr' ? '💡 Thèmes suggérés :' : '💡 Quick topic suggestions:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPills.map((pill) => (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => handleSendMessage(pill.query, pill.id)}
                      disabled={isTyping}
                      className="rounded-lg border border-[#7A9A3C]/40 bg-[#1D2C16] px-2.5 py-1.5 text-[11px] text-[#E0EEDA] hover:border-[#90B24A] hover:bg-[#7A9A3C] hover:text-black transition-all cursor-pointer text-left disabled:opacity-50 font-medium"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div id="chat-is-typing" className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#7A9A3C] text-black">
                  <Bot className="h-4 w-4 animate-bounce" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-[#1C2A15] border border-[#7A9A3C]/40 px-3.5 py-2.5 text-[#C2E86B] text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7A9A3C] animate-bounce"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7A9A3C] animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#7A9A3C] animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[10px] ml-1 font-mono text-[#A6CC8E]">
                      {currentLanguage === 'ru' ? 'Поиск в базе законов...' : currentLanguage === 'fr' ? 'Consultation des textes...' : 'Consulting legal DB...'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form
            id="form-support-chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2 bg-gradient-to-r from-[#1A2813] to-[#14200E] p-3 border-t border-[#7A9A3C]/40"
          >
            <input
              id="input-support-chat-text"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={currentLanguage === 'ru' ? 'Что вас интересует? Напишите вопрос...' : t('askPlaceholder')}
              className="flex-1 rounded-xl border border-[#7A9A3C]/50 bg-[#0C1309] px-3.5 py-2 text-xs text-white placeholder-[#8FAD78] outline-none focus:border-[#C2E86B] focus:ring-1 focus:ring-[#C2E86B]/50 transition"
            />
            <button
              id="btn-support-chat-submit"
              type="submit"
              disabled={!inputText.trim() || isTyping}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7A9A3C] text-black font-bold transition hover:bg-[#90B24A] hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 shadow-md shadow-[#7A9A3C]/30"
            >
              <Send className="h-4 w-4" id="icon-support-send" />
            </button>
          </form>

          {/* Permanent bottom disclaimer under input with /privacy link */}
          <div
            id="footer-support-chat-disclaimer-floating"
            className="bg-[#0C1309] px-3 py-1.5 border-t border-[#7A9A3C]/20 text-[10px] text-[#8FAD78] text-center flex items-center justify-center gap-1.5 flex-wrap font-sans shrink-0"
          >
            <span>
              {currentLanguage === 'ru'
                ? 'Справочная информация. Актуально на дату ответа.'
                : currentLanguage === 'fr'
                ? 'Information à titre indicatif. Valable à la date de réponse.'
                : 'Reference information only. Current as of response date.'}
            </span>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== 'undefined') {
                  window.history.pushState(null, '', '/privacy');
                  window.dispatchEvent(new CustomEvent('app-navigate', { detail: { path: '/privacy' } }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="text-[#A6D448] hover:text-white underline underline-offset-2 transition font-medium"
            >
              /privacy
            </a>
          </div>
        </div>
      )}
    </>
  );
}

