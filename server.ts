import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Client network info for legal consent ledger (IP address, user agent, server timestamp)
app.get('/api/client-info', (req, res) => {
  const forwarded = req.headers['x-forwarded-for'];
  let ip = '127.0.0.1';
  if (typeof forwarded === 'string') {
    ip = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded) && forwarded.length > 0) {
    ip = forwarded[0].trim();
  } else if (req.socket.remoteAddress) {
    ip = req.socket.remoteAddress;
  } else if (req.ip) {
    ip = req.ip;
  }

  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }

  res.json({
    ipAddress: ip,
    userAgent: (req.headers['user-agent'] as string) || '',
    serverTimestamp: new Date().toISOString()
  });
});

// Cooldown timestamp for Gemini quota depletion / billing issues
let geminiCooldownUntil = 0;

function generateLegalFallbackAnswer(userText: string, lang: string, legalKnowledge: string): string {
  const query = userText.toLowerCase();

  if (lang === 'ru') {
    if (query.includes('случай') || query.includes('друг') || query.includes('квартир') || query.includes('отел') || query.includes('хостел') || query.includes('родствен') || query.includes('30 дн') || query.includes('дольше 30') || query.includes('где остановились') || query.includes('размещен') || query.includes('гостиниц') || query.includes('санатор')) {
      return `🏡 **Разъяснение по способам регистрации в зависимости от типа размещения:**\n\n` +
        `• **1. Отели, хостелы, гостевые дома, санатории:**\n` +
        `  Объект регистрирует вас **самостоятельно и бесплатно** в день заезда через государственную систему e-mehmon. Наша платная услуга вам не требуется — запросите регистрационный талон с QR-кодом у администратора на ресепшене.\n\n` +
        `• **2. Апартаменты, съемные квартиры, проживание у знакомых или родственников:**\n` +
        `  Регистрацию обязан оформить **собственник жилья (принимающая сторона)** через личный кабинет на портале e-mehmon.uz либо в районном отделе миграции (ОМиОГ МВД РУз).\n\n` +
        `• **3. Пребывание в Узбекистане дольше 30 дней:**\n` +
        `  Оформляется исключительно через **территориальные подразделения миграции МВД РУз (ОМиОГ)** с личным присутствием принимающей стороны.\n\n` +
        `• **4. Палатка, кемпинг, автодом или транспорт, переоборудованный для ночлега:**\n` +
        `  Вы регистрируетесь в **статусе самостоятельного туриста** на срок до 30 дней. Это та услуга, которую предоставляет сервис **RegistApp**.\n\n` +
        `*При возникновении любых вопросов работает круглосуточный телефон Туристической полиции: **1173**.*`;
    }

    if (query.includes('срок') || query.includes('дн') || query.includes('когда') || query.includes('3 дня') || query.includes('три дня')) {
      return `📌 **Сроки регистрации согласно законодательству Республики Узбекистан:**\n\n` +
        `• В соответствии с **Постановлением Кабинета Министров РУз № 433 от 10.07.2020 г.**, иностранные граждане обязаны оформить регистрацию по месту пребывания в течение **3 рабочих дней** с момента пересечения государственной границы.\n` +
        `• **Важно:** Воскресные и официально установленные праздничные дни в данный 3-дневный срок не засчитываются.\n` +
        `• Если ваше пребывание в стране не превышает 3 рабочих дней, регистрация не требуется.\n` +
        `• Через сервис **RegistApp** процедура подачи занимает считанные минуты, а официальный документ с QR-кодом выдается оператором в день подтверждения оплаты.`;
    }

    if (query.includes('штраф') || query.includes('224') || query.includes('наруш') || query.includes('просроч') || query.includes('наказан')) {
      return `⚖️ **Ответственность за нарушение правил пребывания (Статья 224 КоАП РУз):**\n\n` +
        `• Нарушение иностранным гражданином правил пребывания влечет административный штраф:\n` +
        `  — Просрочка до 30 суток: штраф в размере **5 базовых расчетных величин (БРВ)**;\n` +
        `  — Просрочка свыше 30 суток: штраф от **10 до 20 БРВ** либо выдворение за пределы РУз с запретом на въезд сроком до 3 лет.\n` +
        `• **Что делать при просрочке:** Незамедлительно обратитесь в районный отдел миграции и оформления гражданства (ОМиОГ МВД РУз) или свяжитесь с Туристической полицией по номеру **1173**. В Личном кабинете RegistApp вы также можете скачать официальную «Памятку нарушителя» с поэтапным планом действий.`;
    }

    if (query.includes('виз') || query.includes('документ') || query.includes('паспорт') || query.includes('скан') || query.includes('штамп')) {
      return `📄 **Необходимые документы для оформления регистрации:**\n\n` +
        `• **Для граждан безвизовых стран** (более 90 государств, включая страны ЕС, СНГ, Турцию, ОАЭ и др.):\n` +
        `  1. Четкая фотография/скан разворота паспорта с фото;\n` +
        `  2. Четкий скан штампа пограничного контроля о въезде в РУз с читаемой датой.\n` +
        `• **Для граждан стран с визовым режимом:**\n` +
        `  1. Скан паспорта;\n` +
        `  2. Скан штампа о въезде;\n` +
        `  3. Скан действующей въездной/электронной визы (e-visa).\n` +
        `• Все документы загружаются в зашифрованном виде и проверяются сертифицированным оператором перед отправкой в государственную базу e-mehmon.`;
    }

    if (query.includes('e-mehmon') || query.includes('emehmon') || query.includes('е-мехмон') || query.includes('qr') || query.includes('сертификат')) {
      return `🏛️ **Государственная система e-mehmon и QR-сертификат:**\n\n` +
        `• **E-mehmon (emehmon.uz)** — специализированная государственная информационная система Республики Узбекистан для автоматизированного учета иностранных туристов.\n` +
        `• По итогам проверки оператор генерирует официальный электронный листок с уникальным QR-кодом.\n` +
        `• Данный электронный документ имеет **полную юридическую силу** на всей территории Узбекистана и проверяется пограничной службой при выезде в аэропортах и на наземных КПП путем сканирования QR-кода. Распечатывать его необязательно — достаточно сохранить PDF на смартфоне.`;
    }

    if (query.includes('свободн') || query.includes('палатк') || query.includes('кемпинг') || query.includes('юрт') || query.includes('хостел') || query.includes('гостиниц')) {
      return `🏕️ **Статус «Свободный турист» (Free Tourist):**\n\n` +
        `• Если вы путешествуете самостоятельно (на автомобиле, велосипеде, с палатками в горах Чимгана или Заамина, проживаете в юртовых лагерях или у друзей), вы регистрируетесь в статусе «Свободный турист».\n` +
        `• В этом случае регистрация осуществляется через электронного туроператора/хостел (включая RegistApp), без необходимости бронирования дорогостоящих отелей на каждый день путешествия.\n` +
        `• Важно сохранять билеты на поезда («Афросиаб»), чеки или квитанции об оплате стоянок для подтверждения маршрута следования.`;
    }

    if (query.includes('оплат') || query.includes('цен') || query.includes('стоимост') || query.includes('тариф') || query.includes('карт')) {
      return `💳 **Тарифы и порядок оплаты в RegistApp:**\n\n` +
        `• Стоимость услуг фиксированная за каждые сутки пребывания:\n` +
        `  — **USD:** 5 USD/сутки;\n` +
        `  — **EUR:** 5 EUR/сутки;\n` +
        `  — **RUB:** 500 RUB/сутки;\n` +
        `  — **UZS:** 70 000 UZS/сутки.\n` +
        `• Оплата производится прямым переводом на реквизиты банковской карты соответствующей валюты в Личном кабинете, после чего вы указываете номер/ID транзакции для моментальной сверки оператором.`;
    }

    return `Здравствуйте! Я ваш официальный ИИ-консультант по правовым вопросам для туристов в Узбекистане.\n\n` +
      `Я работаю на базе актуального законодательства РУз (Постановление КМ № 433, Закон «О туризме», ст. 224 КоАП РУз).\n` +
      `Вы можете спросить меня о:\n` +
      `• Способах регистрации (отели, квартиры, знакомые, палатки);\n` +
      `• Правиле 3 рабочих дней и исчислении сроков;\n` +
      `• Размерах штрафов и действиях в случае просрочки;\n` +
      `• Списке документов для визовых и безвизовых стран;\n` +
      `• Системе e-mehmon и юридической силе QR-сертификата;\n` +
      `• Правилах для свободных туристов, кемпингов и походов.\n\n` +
      `*Единый круглосуточный телефон Туристической полиции: **1173**.*`;
  } else if (lang === 'fr') {
    if (query.includes('cas') || query.includes('different') || query.includes('hotel') || query.includes('auberge') || query.includes('appartement') || query.includes('proche') || query.includes('ami') || query.includes('30 jour') || query.includes('hebergement')) {
      return `🏡 **Modalités d'enregistrement selon votre hébergement en Ouzbékistan :**\n\n` +
        `• **1. Hôtels, auberges, maisons d'hôtes, sanatoriums :**\n` +
        `  L'établissement vous enregistre **gratuitement et automatiquement** le jour de votre arrivée via e-mehmon. Notre service n'est pas nécessaire — demandez votre coupon d'enregistrement avec QR code à la réception.\n\n` +
        `• **2. Appartement, maison privée, chez des amis ou des proches :**\n` +
        `  L'enregistrement doit être effectué par le **propriétaire / hébergeur** via le portail e-mehmon.uz ou au bureau des migrations (OMiOG).\n\n` +
        `• **3. Séjour supérieur à 30 jours :**\n` +
        `  S'effectue auprès du **service des migrations des organes des affaires intérieures (OMiOG)**.\n\n` +
        `• **4. Tente, camping-car ou véhicule aménagé pour le couchage :**\n` +
        `  Enregistrement sous le **statut de touriste indépendant** jusqu'à 30 jours. C'est la prestation assurée par **RegistApp**.\n\n` +
        `*Police touristique (24h/24) : composez le **1173**.*`;
    }

    if (query.includes('delai') || query.includes('jour') || query.includes('temps') || query.includes('3 jour')) {
      return `📌 **Délais d'enregistrement en Ouzbékistan :**\n\n` +
        `• Selon le **Décret n° 433 du Cabinet des Ministres de la République d'Ouzbékistan**, les touristes étrangers doivent s'enregistrer dans les **3 jours ouvrables** suivant leur entrée sur le territoire.\n` +
        `• Les dimanches et jours fériés officiels ne sont pas comptabilisés dans ce délai.\n` +
        `• Si votre séjour est inférieur à 3 jours ouvrables, aucun enregistrement n'est requis.`;
    }
    return `Bonjour ! Je suis votre conseiller juridique IA pour les touristes en Ouzbékistan.\n\n` +
      `Je vous assiste sur la réglementation migratoire ouzbèke (règle des 3 jours, amendes sous l'article 224, documents requis et système e-mehmon).\n` +
      `N'hésitez pas à poser vos questions. Police touristique : composez le **1173** (24h/24).`;
  } else {
    // English
    if (query.includes('case') || query.includes('different') || query.includes('hotel') || query.includes('hostel') || query.includes('apartment') || query.includes('flat') || query.includes('friend') || query.includes('relative') || query.includes('30 day') || query.includes('stay') || query.includes('where staying') || query.includes('accommodation')) {
      return `🏡 **Registration Rules by Accommodation Type in Uzbekistan:**\n\n` +
        `• **1. Hotels, Hostels, Guest Houses & Sanatoriums:**\n` +
        `  The accommodation registers you **automatically and free of charge** upon check-in via e-mehmon. You do not need RegistApp — just ask for your registration slip with QR code at reception.\n\n` +
        `• **2. Apartments, Rented Flats, Staying with Friends or Relatives:**\n` +
        `  Must be registered by the **property owner / host** through the e-mehmon.uz portal or at the district migration office (OMiOG).\n\n` +
        `• **3. Stays Exceeding 30 Days:**\n` +
        `  Must be processed directly at the **Internal Affairs Migration Department (OMiOG)**.\n\n` +
        `• **4. Tent, Camper Van, Off-grid Camping:**\n` +
        `  Registered under the **Independent Tourist Status** for up to 30 days. This is the exact service provided by **RegistApp**.\n\n` +
        `*Tourist Police 24/7 Helpline: **1173**.*`;
    }

    if (query.includes('day') || query.includes('period') || query.includes('how long') || query.includes('3 day') || query.includes('deadline')) {
      return `📌 **Registration Deadlines in the Republic of Uzbekistan:**\n\n` +
        `• Pursuant to **Decree No. 433 of the Cabinet of Ministers of Uzbekistan**, foreign tourists are legally mandated to register their place of stay within **3 business days** of crossing the national border.\n` +
        `• **Important Note:** Sundays and officially gazetted public holidays are strictly excluded from this 3-day calculation.\n` +
        `• If your total visit in Uzbekistan is less than 3 business days, registration is not mandatory.\n` +
        `• RegistApp processes your filing directly with certified operators, delivering an official QR-coded registration certificate.`;
    }

    if (query.includes('fine') || query.includes('penalty') || query.includes('violation') || query.includes('law') || query.includes('224')) {
      return `⚖️ **Migration Violations & Penalties (Article 224 of the Administrative Code):**\n\n` +
        `• Overstaying without registration constitutes an administrative violation:\n` +
        `  — Delays under 30 days: fine of **5 Base Calculated Units (BCU)**;\n` +
        `  — Delays over 30 days: fines from **10 to 20 BCU** or administrative deportation with a re-entry ban for up to 3 years.\n` +
        `• **Corrective Actions:** If your deadline has passed, immediately contact the Migration Office (OMiOG) or the Tourist Police Hotline at **1173**. You can also download our official Violation Guide in your RegistApp Cabinet.`;
    }

    if (query.includes('document') || query.includes('passport') || query.includes('stamp') || query.includes('visa')) {
      return `📄 **Required Documents for Tourist Registration:**\n\n` +
        `• **Visa-Free Travelers** (Over 90 countries including EU, UK, US/Canada, Australia, UAE, Turkey):\n` +
        `  1. Clear photo/scan of passport biographical page;\n` +
        `  2. Clear scan of the entry border stamp showing your arrival date.\n` +
        `• **Visa-Required Travelers:**\n` +
        `  1. Passport bio page scan;\n` +
        `  2. Border entry stamp scan;\n` +
        `  3. Valid Uzbekistan tourist visa or e-Visa copy.`;
    }

    return `Hello! I am your RegistApp AI Legal & Tourism Support Assistant.\n\n` +
      `I am equipped with the official legal database of the Republic of Uzbekistan (Cabinet of Ministers Resolution No. 433, Tourism Law, Article 224 Administrative Code).\n` +
      `Ask me about:\n` +
      `• Registration rules for hotels, apartments, friends, and tents;\n` +
      `• The 3-business-day registration rule;\n` +
      `• Visa policies and required document scans;\n` +
      `• How the e-mehmon QR certificate works;\n` +
      `• Independent travelers camping, trekking, and yurt stays;\n` +
      `• Overstay penalties and prevention.\n\n` +
      `*Tourist Police 24/7 Helpline: **1173**.*`;
  }
}

// API endpoint for AI Support
app.post('/api/support/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], language = 'ru', legalKnowledgeBase = '' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Only attempt Gemini API if key is present and we are not in quota/prepayment cooldown
    if (apiKey && Date.now() > geminiCooldownUntil) {
      try {
        const ai = new GoogleGenAI({ apiKey });

        const systemInstruction = `Вы — официальный ИИ-консультант по правовой и туристической поддержке сервиса RegistApp для иностранных туристов в Республике Узбекистан.
Ваша цель: помогать иностранным туристам безошибочно понимать и соблюдать законодательство РУз о порядке временного пребывания, правиле 3 рабочих дней, регистрации через государственную систему e-mehmon (emehmon.uz), визовых режимах и предотвращении штрафов по ст. 224 КоАП РУз.

БАЗА ДАННЫХ ПРАВОВОЙ ИНФОРМАЦИИ РЕСПУБЛИКИ УЗБЕКИСТАН (ЗАГРУЖЕНА АДМИНИСТРАТОРОМ):
${legalKnowledgeBase || 'Действует Постановление КМ РУз № 433 от 10.07.2020 г., Закон РУз "О туризме" № ЗРУ-549, ст. 224 КоАП РУз (штрафы от 5 до 20 БРВ), правило 3 рабочих дней со дня въезда. Единый номер туристической полиции 1173.'}

ПРАВИЛА ОТВЕТА:
1. Опирайтесь строго на приведенную базу данных правовой информации.
2. Приводите конкретные ссылки на статьи законов и постановлений (Постановление КМ РУз № 433, статья 224 КоАП РУз, система e-mehmon).
3. Отвечайте на том языке, на котором обратился пользователь (${language === 'ru' ? 'русский' : language === 'fr' ? 'французский' : 'английский'}).
4. Форматируйте ответ в Markdown со списками, выделениями и практическими советами.
5. При угрозе нарушения сроков предупреждайте о рисках и давайте контакты туристической полиции (1173).`;

        const contents: any[] = [];
        if (Array.isArray(conversationHistory)) {
          for (const item of conversationHistory.slice(-6)) {
            contents.push({
              role: item.sender === 'user' ? 'user' : 'model',
              parts: [{ text: item.text }]
            });
          }
        }
        contents.push({
          role: 'user',
          parts: [{ text: message }]
        });

        const response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.2,
          }
        });

        const reply = response.text || 'Ответ сформирован на основе правовой базы данных.';
        return res.json({ reply, source: 'gemini' });
      } catch (geminiError: any) {
        const errMsg = geminiError?.message || String(geminiError);
        // If quota limit reached or prepayment credits depleted, back off to avoid recurring errors
        if (errMsg.includes('429') || errMsg.includes('depleted') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
          geminiCooldownUntil = Date.now() + 15 * 60 * 1000;
        }
      }
    }

    // High-precision legal knowledge base retriever fallback
    const fallbackAnswer = generateLegalFallbackAnswer(message, language, legalKnowledgeBase);
    return res.json({ reply: fallbackAnswer, source: 'knowledge_base_fallback' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RegistApp Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
