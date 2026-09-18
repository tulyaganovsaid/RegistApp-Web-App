import { LegalLocaleContent } from './types';

export const termsContent: LegalLocaleContent = {
  ru: {
    slug: 'terms',
    title: 'Публичная оферта на оказание услуг онлайн-регистрации туристов',
    subtitle: 'Пользовательское соглашение и условия предоставления электронных услуг по оформлению временной регистрации в Республике Узбекистан',
    lastUpdated: '17 сентября 2026 г.',
    tableOfContentsTitle: 'Оглавление оферты',
    sections: [
      {
        id: 'general',
        title: '1. Общие положения и предмет оферты',
        paragraphs: [
          'Настоящий документ является официальным публичным предложением (публичной офертой) Семейного предприятия «Jules Verne Hostel» (далее — «Исполнитель») заключить договор возмездного оказания услуг по оформлению обязательной государственной временной регистрации иностранных граждан на территории Республики Узбекистан через государственную систему E-mehmon.',
          'В соответствии со статьей 369 Гражданского кодекса Республики Узбекистан принятием условий настоящей оферты (акцептом) считается совершение Заказчиком конклюдентных действий по отправке регистрационной анкеты и оплате услуг.',
        ],
      },
      {
        id: 'acceptance',
        title: '2. Порядок акцепта и оформления заказа',
        paragraphs: [
          'Акцептуя настоящую оферту, Заказчик подтверждает, что:',
        ],
        bulletPoints: [
          'Предоставленные данные заграничного паспорта, отметок о въезде и визы являются подлинными, достоверными и принадлежат Заказчику;',
          'Заказчик въехал на территорию Республики Узбекистан законным путем через официальный пункт пограничного контроля;',
          'Срок обращения не превышает установленные законодательством 3 (три) рабочих дня с момента пересечения границы либо Заказчик проинформирован о последствиях нарушения;',
          'Заказчик дает безоговорочное согласие на обработку персональных данных в объеме, необходимом для регистрации в системе E-mehmon.',
        ],
      },
      {
        id: 'pricing',
        title: '3. Стоимость услуг и порядок расчетов',
        paragraphs: [
          'Стоимость услуг сервиса рассчитывается исходя из количества заявленных суток пребывания и выбранной валюты расчёта:',
        ],
        bulletPoints: [
          'USD: 5 долларов США за каждые сутки пребывания;',
          'EUR: 5 евро за каждые сутки пребывания;',
          'RUB: 500 рублей РФ за каждые сутки пребывания;',
          'UZS: 70 000 узбекских сумов за каждые сутки пребывания.',
          'В стоимость включены обязательные государственные туристические сборы и операционные расходы на оформление электронного QR-сертификата.',
          'Оплата производится в безналичном порядке через платежные реквизиты, указанные в Личном кабинете сервиса, с обязательным указанием идентификатора транзакции.',
        ],
      },
      {
        id: 'obligations',
        title: '4. Права и обязанности сторон',
        paragraphs: [
          'Исполнитель обязуется:',
        ],
        bulletPoints: [
          'Проверить предоставленные Заказчиком скан-копии документов на соответствие миграционным требованиям РУз;',
          'Внести данные в государственную систему E-mehmon и сформировать официальный регистрационный листок с QR-кодом МВД РУз в течение срока от 30 минут до 24 часов с момента подтверждения оплаты;',
          'Предоставить Заказчику доступ к скачиванию электронного сертификата в формате PDF в Личном кабинете и направить его на подтвержденный e-mail.',
        ],
        subsections: [
          {
            title: 'Обязанности Заказчика',
            text: 'Заказчик обязуется предоставить качественные, читаемые сканы/фотографии документов без бликов и обрезанных краев, своевременно оплатить услуги и соблюдать правила миграционного учета РУз.',
          },
        ],
      },
      {
        id: 'qr-certificate',
        title: '5. Юридическая сила QR-сертификата e-mehmon',
        paragraphs: [
          'Электронный регистрационный листок с уникальным QR-кодом системы E-mehmon является официальным государственным документом Республики Узбекистан, подтверждающим законность временного пребывания туриста.',
          'QR-код считывается сотрудниками пограничной службы в международных аэропортах и на наземных пунктах пропуска при выезде из Узбекистана. Распечатка на бумажном носителе не является строго обязательной, однако рекомендуется сохранять электронную копию в памяти смартфона.',
        ],
      },
      {
        id: 'liability',
        title: '6. Ответственность сторон и форс-мажор',
        paragraphs: [
          'Исполнитель не несет ответственности за отказ в регистрации государственными органами в случаях:',
        ],
        bulletPoints: [
          'Предоставления Заказчиком поддельных документов либо искаженных сведений;',
          'Наличия действующих запретов на въезд или решений о нежелательности пребывания Заказчика в РУз;',
          'Сбоев в работе государственных серверов emehmon.uz или центральных баз данных МВД РУз (форс-мажор). В этом случае обработка возобновляется немедленно после восстановления работоспособности шлюза.',
        ],
      },
      {
        id: 'refunds',
        title: '7. Условия возврата денежных средств',
        paragraphs: [
          'Если услуга не может быть оказана по вине Исполнителя, уплаченные средства подлежат полному возврату в течение 5 рабочих дней.',
          'В случае, если Заказчик самостоятельно отменил заказ после того, как данные были внесены в государственную базу E-mehmon и сертификат был сгенерирован, средства возврату не подлежат в связи с фактическим исполнением услуги и уплатой необратимых госпошлин.',
        ],
      },
      {
        id: 'disputes',
        title: '8. Порядок разрешения споров',
        paragraphs: [
          'Все споры и разногласия стороны стремятся урегулировать путем переговоров через службу поддержки info@registapp.online.',
          'При недостижении согласия спор передается на рассмотрение в судебные органы по месту нахождения Исполнителя в соответствии с материальным и процессуальным правом Республики Узбекистан.',
        ],
      },
    ],
  },
  en: {
    slug: 'terms',
    title: 'Public Offer and Terms of Service',
    subtitle: 'User Agreement for online foreign tourist registration services in the Republic of Uzbekistan',
    lastUpdated: 'September 17, 2026',
    tableOfContentsTitle: 'Table of Contents',
    sections: [
      {
        id: 'general',
        title: '1. General Provisions and Subject Matter',
        paragraphs: [
          'This document constitutes an official Public Offer of Family Enterprise "Jules Verne Hostel" (hereinafter "Provider") to enter into an electronic service agreement for issuing mandatory state temporary tourist registration via the official E-mehmon government system.',
          'Under Article 369 of the Civil Code of Uzbekistan, submitting the registration questionnaire and paying the service fee constitutes full acceptance of this Offer.',
        ],
      },
      {
        id: 'acceptance',
        title: '2. Acceptance and Ordering Process',
        paragraphs: [
          'By accepting this agreement, the Client warrants that:',
        ],
        bulletPoints: [
          'All passport, entry stamp, and visa details submitted are genuine, legible, and accurate;',
          'The Client entered Uzbekistan through an authorized state border checkpoint;',
          'The application is submitted within 3 business days of arrival or the Client accepts statutory compliance advisories;',
          'The Client authorizes processing of personal data for migration recording.',
        ],
      },
      {
        id: 'pricing',
        title: '3. Pricing and Payment Terms',
        paragraphs: [
          'Service fees are calculated based on the total registered calendar days and selected payment currency:',
        ],
        bulletPoints: [
          'USD: $5.00 per day;',
          'EUR: €5.00 per day;',
          'RUB: 500 ₽ per day;',
          'UZS: 70,000 UZS per day;',
          'Prices include statutory tourist city tax and electronic verification fees.',
        ],
      },
      {
        id: 'obligations',
        title: '4. Rights and Obligations',
        paragraphs: [
          'Provider verifies submitted scans, inputs required records into emehmon.uz, and provides an official PDF registration certificate bearing the Ministry of Internal Affairs QR code within 30 minutes to 24 hours of payment verification.',
        ],
      },
      {
        id: 'qr-certificate',
        title: '5. Legal Validity of the E-mehmon QR Certificate',
        paragraphs: [
          'The electronic registration certificate with verified QR code is fully recognized by Border Control Officers at all airports and land checkpoints across Uzbekistan. Carrying a physical printout is optional; a digital smartphone copy is sufficient.',
        ],
      },
      {
        id: 'liability',
        title: '6. Limitation of Liability',
        paragraphs: [
          'The Provider is not liable for registration denial resulting from falsified user documents, pre-existing entry bans, or unforeseen governmental downtime of state servers.',
        ],
      },
      {
        id: 'refunds',
        title: '7. Cancellation and Refunds',
        paragraphs: [
          'Full refund applies if the service cannot be executed due to Provider fault. Once an official E-mehmon certificate has been successfully generated in the state system, fees become non-refundable as government taxes have been remitted.',
        ],
      },
      {
        id: 'disputes',
        title: '8. Governing Law and Jurisdiction',
        paragraphs: [
          'This agreement is governed by the laws of the Republic of Uzbekistan. Amicable dispute resolution is handled via info@registapp.online.',
        ],
      },
    ],
  },
  fr: {
    slug: 'terms',
    title: 'Conditions Générales de Service et Offre Publique',
    subtitle: 'Conditions de prestation pour l\'enregistrement touristique en ligne en Ouzbékistan',
    lastUpdated: '17 septembre 2026',
    tableOfContentsTitle: 'Sommaire',
    sections: [
      {
        id: 'general',
        title: '1. Dispositions générales',
        paragraphs: [
          'Ce document régit les conditions de prestation des services d\'enregistrement touristique officiel via la plateforme E-mehmon par l\'Entreprise Familiale « Jules Verne Hostel » (ci-après le « Prestataire »).',
        ],
      },
      {
        id: 'pricing',
        title: '2. Tarifs et modalités de paiement',
        paragraphs: [
          'Les tarifs sont calculés par jour de séjour : 5 USD / 5 EUR / 500 RUB / 70 000 UZS par jour, taxes touristiques d\'État incluses.',
        ],
      },
      {
        id: 'qr-certificate',
        title: '3. Validité du certificat QR E-mehmon',
        paragraphs: [
          'Le certificat électronique muni d\'un code QR officiel a pleine valeur juridique auprès des gardes-frontières ouzbèkes.',
        ],
      },
      {
        id: 'obligations',
        title: '4. Obligations et responsabilité',
        paragraphs: [
          'Le client s\'engage à fournir des documents authentiques et lisibles. Le prestataire délivre le certificat sous 30 minutes à 24 heures après vérification du paiement.',
        ],
      },
      {
        id: 'disputes',
        title: '5. Droit applicable et réclamations',
        paragraphs: [
          'Tout différend est soumis au droit de la République d\'Ouzbékistan. Contact : info@registapp.online.',
        ],
      },
    ],
  },
};
