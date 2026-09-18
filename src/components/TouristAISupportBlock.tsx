import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, Scale, AlertCircle, RefreshCw, PhoneCall, Copy, Check, ShieldCheck, User, AlertTriangle, X } from 'lucide-react';
import { LanguageCode } from '../types';
import { getLegalKnowledgeBase } from '../db';

interface TouristAISupportBlockProps {
  currentLanguage: LanguageCode;
}

interface Message {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
  source?: 'gemini' | 'knowledge_base_fallback';
}

export function TouristAISupportBlock({ currentLanguage }: TouristAISupportBlockProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Session disclaimer state: dismissible, but re-shown in each new session
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

  // Suggested prompt pills for quick tourist questions
  const quickPills = currentLanguage === 'ru'
    ? [
        { label: '📌 Правило 3 рабочих дней', query: 'Расскажите подробно про правило 3 рабочих дней: как исчисляется срок, исключаются ли выходные?' },
        { label: '⚖️ Штрафы по ст. 224 КоАП', query: 'Какие штрафы предусмотрены по статье 224 КоАП РУз за просрочку регистрации?' },
        { label: '📄 Документы для оформления', query: 'Какие документы нужны для регистрации гражданам безвизовых и визовых стран?' },
        { label: '🏛️ Система e-mehmon и QR-код', query: 'Имеет ли электронный листок с QR-кодом из e-mehmon полную юридическую силу при выезде?' },
        { label: '🏕️ Палатки, кемпинг и юрты', query: 'Как оформляется статус «Свободный турист», если мы ночуем в палатках или юртах?' },
        { label: '🚨 Полиция и горячая линия 1173', query: 'Какие контакты у туристической полиции и экстренных служб Узбекистана?' }
      ]
    : currentLanguage === 'fr'
    ? [
        { label: '📌 Règle des 3 jours ouvrables', query: 'Comment fonctionne la règle des 3 jours ouvrables pour l\'enregistrement en Ouzbékistan ?' },
        { label: '⚖️ Amendes (Article 224)', query: 'Quelles sont les amendes en cas de dépassement du délai selon l\'article 224 ?' },
        { label: '📄 Documents requis', query: 'Quels documents dois-je fournir pour mon enregistrement ?' },
        { label: '🏛️ Système e-mehmon et QR code', query: 'Quelle est la valeur juridique du certificat e-mehmon avec code QR ?' }
      ]
    : [
        { label: '📌 The 3-Business-Day Rule', query: 'Explain the 3-business-day registration deadline and how weekends/holidays are counted.' },
        { label: '⚖️ Fines under Article 224', query: 'What are the fines and penalties for overstaying under Article 224 of Uzbekistan code?' },
        { label: '📄 Required Documents', query: 'What documents are required for visa-free versus visa-required travelers?' },
        { label: '🏛️ e-mehmon QR Certificate', query: 'Is the electronic QR-coded certificate from e-mehmon legally recognized by border control?' },
        { label: '🏕️ Free Tourist & Camping', query: 'How does registration work for independent travelers camping in tents or yurt camps?' },
        { label: '🚨 Tourist Police Hotline 1173', query: 'What are the helpline numbers for the Tourist Police and emergency assistance?' }
      ];

  // Initial welcome greeting
  useEffect(() => {
    const greetingText = currentLanguage === 'ru'
      ? `Здравствуйте! Я официальный ИИ-консультант сервиса **RegistApp** по миграционному законодательству и туризму в Республике Узбекистан.\n\n**Что именно вас интересует?**\nЗадайте любой интересующий вас вопрос (о сроках, правиле 3 рабочих дней, тарифах, штрафах по ст. 224 КоАП или системе e-mehmon) либо выберите быструю подсказку ниже:`
      : currentLanguage === 'fr'
      ? `Bonjour ! Je suis le conseiller juridique IA officiel de **RegistApp** pour les voyageurs en Ouzbékistan.\n\n**Qu'est-ce qui vous intéresse aujourd'hui ?**\nPosez votre question (règle des 3 jours, amendes sous l'article 224, tarifs, e-mehmon) ou cliquez sur un des thèmes rapides ci-dessous :`
      : `Welcome! I am your official **RegistApp** AI Legal & Tourism Support Assistant for the Republic of Uzbekistan.\n\n**What are you interested in today?**\nAsk any question (the 3-business-day rule, overstay penalties, document requirements, rates, or e-mehmon) or tap a quick topic below:`;

    setMessages([
      {
        id: 'msg-welcome',
        sender: 'model',
        text: greetingText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  }, [currentLanguage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: Message = {
      id: `msg-user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) {
      setInputMessage('');
    }
    setIsLoading(true);

    try {
      const legalDb = getLegalKnowledgeBase();
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationHistory: messages.slice(-5).map(m => ({ sender: m.sender, text: m.text })),
          language: currentLanguage,
          legalKnowledgeBase: legalDb
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      const aiReply = data.reply || (currentLanguage === 'ru' ? 'Ответ не получен.' : 'No response received.');

      setMessages(prev => [
        ...prev,
        {
          id: `msg-ai-${Date.now()}`,
          sender: 'model',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source
        }
      ]);
    } catch {
      // Graceful fallback to legal advice without error emission
      setMessages(prev => [
        ...prev,
        {
          id: `msg-ai-err-${Date.now()}`,
          sender: 'model',
          text: currentLanguage === 'ru'
            ? '📌 Согласно Постановлению КМ РУз № 433, регистрация оформляется в течение 3 рабочих дней со дня въезда. Для круглосуточной консультации свяжитесь с Туристической полицией: 1173.'
            : '📌 Pursuant to Decree No. 433 of Uzbekistan, tourist registration must be completed within 3 business days of arrival. Tourist Police Hotline: 1173.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div id="tourist-ai-support-block" className="rounded-2xl border-2 border-[#7A9A3C] bg-gradient-to-b from-[#1C2615] via-[#141C10] to-[#0E150B] p-5 space-y-4 shadow-[0_0_35px_rgba(122,154,60,0.25)] ring-1 ring-[#90B24A]/40">
      {/* Block Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#2B3232] pb-4">
        <div className="flex items-center space-x-3">
          <div className="relative h-11 w-11 rounded-xl bg-[#7A9A3C]/15 border border-[#7A9A3C]/40 flex items-center justify-center text-[#90B24A] shrink-0">
            <Bot className="h-6 w-6" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#7A9A3C] border-2 border-[#23292A]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <span>{currentLanguage === 'ru' ? 'ИИ-саппорт для туристов' : currentLanguage === 'fr' ? 'Support IA pour Touristes' : 'Tourist AI Legal Support'}</span>
              <span className="inline-flex items-center space-x-1 rounded-full bg-[#7A9A3C]/15 border border-[#7A9A3C]/30 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#90B24A]">
                <Scale className="h-3 w-3" />
                <span>{currentLanguage === 'ru' ? 'База знаний РУз' : 'UZ Legal DB'}</span>
              </span>
            </h3>
            <p className="text-xs text-[#9AA1A0] mt-0.5">
              {currentLanguage === 'ru'
                ? 'Круглосуточный правовой консультант по правилам пребывания, срокам и системе e-mehmon'
                : currentLanguage === 'fr'
                ? 'Conseiller juridique 24/7 sur les règles d\'enregistrement et la législation'
                : '24/7 legal assistant for registration guidelines, overstay rules, and e-mehmon'}
            </p>
          </div>
        </div>

        {/* Tourist Police Hotline Callout */}
        <div className="flex items-center space-x-2 rounded-xl bg-[#171A1A] border border-[#3E4747] px-3.5 py-1.5 self-start sm:self-auto">
          <PhoneCall className="h-3.5 w-3.5 text-[#7A9A3C]" />
          <span className="text-[11px] text-[#9AA1A0]">
            {currentLanguage === 'ru' ? 'Туристическая полиция:' : 'Tourist Police:'}
          </span>
          <a href="tel:1173" className="text-xs font-mono font-bold text-[#90B24A] hover:underline">
            1173
          </a>
        </div>
      </div>

      {/* Quick Prompt Topic Pills */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono text-[#9AA1A0] uppercase tracking-wider block">
          {currentLanguage === 'ru' ? 'Частые правовые вопросы:' : 'Frequently Asked Topics:'}
        </span>
        <div className="flex flex-wrap gap-2">
          {quickPills.map((pill, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(pill.query)}
              disabled={isLoading}
              className="rounded-lg border border-[#3E4747] bg-[#171A1A] px-3 py-1.5 text-xs text-[#E5E5E5] hover:border-[#7A9A3C] hover:text-[#90B24A] hover:bg-[#1E2222] transition-all cursor-pointer disabled:opacity-50 text-left"
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Dialogue Container */}
      <div 
        id="tourist-support-chat-container" 
        className="rounded-xl border border-[#2B3232] bg-[#171A1A] p-4 h-80 overflow-y-auto space-y-3 font-sans text-xs scroll-smooth"
      >
        {/* Session Disclaimer Banner: Shown before first message, dismissible, re-shown in each new session */}
        {showSessionDisclaimer && (
          <div
            id="banner-tourist-chat-session-disclaimer"
            className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-[#171A1A] p-3 text-[11px] leading-relaxed text-amber-200/90 shadow-sm relative animate-in fade-in duration-200"
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
                      Les réponses de l'assistant sont fournies à titre indicatif et ne constituent pas un conseil juridique officiel. Pour des clarifications officielles, veuillez vous adresser aux services des migrations et de la citoyenneté du ministère des Affaires intérieures. La conversation est traitée par un système d'intelligence artificielle et peut être enregistrée — ne saisissez pas de données que vous не souhaitez pas transmettre.
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
                id="btn-close-tourist-chat-disclaimer"
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

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start space-x-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'model' && (
              <div className="h-7 w-7 rounded-lg bg-[#7A9A3C]/20 border border-[#7A9A3C]/40 flex items-center justify-center text-[#90B24A] shrink-0 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#7A9A3C] text-white rounded-tr-none shadow-sm'
                  : 'bg-[#23292A] text-[#E5E5E5] border border-[#2B3232] rounded-tl-none shadow-sm'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 text-[10px] text-[#9AA1A0] mb-1 font-mono">
                <span>
                  {m.sender === 'user' 
                    ? (currentLanguage === 'ru' ? 'Вы' : 'You') 
                    : (currentLanguage === 'ru' ? 'ИИ-Консультант RegistApp' : 'RegistApp AI Assistant')}
                </span>
                <div className="flex items-center space-x-1.5">
                  <span>{m.timestamp}</span>
                  {m.sender === 'model' && (
                    <button
                      type="button"
                      onClick={() => handleCopy(m.id, m.text)}
                      className="hover:text-white transition"
                      title={currentLanguage === 'ru' ? 'Скопировать ответ' : 'Copy'}
                    >
                      {copiedId === m.id ? <Check className="h-3 w-3 text-[#90B24A]" /> : <Copy className="h-3 w-3" />}
                    </button>
                  )}
                </div>
              </div>

              {/* Message Text */}
              <div className="whitespace-pre-line text-xs sm:text-[13px] leading-relaxed">
                {m.text}
              </div>

              {m.source === 'knowledge_base_fallback' && (
                <div className="mt-2 pt-1 border-t border-[#3E4747]/60 text-[9px] text-[#90B24A] flex items-center gap-1 font-mono">
                  <ShieldCheck className="h-3 w-3 text-[#7A9A3C]" />
                  <span>Верифицировано по локальной правовой базе данных РУз</span>
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="h-7 w-7 rounded-lg bg-[#3E4747] flex items-center justify-center text-white shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start space-x-2.5">
            <div className="h-7 w-7 rounded-lg bg-[#7A9A3C]/20 border border-[#7A9A3C]/40 flex items-center justify-center text-[#90B24A] shrink-0">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-none bg-[#23292A] border border-[#2B3232] px-4 py-3 text-xs text-[#9AA1A0] flex items-center space-x-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#7A9A3C]" />
              <span>{currentLanguage === 'ru' ? 'Анализ правовой базы данных...' : 'Consulting legal knowledge base...'}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex gap-2"
      >
        <input
          id="input-tourist-support-query"
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={
            currentLanguage === 'ru'
              ? 'Задайте вопрос о сроках, штрафах, правилах регистрации...'
              : currentLanguage === 'fr'
              ? 'Posez une question sur les règles, les amendes, la durée...'
              : 'Ask about 3-day rule, penalties, documents, e-mehmon...'
          }
          className="flex-1 rounded-xl border border-[#3E4747] bg-[#171A1A] px-4 py-2.5 text-xs text-white placeholder-[#9AA1A0] outline-none focus:border-[#7A9A3C] transition"
        />
        <button
          id="btn-send-tourist-support-query"
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="flex items-center space-x-2 rounded-xl bg-[#7A9A3C] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#5E7A2A] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{currentLanguage === 'ru' ? 'Отправить' : 'Send'}</span>
        </button>
      </form>

      {/* Permanent bottom disclaimer under input with /privacy link */}
      <div
        id="footer-tourist-chat-disclaimer"
        className="text-[10px] text-[#9AA1A0] text-center flex items-center justify-center gap-1.5 flex-wrap font-sans pt-1"
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
          className="text-[#90B24A] hover:text-white underline underline-offset-2 transition font-medium"
        >
          /privacy
        </a>
      </div>
    </div>
  );
}

export default TouristAISupportBlock;
