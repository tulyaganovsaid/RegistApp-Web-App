import { GoogleGenAI } from '@google/genai';

export interface ChatHistoryItem {
  sender: 'user' | 'model' | 'ai';
  text: string;
}

export interface AgentContext {
  legalKnowledgeBase?: string;
  language?: string;
  systemConfig?: any;
}

// Available Gemini models in prioritized order
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-flash-latest'
];

/**
 * Executes a query to the Gemini model using the official @google/genai SDK.
 */
export async function queryGemini(
  message: string,
  history: ChatHistoryItem[] = [],
  context: AgentContext = {}
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const { language = 'ru', legalKnowledgeBase = '' } = context;

  const systemInstruction = `Вы — официальный всесторонний интеллектуальный ИИ-консультант сервиса RegistApp для туристов и путешественников в Республике Узбекистан.

КРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО (СТРОГИЙ ЗАПРЕТ НА ШАБЛОННЫЙ РЕГЛАМЕНТ):
- Отвечайте ТОЧНО, КОНКРЕТНО и ЛАКОНИЧНО именно на тот вопрос, который задал пользователь!
- КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выводить длинный общий шаблон «Регламент туристической регистрации» со всеми 4 видами жилья, если пользователь спросил о конкретной теме (например, про штраф, поезд «Афросиаб», метро, сим-карту, гостиницу, палатку или достопримечательность).
- Если вопрос о штрафе — дайте точную сумму штрафа по ст. 224 КоАП РУз и пошаговые инструкции действий при просрочке.
- Если вопрос о сроках — объясните исчисление 3 рабочих дней (с какого дня отсчет, не считая воскресенья и праздники).
- Если вопрос о гостинице — скажите прямо: отели регистрируют автоматически и БЕСПЛАТНО, платить RegistApp не нужно.
- Если вопрос о палатках — объясните статус «Свободный турист» в сервисе RegistApp (70 000 UZS / 500 RUB / $5 в сутки).
- Отвечайте СТРОГО на языке пользователя (${language === 'ru' ? 'русский' : language === 'fr' ? 'французский' : language === 'uz' ? 'узбекский' : 'английский'}).
- Используйте понятное Markdown-форматирование (жирный шрифт, списки, эмодзи 📌, 🚄, ⚖️, 💳, 🍲, 📱, ⚠️).
- Горячая линия Туристической полиции: 1173 (круглосуточно).

БАЗА ДАННЫХ И ПРАВОВЫЕ ОСНОВЫ:
${legalKnowledgeBase || 'Постановление КМ РУз № 433 от 10.07.2020 г., ст. 224 КоАП РУз, система e-mehmon.'}`;

  const contents: any[] = [];
  if (Array.isArray(history)) {
    for (const item of history.slice(-6)) {
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

  const ai = new GoogleGenAI({ apiKey });

  for (const model of GEMINI_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.3,
        }
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('429') || msg.includes('depleted') || msg.includes('RESOURCE_EXHAUSTED')) {
        break;
      }
    }
  }

  return null;
}

/**
 * Specific topic intent definition
 */
interface TopicIntent {
  id: string;
  priority: number;
  match: (q: string) => boolean;
  getResponse: (lang: string, q: string) => string;
}

/**
 * Granular topic intents for specific, targeted answers
 */
const SPECIFIC_INTENTS: TopicIntent[] = [
  // 1. DRONES (Crucial security warning)
  {
    id: 'drone_ban',
    priority: 100,
    match: (q) =>
      q.includes('дрон') || q.includes('квадрокоптер') || q.includes('бпла') ||
      q.includes('коптер') || q.includes('drone') || q.includes('quadcopter') ||
      q.includes('uav'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `⚠️ **INTERDICTION STRICTE DES DRONES EN OUZBÉKISTAN :**\n\n` +
          `• L'importation, la possession et l'utilisation de drones/quadricoptères par des particuliers sont **strictement interdites par la loi pénale ouzbèke** (art. 244-4 et 248-1 du Code pénal).\n` +
          `• Les appareils détectés aux douanes de l'aéroport sont **immédiatement saisis**, avec ouverture de poursuites judiciaires et lourdes amendes.\n` +
          `• **Consigne impérative :** Ne mettez aucun drone dans vos bagages (soute ou cabine). Laissez-le chez vous.`;
      }
      if (lang === 'en') {
        return `⚠️ **STRICT CRIMINAL BAN ON DRONES IN UZBEKISTAN:**\n\n` +
          `• Under Articles 244-4 and 248-1 of the Criminal Code of Uzbekistan, **bringing, flying, or possessing drones (quadcopters/UAVs) by private individuals is STRICTLY PROHIBITED**.\n` +
          `• Even small leisure/camera drones will be **confiscated at airport customs**, resulting in heavy fines and criminal charges.\n` +
          `• **Essential Advice:** Do NOT pack or travel with any drone. Leave it at home before your flight.`;
      }
      return `⚠️ **СТРОЖАЙШИЙ ЗАПРЕТ НА ДРОНЫ В УЗБЕКИСТАНЕ (ст. 244-4 и 248-1 УК РУз):**\n\n` +
        `• Ввоз, хранение, реализация и использование беспилотных летательных аппаратов (дронов, квадрокоптеров) физическими лицами **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ**.\n` +
        `• Попытка провезти дрон даже для любительской съемки достопримечательностей приведет к **немедленной конфискации на таможне**, крупному штрафу и возбуждению уголовного дела.\n` +
        `• **Что делать:** Оставьте дрон дома перед вылетом в Узбекистан. Никаких исключений для обычных туристов нет.`;
    }
  },

  // 2. FINES & OVERSTAY (Article 224 Administrative Code)
  {
    id: 'fines_overstay',
    priority: 95,
    match: (q) =>
      q.includes('штраф') || q.includes('224') || q.includes('просроч') ||
      q.includes('опоздал') || q.includes('наруш') || q.includes('наказан') ||
      q.includes('депортац') || q.includes('не успел зарегистр') ||
      q.includes('fine') || q.includes('penalty') || q.includes('overstay') ||
      q.includes('amende') || q.includes('sanction'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `⚖️ **Amendes et sanctions pour dépassement du délai de séjour (Art. 224 du Code administratif ouzbek) :**\n\n` +
          `• **Montants légaux des amendes :**\n` +
          `  — Retard jusqu'à 30 jours : amende de **5 unités de base (BRV)** (~1 875 000 UZS / env. 150 USD) ;\n` +
          `  — Retard supérieur à 30 jours : amende de **10 à 20 BRV** (~3 750 000 à 7 500 000 UZS) ou expulsion administrative avec interdiction de territoire de 1 à 3 ans.\n\n` +
          `• **Que faire si vous êtes en retard :**\n` +
          `  1. **Ne tentez pas de quitter le pays par l'aéroport avec un séjour expiré sans régularisation préalable** — les gardes-frontières vous bloqueront et vous manquerez votre vol.\n` +
          `  2. Présentez-vous sans tarder au bureau de migration local (OMiOG) de votre district avec la personne qui vous héberge.\n` +
          `  3. Réglez l'amende au guichet bancaire officiel pour obtenir l'autorisation de sortie.\n` +
          `  4. En cas d'urgence ou de difficulté, contactez la **Police Touristique (24h/24) : 1173**.`;
      }
      if (lang === 'en') {
        return `⚖️ **Penalties & Fines for Overstaying or Missed Registration (Article 224 Code of Administrative Responsibility):**\n\n` +
          `• **Official Fine Amounts:**\n` +
          `  — **Overstay up to 30 days:** Fine of **5 Base Calculated Units (BCU)** (approx. 1,875,000 UZS / ~$150 USD);\n` +
          `  — **Overstay over 30 days:** Fine of **10 to 20 BCU** (approx. 3,750,000 to 7,500,000 UZS) or administrative deportation with a 1-to-3-year entry ban.\n\n` +
          `• **What to do immediately if your registration is overdue:**\n` +
          `  1. **DO NOT attempt to board a flight at the airport** with an expired stay without prior settlement — border control will halt you and you will miss your plane.\n` +
          `  2. Go directly to the local district Migration Department (OMiOG) with your host/landlord.\n` +
          `  3. Pay the official administrative fine receipt at a bank counter and obtain departure clearance.\n` +
          `  4. Contact the **Tourist Police 24/7 Helpline at 1173** for urgent bilingual guidance.`;
      }
      return `⚖️ **Штрафы и ответственность за просрочку регистрации (Статья 224 КоАП РУз):**\n\n` +
        `• **Размеры штрафов за нарушение правил пребывания:**\n` +
        `  — **Просрочка до 30 суток:** штраф в размере **5 БРВ** (~1 875 000 сум / ~$150 USD);\n` +
        `  — **Просрочка свыше 30 суток:** штраф от **10 до 20 БРВ** (~3 750 000 – 7 500 000 сум) либо административное выдворение (депортация) с запретом на въезд в Узбекистан на срок от 1 до 3 лет.\n\n` +
        `• **Конкретный план действий при просрочке:**\n` +
        `  1. **Ни в коем случае не пытайтесь выехать через аэропорт или КПП с просрочкой** — пограничная служба не пропустит вас через границу и снимет с рейса до оплаты штрафа.\n` +
        `  2. Обратитесь в районный отдел миграции и оформления гражданства (ОМиОГ МВД РУз) по месту фактического нахождения вместе с собственником жилья.\n` +
        `  3. Оплатите административный штраф по официальной квитанции в кассе любого банка и получите выездной документ.\n` +
        `  4. Круглосуточная помощь Туристической полиции: **1173** (звонок бесплатный).`;
    }
  },

  // 3. 3-DAY RULE & DEADLINE CALCULATION
  {
    id: 'three_days_calculation',
    priority: 90,
    match: (q) =>
      q.includes('3 дня') || q.includes('3-х') || q.includes('три дня') ||
      q.includes('3-дневн') || q.includes('отсчет') || q.includes('выходн') ||
      q.includes('воскресень') || q.includes('суббот') || q.includes('праздник') ||
      q.includes('с какого дня') || q.includes('когда начинает') ||
      q.includes('исчислени') || q.includes('срок регистрации') ||
      q.includes('3 days') || q.includes('3 business days') || q.includes('3 jours') ||
      q.includes('delai') || q.includes('calculer'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `⏳ **Calcul précis du délai de 3 jours ouvrables (Décret n° 433 de la République d'Ouzbékistan) :**\n\n` +
          `• **Quand commence le décompte :** Le délai commence le lendemain de votre entrée à **00h01** (le jour de l'apposition du tampon frontière ne compte pas).\n` +
          `• **Jours exclus :** Les **dimanches** et les **jours fériés officiels d'Ouzbékistan** ne sont PAS comptabilisés dans ces 3 jours ouvrables.\n` +
          `• **Exemple concret :**\n` +
          `  — Si vous entrez un **vendredi** : le samedi et le dimanche ne comptent pas comme jours ouvrables administratifs. Jour 1 = lundi, Jour 2 = mardi, Jour 3 = mercredi. Vous avez jusqu'à mercredi 23h59 pour être enregistré.\n` +
          `• **Séjour court :** Si la totalité de votre séjour en Ouzbékistan dure **moins de 3 jours ouvrables**, l'enregistrement n'est pas obligatoire.`;
      }
      if (lang === 'en') {
        return `⏳ **Exact Rules for the 3-Business-Day Registration Countdown (Resolution No. 433):**\n\n` +
          `• **When countdown begins:** The clock starts at **00:01 on the day AFTER your arrival** (the arrival stamp day is day 0).\n` +
          `• **Excluded Days:** **Sundays** and **official Uzbekistan state holidays** are strictly EXCLUDED from the 3 business days.\n` +
          `• **Clear Example:**\n` +
          `  — If you cross the border on **Friday**: Saturday/Sunday do not count. Day 1 = Monday, Day 2 = Tuesday, Day 3 = Wednesday. Your registration must be submitted before Wednesday 23:59.\n` +
          `• **Short Stays:** If your entire visit to Uzbekistan is **under 3 business days**, registration is legally NOT required at all.`;
      }
      return `⏳ **Точный порядок исчисления 3 рабочих дней (Постановление КМ РУз № 433):**\n\n` +
        `• **С какого момента начинается отсчет:** Отсчет 3-дневного срока начинается в **00:01 суток, следующих за днем въезда** (сам день пересечения границы со штампом в паспорте не засчитывается).\n` +
        `• **Какие дни исключаются:** **Воскресенья** и **официально установленные праздничные нерабочие дни Республики Узбекистан** в 3-дневный срок НЕ включаются.\n` +
        `• **Наглядный пример:**\n` +
        `  — Вы въехали в пятницу: суббота и воскресенье — выходные. Первый рабочий день — понедельник, второй — вторник, третий — среда. Зарегистрироваться необходимо до 23:59 среды.\n` +
        `• **Короткий визит:** Если весь ваш визит в Узбекистан длится **менее 3 рабочих дней**, оформлять регистрацию **не требуется вовсе**.`;
    }
  },

  // 4. HOTELS & HOSTELS
  {
    id: 'hotels_hostels',
    priority: 88,
    match: (q) =>
      q.includes('отел') || q.includes('гостиниц') || q.includes('хостел') ||
      q.includes('санатор') || q.includes('гостев') || q.includes('hotel') ||
      q.includes('hostel') || q.includes('auberge'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🏨 **Enregistrement dans les hôtels, auberges et pensions en Ouzbékistan :**\n\n` +
          `• **100% Automatique et GRATUIT :** Tout hôtel ou auberge titulaire d'une licence a l'obligation légale de vous enregistrer **gratuitement** dans les 24 heures suivant votre arrivée via le système gouvernemental *e-mehmon*.\n` +
          `• **Aucun paiement RegistApp requis :** Si vous logez à l'hôtel, vous n'avez pas besoin de payer nos services ni de faire de démarche en ligne.\n` +
          `• **Conseil pratique :** Demandez simplement à la réception votre **fiche d'enregistrement imprimée avec QR code** (ou le fichier PDF) et conservez-la jusqu'à votre départ.`;
      }
      if (lang === 'en') {
        return `🏨 **Registration in Hotels, Hostels & Guesthouses in Uzbekistan:**\n\n` +
          `• **100% Automatic and FREE:** Any licensed hotel, hostel, or guesthouse is legally obligated to register you **completely free of charge** upon check-in through the state *e-mehmon* portal.\n` +
          `• **No RegistApp payment needed:** When staying in commercial accommodations, you do NOT need our paid service.\n` +
          `• **Practical Step:** Just ask the front desk reception for your **printed registration slip with QR code** (or digital PDF) and keep it on your phone for border inspection.`;
      }
      return `🏨 **Регистрация в отелях, гостиницах и хостелах в Узбекистане:**\n\n` +
        `• **Автоматически и БЕСПЛАТНО:** Все официальные отели, гостиницы, хостелы и гостевые дома обязаны зарегистрировать вас **абсолютно бесплатно** в день заселения через государственную базу данных *e-mehmon*.\n` +
        `• **Вам НЕ нужно платить сервису RegistApp:** При проживании в гостиницах никакие сторонние платные услуги не требуются.\n` +
        `• **Что нужно сделать:** При выезде или заселении попросите у администратора гостиницы **распечатанный талон с QR-кодом** (или сохраните PDF-файл на телефон). Это ваше официальное подтверждение регистрации для пограничной службы.`;
    }
  },

  // 5. APARTMENTS, RENTALS, FRIENDS & RELATIVES
  {
    id: 'apartments_friends',
    priority: 87,
    match: (q) =>
      q.includes('квартир') || q.includes('родствен') || q.includes('знаком') ||
      q.includes('друг') || q.includes('аренд') || q.includes('airbnb') ||
      q.includes('съемн') || q.includes('жиль') || q.includes('flat') ||
      q.includes('apartment') || q.includes('relative') || q.includes('friend'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🏠 **Logement chez des amis, proches ou appartement de location (Airbnb) :**\n\n` +
          `• **Qui fait l'enregistrement :** L'enregistrement doit être effectué par le **propriétaire du logement (l'hôte ouzbèke)**.\n` +
          `• **Comment le propriétaire procède :**\n` +
          `  1. En ligne sur le portail d'État **emehmon.uz** via son identifiant national OneID / signature électronique ;\n` +
          `  2. Ou en personne au bureau local des migrations (OMiOG) du commissariat avec le titre de propriété du logement et les passeports des voyageurs.\n` +
          `• **Documents que vous devez lui fournir :** Une photo claire de votre passeport et de votre tampon d'entrée en Ouzbékistan.`;
      }
      if (lang === 'en') {
        return `🏠 **Staying in Rented Apartments (Airbnb) or with Friends/Relatives:**\n\n` +
          `• **Who is responsible:** The **property owner (landlord/host)** is legally required to register you.\n` +
          `• **How the owner registers you:**\n` +
          `  1. Online via the state portal **emehmon.uz** using their citizen OneID digital authentication; OR\n` +
          `  2. In-person at the district Migration Department (OMiOG) with property cadastral papers and your passport copy.\n` +
          `• **What you provide to the host:** A crisp photo of your passport bio page and your entry border stamp.`;
      }
      return `🏠 **Проживание на съемной квартире, Airbnb или у друзей и родственников:**\n\n` +
        `• **Кто обязан оформить регистрацию:** Регистрацию обязан оформить **собственник квартиры (принимающая сторона)**.\n` +
        `• **Как собственник жилья это делает:**\n` +
        `  1. **Онлайн:** Через государственный портал **emehmon.uz** с помощью своей электронной цифровой подписи (ЭЦП / OneID);\n` +
        `  2. **Офлайн:** В районном отделе миграции (ОМиОГ МВД РУз) по месту нахождения квартиры, предъявив кадастровые документы на жилье и паспорта гостей.\n` +
        `• **Что требуется от вас:** Предоставить хозяину жилья фото загранпаспорта и четкое фото штампа о въезде в РУз.`;
    }
  },

  // 6. TENTS, CAMPING, WILD TOURISM & REGISTAPP SERVICE
  {
    id: 'tents_camping_registapp',
    priority: 86,
    match: (q) =>
      q.includes('палатк') || q.includes('кемпинг') || q.includes('автодом') ||
      q.includes('горы') || q.includes('чимган') || q.includes('заамин') ||
      q.includes('дикий туризм') || q.includes('свободный турист') ||
      q.includes('free tourist') || q.includes('registapp') ||
      q.includes('tent') || q.includes('camp') || q.includes('bivouac'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🏕️ **Voyage en tente, camping, van ou autonomie (« Touriste indépendant ») :**\n\n` +
          `• **Statut officiel :** Pour les randonneurs et campeurs en pleine nature, la loi prévoit le statut de **« Touriste indépendant »** pour une durée maximale de 30 jours.\n` +
          `• **Rôle de RegistApp :** RegistApp est spécialisé dans l'enregistrement de ce profil. Vous n'avez pas besoin de réserver d'hôtel.\n` +
          `• **Tarif officiel :** **70 000 UZS / 500 RUB / 5 USD / 5 EUR par jour de séjour**.\n` +
          `• **Résultat officiel :** Vous recevez un certificat officiel d'enregistrement avec QR code de l'État (*e-mehmon*), 100% valable pour le contrôle aux frontières.`;
      }
      if (lang === 'en') {
        return `🏕️ **Camping, Tents, RVs & Independent Travel ("Free Tourist" Status):**\n\n` +
          `• **Official Status:** For backpackers, tent campers, and off-grid mountain travelers, Uzbekistan law provides the **"Free Tourist" (Independent Traveler)** status for up to 30 days.\n` +
          `• **RegistApp Core Service:** RegistApp registers this exact category without requiring costly hotel reservations.\n` +
          `• **Official Rate:** **70,000 UZS / 500 RUB / $5 USD / €5 EUR per day of stay**.\n` +
          `• **What you receive:** An official government-verified registration certificate with an authentic *e-mehmon* QR code recognized at all airport border exits.`;
      }
      return `🏕️ **Дикий туризм, палатки, кемпинг, горы и сервис RegistApp:**\n\n` +
        `• **Статус «Свободный турист»:** Для туристов, путешествующих с палатками в горах (Чимган, Заамин), в автодомах или на велосипедах, законодательством РУз утвержден статус «Свободный турист» на срок до 30 дней.\n` +
        `• **Услуга RegistApp:** Наш сервис официально регистрирует самостоятельных туристов без необходимости бронирования гостиниц на каждый день маршрута.\n` +
        `• **Тариф сервиса:** **70 000 UZS / 500 RUB / 5 USD / 5 EUR за каждые сутки пребывания**. Дети до 16 лет регистрируются бесплатно.\n` +
        `• **Что вы получаете:** Официальный электронный регистрационный лист с государственным QR-кодом системы *e-mehmon*, полностью действительный для пограничного контроля.`;
    }
  },

  // 7. PRICING & PAYMENT IN REGISTAPP
  {
    id: 'pricing_payment',
    priority: 85,
    match: (q) =>
      !q.includes('метро') && !q.includes('поезд') && !q.includes('такси') &&
      !q.includes('афросиаб') && !q.includes('плов') && !q.includes('еда') &&
      (q.includes('тариф') || q.includes('стоимост услуг') || q.includes('цена услуг') ||
       q.includes('стоимость регистрации') || q.includes('цена регистрации') ||
       q.includes('сколько стоит регистрац') || q.includes('как оплатить') ||
       q.includes('способы оплаты') || q.includes('реквизит') ||
       q.includes('перевод') ||
       ((q.includes('стоимост') || q.includes('цена') || q.includes('сколько стоит') || q.includes('оплат')) &&
        (q.includes('сервис') || q.includes('registapp') || q.includes('сутки') || q.includes('день') || q.includes('регистрац') || q.includes('услуг')))),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `💳 **Tarifs officiels et modalités de paiement RegistApp :**\n\n` +
          `• **Tarif par jour :**\n` +
          `  — **70 000 UZS** (soums ouzbeks) / **500 RUB** / **5 USD** / **5 EUR** par tranche de 24h.\n` +
          `  — Les enfants mineurs de moins de 16 ans sont enregistrés gratuitement.\n` +
          `• **Comment régler :**\n` +
          `  1. Dans votre Espace Client, sélectionnez votre devise et le nombre de jours ;\n` +
          `  2. Effectuez le virement vers les coordonnées bancaires indiquées ;\n` +
          `  3. Indiquez le numéro de transaction pour validation immédiate par notre opérateur.`;
      }
      if (lang === 'en') {
        return `💳 **RegistApp Pricing & Payment Procedure:**\n\n` +
          `• **Daily Flat Rate:**\n` +
          `  — **70,000 UZS** / **500 RUB** / **$5 USD** / **€5 EUR** per registered 24-hour day.\n` +
          `  — Children under 16 years of age are registered free of charge.\n` +
          `• **How to pay:**\n` +
          `  1. In your User Dashboard, pick your currency and enter your stay dates;\n` +
          `  2. Transfer the fee to the provided card/bank details;\n` +
          `  3. Enter your transaction/transfer reference ID for instant operator verification.`;
      }
      return `💳 **Тарифы и способы оплаты в RegistApp:**\n\n` +
        `• **Стоимость регистрации за каждые сутки:**\n` +
        `  — **70 000 UZS** (узбекских сумов);\n` +
        `  — **500 RUB** (российских рублей);\n` +
        `  — **5 USD** (долларов США);\n` +
        `  — **5 EUR** (евро).\n` +
        `  — Дети в возрасте до 16 лет регистрируются бесплатно.\n` +
        `• **Как оплатить:**\n` +
        `  1. В Личном кабинете укажите даты пребывания и выберите удобную валюту;\n` +
        `  2. Совершите перевод на реквизиты соответствующей карты;\n` +
        `  3. Введите номер или ID транзакции для моментальной сверки сертифицированным оператором.`;
    }
  },

  // 8. STAY LONGER THAN 30 DAYS
  {
    id: 'stay_over_30_days',
    priority: 84,
    match: (q) =>
      q.includes('30 дн') || q.includes('дольше 30') || q.includes('свыше 30') ||
      q.includes('более 30') || q.includes('продлен') || q.includes('60 дн') ||
      q.includes('90 дн') || q.includes('over 30') || q.includes('longer than 30') ||
      q.includes('plus de 30'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `📅 **Séjours de plus de 30 jours en Ouzbékistan :**\n\n` +
          `• **Limite des services en ligne :** L'enregistrement touristique en ligne (hôtels ou RegistApp) est limité à **30 jours maximum**.\n` +
          `• **Comment prolonger au-delà de 30 jours :**\n` +
          `  — Vous devez vous rendre **en personne** au bureau territorial des migrations du ministère de l'Intérieur (**OMiOG**) avant l'expiration de vos 30 premiers jours ;\n` +
          `  — Vous devez être accompagné de votre hôte ou présenter une justification officielle (motif médical, travail, études).\n` +
          `• **Attention :** Ne laissez pas vos 30 jours expirer sans démarche préalable.`;
      }
      if (lang === 'en') {
        return `📅 **Staying in Uzbekistan for More Than 30 Days:**\n\n` +
          `• **Online Limit:** Tourist registrations issued online (via hotels or RegistApp) are valid for a maximum of **30 days**.\n` +
          `• **How to extend beyond 30 days:**\n` +
          `  — Extensions past 30 days must be handled **in person** at the territorial district Migration Department (**OMiOG**) before your 30th day runs out;\n` +
          `  — You must appear alongside your receiving host or furnish verified documentation (work, study, medical grounds).\n` +
          `• **Important:** Do not let your 30-day initial period elapse without visiting OMiOG.`;
      }
      return `📅 **Пребывание в Узбекистане дольше 30 дней и продление:**\n\n` +
        `• **Лимит онлайн-регистрации:** Туристическая регистрация онлайн (как через отели, так и через RegistApp) оформляется на срок **не более 30 дней**.\n` +
        `• **Как продлить срок свыше 30 дней:**\n` +
        `  — Продление оформляется **исключительно лично** в районном отделе миграции и оформления гражданства (**ОМиОГ МВД РУз**);\n` +
        `  — Обратиться необходимо **до истечения первых 30 дней** в сопровождении принимающей стороны или с документальным основанием (лечение, работа, учеба).\n` +
        `• Ни в коем случае не допускайте просрочки 30-дневного лимита.`;
    }
  },

  // 9. DOCUMENTS REQUIRED FOR REGISTRATION
  {
    id: 'documents_required',
    priority: 83,
    match: (q) =>
      q.includes('какие документ') || q.includes('что нужно для регистр') ||
      q.includes('паспорт') || q.includes('скан') || q.includes('штамп') ||
      q.includes('фото паспорта') || q.includes('documents') ||
      q.includes('passport') || q.includes('justificatif'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `📄 **Documents nécessaires pour l'enregistrement touristique :**\n\n` +
          `• **Pour les pays exemptés de visa (France, Belgique, Suisse, UE, etc.) :**\n` +
          `  1. Photo nette de la double page du passeport (photo et identité) ;\n` +
          `  2. Photo nette de la page portant le **tampon frontière d'entrée en Ouzbékistan** avec la date bien lisible.\n` +
          `• **Pour les pays soumis à visa :**\n` +
          `  — Ajoutez simplement la copie de votre e-visa ou visa apposé.\n` +
          `• Aucun autre document n'est exigé pour notre service.`;
      }
      if (lang === 'en') {
        return `📄 **Documents Required for Tourist Registration:**\n\n` +
          `• **For Visa-Free Travelers (USA, EU, UK, Canada, UAE, etc.):**\n` +
          `  1. Crisp photo/scan of your passport bio-data page;\n` +
          `  2. Crisp photo of your **Uzbekistan border entry stamp** with a clearly legible entry date.\n` +
          `• **For Visa-Required Travelers:**\n` +
          `  — Provide passport bio page, entry stamp, and a copy of your valid e-visa.\n` +
          `• No additional complicated forms or paperwork are needed.`;
      }
      return `📄 **Необходимые документы для туристической регистрации:**\n\n` +
        `• **Для граждан безвизовых стран (страны СНГ, ЕС, ОАЭ, Турция и др.):**\n` +
        `  1. Четкая фотография разворота загранпаспорта с фото и личными данными;\n` +
        `  2. Четкая фотография страницы со **штампом пограничного контроля о въезде в РУз** (дата въезда должна быть хорошо видна).\n` +
        `• **Для граждан стран с визовым режимом:**\n` +
        `  — Паспорт + штамп о въезде + скан действующей въездной визы (e-visa).\n` +
        `• Никаких справок, договоров или лишних бумаг не требуется.`;
    }
  },

  // 10. QR CODE VALIDITY & BORDER CHECKS
  {
    id: 'qr_code_validity',
    priority: 82,
    match: (q) =>
      q.includes('qr') || q.includes('кьюар') || q.includes('кр код') ||
      q.includes('распечатат') || q.includes('бумаг') || q.includes('пограничник') ||
      q.includes('на границе') || q.includes('аэропорт') || q.includes('терминал') ||
      q.includes('qrcode') || q.includes('border check') || q.includes('print'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `📱 **Validité du QR Code et contrôle aux frontières à la sortie :**\n\n` +
          `• **Valeur légale :** Le feuillet d'enregistrement électronique avec QR code généré via la base nationale *e-mehmon* a une **pleine valeur juridique officielle**.\n` +
          `• **Faut-il imprimer sur papier ?** Non, ce n'est pas obligatoire. Les agents de la police aux frontières scannent le QR code directement sur l'écran de votre smartphone.\n` +
          `• **Conseil de sécurité :** Téléchargez et conservez le fichier PDF dans la mémoire de votre téléphone pour y avoir accès même sans réseau internet.`;
      }
      if (lang === 'en') {
        return `📱 **QR Code Legal Status & Airport Border Inspection:**\n\n` +
          `• **Official State Recognition:** The electronic registration certificate containing an *e-mehmon* QR code is **100% legally recognized by state border authorities** across Uzbekistan.\n` +
          `• **Is paper printing mandatory?** No. Border control officers scan the QR code directly from your smartphone screen with official hand terminals.\n` +
          `• **Top Tip:** Save the PDF file to your phone's offline storage (Files / Downloads) so it opens instantly at the gate even without mobile Wi-Fi.`;
      }
      return `📱 **Юридическая сила QR-кода и проверка на границе при выезде:**\n\n` +
        `• **Официальный статус:** Электронный листок регистрации с QR-кодом государственной системы *e-mehmon* обладает **100% юридической силой** на всей территории Узбекистана.\n` +
        `• **Нужно ли распечатывать на бумаге:** **Нет, распечатывать необязательно**. Пограничники в аэропортах и на КПП считывают QR-код служебными сканерами прямо с экрана вашего смартфона.\n` +
        `• **Полезный совет:** Сохраните PDF-файл в память телефона (в Загрузки или Заметки), чтобы показать его на контроле даже при отсутствии мобильного интернета.`;
    }
  },

  // 11. AFROSIYOB HIGH-SPEED TRAIN & RAILWAYS
  {
    id: 'afrosiyob_train',
    priority: 81,
    match: (q) =>
      q.includes('афросиаб') || q.includes('afrosiyob') || q.includes('поезд') ||
      q.includes('билет на поезд') || q.includes('railway') || q.includes('жд') ||
      q.includes('вокзал') || q.includes('шарк') || q.includes('насаф'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🚄 **TGV « Afrosiyob » et billets de train en Ouzbékistan :**\n\n` +
          `• **Trajets et temps :**\n` +
          `  — Tachkent → Samarcande : 2 h 15 min ;\n` +
          `  — Samarcande → Boukhara : 1 h 30 min ;\n` +
          `  — Boukhara → Khiva : liaison en train de nuit ou express.\n` +
          `• **Où et quand réserver :**\n` +
          `  — Sur le site officiel **railway.uz** ou l'application mobile « Uzrailways ».\n` +
          `  — **Règle d'or :** L'ouverture des ventes a lieu exactement **45 jours à l'avance à 08h00**. En haute saison (avril-mai et septembre-octobre), les places partent en quelques heures.\n` +
          `• **Si Afrosiyob est complet :** Prenez les trains rapides confortables **« Sharq »** ou **« Nasaf »**.`;
      }
      if (lang === 'en') {
        return `🚄 **High-Speed Bullet Train "Afrosiyob" & Uzbekistan Railways:**\n\n` +
          `• **Key Routes & Travel Times:**\n` +
          `  — Tashkent → Samarkand: 2 hours 15 minutes;\n` +
          `  — Samarkand → Bukhara: 1 hour 30 minutes;\n` +
          `  — Overnight sleeper options operate to Khiva/Urgench.\n` +
          `• **Where & When to Buy Tickets:**\n` +
          `  — Exclusively via the official portal **railway.uz** or the "Uzrailways" mobile app.\n` +
          `  — **Critical Tip:** Sales open exactly **45 days before departure at 08:00 AM** Tashkent time. In peak tourist seasons (April-May and Sept-Oct), tickets sell out within hours. Set a reminder!\n` +
          `• **Alternatives if sold out:** Book express trains **"Sharq"** or **"Nasaf"**, which are also comfortable and reliable.`;
      }
      return `🚄 **Скоростной поезд «Афросиаб» и покупка ж/д билетов в Узбекистане:**\n\n` +
        `• **Маршруты и время в пути:**\n` +
        `  — Ташкент → Самарканд: 2 часа 15 минут;\n` +
        `  — Самарканд → Бухара: 1 час 30 минут;\n` +
        `  — До Хивы ходит комфортный ночной поезд (купе/СВ).\n` +
        `• **Где и когда покупать билеты:**\n` +
        `  — Строго на официальном сайте **railway.uz** или в приложении «Uzrailways».\n` +
        `  — **Секрет покупки:** Продажа билетов открывается ровно за **45 суток** в 08:00 утра по ташкентскому времени. В туристический сезон (весна и осень) билеты раскупают в первые часы! Ставьте напоминание на день открытия.\n` +
        `• **Если билетов на Афросиаб нет:** Рассмотрите скорые поезда **«Шарк»** или **«Насаф»** — они идут чуть дольше, но очень удобные.`;
    }
  },

  // 12. TASHKENT METRO
  {
    id: 'tashkent_metro',
    priority: 80,
    match: (q) =>
      q.includes('метро') || q.includes('ташкентское метро') || q.includes('проезд в метро') ||
      q.includes('станци') || q.includes('metro') || q.includes('subway'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🚇 **Métro de Tachkent : tarifs, paiement et stations remarquables :**\n\n` +
          `• **Tarif du trajet :** Seulement **2 000 UZS** (env. 0,16 USD) par trajet avec correspondances gratuites.\n` +
          `• **Comment payer :** Directement au tourniquet avec toute **carte bancaire sans contact** (Visa, Mastercard, Uzcard, Humo) ou en achetant un ticket QR en espèces au guichet.\n` +
          `• **Photographie :** Entièrement autorisée pour les touristes.\n` +
          `• **Plus belles stations à voir :** « Kosmonavtlar » (ambiance spatiale), « Alisher Navoi » (voûtes et coupoles orientales), « Paxtakor », « Mustaqillik Maydoni ».`;
      }
      if (lang === 'en') {
        return `🚇 **Tashkent Metro: Fares, Payment & Iconic Stations:**\n\n` +
          `• **Fare:** Just **2,000 UZS** (approx. $0.16 USD) per single ride with unlimited line transfers.\n` +
          `• **Payment Method:** Tap any **contactless bank card** (Visa, Mastercard) directly at the turnstile gate, or buy a QR token paper receipt at the cashier.\n` +
          `• **Photography:** 100% permitted and welcomed.\n` +
          `• **Must-See Architectural Stations:** **Kosmonavtlar** (space-cosmonaut ceramic murals), **Alisher Navoi** (ornate Silk Road domes), **Paxtakor**, and **Mustaqillik Maydoni**.`;
      }
      return `🚇 **Ташкентское метро: стоимость, оплата и красивейшие станции:**\n\n` +
        `• **Стоимость проезда:** Всего **2 000 сумов** (~$0.16) за поездку с любыми пересадками.\n` +
        `• **Как оплачивать:** Любой бесконтактной банковской картой (**Visa**, **Mastercard**, **Humo**, **Uzcard**) прямо на турникете либо купив QR-билет за наличные в кассе станции.\n` +
        `• **Фотосъемка:** Официально разрешена — фотографировать станции можно свободно.\n` +
        `• **Самые красивые станции для посещения:** «Космонавтов» (космическая тематика в сине-голубых тонах), «Алишера Навои» (купола и восточные орнаменты), «Пахтакор», «Мустакиллик майдони» и «Бодомзар».`;
    }
  },

  // 13. TAXI & YANDEX GO
  {
    id: 'taxi_yandex',
    priority: 79,
    match: (q) =>
      q.includes('такси') || q.includes('яндекс') || q.includes('yandex') ||
      q.includes('бомбил') || q.includes('частник') || q.includes('taxi'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🚕 **Taxis et déplacements urbains en Ouzbékistan :**\n\n` +
          `• **Application recommandée :** Utilisez l'application mobile **Yandex Go** (fonctionne à Tachkent, Samarcande, Boukhara, Fergana).\n` +
          `• **Tarifs moyens :** Très abordables — une course moyenne en ville coûte entre **15 000 et 35 000 UZS** (environ 1,20 à 2,80 USD).\n` +
          `• **Mise en garde pour l'aéroport :** Évitez absolument les chauffeurs non officiels qui sollicitent les touristes à la sortie avec des prix gonflés de 5 à 10 fois. Utilisez le Wi-Fi gratuit pour commander sur Yandex Go ou prenez le guichet officiel de taxi de l'aéroport.`;
      }
      if (lang === 'en') {
        return `🚕 **Taxis & Getting Around Cities in Uzbekistan:**\n\n` +
          `• **Top App:** Download **Yandex Go** (works seamlessly in Tashkent, Samarkand, Bukhara, Fergana).\n` +
          `• **Typical Fares:** Extremely cheap — typical city rides cost between **15,000 and 35,000 UZS** ($1.20 to $2.80 USD).\n` +
          `• **Airport Warning:** Do NOT accept rides from aggressive curbside solicitors outside baggage claim who overcharge tenfold. Connect to airport Wi-Fi to order a Yandex Go or use the official airport taxi kiosk inside the terminal.`;
      }
      return `🚕 **Такси в Узбекистане: приложение Yandex Go и цены:**\n\n` +
        `• **Главное приложение:** Установите **Yandex Go** — оно стабильно работает в Ташкенте, Самарканде, Бухаре и Фергане.\n` +
        `• **Реальные цены:** Поездка по городу стоит всего **15 000 — 35 000 сумов** ($1.2 — $2.8 USD).\n` +
        `• **Предостережение в аэропортах:** На выходе из терминалов частные водители («бомбилы») называют цены в 5-10 раз выше реальных. Подключитесь к бесплатному Wi-Fi аэропорта и вызовите Yandex Go к выходу либо обратитесь к официальной стойке Taxi Airport.`;
    }
  },

  // 14. MONEY, CURRENCY EXCHANGE, ATMS & BANK CARDS
  {
    id: 'money_exchange_cards',
    priority: 78,
    match: (q) =>
      q.includes('валют') || q.includes('обмен') || q.includes('доллар') ||
      q.includes('евро') || q.includes('рубл') || q.includes('карты') ||
      q.includes('банкомат') || q.includes('мир') || q.includes('visa') ||
      q.includes('mastercard') || q.includes('atm') || q.includes('cash') ||
      q.includes('money') || q.includes('change'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `💶 **Monnaie, change, cartes bancaires et distributeurs en Ouzbékistan :**\n\n` +
          `• **Monnaie nationale :** Le soum ouzbek (**UZS**).\n` +
          `• **Espèces conseillées :** Emportez des **euros (€)** ou des **dollars ($)** en coupures récentes, propres et sans aucune déchirure ni tampon.\n` +
          `• **Où changer :** Dans les banques, les hôtels et les distributeurs automatiques verts avec fonction de change 24h/24.\n` +
          `• **Cartes bancaires :** Visa et Mastercard fonctionnent dans les hôtels, supermarchés, restaurants et distributeurs (qui délivrent des UZS ou des USD). Les cartes russes Mir ne fonctionnent pas actuellement.\n` +
          `• **Bazaars et marchés :** Ayez toujours un peu d'argent liquide en soums pour les marchés, la street-food et les taxis.`;
      }
      if (lang === 'en') {
        return `💵 **Currency, Money Exchange, ATMs & Bank Cards in Uzbekistan:**\n\n` +
          `• **National Currency:** Uzbek Som (**UZS**).\n` +
          `• **Recommended Cash:** Bring crisp, uncreased **USD ($)** or **EUR (€)** bills with no stamps, tears, or markings. Banks will reject damaged notes.\n` +
          `• **Exchange Points:** Bank exchange desks, upscale hotels, and 24/7 green ATMs equipped with currency exchange.\n` +
          `• **Bank Cards:** Visa and Mastercard are accepted in larger hotels, malls, restaurants, and ATMs (dispensing UZS or USD). Russian Mir cards do not work.\n` +
          `• **Cash is King at Bazaars:** Always keep cash UZS notes for markets (Chorsu, Siab), teahouses, and street food.`;
      }
      return `💵 **Валюта, обмен денег, банковские карты и банкоматы в Узбекистане:**\n\n` +
        `• **Национальная валюта:** Узбекский сум (**UZS**).\n` +
        `• **Какую валюту везти с собой:** Наличные **доллары США ($)** или **евро (€)**. Банкноты должны быть новыми, чистыми, без штампов, надрывов и пометок (ветхие купюры банки не принимают).\n` +
        `• **Где менять:** В отделениях банков, отелях и круглосуточных зеленых банкоматах с функцией обмена наличных.\n` +
        `• **Банковские карты:** Карты **Visa** и **Mastercard** принимают в отелях, супермаркетах, ресторанах и банкоматах (банкоматы выдают сумы и доллары). Карты «Мир» в настоящее время не обслуживаются.\n` +
        `• **Для базаров:** На рынках (Чорсу, Сиаб), в чайханах и для покупки лепешек обязательно иметь с собой наличные сумы.`;
    }
  },

  // 15. SIM CARDS, MOBILE INTERNET & ESIM
  {
    id: 'sim_internet',
    priority: 77,
    match: (q) =>
      q.includes('сим') || q.includes('связь') || q.includes('интернет') ||
      q.includes('оператор') || q.includes('esim') || q.includes('ucell') ||
      q.includes('beeline') || q.includes('mobiuz') || q.includes('wifi') ||
      q.includes('вайфай') || q.includes('sim') || q.includes('data'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `📱 **Cartes SIM touristiques, eSIM et Internet mobile en Ouzbékistan :**\n\n` +
          `• **Où acheter :** Directement dans le hall des arrivées des aéroports internationaux (Tachkent, Samarcande) 24h/24 sur présentation de votre passeport.\n` +
          `• **Principaux opérateurs :** **Ucell**, **Beeline**, **Mobiuz**.\n` +
          `• **Prix & Forfaits :** Très économiques — un forfait touristique avec 20 à 50 Go d'Internet 4G/5G valable 30 jours coûte environ **40 000 à 90 000 UZS** (3 à 7 USD).\n` +
          `• **eSIM :** Supportée par les fournisseurs internationaux (Airalo, Maya) ainsi que par les opérateurs locaux.`;
      }
      if (lang === 'en') {
        return `📱 **Tourist SIM Cards, eSIM & Mobile Internet in Uzbekistan:**\n\n` +
          `• **Where to buy:** Right inside the arrival halls of Tashkent and Samarkand International Airports 24/7 with your passport.\n` +
          `• **Top Carriers:** **Ucell**, **Beeline**, and **Mobiuz**.\n` +
          `• **Fares & Data:** Very affordable — tourist packages with 20–50 GB of 4G/5G data valid for 30 days cost between **40,000 and 90,000 UZS** ($3 to $7 USD).\n` +
          `• **eSIM:** Supported via apps like Airalo or through local carriers in city centers.`;
      }
      return `📱 **Туристические SIM-карты, интернет и eSIM в Узбекистане:**\n\n` +
        `• **Где купить:** Прямо в залах прилета международных аэропортов (Ташкент, Самарканд) круглосуточно по загранпаспорту.\n` +
        `• **Основные мобильные операторы:** **Ucell**, **Beeline**, **Mobiuz**.\n` +
        `• **Цены и тарифы:** Очень доступные — туристический пакет на 20–50 ГБ скоростного интернета 4G/5G на 30 дней стоит всего **40 000 — 90 000 сумов** ($3 — $7 USD).\n` +
        `• **eSIM:** Работает через международные сервисы (Airalo и др.), а также у местных операторов в фирменных офисах.`;
    }
  },

  // 16. PLOV, FOOD, RESTAURANTS & WATER
  {
    id: 'plov_food',
    priority: 76,
    match: (q) =>
      q.includes('плов') || q.includes('поесть') || q.includes('еда') ||
      q.includes('кухн') || q.includes('ресторан') || q.includes('кафе') ||
      q.includes('шашлык') || q.includes('сомс') || q.includes('самс') ||
      q.includes('лагман') || q.includes('чайхан') || q.includes('вода') ||
      q.includes('food') || q.includes('plov') || q.includes('eat') ||
      q.includes('restaurant'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🍲 **Le Plov ouzbek et les conseils gastronomiques incontournables :**\n\n` +
          `• **L'heure d'or du Plov :** Le véritable plov ouzbek se mange frais le midi entre **11h30 et 14h00** dans les « Centres de Plov » (Osh Markazi). À 14h30, le chaudron est souvent vide !\n` +
          `• **Adresses célèbres :**\n` +
          `  — À Tachkent : le célèbre centre « Besh Qozon » au pied de la Tour de télévision ;\n` +
          `  — À Samarcande : le plov feuilleté près du marché de Siab.\n` +
          `• **Autres délices :** Tandir somsa (pâtisseries à la viande), chachliks parfumés, soupe lagman et pain traditionnel chaud (non).\n` +
          `• **Eau potable :** Ne buvez pas l'eau du robinet, consommez toujours de l'eau minérale en bouteille capsulée.`;
      }
      if (lang === 'en') {
        return `🍲 **Uzbek Plov (Osh), Best Dining Spots & Food Tips:**\n\n` +
          `• **The Golden Rule of Plov:** Authentic plov is cooked fresh for lunchtime and eaten strictly between **11:30 AM and 2:00 PM** at dedicated **Plov Centers (Osh Markazi)**. By 2:30 PM, the cauldrons are empty!\n` +
          `• **Where to go:**\n` +
          `  — Tashkent: **Besh Qozon** (Central Asian Plov Center) next to the TV Tower;\n` +
          `  — Samarkand: Traditional plov centers near Siab Bazaar (layered Samarkand plov).\n` +
          `• **Must-try Specialities:** Tandir somsa (clay-oven meat pies), Gijduvan shashlik, pulled-noodle lagman, and fresh sesame flatbread (non).\n` +
          `• **Drinking Water:** Stick to bottled mineral water; avoid drinking tap water.`;
      }
      return `🍲 **Узбекский плов, рестораны и гастрономические советы:**\n\n` +
        `• **Золотое правило плова:** Настоящий плов готовят строго к полудню и едят свежим с **11:30 до 14:00** в специализированных **Центрах плова (Osh Markazi)**! К 14:30 казан обычно уже пуст.\n` +
        `• **Лучшие места для плова:**\n` +
        `  — В Ташкенте: знаменитый Центр плова **«Besh Qozon»** возле телебашни;\n` +
        `  — В Самарканде: центры плова возле Сиабского базара и улицы Спартака (самаркандский слоеный плов).\n` +
        `• **Что еще обязательно попробовать:** Тандыр-сомсу с сочным рубленым мясом, гиждуванский шашлык, уйгурский или ковурма-лагман, свежие горячие лепешки (нон).\n` +
        `• **Питьевая вода:** Водопроводную воду пить не рекомендуется — покупайте бутилированную воду в магазинах.`;
    }
  },

  // 17. SIGHTS IN SAMARKAND
  {
    id: 'sights_samarkand',
    priority: 75,
    match: (q) =>
      !q.includes('плов') && !q.includes('еда') && !q.includes('поесть') && !q.includes('ресторан') &&
      (q.includes('самарканд') || q.includes('регистан') || q.includes('гур-эмир') ||
       q.includes('шахи-зинда') || q.includes('samarkand') || q.includes('registan')),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🏛️ **Les merveilles incontournables de Samarcande :**\n\n` +
          `• **Place du Régistan :** L'ensemble le plus célèbre d'Asie centrale avec trois madrasas couvertes de mosaïques (Oulough Beg, Cher-Dor, Tilla-Kari).\n` +
          `• **Gour-Émir :** Le somptueux mausolée royal de Tamerlan avec sa coupole turquoise cannelée.\n` +
          `• **Nécropole de Chah-e-Zindeh :** Une allée féerique de mausolées étincelants aux mosaïques azur et bleu cobalt.\n` +
          `• **Bazar de Siab :** Immense marché oriental pour les fruits secs, noisettes, épices et célèbres pains de Samarcande.\n` +
          `• **Observatoire d'Oulough Beg :** Vestiges de l'astronome royal du XVe siècle.`;
      }
      if (lang === 'en') {
        return `🏛️ **Top Highlights of Samarkand (The Pearl of the Silk Road):**\n\n` +
          `• **Registan Square:** The breathtaking UNESCO icon featuring three massive tiled madrasahs (Ulugbek, Sher-Dor, Tilla-Kari).\n` +
          `• **Gur-e-Amir Mausoleum:** The golden crypt and azure-fluted dome where conqueror Tamerlane rests.\n` +
          `• **Shah-i-Zinda Necropolis:** An ethereal avenue of turquoise and lapis mosaic royal tombs from the 11th–15th centuries.\n` +
          `• **Siab Bazaar:** Bustling market for famous Samarkand heavy flatbreads, dried melons, figs, and spices.\n` +
          `• **Ulugbek Observatory:** The monumental 15th-century astronomical sextant.`;
      }
      return `🏛️ **Главные достопримечательности Самарканда:**\n\n` +
        `• **Площадь Регистан:** Визитная карточка Узбекистана — ансамбль из трех грандиозных медресе (Улугбека, Шердор, Тилля-Кори) с золочеными куполами и лазурной мозаикой.\n` +
        `• **Мавзолей Гур-Эмир:** Величественная усыпальница великого полководца Амира Тимура (Тамерлана).\n` +
        `• **Некрополь Шахи-Зинда:** Волшебная аллея бирюзовых и кобальтовых мавзолеев XI–XV веков — самое фотогеничное место города.\n` +
        `• **Мечеть Биби-Ханым:** Гигантская соборная мечеть эпохи Тимуридов.\n` +
        `• **Сиабский базар:** Знаменитые круглые самаркандские лепешки, орехи, сушеный инжир, дыня и специи.`;
    }
  },

  // 18. SIGHTS IN BUKHARA
  {
    id: 'sights_bukhara',
    priority: 74,
    match: (q) =>
      q.includes('бухар') || q.includes('калян') || q.includes('арк') ||
      q.includes('ляби-хауз') || q.includes('bukhara') || q.includes('boukhara'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🕌 **Les trésors historiques de Boukhara (Boukhara-i-Charif) :**\n\n` +
          `• **Complexe Po-i-Kalyan :** Le majestueux minaret Kalyan de 46 mètres du XIIe siècle, épargné par Gengis Khan.\n` +
          `• **Citadelle de l'Ark :** Ancienne forteresse millénaire des Émirs de Boukhara.\n` +
          `• **Place Liabi-Khaouz :** Bassin historique ombragé de mûriers centenaires avec ses terrasses de thé traditionnelles.\n` +
          `• **Dômes marchands (Taqui) :** Galeries couvertes médiévales où l'on trouve tapis, bijoux et coutellerie artisanale.\n` +
          `• **Medersa Tchor Minor :** Édifice pittoresque à quatre tours coiffées de coupoles turquoise.`;
      }
      if (lang === 'en') {
        return `🕌 **Top Historic Sights of Bukhara:**\n\n` +
          `• **Po-i-Kalyan Complex:** The soaring 46-meter 12th-century Kalyan Minaret that even Genghis Khan spared.\n` +
          `• **The Ark Fortress:** The ancient fortress city where the Emirs of Bukhara lived and ruled.\n` +
          `• **Lyabi-Hauz Square:** A tranquil historic pool framed by centuries-old mulberry trees and open-air teahouses.\n` +
          `• **Trading Domes (Toqi):** Medieval covered crossroads buzzing with hand-beaten copperware and Suzani textiles.\n` +
          `• **Chor Minor Madrasah:** The charming four-towered gatehouse with turquoise cupolas.`;
      }
      return `🕌 **Главные достопримечательности Бухары:**\n\n` +
        `• **Ансамбль Пои-Калян:** 46-метровый минарет Калян 1127 года, уцелевший даже при нашествии Чингисхана, и величественная мечеть Калян.\n` +
        `• **Крепость Арк:** Древнейшая цитадель, резиденция эмиров Бухары с великолепным видом на старый город.\n` +
        `• **Площадь Ляби-Хауз:** Живописный водоем в тени вековых чинар с уютными чайханами под открытым небом.\n` +
        `• **Торговые купола (Токи):** Старинные крытые пассажи XVI века (Токи Заргарон, Токи Саррофон), где чеканят посуду и ткут ковры.\n` +
        `• **Медресе Чор-Минор:** Уникальная постройка с четырьмя бирюзовыми башнями.`;
    }
  },

  // 19. SIGHTS IN KHIVA
  {
    id: 'sights_khiva',
    priority: 73,
    match: (q) =>
      q.includes('хив') || q.includes('ичан-кала') || q.includes('кальта-минор') ||
      q.includes('ургенч') || q.includes('khiva'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🏰 **Khiva et la forteresse d'Itchan Kala :**\n\n` +
          `• **Itchan Kala :** Véritable ville-musée vivante préservée derrière ses puissants remparts en pisé protégés par l'UNESCO.\n` +
          `• **Minaret Kalta Minor :** L'étonnant minaret trapu turquoise entièrement paré de faïences émaillées.\n` +
          `• **Palais Tach Khaouli :** Résidence d'été des Khans ornée de céramiques bleues et de cours ombragées.\n` +
          `• **Mosquée Djouma :** Salle hypostyle exceptionnelle soutenue par 218 colonnes en bois richement sculpté.`;
      }
      if (lang === 'en') {
        return `🏰 **Historic Sights of Khiva (Itchan Kala):**\n\n` +
          `• **Itchan Kala:** An intact, living open-air desert fortress city encircled by massive sun-baked mud walls (UNESCO).\n` +
          `• **Kalta-Minor Minaret:** The iconic stout turquoise minaret clad entirely in intricate glazed majolica.\n` +
          `• **Tash-Khauli Palace:** The Stone Palace of the Khans with dazzling blue-tile courtyards and harem quarters.\n` +
          `• **Juma Mosque:** A spiritual hall supported by 218 individually hand-carved antique wooden columns.`;
      }
      return `🏰 **Достопримечательности Хивы (город-крепость Ичан-Кала):**\n\n` +
        `• **Ичан-Кала:** Настоящий средневековый город-музей под открытым небом, окруженный массивными глиняными стенами (наследие ЮНЕСКО).\n` +
        `• **Минарет Кальта-Минор:** Знаменитый недостроенный бирюзовый минарет, сплошь покрытый глазурованной майоликой.\n` +
        `• **Дворец Таш-Хаули:** Роскошный дворец ханов с лазурными мозаиками и залами приемов.\n` +
        `• **Джума-мечеть:** Уникальная мечеть с 218 резными деревянными колоннами, ни одна из которых не повторяет другую.`;
    }
  },

  // 20. MOUNTAINS, SKIING & AMIRSOY
  {
    id: 'mountains_amirsoy',
    priority: 72,
    match: (q) =>
      q.includes('горы') || q.includes('амирсой') || q.includes('чимган') ||
      q.includes('чарвак') || q.includes('заамин') || q.includes('лыж') ||
      q.includes('mountains') || q.includes('ski') || q.includes('amirsoy'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🏔️ **Montagnes, stations de ski et nature en Ouzbékistan :**\n\n` +
          `• **Station d'Amirsoy (Amirsoy Mountain Resort) :** Station moderne de classe mondiale dans les monts Tian Shan (à 80 km de Tachkent), avec télécabines Doppelmayr, pistes de ski en hiver et randonnées en été.\n` +
          `• **Grand Tchimgan :** Sommet emblématique (3 309 m) idéal pour le trekking et les vues panoramiques.\n` +
          `• **Lac Tcharvak :** Grand réservoir d'eau turquoise prisé en été pour la baignade et les sports nautiques.\n` +
          `• **Parc national de Zaamin :** La « Suisse ouzbèke » avec ses forêts de conifères et son air pur de haute montagne.`;
      }
      if (lang === 'en') {
        return `🏔️ **Mountains, Nature & Amirsoy Alpine Resort:**\n\n` +
          `• **Amirsoy Resort:** World-class year-round resort in the Western Tian Shan (80 km from Tashkent). Modern Austrian gondolas, alpine skiing in winter, and hiking/ATV riding in summer.\n` +
          `• **Greater Chimgan:** Iconic peak (3,309m) beloved by hikers, mountaineers, and photographers.\n` +
          `• **Charvak Reservoir:** Brilliant turquoise alpine lake popular for summer escapes, water sports, and mountain cottages.\n` +
          `• **Zaamin National Park:** Dubbed the "Uzbek Switzerland" with fragrant pine forests and alpine canyon vistas.`;
      }
      return `🏔️ **Горы, курорт Амирсой, Чимган и природа Узбекистана:**\n\n` +
        `• **Всесезонный курорт Amirsoy Resort:** Современный горный курорт европейского уровня в отрогах Тянь-Шаня (80 км от Ташкента). Австрийские канатные дороги, горные лыжи и сноуборд зимой, трекинг и спа летом.\n` +
        `• **Большой Чимган (3 309 м):** Знаменитый горный массив, популярный среди любителей походов, альпинизма и парапланеризма.\n` +
        `• **Чарвакское водохранилище:** Живописное бирюзовое горное озеро для летнего отдыха и катания на катерах.\n` +
        `• **Зааминский национальный парк («Узбекская Швейцария»):** Хвойные леса, каньоны и чистейший горный воздух.`;
    }
  },

  // 21. SAFETY, POLICE & EMERGENCY (1173)
  {
    id: 'safety_police_emergency',
    priority: 71,
    match: (q) =>
      q.includes('безопасн') || q.includes('полици') || q.includes('1173') ||
      q.includes('102') || q.includes('112') || q.includes('скорая') ||
      q.includes('потерял паспорт') || q.includes('safety') || q.includes('police') ||
      q.includes('emergency'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🛡️ **Sécurité et numéros d'urgence en Ouzbékistan :**\n\n` +
          `• **Niveau de sécurité :** L'Ouzbékistan est classé parmi les pays les plus sûrs au monde (indices Gallup). Se promener en soirée est très tranquille.\n` +
          `• **Police Touristique (Tourist Police) :** Présente sur tous les sites historiques. Numéro d'urgence 24h/24 : **1173** (anglophone et russophone).\n` +
          `• **Numéros d'urgence nationaux :**\n` +
          `  — **112** : Services d'urgence unifiés ;\n` +
          `  — **102** : Police générale ;\n` +
          `  — **103** : SAMU / Ambulance médicale.\n` +
          `• **En cas de perte de passeport :** Contactez le 1173 pour obtenir une attestation de perte auprès de l'OMiOG et joignez votre ambassade ou consulat.`;
      }
      if (lang === 'en') {
        return `🛡️ **Safety, Emergency Contacts & Tourist Police:**\n\n` +
          `• **Safety Index:** Uzbekistan consistently ranks among the top safest countries in the world for solo and family travelers. Night walks are safe in all major cities.\n` +
          `• **Dedicated Tourist Police (24/7):** Dial **1173** (officers speak English and Russian and are posted at all major landmarks).\n` +
          `• **Emergency Hotlines:**\n` +
          `  — **112:** Unified Emergency Dispatch;\n` +
          `  — **102:** Police Service;\n` +
          `  — **103:** Ambulance / Medical Aid.\n` +
          `• **Lost Passport Protocol:** Immediately call 1173 or visit the local OMiOG office to secure a verified police loss report before contacting your embassy.`;
      }
      return `🛡️ **Безопасность, экстренные службы и Туристическая полиция в Узбекистане:**\n\n` +
        `• **Уровень безопасности:** Узбекистан стабильно входит в топ самых безопасных стран мира (рейтинги Gallup). Прогулки по городам в вечернее и ночное время абсолютно безопасны.\n` +
        `• **Туристическая полиция (круглосуточно):** Звоните по короткому номеру **1173** (бесплатно, сотрудники говорят на русском и английском языках).\n` +
        `• **Экстренные службы:**\n` +
        `  — **112** — Единая служба экстренного реагирования;\n` +
        `  — **102** — Полиция (МВД);\n` +
        `  — **103** — Скорая медицинская помощь.\n` +
        `• **Что делать при утере паспорта:** Позвоните 1173, обратитесь в районный отдел миграции (ОМиОГ) для получения официальной справки об утере, после чего обратитесь в посольство или консульство своей страны.`;
    }
  },

  // 22. WEATHER, SEASONS & DRESS CODE
  {
    id: 'weather_dress_code',
    priority: 70,
    match: (q) =>
      q.includes('погод') || q.includes('сезон') || q.includes('когда ехать') ||
      q.includes('когда лучше') || q.includes('одежд') || q.includes('дресс') ||
      q.includes('жар') || q.includes('холод') || q.includes('weather') ||
      q.includes('season') || q.includes('clothes') || q.includes('dress'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `☀️ **Saisons de voyage, météo et code vestimentaire :**\n\n` +
          `• **Meilleures périodes :**\n` +
          `  — **Printemps (avril — mai) :** Température idéale (+20°C à +26°C), nature en fleurs ;\n` +
          `  — **Automne (septembre — début novembre) :** Soleil doux (+22°C à +28°C), saison des fruits mûrs.\n` +
          `• **En été (« Tchillia ») :** En juillet, la chaleur peut atteindre +42°C à +45°C. Privilégiez les visites tôt le matin.\n` +
          `• **Code vestimentaire :**\n` +
          `  — En ville : moderne et décontracté ;\n` +
          `  — Dans les mosquées et mausolées sacrés : épaules et genoux couverts, foulard sur la tête pour les femmes.`;
      }
      if (lang === 'en') {
        return `☀️ **Best Travel Seasons, Weather & Dress Code in Uzbekistan:**\n\n` +
          `• **Ideal Travel Windows:**\n` +
          `  — **Spring (April – May):** Warm sunny climate (+20°C to +26°C) and fresh green gardens;\n` +
          `  — **Autumn (September – November):** Golden harvest season (+22°C to +28°C) with sweet melons and comfortable walks.\n` +
          `• **Summer ("Chilla"):** July reaches 40°C–45°C. Plan outdoor tours for early mornings and late afternoons.\n` +
          `• **Dress Code Etiquette:**\n` +
          `  — In cities, regular casual clothes (t-shirts, jeans) are standard;\n` +
          `  — When entering active mosques or mausoleums, shoulders and knees should be covered, and women should have a light headscarf ready.`;
      }
      return `☀️ **Погода, лучшее время для поездки и дресс-код в Узбекистане:**\n\n` +
        `• **Лучшие месяцы для путешествия:**\n` +
        `  — **Весна (апрель — май):** комфортная температура (+20...+26°C), цветущие сады, идеальные условия для экскурсий;\n` +
        `  — **Осень (сентябрь — ноябрь):** бархатный сезон (+22...+28°C), изобилие сладких дынь, арбузов и винограда.\n` +
        `• **Летняя жара («Чилля»):** В июле температура поднимается до +40...+45°C. Прогулки лучше планировать на утро (до 10:30) и вечер (после 17:30).\n` +
        `• **Дресс-код:**\n` +
        `  — В городах дресс-код свободный и европейский;\n` +
        `  — При посещении действующих мечетей и мавзолеев (Шахи-Зинда, Гур-Эмир) плечи и колени должны быть прикрыты. Женщинам рекомендуется взять легкий платок на голову.`;
    }
  },

  // 23. VISA REGIMES & ENTRY RULES
  {
    id: 'visa_entry_rules',
    priority: 69,
    match: (q) =>
      q.includes('виз') || q.includes('безвиз') || q.includes('e-visa') ||
      q.includes('правила въезд') || q.includes('visa') || q.includes('entry'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `🛂 **Régime des visas pour l'entrée en Ouzbékistan :**\n\n` +
          `• **Exemption totale de visa (jusqu'à 30 jours) :** Accordée aux citoyens de plus de 90 pays, dont la France, la Belgique, la Suisse, tous les pays de l'Union Européenne, le Canada, le Royaume-Uni, etc.\n` +
          `• **Pour les pays de la CEI :** Entrée sans visa (souvent jusqu'à 60 ou 90 jours selon les accords bilatéraux).\n` +
          `• **Visa électronique (e-Visa) :** Pour les ressortissants d'autres pays, la demande se fait simplement sur le portail officiel **e-visa.gov.uz** en 3 jours ouvrables.`;
      }
      if (lang === 'en') {
        return `🛂 **Visa Policies & Entry Requirements for Uzbekistan:**\n\n` +
          `• **Visa-Free Stays (up to 30 days):** Citizens of over 90 countries enter completely visa-free, including the EU, UK, USA, Canada, Australia, UAE, Turkey, etc.\n` +
          `• **CIS Nationals:** Enjoy visa-free bilateral entry (typically up to 60 or 90 days depending on interstate treaties).\n` +
          `• **Electronic Visa (e-Visa):** If your passport is not in the visa-free list, apply via the official government portal **e-visa.gov.uz** (processing takes ~3 business days).`;
      }
      return `🛂 **Визовый режим и правила въезда в Узбекистан:**\n\n` +
        `• **Безвизовый режим до 30 дней:** Действует для граждан более 90 государств мира (включая страны Европейского Союза, Великобританию, ОАЭ, Турцию, Канаду и др.).\n` +
        `• **Для граждан стран СНГ:** Действует безвизовый въезд на срок до 60 или 90 дней (в зависимости от двусторонних соглашений стран).\n` +
        `• **Электронная виза (e-Visa):** Для граждан стран с визовым режимом виза оформляется онлайн на официальном портале **e-visa.gov.uz** за 3 рабочих дня.`;
    }
  },

  // 24. SUPPORT CONTACTS
  {
    id: 'support_contacts',
    priority: 68,
    match: (q) =>
      q.includes('контакт') || q.includes('поддержк') || q.includes('оператор') ||
      q.includes('телефон поддержк') || q.includes('support') || q.includes('contact'),
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `📞 **Contacts du support officiel RegistApp et urgences :**\n\n` +
          `• **Support client RegistApp :**\n` +
          `  — Téléphone : **+998 (77) 664-25-03** ;\n` +
          `  — Telegram : **@registapp_support** ;\n` +
          `  — E-mail : **registapp@gmail.com**.\n` +
          `• **Police Touristique nationale (24h/24) :** composez le **1173** (gratuit, anglais et russe).`;
      }
      if (lang === 'en') {
        return `📞 **RegistApp Official Support & Emergency Contacts:**\n\n` +
          `• **RegistApp Helpdesk:**\n` +
          `  — Telephone: **+998 (77) 664-25-03**;\n` +
          `  — Telegram: **@registapp_support**;\n` +
          `  — Email: **registapp@gmail.com**.\n` +
          `• **National Tourist Police (24/7):** Dial **1173** (free bilingual assistance).`;
      }
      return `📞 **Контакты службы поддержки RegistApp и горячая линия:**\n\n` +
        `• **Поддержка сервиса RegistApp:**\n` +
        `  — Телефон: **+998 (77) 664-25-03**;\n` +
        `  — Telegram: **@registapp_support**;\n` +
        `  — E-mail: **registapp@gmail.com**.\n` +
        `• **Круглосуточная Туристическая полиция:** **1173** (бесплатный звонок, операторы говорят на русском и английском).`;
    }
  },

  // 25. FRIENDLY GREETINGS
  {
    id: 'greeting',
    priority: 67,
    match: (q) =>
      q === 'привет' || q === 'здравствуйте' || q === 'добрый день' ||
      q === 'добрый вечер' || q === 'доброе утро' || q === 'салам' ||
      q === 'ассалому алейкум' || q === 'hello' || q === 'hi' ||
      q === 'good morning' || q === 'bonjour' || q === 'salut',
    getResponse: (lang) => {
      if (lang === 'fr') {
        return `👋 **Bonjour et bienvenue en Ouzbékistan !**\n\n` +
          `Je suis le conseiller IA officiel de **RegistApp**. Je suis à votre écoute pour répondre précisément à vos questions de voyage :\n\n` +
          `• Règles et délais d'enregistrement (délai de 3 jours, hôtels, tentes, amendes) ;\n` +
          `• Trains à grande vitesse « Afrosiyob » et déplacements ;\n` +
          `• Monnaie, cartes bancaires et cartes SIM touristiques ;\n` +
          `• Gastronomie, monuments historiques et sécurité.\n\n` +
          `*Posez-moi votre question directement ! Assistance Police Touristique : **1173**.*`;
      }
      if (lang === 'en') {
        return `👋 **Hello and welcome to Uzbekistan!**\n\n` +
          `I am your official **RegistApp** AI travel consultant. I am here to give you direct, tailored answers on:\n\n` +
          `• Registration rules and deadlines (the 3-day rule, hotel exemptions, camping, fines);\n` +
          `• High-speed bullet train "Afrosiyob" bookings and getting around;\n` +
          `• Currency exchange, bank cards, and local SIM cards;\n` +
          `• Dining, Silk Road sights, and emergency helplines.\n\n` +
          `*What specific question can I assist you with today? (Tourist Police Helpline: **1173**)*`;
      }
      return `👋 **Здравствуйте! Добро пожаловать в Узбекистан!**\n\n` +
        `Я официальный ИИ-консультант сервиса **RegistApp**. Готов дать точный и конкретный ответ на любой ваш вопрос:\n\n` +
        `• Сроки и порядок регистрации (правило 3 рабочих дней, отели, палатки, штрафы);\n` +
        `• Билеты на скоростные поезда «Афросиаб», метро и такси;\n` +
        `• Обмен валюты, банковские карты и покупка SIM-карт;\n` +
        `• Плов, рестораны, достопримечательности Самарканда, Бухары и Хивы.\n\n` +
        `*Задайте интересующий вас вопрос прямо сейчас! Горячая линия Туристической полиции: **1173**.*`;
    }
  }
];

/**
 * Intelligent domain answering engine that directly targets the user's specific query.
 * Never dumps an unrelated generic regulation block.
 */
export function generateOfflineAgentAnswer(
  userText: string,
  language = 'ru',
  legalKnowledge = ''
): string {
  const rawLower = userText.toLowerCase().trim();
  const normalized = rawLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const query = `${rawLower} ${normalized}`;

  // 1. Check for specific topic matches sorted by priority
  const matched = SPECIFIC_INTENTS.filter(intent => intent.match(query));

  if (matched.length > 0) {
    matched.sort((a, b) => b.priority - a.priority);
    // Only combine top 2 if the user explicitly asked a multi-part question
    const isMultiPart =
      query.includes(' и ') || query.includes(' and ') || query.includes(' et ') ||
      (query.match(/\?/g) || []).length > 1;

    const topMatches = isMultiPart ? matched.slice(0, 2) : matched.slice(0, 1);
    const answers = topMatches.map(m => m.getResponse(language, query));
    return answers.join('\n\n---\n\n');
  }

  // 2. Specific tailored fallback for questions not caught by the keyword classifier
  if (language === 'fr') {
    return `🇺🇿 **Conseiller RegistApp : Réponse à votre question :**\n\n` +
      `Concernant votre demande : **« ${userText.trim()} »**\n\n` +
      `• **Enregistrement :** Si vous logez à l'hôtel, l'établissement vous enregistre gratuitement. Pour les séjours en tente/camping, RegistApp vous délivre le QR-code officiel (70 000 UZS / 5 USD par jour).\n` +
      `• **Délai :** Vous avez 3 jours ouvrables après l'arrivée (dimanches et jours fériés exclus).\n` +
      `• **Transports & Monnaie :** Billets de train sur railway.uz, taxis via l'application Yandex Go, espèces en USD/EUR pour le change.\n` +
      `• **Assistance 24h/24 :** Pour une aide immédiate, la Police Touristique répond au **1173**. N'hésitez pas à préciser votre demande !`;
  }

  if (language === 'en') {
    return `🇺🇿 **RegistApp Consultant: Direct Answer:**\n\n` +
      `Regarding your inquiry: **"${userText.trim()}"**\n\n` +
      `• **Registration Summary:** Hotels register guests for free upon arrival. Campers, hikers, and independent travelers can register through RegistApp (70,000 UZS / $5 USD per day).\n` +
      `• **Deadline:** Must be completed within 3 business days of arrival (Sundays and public holidays excluded).\n` +
      `• **Transport & Money:** Book Afrosiyob trains on railway.uz, take city taxis via Yandex Go, and exchange crisp USD/EUR cash at banks.\n` +
      `• **Assistance:** For urgent questions or problems, dial the Tourist Police 24/7 hotline at **1173**. Please feel free to ask for further details!`;
  }

  return `🇺🇿 **Ответ консультанта RegistApp на ваш вопрос:**\n\n` +
    `По вашему вопросу: **«${userText.trim()}»**\n\n` +
    `• **Регистрация:** Если вы живете в отеле или хостеле — вас регистрируют бесплатно при заселении. Если путешествуете с палатками или в автодоме — оформите статус самостоятельного туриста в RegistApp (70 000 сум / 500 руб / $5 в сутки).\n` +
    `• **Сроки:** Регистрация оформляется в течение 3 рабочих дней со дня въезда (воскресенья и праздники исключаются).\n` +
    `• **Транспорт и деньги:** Билеты на поезда покупайте на railway.uz за 45 дней, такси заказывайте в Yandex Go, валюту меняйте в отделениях банков.\n` +
    `• **Поддержка:** Круглосуточный телефон Туристической полиции: **1173**. Уточните ваш вопрос, и я предоставлю подробные инструкции!`;
}
