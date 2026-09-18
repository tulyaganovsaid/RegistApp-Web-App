import { LanguageCode } from '../types';

export interface LocalizedPill {
  id: string;
  label: string;
  query: string;
}

export interface PredefinedTopic {
  id: string;
  keywords: string[];
  queries: Record<LanguageCode, string>;
  answers: Record<LanguageCode, string>;
}

export const PREDEFINED_TOPICS: PredefinedTopic[] = [
  {
    id: 'rule_3_days',
    keywords: ['3 дня', '3-дневн', '3-х дней', 'трех дней', '3 business days', '3 days', '3 jours', 'delai 3', 'срок регистрации'],
    queries: {
      ru: 'Расскажите подробно про правило 3 рабочих дней: как исчисляется срок, исключаются ли выходные?',
      en: 'Explain the 3-business-day registration deadline and how weekends or public holidays are counted.',
      fr: 'Comment fonctionne la règle des 3 jours ouvrables et les week-ends sont-ils exclus ?'
    },
    answers: {
      ru: `📌 **Регламент туристической регистрации в Республике Узбекистан:**

• **Правило 3 рабочих дней (Постановление КМ РУз № 433):** Отсчет срока начинается в 00:01 суток, следующих за днем пересечения государственной границы.
• **Исключение выходных дней:** Субботы (при 5-дневной рабочей неделе органов миграции), воскресенья и официальные государственные праздничные дни РУз **НЕ включаются** в 3-дневный срок.
• **Пример:** Если вы въехали в пятницу, отсчет 3 рабочих дней начинается в понедельник, и регистрацию необходимо оформить до конца среды.
• **Где оформить:** В отелях (оформляет администратор) либо самостоятельно через наш портал **RegistApp** в системе *e-mehmon* без очередей и визитов в ОВИР.`,
      en: `📌 **Mandatory Registration Guidelines for Foreign Tourists in Uzbekistan:**

• **The 3-Business-Day Rule (Cabinet Resolution No. 433):** The countdown begins at 00:01 on the day following your border entry stamp.
• **Exclusion of Non-Working Days:** Sundays and official Uzbekistan public holidays are **strictly excluded** from the 3-day calculation.
• **Practical Example:** If you arrive on a Friday, the 3-business-day window starts on Monday, giving you until Wednesday night to complete your registration.
• **How to Register:** Automatically arranged by hotels, or directly through **RegistApp** via the official *e-mehmon* system without visiting police or migration offices.`,
      fr: `📌 **Règles officielles d'enregistrement touristique en Ouzbékistan :**

• **Délai légal de 3 jours ouvrables (Décret n° 433) :** Le décompte débute à 00h01 le jour suivant la date indiquée sur votre tampon frontière.
• **Exclusion des jours fériés et dimanches :** Les dimanches ainsi que les jours fériés officiels en Ouzbékistan **ne sont pas comptabilisés** dans les 3 jours.
• **Exemple concret :** Arrivé un vendredi, le délai débute le lundi suivant et vous avez jusqu'au mercredi soir pour régulariser votre séjour.
• **Où s'enregistrer :** Par les hôtels ou directement via notre portail **RegistApp** dans le système officiel *e-mehmon* sans démarche administrative physique.`
    }
  },
  {
    id: 'fines_224',
    keywords: ['штраф', '224', 'коап', 'просрочк', 'штрафы', 'penalty', 'penalties', 'fine', 'fines', 'amende', 'sanction'],
    queries: {
      ru: 'Какие штрафы предусмотрены по статье 224 КоАП РУз за просрочку регистрации?',
      en: 'What are the fines and penalties for overstaying under Article 224 of Uzbekistan code?',
      fr: 'Quelles sont les amendes en cas de dépassement du délai de séjour selon l\'article 224 ?'
    },
    answers: {
      ru: `⚖️ **Ответственность по ст. 224 Кодекса об административной ответственности РУз:**

• **Просрочка до 30 суток:** Штраф от 5 до 10 Базовых расчетных величин (БРВ).
• **Просрочка свыше 30 суток:** Штраф от 10 до 20 БРВ.
• **Повторное нарушение в течение года:** Штраф до 30 БРВ либо административное выдворение с запретом на въезд от 1 до 3 лет.
• **Защита в аэропорту:** При наличии действующего электронного QR-сертификата *e-mehmon* сотрудники пограничной службы пропускают вас без задержек и вопросов. Своевременное оформление в RegistApp гарантирует 100% юридическую чистоту.`,
      en: `⚖️ **Legal Consequences under Article 224 of Uzbekistan Administrative Code:**

• **Overstay up to 30 days:** Fine ranging from 5 to 10 Base Calculated Units (BCU).
• **Overstay beyond 30 days:** Fine ranging from 10 to 20 BCU.
• **Repeated violation within 1 year:** Up to 30 BCU fine or administrative deportation with a 1 to 3-year entry ban.
• **Airport Clearance:** A valid digital QR certificate from *e-mehmon* presented on your phone provides full immunity from border inspection delays. Timely registration with RegistApp ensures total peace of mind.`,
      fr: `⚖️ **Sanctions prévues par l'Article 224 du Code administratif ouzbek :**

• **Dépassement jusqu'à 30 jours :** Amende de 5 à 10 unités de base (BRV).
• **Dépassement supérieur à 30 jours :** Amende de 10 à 20 BRV.
• **Récidive dans l'année :** Jusqu'à 30 BRV ou expulsion administrative avec interdiction de territoire de 1 à 3 ans.
• **Contrôle à l'aéroport :** Le certificat électronique QR *e-mehmon* garantit un passage immédiat sans contestation auprès des douanes et garde-frontières.`
    }
  },
  {
    id: 'documents',
    keywords: ['документ', 'паспорт', 'штамп', 'фото', 'documents', 'passport', 'justificatif', 'tampon'],
    queries: {
      ru: 'Какие документы нужны для регистрации гражданам безвизовых и визовых стран?',
      en: 'What documents are required for visa-free versus visa-required travelers?',
      fr: 'Quels documents dois-je fournir pour mon enregistrement selon ma nationalité ?'
    },
    answers: {
      ru: `📄 **Перечень документов для регистрации туриста:**

1. **Заграничный паспорт:** Четкая фотография или скан разворота с личными данными и фотографией.
2. **Въездной штамп:** Фотография страницы с отметкой КПП пограничной службы РУз (с датой въезда).
3. **Для визовых стран:** Фотография действующей туристической визы или распечатка e-visa (с номером подтверждения).
4. **Для гостей у родственников / в квартирах:** Адрес пребывания и контактный телефон принимающей стороны.
5. **Для отелей / кемпингов:** Достаточно только паспорта — персонал оформляет все через API.`,
      en: `📄 **Documents Required for Registration:**

1. **International Passport:** Clear photo or scan of the main photo & biographical data page.
2. **Entry Border Stamp:** Legible photo of the passport page stamped with the arrival date at the border.
3. **For Visa-Required Nationalities:** Copy of your valid tourist visa or electronic e-visa printout.
4. **Private Rentals / Family Stays:** Exact temporary address and local host contact phone number.
5. **Hotels / Registered Camps:** Only your passport is required — administrators handle the API submission.`,
      fr: `📄 **Documents nécessaires pour l'enregistrement :**

1. **Passeport valide :** Photo nette ou scan de la page d'identité avec photo.
2. **Tampon d'entrée :** Photo lisible du tampon apposé par la police des frontières à votre arrivée.
3. **Nationalités soumises à visa :** Copie du visa touristique valide ou de l'e-visa officiel.
4. **Hébergement privé / famille :** Adresse exacte de résidence et téléphone de l'hôte.
5. **Hôtels et campings enregistrés :** Seul le passeport est requis — le personnel gère l'enregistrement numérique.`
    }
  },
  {
    id: 'rates_payment',
    keywords: ['тариф', 'стоимост', 'цена', 'оплат', 'сколько стоит', 'rate', 'rates', 'cost', 'fee', 'payment', 'tarif', 'prix', 'payer'],
    queries: {
      ru: 'Какова стоимость регистрации в сутки и в каких валютах можно оплатить?',
      en: 'What are the daily registration fees and accepted payment currencies?',
      fr: 'Quels sont les tarifs par jour et quelles devises sont acceptées ?'
    },
    answers: {
      ru: `💳 **Тарифы на туристическую регистрацию:**

• **Фиксированный сбор:** 70 000 UZS / 500 RUB / 5 USD / 5 EUR в сутки.
• **Способы оплаты:** Карты Uzcard, HUMO, Visa, Mastercard, МИР, а также онлайн-кошельки.
• **Освобождение от сбора:** Дети до 16 лет регистрируются бесплатно вместе с родителями.
• **Отели:** В большинстве гостиниц туристический сбор уже включен в стоимость проживания.`,
      en: `💳 **Registration Fees & Payment Options:**

• **Standard Tourist Fee:** 70,000 UZS / ~5 USD / ~5 EUR / ~500 RUB per night.
• **Accepted Payment Methods:** International Visa, Mastercard, Uzcard, HUMO, and digital cards.
• **Children Exemption:** Children under 16 years of age are registered free of charge alongside their parents.
• **Hotels:** Most certified hotels already include this state tourist fee in the room rate.`,
      fr: `💳 **Tarifs d'enregistrement et modalités de paiement :**

• **Taxe de séjour forfaitaire :** 70 000 UZS / env. 5 $ USD / env. 5 € EUR / 500 RUB par nuitée.
• **Moyens de paiement :** Cartes bancaires internationales Visa, Mastercard, HUMO, Uzcard.
• **Gratuité enfants :** Les mineurs de moins de 16 ans sont enregistrés gratuitement avec leurs parents.
• **Hôtels :** La plupart des hôtels incluent déjà cette taxe dans le prix de la chambre.`
    }
  },
  {
    id: 'emehmon_qr',
    keywords: ['qr', 'emehmon', 'e-mehmon', 'сертификат', 'справка', 'certificate', 'attestation', 'border'],
    queries: {
      ru: 'Имеет ли электронный листок с QR-кодом из e-mehmon полную юридическую силу при выезде?',
      en: 'Is the electronic QR-coded certificate from e-mehmon legally recognized by border control?',
      fr: 'Quelle est la valeur juridique du certificat e-mehmon avec code QR lors du départ ?'
    },
    answers: {
      ru: `📱 **Юридический статус QR-сертификата e-mehmon:**

• **100% официальный документ:** Электронный листок временной регистрации с двумерным QR-кодом имеет статус государственного документа строгой отчетности.
• **Пограничный контроль:** Сотрудники Погранслужбы СГБ РУз в аэропортах Ташкента, Самарканда, Бухары сканируют QR-код служебным терминалом. Печатать на бумаге не обязательно — достаточно показать экран смартфона.
• **База МВД:** Все записи мгновенно синхронизируются с центральной базой Главного управления миграции и оформления гражданства МВД РУз.`,
      en: `📱 **Legal Recognition of the e-mehmon QR Certificate:**

• **100% State-Recognized:** The digital certificate featuring an official QR code has full legal validity under Uzbekistan law.
• **Border Checkpoints:** Officers of the State Border Service at all international airports (Tashkent, Samarkand, Bukhara, Urgench) scan the QR code directly from your smartphone screen. Paper printouts are not required.
• **Direct Database Sync:** Every registered slip is immediately registered in the Ministry of Internal Affairs migration database.`,
      fr: `📱 **Valeur légale du certificat QR e-mehmon :**

• **Validité officielle à 100% :** Le document numérique doté d'un code QR certifié équivaut à une attestation officielle d'État.
• **Postes frontières :** Les agents douaniers des aéroports de Tachkent, Samarcande et Boukhara scannent le QR code directement sur votre smartphone. Aucune impression papier n'est requise.
• **Base centrale :** L'enregistrement est instantanément consigné dans le registre national de la police des migrations.`
    }
  },
  {
    id: 'camping_yurts',
    keywords: ['палатк', 'кемпинг', 'юрт', 'свободный турист', 'горы', 'camping', 'tent', 'yurt', 'bivouac', 'trekking', 'nature'],
    queries: {
      ru: 'Как оформляется статус «Свободный турист», если мы ночуем в палатках или юртах?',
      en: 'How does registration work for independent travelers camping in tents or yurt camps?',
      fr: 'Comment s\'enregistrer pour le camping sauvage, sous tente ou en yourte ?'
    },
    answers: {
      ru: `⛺ **Правила для палаток, юртовых лагерей и треккинга («Свободный турист»):**

• **Статус самостоятельного путешественника:** Туристы, путешествующие на автомобилях, мотоциклах, велосипедах или пешком с ночевками в палатках, могут оформить регистрацию самостоятельно в RegistApp.
• **Что указать:** При оформлении выбирается статус «Самостоятельный туризм / Кемпинг», указывается ориентировочный маршрут или локация (например, озеро Айдаркуль, Чимган, Заамин).
• **Юртовые лагеря:** Сертифицированные юртовые лагеря регистрируют гостей сами через систему e-mehmon.
• **Сохраняйте билеты:** Чеки за топливо, билеты на транспорт и входные билеты в заповедники также подтверждают ваш туристический маршрут.`,
      en: `⛺ **Rules for Camping, Yurt Stays & Trekking ("Independent Traveler"):**

• **Autonomous Tourist Status:** Travelers exploring by camper van, car, bicycle, or hiking with tents can register directly via RegistApp.
• **Registration Details:** Select "Independent Tourism / Camping" and enter your general route or destination (e.g., Lake Aydarkul, Chimgan, Zaamin).
• **Yurt Camps:** Official yurt camps register their guests on-site through the e-mehmon portal.
• **Save Proof:** Keep transit tickets, fuel receipts, or national park entry tickets to corroborate your travel timeline if requested.`,
      fr: `⛺ **Règles pour camping, tentes et yourtes (« Touriste autonome ») :**

• **Statut de voyageur autonome :** Les randonneurs et voyageurs en van ou tente peuvent s'enregistrer en ligne sur RegistApp sous statut autonome.
• **Déclaration du circuit :** Indiquez vos étapes clés ou régions traversées (ex. Lac Aydarkoul, Tchimgan, Zaamin).
• **Camps de yourtes :** Les camps officiels procèdent à l'enregistrement sur place via le système e-mehmon.
• **Conservez vos justificatifs :** Billets de train, tickets d'entrée de réserves naturelles et péages attestent de votre itinéraire.`
    }
  },
  {
    id: 'tourist_police_1173',
    keywords: ['1173', 'полици', 'помощь', 'телефон', 'police', 'helpline', 'emergency', 'assistance', 'urgence'],
    queries: {
      ru: 'Какие контакты у туристической полиции и экстренных служб Узбекистана?',
      en: 'What are the helpline numbers for the Tourist Police and emergency assistance?',
      fr: 'Quels sont les numéros d\'urgence et de la police touristique en Ouzbékistan ?'
    },
    answers: {
      ru: `📞 **Экстренные службы и горячие линии в Узбекистане:**

• **Туристическая полиция (24/7):** Звонок по короткому номеру **1173** (бесплатно со всех мобильных операторов РУз). Операторы говорят на русском, английском, французском.
• **Единая служба спасения / МЧС:** **112** или **101**.
• **Скорая медицинская помощь:** **103**.
• **Милиция / Полиция:** **102**.
• **Горячая линия Комитета по туризму:** **+998 (71) 200-00-88**.`,
      en: `📞 **Emergency & Tourist Police Helpline Numbers in Uzbekistan:**

• **Tourist Police (24/7 Multilingual):** Dial toll-free **1173** from any local phone or SIM. Assistance available in English, Russian, and French.
• **Emergency Services / Fire:** **112** or **101**.
• **Ambulance / Medical Emergency:** **103**.
• **Police:** **102**.
• **Tourism Committee Helpdesk:** **+998 (71) 200-00-88**.`,
      fr: `📞 **Numéros d'urgence et police touristique en Ouzbékistan :**

• **Police Touristique (24h/24 polyglotte) :** Composez le **1173** (gratuit depuis toute ligne mobile locale). Assistance en français, anglais, russe.
• **Secours / Pompiers :** **112** ou **101**.
• **Urgences médicales (Samu) :** **103**.
• **Police :** **102**.
• **Comité National du Tourisme :** **+998 (71) 200-00-88**.`
    }
  },
  {
    id: 'plov_food',
    keywords: ['плов', 'еда', 'ресторан', 'кухн', 'самса', 'лагман', 'plov', 'food', 'restaurant', 'cuisine', 'dish', 'manger'],
    queries: {
      ru: 'Где в Ташкенте и других городах попробовать лучший плов и национальную кухню?',
      en: 'Where to taste the best authentic Uzbek plov and traditional gastronomy?',
      fr: 'Où déguster le meilleur plov traditionnel et découvrir la cuisine ouzbéke ?'
    },
    answers: {
      ru: `🍲 **Узбекская гастрономия и лучший плов:**

• **Центр плова «Besh Qozon» в Ташкенте:** У подножия Ташкентской телебашни готовят тонны праздничного плова в пяти гигантских казанах. Рекомендуем приходить к 11:30–12:30.
• **Разновидности плова:** 
  - *Ташкентский (байский)* — с изюмом, нутом, казы (кониной) и перепелиными яйцами;
  - *Самаркандский* — выкладывается слоями, мясо сочное и не перемешивается с желтой морковью;
  - *Бухарский (оши-софи)* — диетический, отварной с травами и шафраном.
• **Что еще попробовать:** Самса из тандыра с бараниной, наваристая шурпа, лагман ручной тяги и свежие горячие лепешки «нон».`,
      en: `🍲 **Uzbek Gastronomy & Authentic Plov Experience:**

• **Central Asian Plov Center "Besh Qozon" (Tashkent):** Near the TV Tower, giant cast-iron cauldrons cook metric tons of festive plov daily. Best time to visit is 11:30 AM to 1:00 PM.
• **Regional Plov Styles:**
  - *Tashkent Festive Plov:* Loaded with yellow carrots, raisins, chickpeas, and kazy (traditional horsemeat sausage).
  - *Samarkand Plov:* Cooked in distinct layers; meat, vegetables, and rice are served unmixed.
  - *Bukhara Oshi-Sofi:* Light, fragrant with saffron and slow-steamed herbs.
• **Must-Try Dishes:** Tandoor-baked somsa, hearty shurpa broth, hand-pulled lagman noodles, and warm tandoor flatbreads.`,
      fr: `🍲 **Gastronomie ouzbéke et dégustation du Plov :**

• **Centre du Plov « Besh Qozon » à Tachkent :** Au pied de la tour de télévision, d'immenses chaudrons mijotent chaque midi le festin national. Arrivez idéalement entre 11h30 et 13h00.
• **Les grands styles régionaux :**
  - *Plov de fête de Tachkent :* Carottes jaunes, pois chiches, raisins secs et tranches de kazy.
  - *Plov de Samarcande :* Servi par couches sans mélanger viandes et riz soyeux.
  - *Oshi-sofi de Boukhara :* Recette délicate cuite aux herbes et au safran.
• **À ne pas manquer :** Feuilletés de somsa au tandoor, soupe chourpa parfumée et pains chauds dorés.`
    }
  },
  {
    id: 'transport_afrosiyob',
    keywords: ['афросиаб', 'поезд', 'билет', 'такси', 'метро', 'afrosiyob', 'train', 'ticket', 'metro', 'yandex', 'railway', 'transport'],
    queries: {
      ru: 'Как купить билеты на скоростной поезд «Афросиаб» и как устроен транспорт?',
      en: 'How to buy tickets for the "Afrosiyob" bullet train and navigate local transport?',
      fr: 'Comment réserver le TGV « Afrosiyob » et se déplacer en ville ?'
    },
    answers: {
      ru: `🚆 **Транспорт и скоростной поезд «Афросиаб»:**

• **Поезд «Афросиаб» (Talgo 250):** Соединяет Ташкент, Самарканд, Бухару и Хиву. Время в пути: Ташкент—Самарканд ~2 ч 15 мин, Самарканд—Бухара ~1 ч 30 мин.
• **Покупка билетов:** Продажи открываются за 45 суток на официальном сайте **eticket.railway.uz** или в приложении «Uzrailways Tickets». Билеты раскупаются быстро — бронируйте заранее!
• **Такси в городах:** В Ташкенте, Самарканде и Бухаре отлично работает **Яндекс Go** с безналичной оплатой. Поездки по городу стоят всего 15 000–35 000 UZS ($1.2–$2.8).
• **Метро Ташкента:** Каждая станция — подземный музей. Стоимость проезда ~2 000 UZS (оплата банковской картой или жетоном).`,
      en: `🚆 **High-Speed Rail & Local Transport Guide:**

• **"Afrosiyob" Bullet Train (Talgo 250):** Connects Tashkent, Samarkand, Bukhara, and Khiva. Travel time: Tashkent to Samarkand ~2h 15m; Samarkand to Bukhara ~1h 30m.
• **Booking Tickets:** Tickets release 45 days in advance at **eticket.railway.uz** or via the official Uzrailways app. Secure them early during peak seasons!
• **City Rides & Taxis:** **Yandex Go** functions seamlessly in Tashkent, Samarkand, and Bukhara with credit cards. Typical city fares are 15,000–35,000 UZS ($1.2–$2.8 USD).
• **Tashkent Metro:** World-famous architectural metro stations cost only ~2,000 UZS per ride with contactless card touch.`,
      fr: `🚆 **Transports et train à grande vitesse « Afrosiyob » :**

• **Le TGV « Afrosiyob » (Talgo) :** Relie Tachkent, Samarcande, Boukhara et Khiva. Trajet Tachkent-Samarcande en ~2h15, Samarcande-Boukhara en ~1h30.
• **Acheter les billets :** Ouverture des ventes 45 jours avant sur **eticket.railway.uz** ou l'appli mobile Uzrailways. Réservez impérativement à l'ouverture.
• **Taxis urbains :** L'application **Yandex Go** fonctionne parfaitement à Tachkent, Samarcande et Boukhara. Course moyenne : 15 000 à 35 000 UZS (1,20 à 2,80 €).
• **Métro de Tachkent :** Magnifiques stations marbrées pour ~2 000 UZS avec carte sans contact.`
    }
  },
  {
    id: 'drones',
    keywords: ['дрон', 'квадрокоптер', 'бпла', 'drone', 'quadcopter', 'uav'],
    queries: {
      ru: 'Можно ли ввозить и использовать дрон (квадрокоптер) в Узбекистане?',
      en: 'Is it permitted to bring and fly a drone or quadcopter in Uzbekistan?',
      fr: 'Peut-on faire entrer et piloter un drone ou quadricoptère en Ouzbékistan ?'
    },
    answers: {
      ru: `⚠️ **СТРОГИЙ ЗАПРЕТ НА ВВОЗ БПЛА (ДРОНОВ):**

• **Законодательство РУз:** Ввоз, реализация и использование беспилотных летательных аппаратов (дронов, квадрокоптеров) частными лицами **КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ** (статья 244-4 Уголовного кодекса РУз).
• **На границе:** При обнаружении дрона в багаже в аэропорту или на КПП дрон конфискуется, а в отношении нарушителя возбуждается дело с крупным штрафом или арестом.
• **Исключения:** Только аккредитованные зарубежные съемочные группы при предварительном согласовании с Министерством культуры и СГБ РУз. Обычным туристам ввозить дроны строго не рекомендуется!`,
      en: `⚠️ **STRICT PROHIBITION ON DRONES & UAVs:**

• **Uzbekistan Law:** Bringing, operating, or possessing unauthorized drones or quadcopters is **strictly prohibited** by criminal law (Article 244-4 of the Criminal Code).
• **Border Inspection:** Luggage is thoroughly scanned at airport customs. Drones will be confiscated immediately, and violators face severe criminal fines or detention.
• **Exceptions:** Only state-approved foreign documentary film crews with prior permits from the Ministry of Culture and State Security may import equipment. Regular tourists should strictly leave drones at home!`,
      fr: `⚠️ **INTERDICTION STRICTE DES DRONES EN OUZBÉKISTAN :**

• **Législation pénale :** L'importation et l'usage de drones ou quadricoptères par des particuliers sont **strictement interdits** (art. 244-4 du Code pénal).
• **Douanes aux frontières :** Les bagages sont systématiquement scannés. Tout drone détecté est confisqué et expose son porteur à de lourdes amendes judiciaires.
• **Recommandation formelle :** Ne voyagez sous aucun prétexte avec un drone en Ouzbékistan.`
    }
  },
  {
    id: 'money_exchange',
    keywords: ['валют', 'деньги', 'карт', 'обмен', 'банкомат', 'доллар', 'money', 'currency', 'exchange', 'atm', 'card', 'cash', 'argent', 'change', 'devise'],
    queries: {
      ru: 'Как обменять валюту, работают ли карты Visa/Mastercard и нужны ли наличные?',
      en: 'How does currency exchange work, do Visa/Mastercard cards work, and is cash necessary?',
      fr: 'Comment échanger de l\'argent, les cartes Visa/Mastercard marchent-elles et faut-il du liquide ?'
    },
    answers: {
      ru: `💵 **Деньги, обмен валюты и банковские карты:**

• **Национальная валюта:** Узбекский сум (UZS).
• **Банковские карты:** Международные карты Visa и Mastercard принимаются во всех крупных отелях, супермаркетах (Korzinka, Makro) и ресторанах.
• **Банкоматы (ATM):** В изобилии установлены в аэропортах, банках и у достопримечательностей. Выдают сумы и доллары США.
• **Обмен валюты:** Официальные обменные пункты в банках и отелях работают по единому курсу ЦБ РУз. Лучше всего иметь с собой новые, неповрежденные купюры долларов США или евро.
• **Наличные на базарах:** Для покупок на рынках (Чорсу, Сиабский базар) и оплаты уличной еды обязательно иметь немного наличных сумов.`,
      en: `💵 **Money, Currency Exchange & Payment Cards:**

• **National Currency:** Uzbek Som (UZS).
• **Bank Cards:** International Visa and Mastercard are accepted at major hotels, modern restaurants, and supermarkets (Korzinka, Makro).
• **ATMs:** Readily available in airports, bank branches, and historical centers, dispensing both UZS and USD cash.
• **Currency Exchange:** Official bank booths offer fair central-bank rates. Bring crisp, undamaged USD ($50/$100) or EUR banknotes for effortless exchange.
• **Cash for Bazaars:** Traditional outdoor bazaars (Chorsu, Siab) and teahouses require local cash sums.`,
      fr: `💵 **Monnaie, change et cartes bancaires :**

• **Devise locale :** Le Sum ouzbek (UZS).
• **Cartes bancaires :** Cartes Visa et Mastercard acceptées dans les hôtels, supermarchés et grands restaurants.
• **Distributeurs (DAB) :** Disponibles dans les aéroports et banques, délivrant des sums et des dollars US.
• **Bureaux de change :** Taux officiel transparent dans les banques. Privilégiez des billets de dollars ou d'euros neufs et non froissés.
• **Marchés et bazars :** Pour les étals traditionnels (Chorsu à Tachkent, Siab à Samarcande), prévoyez toujours des sommes en liquide.`
    }
  },
  {
    id: 'sim_cards',
    keywords: ['сим', 'связь', 'интернет', 'оператор', 'esim', 'ucell', 'beeline', 'sim', 'sim-card', 'data', 'mobile', 'forfait'],
    queries: {
      ru: 'Где купить туристическую SIM-карту и как подключить мобильный интернет?',
      en: 'Where to buy a tourist SIM card and how to set up mobile internet?',
      fr: 'Où acheter une carte SIM touristique et avoir de la 4G/5G ?'
    },
    answers: {
      ru: `📶 **Мобильная связь и интернет для туристов:**

• **Покупка в аэропорту:** В залах прилета аэропортов Ташкента, Самарканда и Бухары работают круглосуточные стойки мобильных операторов: Ucell, Beeline, Mobiuz и Uztelecom.
• **Что нужно для оформления:** Только заграничный паспорт с въездным штампом.
• **Туристические тарифы:** От 40 000 до 100 000 UZS ($3–$8) за 20–50 Гб скоростного интернета и пакет минут на 30 дней.
• **eSIM:** Доступны у местных операторов и через международные сервисы (Airalo, Maya).
• **Wi-Fi:** В отелях и кафе интернет бесплатный, но наличие местной SIM-карты гарантирует быструю связь с картами и такси.`,
      en: `📶 **Mobile Data & Tourist SIM Cards:**

• **Airport Kiosks:** 24/7 official telecom booths (Ucell, Beeline, Mobiuz, Uztelecom) operate in the arrivals halls of Tashkent, Samarkand, and Bukhara airports.
• **Requirements:** Your international passport with entry stamp.
• **Tourist Packages:** 40,000 to 100,000 UZS ($3–$8 USD) for generous 20–50 GB data packages valid for 30 days.
• **eSIM Support:** Supported by local carriers as well as global roaming providers like Airalo.
• **Connectivity:** 4G/LTE coverage is strong across all major cities and tourist routes.`,
      fr: `📶 **Téléphonie mobile et Internet 4G :**

• **À l'aéroport :** Guichets télécom ouverts 24h/24 aux arrivées (Ucell, Beeline, Mobiuz, Uztelecom).
• **Pièce exigée :** Passeport original avec tampon de police aux frontières.
• **Forfaits touristes :** Entre 40 000 et 100 000 UZS (3 à 8 €) pour 20 à 50 Go de données valables 30 jours.
• **eSIM :** Fonctionne très bien via les opérateurs locaux ou applications internationales.
• **Couverture :** Excellente couverture 4G/LTE dans toutes les villes et le long des voies ferrées.`
    }
  }
];

export const QUICK_PILLS_BY_LANG: Record<LanguageCode, LocalizedPill[]> = {
  ru: [
    { id: 'rule_3_days', label: '⏳ Правило 3 дней', query: PREDEFINED_TOPICS[0].queries.ru },
    { id: 'fines_224', label: '⚖️ Штрафы по ст. 224', query: PREDEFINED_TOPICS[1].queries.ru },
    { id: 'documents', label: '📄 Необходимые документы', query: PREDEFINED_TOPICS[2].queries.ru },
    { id: 'emehmon_qr', label: '📱 QR-код e-mehmon', query: PREDEFINED_TOPICS[4].queries.ru },
    { id: 'rates_payment', label: '💳 Тарифы и оплата', query: PREDEFINED_TOPICS[3].queries.ru },
    { id: 'camping_yurts', label: '⛺ Палатки и юрты', query: PREDEFINED_TOPICS[5].queries.ru },
    { id: 'tourist_police_1173', label: '📞 Полиция 1173', query: PREDEFINED_TOPICS[6].queries.ru },
    { id: 'transport_afrosiyob', label: '🚆 Поезд Афросиаб', query: PREDEFINED_TOPICS[8].queries.ru },
    { id: 'plov_food', label: '🍲 Плов и кухня', query: PREDEFINED_TOPICS[7].queries.ru },
    { id: 'drones', label: '⚠️ Запрет на дроны', query: PREDEFINED_TOPICS[9].queries.ru },
    { id: 'money_exchange', label: '💵 Обмен валюты и карты', query: PREDEFINED_TOPICS[10].queries.ru },
    { id: 'sim_cards', label: '📶 SIM-карты и интернет', query: PREDEFINED_TOPICS[11].queries.ru },
  ],
  en: [
    { id: 'rule_3_days', label: '⏳ 3-Business-Day Rule', query: PREDEFINED_TOPICS[0].queries.en },
    { id: 'fines_224', label: '⚖️ Article 224 Penalties', query: PREDEFINED_TOPICS[1].queries.en },
    { id: 'documents', label: '📄 Required Documents', query: PREDEFINED_TOPICS[2].queries.en },
    { id: 'emehmon_qr', label: '📱 e-mehmon QR Code', query: PREDEFINED_TOPICS[4].queries.en },
    { id: 'rates_payment', label: '💳 Rates & Fees', query: PREDEFINED_TOPICS[3].queries.en },
    { id: 'camping_yurts', label: '⛺ Camping & Yurts', query: PREDEFINED_TOPICS[5].queries.en },
    { id: 'tourist_police_1173', label: '📞 Tourist Police 1173', query: PREDEFINED_TOPICS[6].queries.en },
    { id: 'transport_afrosiyob', label: '🚆 Afrosiyob Express', query: PREDEFINED_TOPICS[8].queries.en },
    { id: 'plov_food', label: '🍲 Plov & Cuisine', query: PREDEFINED_TOPICS[7].queries.en },
    { id: 'drones', label: '⚠️ Drone Flight Ban', query: PREDEFINED_TOPICS[9].queries.en },
    { id: 'money_exchange', label: '💵 Currency & Cards', query: PREDEFINED_TOPICS[10].queries.en },
    { id: 'sim_cards', label: '📶 SIM Cards & Data', query: PREDEFINED_TOPICS[11].queries.en },
  ],
  fr: [
    { id: 'rule_3_days', label: '⏳ Règle des 3 jours', query: PREDEFINED_TOPICS[0].queries.fr },
    { id: 'fines_224', label: '⚖️ Amendes Article 224', query: PREDEFINED_TOPICS[1].queries.fr },
    { id: 'documents', label: '📄 Documents requis', query: PREDEFINED_TOPICS[2].queries.fr },
    { id: 'emehmon_qr', label: '📱 Code QR e-mehmon', query: PREDEFINED_TOPICS[4].queries.fr },
    { id: 'rates_payment', label: '💳 Tarifs & Paiement', query: PREDEFINED_TOPICS[3].queries.fr },
    { id: 'camping_yurts', label: '⛺ Bivouac & Yourtes', query: PREDEFINED_TOPICS[5].queries.fr },
    { id: 'tourist_police_1173', label: '📞 Police d\'urgence 1173', query: PREDEFINED_TOPICS[6].queries.fr },
    { id: 'transport_afrosiyob', label: '🚆 TGV Afrosiyob', query: PREDEFINED_TOPICS[8].queries.fr },
    { id: 'plov_food', label: '🍲 Plov & Gastronomie', query: PREDEFINED_TOPICS[7].queries.fr },
    { id: 'drones', label: '⚠️ Interdiction drones', query: PREDEFINED_TOPICS[9].queries.fr },
    { id: 'money_exchange', label: '💵 Change & Cartes', query: PREDEFINED_TOPICS[10].queries.fr },
    { id: 'sim_cards', label: '📶 Carte SIM & 4G', query: PREDEFINED_TOPICS[11].queries.fr },
  ]
};

export const WELCOME_GREETINGS: Record<LanguageCode, string> = {
  ru: `Здравствуйте! Я официальный ИИ-консультант сервиса **RegistApp** по миграционному законодательству и туризму в Республике Узбекистан.\n\n**Что именно вас интересует?**\nЗадайте любой интересующий вас вопрос (о сроках, правиле 3 рабочих дней, тарифах, штрафах по ст. 224 КоАП или системе e-mehmon) либо выберите быструю подсказку ниже:`,
  en: `Hello! I am the official **RegistApp** AI Legal & Travel Consultant for foreign visitors in the Republic of Uzbekistan.\n\n**How may I assist you today?**\nFeel free to ask any question regarding migration rules, the 3-business-day registration deadline, tourist fees, penalties under Article 224, or the e-mehmon system — or pick a quick topic below:`,
  fr: `Bonjour ! Je suis le conseiller officiel IA **RegistApp** spécialisé en législation migratoire et tourisme en République d'Ouzbékistan.\n\n**Comment puis-je vous aider ?**\nPosez toute question concernant les règles de séjour, le délai de 3 jours ouvrables, les tarifs, les amendes de l'article 224 ou le système e-mehmon — ou choisissez un thème ci-dessous :`
};

export function findMatchingTopic(text: string): PredefinedTopic | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  
  for (const topic of PREDEFINED_TOPICS) {
    // Check if query in any language matches
    for (const q of Object.values(topic.queries)) {
      if (lower.includes(q.toLowerCase()) || q.toLowerCase().includes(lower)) {
        return topic;
      }
    }
    // Check keywords
    for (const kw of topic.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        return topic;
      }
    }
  }
  return undefined;
}

export function translateMessage(
  msg: {
    id: string;
    sender: 'user' | 'model' | 'ai';
    text: string;
    translations?: Partial<Record<LanguageCode, string>>;
    queryKey?: string;
  },
  targetLang: LanguageCode
): string {
  // 1. Check if direct translation exists on message object
  if (msg.translations?.[targetLang]) {
    return msg.translations[targetLang]!;
  }

  // 2. Check welcome message
  if (msg.id === 'msg-welcome' || msg.id === 'welcome-msg' || msg.text.includes('RegistApp') && msg.text.includes('Здравствуйте') || msg.text.includes('Hello! I am the official') || msg.text.includes('Bonjour ! Je suis le conseiller')) {
    return WELCOME_GREETINGS[targetLang];
  }

  // 3. Check queryKey if attached (only when explicitly set by a clicked pill)
  if (msg.queryKey) {
    const topic = PREDEFINED_TOPICS.find(t => t.id === msg.queryKey);
    if (topic) {
      if (msg.sender === 'user') {
        return topic.queries[targetLang];
      } else {
        return topic.answers[targetLang];
      }
    }
  }

  // 4. Return original text if not a predefined pill/welcome message (will be translated via API)
  return msg.text;
}
