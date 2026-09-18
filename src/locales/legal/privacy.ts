import { LegalLocaleContent } from './types';

export const privacyContent: LegalLocaleContent = {
  ru: {
    slug: 'privacy',
    title: 'Политика конфиденциальности и обработки персональных данных',
    subtitle: 'Условия и правила обработки персональных данных пользователей сервиса онлайн-регистрации туристов в Республике Узбекистан',
    lastUpdated: '17 сентября 2026 г.',
    disclaimerBadge: 'ТРЕБУЕТ ЮРИДИЧЕСКОЙ ПРОВЕРКИ (ПРОЕКТ ДОКУМЕНТА)',
    tableOfContentsTitle: 'Оглавление документа',
    sections: [
      {
        id: 'operator',
        title: '1. Оператор персональных данных и его реквизиты',
        paragraphs: [
          'Настоящая Политика определяет порядок и условия обработки персональных данных сервисом RegistApp (далее — «Оператор» или «Сервис»).',
          'Оператором обработки персональных данных и исполнителем услуг выступает Семейное предприятие «Jules Verne Hostel» (хостел Jules Verne Hostel, город Ташкент, Республика Узбекистан).',
        ],
        bulletPoints: [
          'Полное наименование: Семейное предприятие «Jules Verne Hostel» (СП «Jules Verne Hostel»)',
          'Юридический и фактический адрес: Республика Узбекистан, 100128, г. Ташкент, Шайхантаурский район, ул. Каттакурган, д. 33',
          'ИНН / Регистрационный номер: 309 881 442',
          'Служба защиты персональных данных (DPO): info@registapp.online',
          'Официальный телефон поддержки: +998 (71) 200-88-11 / 1173 (Туристическая полиция)',
        ],
      },
      {
        id: 'data-categories',
        title: '2. Категории собираемых персональных данных',
        paragraphs: [
          'Для оформления официальной временной регистрации в соответствии с требованиями миграционного законодательства Республики Узбекистан Оператор осуществляет сбор и обработку следующих категорий персональных данных:',
        ],
        bulletPoints: [
          'Фамилия и имя (в точном соответствии с машиносчитываемой зоной заграничного паспорта);',
          'Дата рождения, пол и гражданство (подданство);',
          'Паспортные данные: серия и номер заграничного паспорта, орган и дата выдачи, срок окончания действия документа, цифровая скан-копия / фотография разворота биометрической страницы;',
          'Отметка о въезде: цифровая скан-копия отметки пограничного контроля о пересечении государственной границы Республики Узбекистан с читаемой датой въезда и наименованием пункта пропуска (КПП);',
          'Визовые данные (при наличии визового режима): тип въездной визы, номер электронной визы (e-visa), срок действия, электронная копия визового стикера;',
          'Сведения о пребывании: заявленный адрес фактического проживания / временного размещения на территории Республики Узбекистан, даты начала и окончания периода пребывания;',
          'Контактные данные: адрес электронной почты (e-mail), номер мобильного телефона для оперативной связи и уведомлений;',
          'Данные об оплате: валюта платежа, сумма сервисного сбора, идентификатор транзакции (Transaction ID / хеш чека). Обратите внимание: полные данные банковских карт (номер, CVV/CVC) сервисом не сохраняются и обрабатываются защищенным банковским шлюзом.',
        ],
      },
      {
        id: 'purposes',
        title: '3. Цели обработки персональных данных',
        paragraphs: [
          'Сбор и обработка персональных данных осуществляются исключительно для достижения заранее определенных и законных целей:',
        ],
        bulletPoints: [
          'Оформление и внесение сведений о временном пребывании иностранного гражданина в специализированную государственную автоматизированную систему «E-mehmon» (emehmon.uz);',
          'Формирование, выдача и направление туристу официального регистрационного листка с уникальным верификационным QR-кодом МВД РУз;',
          'Идентификация пользователя в Личном кабинете сервиса и предоставление клиентской поддержки;',
          'Информирование туриста о миграционных правилах, сроках действия регистрации и порядке выезда из страны;',
          'Исполнение обязанностей, возложенных на средства размещения законодательством Республики Узбекистан в сфере туризма и регистрационного учета.',
        ],
      },
      {
        id: 'legal-bases',
        title: '4. Правовые основания обработки',
        paragraphs: [
          'Обработка персональных данных базируется на следующих нормативно-правовых актах Республики Узбекистан и международных нормах:',
        ],
        bulletPoints: [
          'Закон Республики Узбекистан «О персональных данных» № ЗРУ-547 от 02.07.2019 г.;',
          'Закон Республики Узбекистан «О туризме» № ЗРУ-549 от 18.07.2019 г.;',
          'Постановление Кабинета Министров РУз № 433 от 10.07.2020 г. «О мерах по дальнейшему совершенствованию порядка временного пребывания иностранных граждан и лиц без гражданства в Республике Узбекистан»;',
          'Постановление Кабинета Министров РУз № 180 от 05.04.2014 г. (с последующими изменениями);',
          'Согласие субъекта персональных данных на обработку, предоставляемое при регистрации учетной записи и отправке заявки.',
        ],
      },
      {
        id: 'recipients',
        title: '5. Получатели персональных данных',
        paragraphs: [
          'Оператор не передает персональные данные третьим лицам, за исключением следующих уполномоченных получателей, строго необходимых для исполнения услуги:',
        ],
        bulletPoints: [
          'Семейное предприятие «Jules Verne Hostel» — сертифицированный оператор размещения и администратор корпоративного аккаунта в государственной системе E-mehmon, непосредственно осуществляющий регистрационные действия;',
          'Министерство внутренних дел Республики Узбекистан (Главное управление миграции и оформления гражданства) — как государственный владелец и оператор информационной системы e-mehmon.uz;',
          'Банковский платёжный провайдер / эквайер — в части, минимально необходимой для верификации факта совершения транзакции и оплаты госпошлины/сервисного сбора;',
          'Google Cloud Platform (Google LLC) — в качестве поставщика облачной защищенной инфраструктуры и баз данных, отвечающего мировым стандартам безопасности SOC 2 и ISO 27001.',
        ],
      },
      {
        id: 'cross-border',
        title: '6. Трансграничная передача данных и её основания',
        paragraphs: [
          'Для обеспечения бесперебойного доступа иностранных туристов, находящихся за пределами или на территории Узбекистана, Сервис использует отказоустойчивую облачную инфраструктуру.',
          'Трансграничная передача персональных данных осуществляется с соблюдением требований статьи 15 Закона РУз «О персональных данных»:',
        ],
        bulletPoints: [
          'Передача осуществляется на основании выраженного согласия субъекта персональных данных в целях исполнения договора (оферты) на оказание регистрационных услуг;',
          'Все каналы передачи защищены современными криптографическими протоколами TLS 1.3, а хранилища данных используют сквозное шифрование AES-256;',
          'Облачные центры обработки данных соответствуют общепринятым международным требованиям к уровню защиты прав субъектов данных.',
        ],
      },
      {
        id: 'retention-periods',
        title: '7. Сроки хранения персональных данных',
        paragraphs: [
          'Персональные данные хранятся не дольше, чем этого требуют цели их обработки, либо в сроки, прямо установленные законодательством Республики Узбекистан:',
        ],
        bulletPoints: [
          'Сведения о совершенной регистрации и выданном QR-сертификате хранятся в течение 3 (трех) лет в соответствии со сроками хранения первичных туристско-миграционных документов учета;',
          'Скан-копии паспортов, въездных штампов и виз удаляются либо деперсонализируются по истечении 90 календарных дней после завершения периода регистрации и благополучного выезда туриста;',
          'Учетная запись пользователя и история заказов в Личном кабинете сохраняются до момента получения запроса на их удаление от субъекта данных.',
        ],
      },
      {
        id: 'data-subject-rights',
        title: '8. Права субъекта данных и порядок их реализации',
        paragraphs: [
          'В соответствии со статьей 30 Закона РУз «О персональных данных» субъект данных имеет право:',
        ],
        bulletPoints: [
          'Знать о наличии у Оператора своих персональных данных и получать информацию о целях, правовых основаниях и получателях таких данных;',
          'Требовать от Оператора уточнения своих персональных данных в случае их неполноты, неточности или устаревания;',
          'Требовать блокирования или уничтожения своих персональных данных, если они являются незаконно полученными или не являются необходимыми для заявленной цели;',
          'Отозвать данное ранее согласие на обработку персональных данных;',
          'Защищать свои права и законные интересы, в том числе требовать возмещения морального вреда в судебном порядке.',
        ],
      },
      {
        id: 'consent-withdrawal',
        title: '9. Порядок отзыва согласия на обработку',
        paragraphs: [
          'Субъект персональных данных вправе в любой момент отозвать свое согласие на обработку персональных данных.',
          'Для отзыва согласия необходимо направить электронное заявление в свободной форме с адреса электронной почты, указанного при регистрации, на официальный адрес Службы защиты данных: info@registapp.online.',
          'В заявлении необходимо указать: фамилию, имя, номер паспорта и перечень отзываемых данных. Оператор обязуется рассмотреть заявление и прекратить обработку в срок до 10 рабочих дней, за исключением сведений, обязательное хранение которых предписано миграционным законодательством РУз.',
        ],
      },
      {
        id: 'contact-operator',
        title: '10. Порядок обращения к оператору и рассмотрения жалоб',
        paragraphs: [
          'Все запросы, требования или жалобы касательно порядка обработки персональных данных принимаются ответственным должностным лицом Оператора.',
          'Срок рассмотрения запроса субъекта персональных данных составляет не более 10 (десяти) рабочих дней с момента официальной регистрации обращения.',
        ],
        bulletPoints: [
          'Email для обращений: info@registapp.online (копия: admin@registapp.online)',
          'Почтовый адрес для письменных претензий: 100128, Узбекистан, г. Ташкент, Шайхантаурский р-н, ул. Каттакурган, 33 (с пометкой «Защита персональных данных»)',
          'Уполномоченный государственный орган по защите персональных данных: Государственный центр персонализации при Кабинете Министров Республики Узбекистан.',
        ],
      },
    ],
  },
  en: {
    slug: 'privacy',
    title: 'Privacy and Personal Data Protection Policy',
    subtitle: 'Terms and conditions for processing personal data of users of the online tourist registration service in the Republic of Uzbekistan',
    lastUpdated: 'September 17, 2026',
    disclaimerBadge: 'REQUIRES LEGAL REVIEW (DRAFT DOCUMENT)',
    tableOfContentsTitle: 'Table of Contents',
    sections: [
      {
        id: 'operator',
        title: '1. Data Controller and Operator Details',
        paragraphs: [
          'This Policy sets forth the principles and rules governing the processing of personal data by the RegistApp service (hereinafter referred to as the "Operator" or "Service").',
          'The personal data processing and tourist registration service provision is carried out by Family Enterprise "Jules Verne Hostel" (Tashkent, Republic of Uzbekistan).',
        ],
        bulletPoints: [
          'Entity Name: Family Enterprise "Jules Verne Hostel" (FE "Jules Verne Hostel")',
          'Registered Office: 33 Kattakurgan Street, Shaykhantakhur District, Tashkent 100128, Republic of Uzbekistan',
          'TIN / Company Registration: 309 881 442',
          'Data Protection Officer (DPO): info@registapp.online',
          'Support Phone: +998 (71) 200-88-11 / Tourist Police Hotline: 1173',
        ],
      },
      {
        id: 'data-categories',
        title: '2. Categories of Collected Personal Data',
        paragraphs: [
          'To issue an official temporary tourist registration in accordance with migration laws of Uzbekistan, the Operator collects and processes the following categories of data:',
        ],
        bulletPoints: [
          'First name and surname (matching the Machine Readable Zone of the international passport);',
          'Date of birth, gender, and citizenship;',
          'Passport details: serial and number, issuing authority, expiry date, scanned image/photograph of the biographical page;',
          'Border arrival stamp: legible digital scan/photo of the state border crossing stamp indicating the date and entry checkpoint into Uzbekistan;',
          'Visa details (for visa-required nationalities): e-visa number, type, validity window, and digital visa scan;',
          'Stay information: declared residential address / hostel stay in Uzbekistan, planned arrival and departure dates;',
          'Contact information: email address and mobile phone number for communication and delivery of registration credentials;',
          'Payment records: payment currency, service fee amount, Transaction ID or receipt hash. Full card data (PAN, CVV) is never stored by RegistApp and is processed securely by authorized banking gateways.',
        ],
      },
      {
        id: 'purposes',
        title: '3. Purposes of Processing',
        paragraphs: [
          'Personal data is collected strictly for specified, explicit, and legitimate migration registration purposes:',
        ],
        bulletPoints: [
          'Registering the foreign visitor in the unified state automated information system "E-mehmon" (emehmon.uz);',
          'Generating and delivering the official electronic registration slip with a verified Ministry of Internal Affairs QR code;',
          'Authenticating users in their personal accounts and providing customer assistance;',
          'Sending critical compliance reminders regarding the 3-day rule, visa validity, and exit regulations;',
          'Complying with statutory reporting requirements imposed on tourist accommodation providers under the laws of Uzbekistan.',
        ],
      },
      {
        id: 'legal-bases',
        title: '4. Legal Bases for Processing',
        paragraphs: [
          'Processing is carried out in strict compliance with the statutory legislation of the Republic of Uzbekistan and international best practices:',
        ],
        bulletPoints: [
          'Law of the Republic of Uzbekistan No. ZRU-547 "On Personal Data" dated July 2, 2019;',
          'Law of the Republic of Uzbekistan No. ZRU-549 "On Tourism" dated July 18, 2019;',
          'Resolution of the Cabinet of Ministers of Uzbekistan No. 433 dated July 10, 2020 on temporary registration procedures for foreign citizens;',
          'Consent of the data subject granted upon account creation and service ordering.',
        ],
      },
      {
        id: 'recipients',
        title: '5. Recipients of Personal Data',
        paragraphs: [
          'The Operator does not sell or disclose personal data to third parties, except for designated authorized entities necessary to fulfill the registration service:',
        ],
        bulletPoints: [
          'Family Enterprise "Jules Verne Hostel" — accredited operator account holder in the state E-mehmon system;',
          'Ministry of Internal Affairs of Uzbekistan (General Department of Migration and Citizenship) — state controller and owner of the e-mehmon.uz registry;',
          'Authorized Payment Gateway Provider — strictly for transaction authorization and fraud prevention;',
          'Google Cloud Platform (Google LLC) — secure cloud database and hosting provider complying with SOC 2 and ISO 27001 standards.',
        ],
      },
      {
        id: 'cross-border',
        title: '6. Cross-Border Data Transfer',
        paragraphs: [
          'To ensure uninterrupted global access for travelers, the service utilizes high-availability cloud infrastructure.',
          'Cross-border transfers comply with Article 15 of the Law of Uzbekistan "On Personal Data":',
        ],
        bulletPoints: [
          'Transfers occur based on explicit user consent for contract fulfillment;',
          'All communication channels use modern TLS 1.3 encryption and AES-256 rest encryption;',
          'Data hosting facilities maintain rigorous physical and logical security safeguards.',
        ],
      },
      {
        id: 'retention-periods',
        title: '7. Data Retention Periods',
        paragraphs: [
          'Personal data is retained only as long as necessary for the fulfillment of statutory purposes:',
        ],
        bulletPoints: [
          'Registration certificates and audit records: 3 years in accordance with state tourism archiving rules;',
          'Uploaded biometric passport scans and stamps: 90 calendar days following the expiration of the registered stay period;',
          'User account profile: until a deletion request is formally submitted by the registered user.',
        ],
      },
      {
        id: 'data-subject-rights',
        title: '8. Rights of the Data Subject',
        paragraphs: [
          'Under Article 30 of Uzbekistan\'s Personal Data Law, data subjects enjoy the following rights:',
        ],
        bulletPoints: [
          'Right to access their personal data and obtain information regarding processing modalities;',
          'Right to demand rectification or updating of incomplete or inaccurate records;',
          'Right to request blocking or erasure of illegally obtained or obsolete data;',
          'Right to withdraw consent at any time;',
          'Right to lodge complaints with regulatory authorities and seek judicial redress.',
        ],
      },
      {
        id: 'consent-withdrawal',
        title: '9. Procedure for Withdrawing Consent',
        paragraphs: [
          'You may withdraw your consent to data processing at any time by sending an email from your registered email address to info@registapp.online.',
          'The request must state your full name, passport number, and scope of withdrawal. The Operator will process the withdrawal within 10 business days, subject to mandatory statutory migration archive requirements.',
        ],
      },
      {
        id: 'contact-operator',
        title: '10. Contacting the Operator and Inquiries',
        paragraphs: [
          'All privacy questions, access requests, and compliance grievances should be addressed to our Data Protection Officer.',
          'Response time: within 10 business days of official submission.',
        ],
        bulletPoints: [
          'Privacy Office Email: info@registapp.online',
          'Postal Address: 33 Kattakurgan St, Shaykhantakhur District, Tashkent 100128, Uzbekistan (Attn: Data Protection Officer)',
          'Supervisory Authority: State Personalization Centre under the Cabinet of Ministers of the Republic of Uzbekistan.',
        ],
      },
    ],
  },
  fr: {
    slug: 'privacy',
    title: 'Politique de Confidentialité et Protection des Données',
    subtitle: 'Conditions et règles de traitement des données personnelles pour le service d\'enregistrement touristique en Ouzbékistan',
    lastUpdated: '17 septembre 2026',
    disclaimerBadge: 'NÉCESSITE UNE VÉRIFICATION JURIDIQUE (PROJET DE DOCUMENT)',
    tableOfContentsTitle: 'Sommaire du document',
    sections: [
      {
        id: 'operator',
        title: '1. Responsable du traitement et coordonnées',
        paragraphs: [
          'La présente politique régit le traitement des données personnelles par le service RegistApp.',
          'Le traitement et la prestation de services sont assurés par l\'Entreprise Familiale « Jules Verne Hostel » (Tachkent, Ouzbékistan).',
        ],
        bulletPoints: [
          'Raison sociale : Entreprise Familiale « Jules Verne Hostel » (FE « Jules Verne Hostel »)',
          'Adresse : 33 rue Kattakourgan, district de Shaykhantakhur, Tachkent 100128, Ouzbékistan',
          'Numéro d\'immatriculation : 309 881 442',
          'Délégué à la protection des données : info@registapp.online',
          'Téléphone d\'assistance : +998 (71) 200-88-11 / Police touristique : 1173',
        ],
      },
      {
        id: 'data-categories',
        title: '2. Catégories de données collectées',
        paragraphs: [
          'Afin de délivrer l\'enregistrement officiel temporaire requis par la loi ouzbèke, les données suivantes sont traitées :',
        ],
        bulletPoints: [
          'Nom et prénom (tels qu\'indiqués dans le passeport) ;',
          'Date de naissance, genre et nationalité ;',
          'Données du passeport : numéro, autorité émettrice, validité, copie numérique de la page biométrique ;',
          'Tampon d\'entrée : copie numérique du tampon d\'entrée à la frontière ouzbèke indiquant la date ;',
          'Données de visa : numéro d\'e-visa et copie numérique (si applicable) ;',
          'Détails du séjour : adresse déclarée, dates de début et fin de séjour ;',
          'Coordonnées : adresse courriel et numéro de téléphone mobile ;',
          'Données de paiement : devise, montant, identifiant de transaction (aucune donnée bancaire complète n\'est stockée).',
        ],
      },
      {
        id: 'purposes',
        title: '3. Finalités du traitement',
        paragraphs: [
          'Les données sont collectées pour :',
        ],
        bulletPoints: [
          'L\'enregistrement officiel dans le système étatique « E-mehmon » (emehmon.uz) ;',
          'L\'émission et la transmission du certificat d\'enregistrement officiel avec code QR du Ministère de l\'Intérieur ;',
          'La gestion de l\'espace client et le support utilisateur ;',
          'Le respect des obligations réglementaires imposées aux hébergements touristiques en Ouzbékistan.',
        ],
      },
      {
        id: 'legal-bases',
        title: '4. Bases juridiques',
        paragraphs: [
          'Le traitement est fondé sur la loi ouzbèke n° ZRU-547 sur les données personnelles, la loi n° ZRU-549 sur le tourisme, le décret n° 433 du 10.07.2020 et le consentement de l\'utilisateur.',
        ],
      },
      {
        id: 'recipients',
        title: '5. Destinataires des données',
        paragraphs: [
          'Les destinataires autorisés comprennent :',
        ],
        bulletPoints: [
          'L\'Entreprise Familiale « Jules Verne Hostel » en tant qu\'opérateur accrédité du système E-mehmon ;',
          'Le Ministère de l\'Intérieur de la République d\'Ouzbékistan (Direction générale des migrations) ;',
          'Le prestataire de services de paiement sécurisé ;',
          'Google Cloud Platform (infrastructure d\'hébergement sécurisée certifiée ISO 27001).',
        ],
      },
      {
        id: 'cross-border',
        title: '6. Transfert transfrontalier de données',
        paragraphs: [
          'Les transferts vers les infrastructures infonuagiques sont protégés par le chiffrement TLS 1.3 et AES-256 avec le consentement exprès de l\'utilisateur.',
        ],
      },
      {
        id: 'retention-periods',
        title: '7. Durée de conservation',
        paragraphs: [
          'Les certificats et registres sont conservés 3 ans conformément aux règles d\'archivage touristique. Les scans de passeports sont supprimés 90 jours après l\'expiration du séjour enregistré.',
        ],
      },
      {
        id: 'data-subject-rights',
        title: '8. Droits des personnes concernées',
        paragraphs: [
          'Vous disposez d\'un droit d\'accès, de rectification, de suppression et d\'opposition concernant vos données en contactant notre délégué à la protection des données.',
        ],
      },
      {
        id: 'consent-withdrawal',
        title: '9. Modalités de retrait du consentement',
        paragraphs: [
          'Le consentement peut être retiré à tout moment par courriel adressé à info@registapp.online avec traitement sous 10 jours ouvrés.',
        ],
      },
      {
        id: 'contact-operator',
        title: '10. Contact et réclamations',
        paragraphs: [
          'Courriel DPO : info@registapp.online. Adresse postale : 33 rue Kattakourgan, district de Shaykhantakhur, Tachkent 100128, Ouzbékistan. Autorité de contrôle : Centre national de personnalisation d\'Ouzbékistan.',
        ],
      },
    ],
  },
};
