import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Bot, User, Sparkles } from 'lucide-react';
import { ChatMessage, LanguageCode } from '../types';
import { getConfig } from '../db';
import { translations } from '../translations';

interface SupportChatProps {
  currentLanguage: LanguageCode;
}

export default function SupportChat({ currentLanguage }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = (key: string) => translations[currentLanguage]?.[key] || key;

  // Initialize or update with greeting based on language
  useEffect(() => {
    const greetings: Record<LanguageCode, string> = {
      en: "Hello! I am your RegistApp AI assistant. How can I help you with your tourist registration in Uzbekistan today? Ask me about visas, passport uploads, prices, or deadlines!",
      ru: "Здравствуйте! Я ИИ-помощник RegistApp. Как я могу помочь вам с регистрацией в Узбекистане? Спросите меня о визах, загрузке паспортов, ценах или сроках!",
      fr: "Bonjour ! Je suis votre assistant IA RegistApp. Comment puis-je vous aider avec votre enregistrement touristique en Ouzbékistan aujourd'hui ? Posez-moi des questions sur les visas, les passeports, les prix ou les délais !"
    };

    setMessages(prev => {
      const welcomeExists = prev.some(m => m.id === 'welcome-msg');
      if (!welcomeExists) {
        return [
          {
            id: 'welcome-msg',
            sender: 'ai',
            text: greetings[currentLanguage],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          ...prev
        ];
      } else {
        return prev.map(m => {
          if (m.id === 'welcome-msg') {
            return { ...m, text: greetings[currentLanguage] };
          }
          return m;
        });
      }
    });
  }, [currentLanguage]);

  // Handle auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const generateAIResponse = (userText: string): string => {
    const text = userText.toLowerCase();
    const config = getConfig();

    // Context from config or default behavior
    const promptInstructions = config.supportAiScript;

    // English responses
    if (currentLanguage === 'en') {
      if (text.includes('visa')) {
        return "Uzbekistan offers dual entries. If you choose 'Visa Country', you must upload (1) Passport Scan, (2) Arrival Border Stamp Scan, and (3) Visas page for verification. Registration rates are the same for all countries ($5 USD/EUR, 500 RUB or 70000 UZS daily).";
      }
      if (text.includes('days') || text.includes('how long') || text.includes('period')) {
        return "Mandatory registration must be purchased and processed within 3 business days of crossing the Uzbekistan border. Failing this triggers migration violations of Article 224.";
      }
      if (text.includes('fine') || text.includes('penalty') || text.includes('violation') || text.includes('law')) {
        return "Overstaying your registration period triggers severe fines under Article 224 of the Administrative Code (from $50 to $100 equivalent). If an operator flags an infraction, you'll receive our Migration Law Violation Guide in your cabinet containing corrective actions.";
      }
      if (text.includes('pay') || text.includes('card') || text.includes('price') || text.includes('cost')) {
        return "The daily processing rates are: USD $5/day, EUR €5/day, RUB 500/day, UZS 70,000/day. You can pay by transfer directly onto our matching currency card during checkout, then type your transaction reference to confirm.";
      }
      if (text.includes('how does') || text.includes('process') || text.includes('step')) {
        return "It's easy! 1. Enter your country and upload documents. 2. Choose dates (arrival & departure). 3. Transfer the amount to the provided card. 4. Our Operator certifies your documents on e-mehmon and issues your official QR-coded PDF.";
      }
      if (text.includes('e-mehmon') || text.includes('emehmon') || text.includes('uzb')) {
        return "e-Mehmon is the official registration system of Uzbekistan (https://emehmon.uz). RegistApp acts as your digital proxy to process, translate, format, and push validation data seamlessly, saving you foreign office queues.";
      }
      return "Thank you for asking. Based on our AI Guidelines: Please make sure to upload clear scans of your passport bio page and arrival stamp. Registrations take approx. 30-60 minutes to process once payment is cleared by our operators.";
    }

    // Russian responses
    if (currentLanguage === 'ru') {
      if (text.includes('виз') || text.includes('виза')) {
        return "Для стран с визовым режимом требуются 3 документа: скан паспорта, скан штампа въезда и скан самой визы в Узбекистан. Стоимость одинаковая для всех категорий.";
      }
      if (text.includes('дн') || text.includes('день') || text.includes('срок') || text.includes('когда')) {
        return "Вы обязаны оформить регистрацию в течение 3 рабочих дней с момента пересечения границы. Воскресенье и праздники не учитываются в этот лимит.";
      }
      if (text.includes('штраф') || text.includes('закон') || text.includes('наруш')) {
        return "Нарушение сроков регистрации карается штрафом по статье 224 КоАП РУз (от 50 до 100 долларов). Оператор может выслать вам Памятку нарушителя с инструкциями по исправлению ситуации.";
      }
      if (text.includes('оплат') || text.includes('карт') || text.includes('цен') || text.includes('руб') || text.includes('сум')) {
        return "Тарифы в сутки: 70 000 UZS, 500 RUB, 5 USD, 5 EUR. Перевод осуществляется вручную по реквизитам соответствующей карты на экране оплаты, после чего вносится ID квитанции.";
      }
      if (text.includes('процесс') || text.includes('как')) {
        return "Всё просто: 1. Выберите страну и загрузите сканы. 2. Укажите даты пребывания. 3. Оплатите на указанную карту. 4. Оператор обработает заявку на e-Mehmon и выдаст PDF с QR-кодом.";
      }
      return "Спасибо за обращение. Пожалуйста, убедитесь, что загруженные сканы паспорта и штампа въезда имеют высокое разрешение. Обработка занимает от 30 до 60 минут после подтверждения оплаты.";
    }

    // French responses
    if (currentLanguage === 'fr') {
      if (text.includes('visa')) {
        return "L'Ouzbékistan propose des régimes avec et sans visa. Si vous sélectionnez 'Pays avec visa', vous devez télécharger votre passeport, tampon d'entrée et visa. Le tarif reste identique ($5/jour).";
      }
      if (text.includes('jour') || text.includes('durée') || text.includes('delai') || text.includes('temps')) {
        return "L'enregistrement obligatoire doit être demandé dans les 3 jours ouvrables suivant votre entrée sur le territoire ouzbek.";
      }
      if (text.includes('amende') || text.includes('loi') || text.includes('infraction')) {
        return "Le non-respect de la règle des 3 jours entraîne de lourdes amendes (article 224 du code administratif, de 50$ à 100$). En cas de problème, notre opérateur vous transmettra un guide d'infraction civile.";
      }
      if (text.includes('payer') || text.includes('prix') || text.includes('carte') || text.includes('cout')) {
        return "Le tarif journalier est de : 5 USD, 5 EUR, 500 RUB ou 70 000 UZS. Vous devez effectuer un virement sur la carte bancaire affichée puis confirmer en fournissant la référence de transaction.";
      }
      return "Je vous remercie pour votre question. Veillez à ce que les photos de votre passeport et de votre tampon d'entrée soient bien nettes. Le délai de traitement varie de 30 à 60 minutes après confirmation de paiement.";
    }

    const fallbacks: Record<LanguageCode, string> = {
      en: "Thank you for your message. We are ready to assist you. Our support center operates 24/7 on Tashkent Time.",
      ru: "Спасибо за обращение. Мы готовы вам помочь. Наша служба поддержки работает круглосуточно по времени Ташкента.",
      fr: "Merci pour votre message. Nous sommes prêts à vous aider. Notre centre de support fonctionne 24h/24 et 7j/7 à l'heure de Tachkent."
    };
    return fallbacks[currentLanguage] || fallbacks.en;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `chat-usr-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputText;
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = generateAIResponse(currentInput);
      const aiMsg: ChatMessage = {
        id: `chat-ai-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 850);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        id="btn-support-chat-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#65a30d] text-white shadow-xl saturate-120 transition-all duration-300 hover:scale-110 active:scale-95"
        title={t('support')}
      >
        {isOpen ? <X className="h-6 w-6" id="icon-support-close" /> : <MessageSquare className="h-6 w-6 animate-pulse" id="icon-support-open" />}
      </button>

      {/* Chat Window Box */}
      {isOpen && (
        <div
          id="card-support-chat-window"
          className="fixed bottom-24 right-6 z-50 flex h-[480px] w-96 flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl transition-all duration-300 sm:w-80 md:w-96"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-zinc-950 p-4 border-b border-zinc-800">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#65a30d]/20 text-[#a2e635]">
                <Sparkles className="h-4 w-4" id="icon-support-stars" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-zinc-100">{t('support')}</h4>
                <div className="flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-lime-500 animate-pulse"></span>
                  <p className="text-[10px] text-zinc-400">{t('aiBotActive')}</p>
                </div>
              </div>
            </div>
            <button
              id="btn-support-chat-inner-close"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              <X className="h-4 w-4" id="icon-inner-close" />
            </button>
          </div>

          {/* Subheader Notice */}
          <div className="bg-[#65a30d]/10 px-4 py-2 border-b border-zinc-800/50">
            <p className="text-[11px] text-[#a2e635] leading-relaxed">
              {t('supportDesc')}
            </p>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto bg-zinc-900/60 p-4 space-y-4">
            {messages.map((msg) => (
              <div
                id={`chat-msg-${msg.id}`}
                key={msg.id}
                className={`flex items-start gap-2.5 ${msg.sender === 'user' ? 'justify-end' : ''}`}
              >
                {msg.sender === 'ai' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#65a30d]/20 text-[#a2e635]">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-xs ${
                    msg.sender === 'user'
                      ? 'bg-[#65a30d] text-white rounded-tr-none font-medium'
                      : 'bg-zinc-800 text-zinc-100 rounded-tl-none'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                  <span className="mt-1 block text-[9px] text-zinc-400/80 text-right">{msg.timestamp}</span>
                </div>
                {msg.sender === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-zinc-400">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div id="chat-is-typing" className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#65a30d]/20 text-[#a2e635]">
                  <Bot className="h-3.5 w-3.5 animate-bounce" />
                </div>
                <div className="rounded-2xl rounded-tl-none bg-zinc-800 px-3.5 py-2 text-zinc-400 text-xs">
                  <div className="flex space-x-1 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form
            id="form-support-chat-input"
            onSubmit={handleSendMessage}
            className="flex items-center space-x-2 bg-zinc-950 p-3 border-t border-zinc-800"
          >
            <input
              id="input-support-chat-text"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('askPlaceholder')}
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 outline-none focus:border-[#65a30d]"
            />
            <button
              id="btn-support-chat-submit"
              type="submit"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#65a30d] text-white transition hover:bg-[#65a30d]/90"
            >
              <Send className="h-4 w-4" id="icon-support-send" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
