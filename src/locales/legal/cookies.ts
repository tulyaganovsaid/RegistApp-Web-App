import { LegalLocaleContent } from './types';

export const cookiesContent: LegalLocaleContent = {
  ru: {
    slug: 'cookies',
    title: 'Политика использования файлов cookie',
    subtitle: 'Информация о технологиях локального хранения данных и файлах cookie в сервисе RegistApp',
    lastUpdated: '17 сентября 2026 г.',
    tableOfContentsTitle: 'Оглавление политики cookie',
    sections: [
      {
        id: 'what-are-cookies',
        title: '1. Что такое файлы cookie и локальное хранилище',
        paragraphs: [
          'Файлы cookie (куки) — это небольшие текстовые фрагменты данных, отправляемые веб-сервером и сохраняемые браузером на вашем устройстве (компьютере, смартфоне или планшете).',
          'Вместе с cookie наш сервис использует технологии Web Storage (localStorage и sessionStorage) для обеспечения непрерывности вашей рабочей сессии и сохранения выбранных языковых настроек.',
        ],
      },
      {
        id: 'types-of-cookies',
        title: '2. Категории используемых файлов cookie',
        paragraphs: [
          'Сервис RegistApp использует только строго необходимые и функциональные файлы cookie. Мы НЕ используем сторонние рекламные трекеры и не продаем данные рекламным сетям.',
        ],
        bulletPoints: [
          'Строго необходимые (технические) cookie: обеспечивают базовую работоспособность платформы, защищенную авторизацию в Личном кабинете, предотвращение CSRF-атак и маршрутизацию запросов.',
          'Сессионные cookie (sessionStorage): сохраняют состояние заполняемой формы регистрации на время активной сессии, чтобы предотвратить потерю введенных данных при случайном обновлении страницы.',
          'Функциональные cookie (localStorage): запоминают выбранный вами язык интерфейса (RU, EN, FR) и параметры сессии пользователя.',
          'Аналитические технические маркеры: анонимные агрегированные показатели времени отклика системы для мониторинга стабильности серверов.',
        ],
      },
      {
        id: 'cookie-table',
        title: '3. Перечень используемых идентификаторов',
        paragraphs: [
          'Основные системные ключи, сохраняемые на вашем устройстве:',
        ],
        bulletPoints: [
          'registapp_active_user — идентификатор авторизованной сессии клиента, оператора или администратора;',
          'registapp_active_lang — сохраненный языковой код интерфейса (en, ru, fr);',
          'registapp_cookie_consent — зафиксированный статус согласия на категории cookie с датой и версией протокола;',
          'registapp_orders_cache — временный кэш локального состояния заказов для ускорения загрузки Личного кабинета.',
        ],
      },
      {
        id: 'management',
        title: '4. Управление файлами cookie и их отключение',
        paragraphs: [
          'Вы можете в любой момент изменить свои предпочтения относительно аналитических и маркетинговых cookie, нажав постоянную ссылку «Настройки cookie» в футере сайта.',
          'Большинство современных браузеров также позволяют заблокировать файлы cookie или удалить уже сохраненные файлы в настройках конфиденциальности.',
          'Обратите внимание: отключение строго необходимых файлов cookie может привести к невозможности входа в Личный кабинет сервиса и нарушениям в процессе оформления заказа.',
        ],
        bulletPoints: [
          'Инструкция для Google Chrome: Настройки → Конфиденциальность и безопасность → Файлы cookie и другие данные сайтов;',
          'Инструкция для Mozilla Firefox: Настройки → Приватность и защита → Куки и данные сайтов;',
          'Инструкция для Apple Safari: Настройки → Конфиденциальность → Блокировать все cookie;',
          'Инструкция для мобильных устройств: Настройки браузера в iOS/Android → Очистить историю и данные веб-сайтов.',
        ],
      },
      {
        id: 'updates',
        title: '5. Обновление настоящей политики',
        paragraphs: [
          'Мы оставляем за собой право вносить изменения в настоящую Политику cookie при обновлении функционала сервиса. Новая редакция вступает в силу с момента ее публикации на данной странице.',
        ],
      },
      {
        id: 'contacts',
        title: '6. Вопросы и обратная связь',
        paragraphs: [
          'Если у вас возникли вопросы относительно использования файлов cookie на нашем сайте, вы можете направить запрос в службу технической поддержки: registapp@gmail.com.',
        ],
      },
    ],
  },
  en: {
    slug: 'cookies',
    title: 'Cookie and Local Storage Policy',
    subtitle: 'Transparent information regarding local browser storage and cookie technologies at RegistApp',
    lastUpdated: 'September 17, 2026',
    tableOfContentsTitle: 'Table of Contents',
    sections: [
      {
        id: 'what-are-cookies',
        title: '1. What are Cookies and Local Storage',
        paragraphs: [
          'Cookies are small text files sent by a web server and saved on your device by your web browser.',
          'In conjunction with cookies, RegistApp utilizes standard Web Storage mechanisms (localStorage and sessionStorage) to retain your authentication status and interface language preferences.',
        ],
      },
      {
        id: 'types-of-cookies',
        title: '2. Types of Cookies We Use',
        paragraphs: [
          'RegistApp operates with strict privacy standards. We NEVER deploy behavioral advertising trackers or sell profiling cookies to third parties.',
        ],
        bulletPoints: [
          'Strictly Necessary Cookies: essential for account authentication, API security, and session maintenance;',
          'Preference / Functional Storage: retains your preferred language selection (EN, RU, FR) across browser visits;',
          'Performance & Resilience: anonymous metrics ensuring fast delivery of PDF documents and secure image upload verification.',
        ],
      },
      {
        id: 'cookie-table',
        title: '3. Specific Storage Keys in Use',
        paragraphs: [
          'Common storage keys stored locally on your device:',
        ],
        bulletPoints: [
          'registapp_active_user — active authenticated session data for clients, operators, and administrators;',
          'registapp_active_lang — your selected UI language code (en, ru, fr);',
          'registapp_orders_cache — temporary client-side order registry cache for instantaneous dashboard rendering.',
        ],
      },
      {
        id: 'management',
        title: '4. Managing and Disabling Cookies',
        paragraphs: [
          'You may modify your browser preferences to reject or purge cookies at any time via your browser settings.',
          'Please note that disabling strictly necessary cookies will prevent login and checkout completion on RegistApp.',
        ],
      },
      {
        id: 'updates',
        title: '5. Policy Updates and Inquiries',
        paragraphs: [
          'Changes to this policy will be posted on this page. For questions, contact registapp@gmail.com.',
        ],
      },
    ],
  },
  fr: {
    slug: 'cookies',
    title: 'Politique d\'Utilisation des Témoins de Connexion (Cookies)',
    subtitle: 'Informations transparentes sur les technologies de stockage local et cookies sur RegistApp',
    lastUpdated: '17 septembre 2026',
    tableOfContentsTitle: 'Sommaire',
    sections: [
      {
        id: 'what-are-cookies',
        title: '1. Définition des cookies',
        paragraphs: [
          'Les cookies et le stockage local (localStorage) permettent de conserver votre langue préférée et votre connexion à l\'espace client.',
        ],
      },
      {
        id: 'types-of-cookies',
        title: '2. Cookies strictement nécessaires',
        paragraphs: [
          'RegistApp n\'utilise aucun cookie publicitaire tiers. Seuls les cookies techniques indispensables au fonctionnement du service d\'enregistrement sont utilisés.',
        ],
      },
      {
        id: 'management',
        title: '3. Gestion et désactivation',
        paragraphs: [
          'Vous pouvez désactiver les cookies dans les paramètres de votre navigateur web. Tout refus des cookies essentiels empêchera l\'accès à votre compte personnel.',
        ],
      },
    ],
  },
};
