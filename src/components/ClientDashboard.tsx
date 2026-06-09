import React, { useState, useEffect } from 'react';
import { 
  Plus, LogOut, Calendar, DollarSign, FileText, CheckCircle, UploadCloud, 
  MapPin, AlertCircle, Copy, Check, Eye, Languages, ChevronLeft, ChevronRight,
  AlertTriangle
} from 'lucide-react';
import { User, Order, LanguageCode, CurrencyCode, OrderStatus } from '../types';
import { 
  getOrders, createOrder, submitPayment, getConfig, getTashkentTime, formatTashkentDate, updateUserProfile 
} from '../db';
import { getViolationGuideText } from '../violationGuides';
import { translations, translateCountry } from '../translations';
import { BrandLogo } from './BrandLogo';

export function isUrgentOrder(createdAt: string, status: string): boolean {
  if (!createdAt || status === 'Completed') return false;
  const startDate = new Date(createdAt);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - startDate.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours > 12;
}

export function formatPlacementAndWaiting(createdAt: string, status: string, completedAt?: string, lang: string = 'en') {
  if (!createdAt) return '';
  const startDate = new Date(createdAt);
  
  const yyyy = startDate.getFullYear();
  const mm = String(startDate.getMonth() + 1).padStart(2, '0');
  const dd = String(startDate.getDate()).padStart(2, '0');
  const hh = String(startDate.getHours()).padStart(2, '0');
  const min = String(startDate.getMinutes()).padStart(2, '0');
  const formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

  const endDate = status === 'Completed' 
    ? (completedAt ? new Date(completedAt) : new Date()) 
    : new Date();
  
  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const hoursText = diffHours === 0 ? '<1' : String(diffHours);
  
  const waitLabel = lang === 'ru' 
    ? (status === 'Completed' ? `обработка: ${hoursText} ч` : `ожидание: ${hoursText} ч`)
    : lang === 'fr'
    ? (status === 'Completed' ? `traité: ${hoursText}h` : `attente: ${hoursText}h`)
    : (status === 'Completed' ? `processed: ${hoursText}h` : `wait: ${hoursText}h`);

  return `${formattedTime} (${waitLabel})`;
}

export function formatResponseTimeAndExecution(createdAt: string, completedAt?: string, lang: string = 'en') {
  if (!createdAt || !completedAt) return '—';
  const startDate = new Date(createdAt);
  const endDate = new Date(completedAt);

  const yyyy = endDate.getFullYear();
  const mm = String(endDate.getMonth() + 1).padStart(2, '0');
  const dd = String(endDate.getDate()).padStart(2, '0');
  const hh = String(endDate.getHours()).padStart(2, '0');
  const min = String(endDate.getMinutes()).padStart(2, '0');
  const formattedTime = `${yyyy}-${mm}-${dd} ${hh}:${min}`;

  const diffMs = Math.max(0, endDate.getTime() - startDate.getTime());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs / (1000 * 60)) % 60);

  const durationStr = lang === 'ru'
    ? `${diffHours} ч ${diffMins} мин`
    : lang === 'fr'
    ? `${diffHours} h ${diffMins} min`
    : `${diffHours}h ${diffMins}m`;

  return `${formattedTime} (${durationStr})`;
}

const CALENDAR_LOCALS: Record<LanguageCode, {
  weekDays: string[];
  months: string[];
  selectDate: string;
}> = {
  en: {
    weekDays: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
    months: [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ],
    selectDate: 'Select Date'
  },
  ru: {
    weekDays: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
    months: [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ],
    selectDate: 'Выберите дату'
  },
  fr: {
    weekDays: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
    months: [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ],
    selectDate: 'Sélectionner la date'
  }
};

const formatDisplayDate = (dateStr: string, lang: LanguageCode) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const local = CALENDAR_LOCALS[lang] || CALENDAR_LOCALS['en'];
  const monthName = local.months[monthIdx];
  
  if (lang === 'ru') {
    return `${day < 10 ? '0' + day : day}.${parts[1]}.${year}`;
  } else if (lang === 'fr') {
    return `${day} ${monthName} ${year}`;
  } else {
    return `${monthName} ${day}, ${year}`;
  }
};

const VISA_FREE_COUNTRIES: Record<LanguageCode, string[]> = {
  en: [
    "Andorra",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Bosnia and Herzegovina",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Canada",
    "Chile",
    "China (including Hong Kong and Macau)",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czech Republic",
    "Denmark",
    "Dominica",
    "Dominican Republic",
    "El Salvador",
    "Estonia",
    "Finland",
    "France",
    "Georgia",
    "Germany",
    "Greece",
    "Grenada",
    "Guatemala",
    "Honduras",
    "Hungary",
    "Iceland",
    "Indonesia",
    "Ireland",
    "Israel",
    "Italy",
    "Jamaica",
    "Japan",
    "Kazakhstan",
    "Kuwait",
    "Kyrgyzstan",
    "Latvia",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Malaysia",
    "Malta",
    "Mexico",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Norway",
    "Oman",
    "Panama",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "San Marino",
    "Serbia",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "South Korea",
    "Spain",
    "Sweden",
    "Switzerland",
    "Tajikistan",
    "Trinidad and Tobago",
    "Turkey",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "Vatican City"
  ],
  ru: [
    "Австралия",
    "Австрия",
    "Азербайджан",
    "Андорра",
    "Антигуа и Барбуда",
    "Аргентина",
    "Армения",
    "Багамы",
    "Барбадос",
    "Бахрейн",
    "Беларусь",
    "Бельгия",
    "Белиз",
    "Болгария",
    "Босния и Герцеговина",
    "Бразилия",
    "Бруней",
    "Ватикан",
    "Великобритания",
    "Венгрия",
    "Германия",
    "Гватемала",
    "Гондурас",
    "Гренада",
    "Греция",
    "Грузия",
    "Дания",
    "Доминика",
    "Доминиканская Республика",
    "Израиль",
    "Индонезия",
    "Ирландия",
    "Исландия",
    "Испания",
    "Италия",
    "Казахстан",
    "Канада",
    "Катар",
    "Кипр",
    "Китай (включая Гонконг и Макао)",
    "Коста-Рика",
    "Куба",
    "Кувейт",
    "Кыргызстан",
    "Латвия",
    "Литва",
    "Лихтенштейн",
    "Люксембург",
    "Малайзия",
    "Мальта",
    "Мексика",
    "Молдова",
    "Монако",
    "Монголия",
    "Нидерланды",
    "Никарагуа",
    "Новая Зеландия",
    "Норвегия",
    "ОАЭ",
    "Оман",
    "Панама",
    "Польша",
    "Португалия",
    "Россия",
    "Румыния",
    "Сальвадор",
    "Сан-Марино",
    "Сент-Винсент и Гренадины",
    "Сент-Китс и Невис",
    "Сент-Люсия",
    "Сербия",
    "Сингапур",
    "Словакия",
    "Словения",
    "Таджикистан",
    "Тринидад и Тобаго",
    "Турция",
    "Украина",
    "Финляндия",
    "Франция",
    "Хорватия",
    "Черногория",
    "Чехия",
    "Чили",
    "Швейцария",
    "Швеция",
    "Эстония",
    "Южная Корея",
    "Ямайка",
    "Япония"
  ],
  fr: [
    "Allemagne",
    "Andorre",
    "Antigua-et-Barbuda",
    "Argentine",
    "Arménie",
    "Australie",
    "Autriche",
    "Azerbaïdjan",
    "Bahamas",
    "Bahreïn",
    "Barbade",
    "Belgique",
    "Belize",
    "Biélorussie",
    "Bosnie-Herzégovine",
    "Brésil",
    "Brunéi",
    "Bulgarie",
    "Canada",
    "Chili",
    "Chine (y compris Hong Kong et Macao)",
    "Chypre",
    "Colombie",
    "Corée du Sud",
    "Costa Rica",
    "Croatie",
    "Cuba",
    "Danemark",
    "Dominique",
    "El Salvador",
    "Émirats Arabes Unis",
    "Espagne",
    "Estonie",
    "Finlande",
    "France",
    "Géorgie",
    "Grèce",
    "Grenade",
    "Guatemala",
    "Honduras",
    "Hongrie",
    "Indonésie",
    "Irlande",
    "Islande",
    "Israël",
    "Italie",
    "Jamaïque",
    "Japon",
    "Kazakhstan",
    "Kirghizistan",
    "Koweït",
    "Lettonie",
    "Liechtenstein",
    "Lituanie",
    "Luxembourg",
    "Malaisie",
    "Malte",
    "Mexique",
    "Moldavie",
    "Monaco",
    "Mongolie",
    "Monténégro",
    "Nicaragua",
    "Norvège",
    "Nouvelle-Zélande",
    "Oman",
    "Panama",
    "Pays-Bas",
    "Pologne",
    "Portugal",
    "Qatar",
    "République Dominicaine",
    "République Tchèque",
    "Roumanie",
    "Royaume-Uni",
    "Russie",
    "Saint-Christophe-et-Niévès",
    "Sainte-Lucie",
    "Saint-Marin",
    "Saint-Vincent-et-les-Grenadines",
    "Serbie",
    "Singapour",
    "Slovaquie",
    "Slovénie",
    "Suède",
    "Suisse",
    "Tadjikistan",
    "Trinité-et-Tobago",
    "Turquie",
    "Ukraine",
    "Vatican"
  ]
};

// Localized official visa-required countries list (contains all countries of the world)
const VISA_REQUIRED_COUNTRIES: Record<LanguageCode, string[]> = {
  en: [
    "Afghanistan",
    "Albania",
    "Algeria",
    "Andorra",
    "Angola",
    "Antigua and Barbuda",
    "Argentina",
    "Armenia",
    "Australia",
    "Austria",
    "Azerbaijan",
    "Bahamas",
    "Bahrain",
    "Bangladesh",
    "Barbados",
    "Belarus",
    "Belgium",
    "Belize",
    "Benin",
    "Bhutan",
    "Bolivia",
    "Bosnia and Herzegovina",
    "Botswana",
    "Brazil",
    "Brunei",
    "Bulgaria",
    "Burkina Faso",
    "Burundi",
    "Cabo Verde",
    "Cambodia",
    "Cameroon",
    "Canada",
    "Central African Republic",
    "Chad",
    "Chile",
    "China (including Hong Kong and Macau)",
    "Colombia",
    "Comoros",
    "Congo",
    "Costa Rica",
    "Croatia",
    "Cuba",
    "Cyprus",
    "Czech Republic",
    "Democratic Republic of the Congo",
    "Denmark",
    "Djibouti",
    "Dominica",
    "Dominican Republic",
    "Ecuador",
    "Egypt",
    "El Salvador",
    "Equatorial Guinea",
    "Eritrea",
    "Estonia",
    "Eswatini",
    "Ethiopia",
    "Fiji",
    "Finland",
    "France",
    "Gabon",
    "Gambia",
    "Georgia",
    "Germany",
    "Ghana",
    "Greece",
    "Grenada",
    "Guatemala",
    "Guinea",
    "Guinea-Bissau",
    "Guyana",
    "Haiti",
    "Honduras",
    "Hungary",
    "Iceland",
    "India",
    "Indonesia",
    "Iran",
    "Iraq",
    "Ireland",
    "Israel",
    "Italy",
    "Ivory Coast",
    "Jamaica",
    "Japan",
    "Jordan",
    "Kazakhstan",
    "Kenya",
    "Kiribati",
    "Kuwait",
    "Kyrgyzstan",
    "Laos",
    "Latvia",
    "Lebanon",
    "Lesotho",
    "Liberia",
    "Libya",
    "Liechtenstein",
    "Lithuania",
    "Luxembourg",
    "Madagascar",
    "Malawi",
    "Malaysia",
    "Maldives",
    "Mali",
    "Malta",
    "Marshall Islands",
    "Mauritania",
    "Mauritius",
    "Mexico",
    "Micronesia",
    "Moldova",
    "Monaco",
    "Mongolia",
    "Montenegro",
    "Morocco",
    "Mozambique",
    "Myanmar",
    "Namibia",
    "Nauru",
    "Nepal",
    "Netherlands",
    "New Zealand",
    "Nicaragua",
    "Niger",
    "Nigeria",
    "North Korea",
    "North Macedonia",
    "Norway",
    "Oman",
    "Pakistan",
    "Palau",
    "Palestine",
    "Panama",
    "Papua New Guinea",
    "Paraguay",
    "Peru",
    "Philippines",
    "Poland",
    "Portugal",
    "Qatar",
    "Romania",
    "Russia",
    "Rwanda",
    "Saint Kitts and Nevis",
    "Saint Lucia",
    "Saint Vincent and the Grenadines",
    "Samoa",
    "San Marino",
    "Sao Tome and Principe",
    "Saudi Arabia",
    "Senegal",
    "Serbia",
    "Seychelles",
    "Sierra Leone",
    "Singapore",
    "Slovakia",
    "Slovenia",
    "Solomon Islands",
    "Somalia",
    "South Africa",
    "South Korea",
    "South Sudan",
    "Spain",
    "Sri Lanka",
    "Sudan",
    "Suriname",
    "Sweden",
    "Switzerland",
    "Syria",
    "Taiwan",
    "Tajikistan",
    "Tanzania",
    "Thailand",
    "Timor-Leste",
    "Togo",
    "Tonga",
    "Trinidad and Tobago",
    "Tunisia",
    "Turkey",
    "Turkmenistan",
    "Tuvalu",
    "Uganda",
    "Ukraine",
    "United Arab Emirates",
    "United Kingdom",
    "USA",
    "Uruguay",
    "Vanuatu",
    "Vatican City",
    "Venezuela",
    "Vietnam",
    "Yemen",
    "Zambia",
    "Zimbabwe"
  ],
  ru: [
    "Австралия",
    "Австрия",
    "Азербайджан",
    "Албания",
    "Алжир",
    "Ангола",
    "Андорра",
    "Антигуа и Барбуда",
    "Аргентина",
    "Армения",
    "Афганистан",
    "Багамы",
    "Бангладеш",
    "Барбадос",
    "Бахрейн",
    "Беларусь",
    "Белиз",
    "Бельгия",
    "Бенин",
    "Болгария",
    "Боливия",
    "Босния и Герцеговина",
    "Ботсвана",
    "Бразилия",
    "Бруней",
    "Буркина-Фасо",
    "Бурунди",
    "Бутан",
    "Вануату",
    "Ватикан",
    "Великобритания",
    "Венгрия",
    "Венесуэла",
    "Восточный Тимор",
    "Вьетнам",
    "Габон",
    "Гаити",
    "Гайана",
    "Гамбия",
    "Гана",
    "Гватемала",
    "Гвинея",
    "Гвинея-Бисау",
    "Германия",
    "Гондурас",
    "Гренада",
    "Греция",
    "Грузия",
    "ДР Конго",
    "Дания",
    "Джибути",
    "Доминика",
    "Доминиканская Республика",
    "Египет",
    "Замбия",
    "Зимбабве",
    "Израиль",
    "Индия",
    "Индонезия",
    "Иордания",
    "Ирак",
    "Иран",
    "Ирландия",
    "Исландия",
    "Испания",
    "Италия",
    "Йемен",
    "Кабо-Верде",
    "Казахстан",
    "Камбоджа",
    "Камерун",
    "Канада",
    "Катар",
    "Кения",
    "Кипр",
    "Кирибати",
    "Китай (включая Гонконг и Макао)",
    "Колумбия",
    "Коморы",
    "Конго",
    "Коста-Рика",
    "Кот-д’Ивуар",
    "Куба",
    "Кувейт",
    "Кыргызстан",
    "Лаос",
    "Латвия",
    "Лесото",
    "Либерия",
    "Ливан",
    "Ливия",
    "Литва",
    "Лихтенштейн",
    "Люксембург",
    "Маврикий",
    "Мавритания",
    "Мадагаскар",
    "Малави",
    "Малайзия",
    "Мальдивы",
    "Мальта",
    "Марокко",
    "Маршалловы Острова",
    "Мексика",
    "Микронезия",
    "Мозамбик",
    "Молдова",
    "Монако",
    "Монголия",
    "Мьянма",
    "Намибия",
    "Науру",
    "Непал",
    "Нигер",
    "Нигерия",
    "Нидерланды",
    "Никарагуа",
    "Новая Зеландия",
    "Норвегия",
    "ОАЭ",
    "Оман",
    "Пакистан",
    "Палау",
    "Панама",
    "Папуа — Новая Гвинея",
    "Парагвай",
    "Перу",
    "Польша",
    "Португалия",
    "Россия",
    "Руанда",
    "Румыния",
    "Сальвадор",
    "Самоа",
    "Сан-Томе и Принсипи",
    "Сан-Марино",
    "Саудовская Аравия",
    "Северная Корея",
    "Северная Македония",
    "Сейшельские острова",
    "Сенегал",
    "Сент-Винсент и Гренадины",
    "Сент-Китс и Невис",
    "Сент-Люсия",
    "Сербия",
    "Сингапур",
    "Сирия",
    "Словакия",
    "Словения",
    "Соломоновы Острова",
    "Сомали",
    "Судан",
    "Суринам",
    "США",
    "Сьерра-Леоне",
    "Таджикистан",
    "Таиланд",
    "Тайвань",
    "Танзания",
    "Того",
    "Тонга",
    "Тринидад и Тобаго",
    "Тувалу",
    "Тунис",
    "Турция",
    "Уганда",
    "Украина",
    "Уругвай",
    "Фиджи",
    "Филиппины",
    "Финляндия",
    "Франция",
    "Хорватия",
    "ЦАР",
    "Чад",
    "Черногория",
    "Чехия",
    "Чили",
    "Швейцария",
    "Швеция",
    "Шри-Ланка",
    "Эквадор",
    "Экваториальная Гвинея",
    "Эритрея",
    "Эсватини",
    "Эстония",
    "Эфиопия",
    "ЮАР",
    "Южный Судан",
    "Ямайка",
    "Япония"
  ],
  fr: [
    "Afghanistan",
    "Afrique du Sud",
    "Albanie",
    "Algérie",
    "Allemagne",
    "Andorre",
    "Angola",
    "Antigua-et-Barbuda",
    "Arabie Saoudite",
    "Argentine",
    "Arménie",
    "Australie",
    "Autriche",
    "Azerbaïdjan",
    "Bahamas",
    "Bahreïn",
    "Bangladesh",
    "Barbade",
    "Belgique",
    "Belize",
    "Bénin",
    "Bhoutan",
    "Biélorussie",
    "Bolivie",
    "Bosnie-Herzégovine",
    "Botswana",
    "Brésil",
    "Brunéi",
    "Bulgarie",
    "Burkina Faso",
    "Burundi",
    "Cabo Verde",
    "Cambodge",
    "Cameroun",
    "Canada",
    "Chili",
    "Chine (y compris Hong Kong et Macao)",
    "Chypre",
    "Colombie",
    "Comores",
    "Congo",
    "Corée du Nord",
    "Corée du Sud",
    "Costa Rica",
    "Côte d'Ivoire",
    "Croatie",
    "Cuba",
    "Danemark",
    "Djibouti",
    "Dominique",
    "Égypte",
    "Émirats Arabes Unis",
    "Équateur",
    "Érythrée",
    "Espagne",
    "Estonie",
    "Eswatini",
    "Éthiopie",
    "Fidji",
    "Finlande",
    "France",
    "Gabon",
    "Gambie",
    "Géorgie",
    "Ghana",
    "Grèce",
    "Grenade",
    "Guatemala",
    "Guinée",
    "Guinée équatoriale",
    "Guinée-Bissau",
    "Guyana",
    "Haïti",
    "Honduras",
    "Hongrie",
    "Îles Marshall",
    "Îles Salomon",
    "Inde",
    "Indonésie",
    "Irak",
    "Iran",
    "Irlande",
    "Islande",
    "Israël",
    "Italie",
    "Jamaïque",
    "Japon",
    "Jordanie",
    "Kazakhstan",
    "Kenya",
    "Kirghizistan",
    "Kiribati",
    "Koweït",
    "Laos",
    "Lesotho",
    "Lettonie",
    "Liban",
    "Libéria",
    "Libye",
    "Liechtenstein",
    "Lituanie",
    "Luxembourg",
    "Macédoine du Nord",
    "Madagascar",
    "Malaisie",
    "Maldives",
    "Mali",
    "Malte",
    "Maroc",
    "Maurice",
    "Mauritanie",
    "Mexique",
    "Micronésie",
    "Moldavie",
    "Monaco",
    "Mongolie",
    "Monténégro",
    "Mozambique",
    "Myanmar",
    "Namibie",
    "Nauru",
    "Népal",
    "Nicaragua",
    "Niger",
    "Nigéria",
    "Norvège",
    "Nouvelle-Zélande",
    "Oman",
    "Ouganda",
    "Pakistan",
    "Palaos",
    "Palestine",
    "Panama",
    "Papouasie-Nouvelle-Guinée",
    "Paraguay",
    "Pays-Bas",
    "Pérou",
    "Philippines",
    "Pologne",
    "Portugal",
    "Qatar",
    "République Centrafricaine",
    "République Démocratique du Congo",
    "République Dominicaine",
    "Roumanie",
    "Royaume-Uni",
    "Russie",
    "Rwanda",
    "Saint-Christophe-et-Niévès",
    "Sainte-Lucie",
    "Saint-Marin",
    "Saint-Vincent-et-les-Grenadines",
    "Samoa",
    "Sao Tomé-et-Principe",
    "Sénégal",
    "Serbie",
    "Seychelles",
    "Sierra Leone",
    "Singapour",
    "Slovaquie",
    "Slovénie",
    "Somalie",
    "Soudan",
    "Soudan du Sud",
    "Sri Lanka",
    "Suède",
    "Suisse",
    "Suriname",
    "Syrie",
    "Tadjikistan",
    "Taïwan",
    "Tanzanie",
    "Tchad",
    "Tchéquie",
    "Thaïlande",
    "Timor oriental",
    "Togo",
    "Tonga",
    "Trinité-et-Tobago",
    "Tunisie",
    "Turkménistan",
    "Turquie",
    "Tuvalu",
    "Ukraine",
    "Uruguay",
    "USA",
    "Vanuatu",
    "Vatican",
    "Venezuela",
    "Vietnam",
    "Yémen",
    "Zambie",
    "Zimbabwe"
  ]
};

interface ClientDashboardProps {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  currentUser: User;
  onLogout: () => void;
  onProfileUpdate: (user: User) => void;
}

export default function ClientDashboard({ currentLanguage, setLanguage, currentUser, onLogout, onProfileUpdate }: ClientDashboardProps) {
  // Views: 'cabinet' (Personal cabinet / history) or 'order_wizard' or 'payment'
  const [view, setView] = useState<'cabinet' | 'order_wizard' | 'payment'>('cabinet');
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState(getConfig());

  // Wizard state variables
  const [visaType, setVisaType] = useState<'Visa-free' | 'Visa'>('Visa-free');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode | ''>('');
  const [agreeOffer, setAgreeOffer] = useState(false);
  
  // Document base64 uploads
  const [passportScan, setPassportScan] = useState<string>('');
  const [arrivalStamp, setArrivalStamp] = useState<string>('');
  const [visaScan, setVisaScan] = useState<string>('');

  // Filename trackers for UI feedback
  const [passportName, setPassportName] = useState('');
  const [stampName, setStampName] = useState('');
  const [visaName, setVisaName] = useState('');

  // Error boundary tracker
  const [wizardError, setWizardError] = useState('');

  // Created Order state (for payment screen redirection)
  const [activePayingOrder, setActivePayingOrder] = useState<Order | null>(null);
  const [txId, setTxId] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [confirmCheckbox, setConfirmCheckbox] = useState(false);
  const [copiedState, setCopiedState] = useState(false);

  // Modals
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Profile editing State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newFirstName, setNewFirstName] = useState(currentUser.firstName || '');
  const [newLastName, setNewLastName] = useState(currentUser.lastName || '');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  useEffect(() => {
    setNewFirstName(currentUser.firstName || '');
    setNewLastName(currentUser.lastName || '');
  }, [currentUser]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setIsUpdatingProfile(true);

    if (!newFirstName.trim() || !newLastName.trim()) {
      setProfileError(currentLanguage === 'ru' ? 'Заполните имя и фамилию' : 'Please fill both first name and last name');
      setIsUpdatingProfile(false);
      return;
    }

    try {
      const updatedUser = await updateUserProfile(currentUser.id, newFirstName.trim(), newLastName.trim());
      onProfileUpdate(updatedUser);
      setProfileSuccess(currentLanguage === 'ru' ? 'Профиль успешно обновлен!' : 'Profile updated successfully!');
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setProfileError(err.message || 'Failed to update profile');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Custom calendar picker states
  const [activeDatePicker, setActiveDatePicker] = useState<'start' | 'end' | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(getTashkentTime().getMonth());
  const [calendarYear, setCalendarYear] = useState(getTashkentTime().getFullYear());

  const t = (key: string) => translations[currentLanguage]?.[key] || key;

  // Tashkent boundaries
  const tzDate = getTashkentTime();
  const todayString = formatTashkentDate(tzDate);

  const syncClientOrders = () => {
    const all = getOrders();
    const userOrders = all.filter(o => o.clientEmail.toLowerCase() === currentUser.email.toLowerCase());
    setOrders(userOrders);
  };

  useEffect(() => {
    // Sync historical orders for this client
    syncClientOrders();
  }, [view, currentUser]);

  useEffect(() => {
    window.addEventListener('db-sync', syncClientOrders);
    return () => {
      window.removeEventListener('db-sync', syncClientOrders);
    };
  }, [currentUser]);

  const handleStartNewOrder = () => {
    setVisaType('Visa-free');
    setCountry('');
    setStartDate('');
    setEndDate('');
    setCurrency('');
    setAgreeOffer(false);
    setPassportScan('');
    setArrivalStamp('');
    setVisaScan('');
    setPassportName('');
    setStampName('');
    setVisaName('');
    setWizardError('');
    setView('order_wizard');
  };

  // Utility to handle uploading to Firebase Storage
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: React.Dispatch<React.SetStateAction<string>>,
    setFileName: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setFileName(`${file.name} (Uploading...)`);

    try {
      const { uploadFileToStorage } = await import('../firebase');
      const downloadUrl = await uploadFileToStorage(file, `scans/${currentUser.id}`);
      setUrl(downloadUrl);
      setFileName(file.name);
    } catch (err) {
      console.error('File upload failed:', err);
      setFileName('Upload failed, try again');
    }
  };

  // Custom Calendar picker helper triggers & builders
  const openDatePicker = (type: 'start' | 'end') => {
    const activeDateValue = type === 'start' ? startDate : (endDate || startDate);
    if (activeDateValue) {
      const parts = activeDateValue.split('-');
      if (parts.length === 3) {
        setCalendarYear(parseInt(parts[0], 10));
        setCalendarMonth(parseInt(parts[1], 10) - 1);
      }
    } else {
      const today = getTashkentTime();
      setCalendarYear(today.getFullYear());
      setCalendarMonth(today.getMonth());
    }
    setActiveDatePicker(type);
  };

  const renderCalendar = (type: 'start' | 'end') => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const tempFirstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const firstDayIdx = tempFirstDay === 0 ? 6 : tempFirstDay - 1; // Mon-indexed (0 to 6)
    
    // previous month days
    const prevMonthIdx = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const prevYear = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    const daysInPrevMonth = new Date(prevYear, prevMonthIdx + 1, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isDisabled: boolean; isSelected: boolean }[] = [];

    // padding from previous month
    for (let i = firstDayIdx - 1; i >= 0; i--) {
      const prevDay = daysInPrevMonth - i;
      const mStr = (prevMonthIdx + 1) < 10 ? `0${prevMonthIdx + 1}` : `${prevMonthIdx + 1}`;
      const dStr = prevDay < 10 ? `0${prevDay}` : `${prevDay}`;
      const dateStr = `${prevYear}-${mStr}-${dStr}`;
      
      cells.push({
        dateStr,
        dayNum: prevDay,
        isCurrentMonth: false,
        isDisabled: true,
        isSelected: false
      });
    }

    // current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = (calendarMonth + 1) < 10 ? `0${calendarMonth + 1}` : `${calendarMonth + 1}`;
      const dStr = d < 10 ? `0${d}` : `${d}`;
      const dateStr = `${calendarYear}-${mStr}-${dStr}`;

      let isDisabled = false;
      if (type === 'start') {
        isDisabled = dateStr < todayString;
      } else {
        isDisabled = dateStr < (startDate || todayString);
      }

      const isSelected = (type === 'start' && dateStr === startDate) ||
                         (type === 'end' && dateStr === endDate);

      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isDisabled,
        isSelected
      });
    }

    // padding for next month
    const remaining = cells.length % 7;
    if (remaining > 0) {
      const nextMonthPadding = 7 - remaining;
      const nextMonthIdx = calendarMonth === 11 ? 0 : calendarMonth + 1;
      const nextYear = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
      for (let d = 1; d <= nextMonthPadding; d++) {
        const mStr = (nextMonthIdx + 1) < 10 ? `0${nextMonthIdx + 1}` : `${nextMonthIdx + 1}`;
        const dStr = d < 10 ? `0${d}` : `${d}`;
        const dateStr = `${nextYear}-${mStr}-${dStr}`;
        
        cells.push({
          dateStr,
          dayNum: d,
          isCurrentMonth: false,
          isDisabled: true,
          isSelected: false
        });
      }
    }

    const local = CALENDAR_LOCALS[currentLanguage] || CALENDAR_LOCALS['en'];

    const handlePrevMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (calendarMonth === 0) {
        setCalendarMonth(11);
        setCalendarYear(v => v - 1);
      } else {
        setCalendarMonth(v => v - 1);
      }
    };

    const handleNextMonth = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (calendarMonth === 11) {
        setCalendarMonth(0);
        setCalendarYear(v => v + 1);
      } else {
        setCalendarMonth(v => v + 1);
      }
    };

    const handleSelectDay = (cell: typeof cells[0]) => {
      if (cell.isDisabled || !cell.isCurrentMonth) return;
      if (type === 'start') {
        setStartDate(cell.dateStr);
        if (endDate && endDate < cell.dateStr) {
          setEndDate('');
        }
      } else {
        setEndDate(cell.dateStr);
      }
      setActiveDatePicker(null);
    };

    return (
      <div 
        id={`popover-calendar-${type}`} 
        className="absolute left-0 mt-2 z-50 w-72 rounded-2xl border border-gray-800 bg-[#111827] p-4 shadow-2xl shadow-black/85 font-mono select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Month header navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="text-gray-400 hover:text-[#a2e635] hover:bg-gray-800/50 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-xs font-semibold text-white tracking-widest uppercase">
            {local.months[calendarMonth]} {calendarYear}
          </span>
          
          <button
            type="button"
            onClick={handleNextMonth}
            className="text-gray-400 hover:text-[#a2e635] hover:bg-gray-800/50 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Days of week */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2 border-b border-gray-800/50 pb-1.5">
          {local.weekDays.map((wd, i) => (
            <span key={i} className="text-gray-500 text-[10px] uppercase font-bold py-1">
              {wd}
            </span>
          ))}
        </div>

        {/* Month grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            const isToday = cell.dateStr === todayString;
            return (
              <button
                key={idx}
                type="button"
                disabled={cell.isDisabled || !cell.isCurrentMonth}
                onClick={() => handleSelectDay(cell)}
                className={`
                  text-xs py-2 rounded-lg flex flex-col items-center justify-center transition-all focus:outline-none focus:ring-1 focus:ring-[#84cc16] cursor-pointer
                  ${!cell.isCurrentMonth ? 'text-gray-700 font-normal cursor-default bg-transparent hover:bg-transparent text-opacity-30' : ''}
                  ${cell.isDisabled && cell.isCurrentMonth ? 'text-gray-600 line-through cursor-not-allowed bg-gray-900/10' : ''}
                  ${cell.isCurrentMonth && !cell.isDisabled && !cell.isSelected ? 'text-gray-200 hover:bg-[#65a30d]/20 hover:text-[#a2e635] font-semibold' : ''}
                  ${cell.isSelected ? 'bg-[#65a30d] text-white shadow-md shadow-[#65a30d]/30 font-bold saturate-120' : ''}
                  ${isToday && !cell.isSelected ? 'border border-[#65a30d]/40 text-[#a2e635]' : ''}
                `}
              >
                <span>{cell.dayNum}</span>
              </button>
            );
          })}
        </div>

        {/* Footer info/clear button */}
        <div className="mt-3 pt-3 border-t border-gray-800 flex justify-between items-center text-[10px]">
          <span className="text-gray-500 font-sans">
            {type === 'start' ? t('startDateLabel') : t('endDateLabel')}
          </span>
          <button
            type="button"
            onClick={() => {
              if (type === 'start') {
                setStartDate('');
                setEndDate('');
              } else {
                setEndDate('');
              }
              setActiveDatePicker(null);
            }}
            className="text-[#a2e635] hover:underline hover:text-white transition-all font-sans cursor-pointer"
          >
            {currentLanguage === 'ru' ? 'Очистить' : currentLanguage === 'fr' ? 'Effacer' : 'Clear'}
          </button>
        </div>
      </div>
    );
  };

  // Pricing math calculator
  const calculateTotalRate = () => {
    if (!startDate || !endDate) return { days: 0, finalPrice: 0, rate: 0 };
    const s = new Date(startDate);
    const e = new Date(endDate);
    
    // Compute total inclusive days
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (!currency) {
      return {
        days,
        rate: 0,
        finalPrice: 0
      };
    }

    let rate = 5; // USD & EUR
    if (currency === 'RUB') rate = 500;
    if (currency === 'UZS') rate = 70000;

    return {
      days,
      rate,
      finalPrice: days * rate
    };
  };

  const { days, rate, finalPrice } = calculateTotalRate();

  const handleCreateOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError('');

    if (!country) {
      setWizardError(t('countryError'));
      return;
    }
    if (!passportScan || !arrivalStamp || (visaType === 'Visa' && !visaScan)) {
      setWizardError(t('docsMissingError'));
      return;
    }
    if (!startDate || !endDate) {
      setWizardError('Select valid registration dates');
      return;
    }
    if (!currency) {
      setWizardError(t('currencyError'));
      return;
    }
    
    // Past date block
    if (startDate < todayString) {
      setWizardError(t('pastDateError'));
      return;
    }
    if (endDate < startDate) {
      setWizardError(t('endDateError'));
      return;
    }
    if (!agreeOffer) {
      setWizardError(t('agreementError'));
      return;
    }

    try {
      // Build order matching schema
      const orderData = {
        userId: currentUser.id,
        clientName: `${currentUser.firstName} ${currentUser.lastName}`,
        clientEmail: currentUser.email,
        visaType,
        country,
        passportScan,
        arrivalStamp,
        visaScan: visaType === 'Visa' ? visaScan : undefined,
        startDate,
        endDate,
        currency,
        dailyRate: rate,
        totalDays: days,
        totalPrice: finalPrice,
      };

      const pendingOrder = createOrder(orderData, currentLanguage);
      setActivePayingOrder(pendingOrder);
      
      // Clear forms
      setCountry('');
      setPassportScan('');
      setArrivalStamp('');
      setVisaScan('');
      setPassportName('');
      setStampName('');
      setVisaName('');
      setAgreeOffer(false);

      // Route straight to card payment terminal
      setView('payment');
    } catch (err: any) {
      setWizardError(err.message || 'Error executing registration creation.');
    }
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');
    setPaymentSuccess('');

    if (!confirmCheckbox) {
      setPaymentError(t('paymentFileError'));
      return;
    }
    if (!activePayingOrder) return;

    try {
      const autoTxId = `TX-P2P-${activePayingOrder.id}-${Math.floor(1000 + Math.random() * 9000)}`;
      const updatedOrder = submitPayment(activePayingOrder.id, autoTxId);
      setPaymentSuccess(t('paymentSuccess'));
      setTxId('');
      setConfirmCheckbox(false);
      
      setTimeout(() => {
        setPaymentSuccess('');
        setActivePayingOrder(null);
        setView('cabinet');
      }, 3500);
    } catch (err: any) {
      setPaymentError(err.message || 'Error validating transaction receipt.');
    }
  };

  const handleCopyCard = (num: string) => {
    const cleanNum = num.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanNum);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleDownloadFile = (dataUrl: string, defaultName: string) => {
    if (!dataUrl) return;
    if (dataUrl.startsWith('data:')) {
      try {
        const parts = dataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
        const binary = atob(parts[1]);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
          array.push(binary.charCodeAt(i));
        }
        const blob = new Blob([new Uint8Array(array)], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = defaultName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error("Failed to download file from data URL", err);
      }
    }
    // If it's a seed file/string placeholder, just create a small txt placeholder
    const blob = new Blob([`Mock document download for ${defaultName}\n(Seed Document Data)`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = defaultName.replace('.png', '.txt').replace('.pdf', '.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generates dummy PDF files for completed registrations to show rich outputs
  const handleDownloadStubPDF = (order: Order) => {
    if (order.finalDocUrl && order.finalDocUrl.startsWith('data:')) {
      try {
        const parts = order.finalDocUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const binary = atob(parts[1]);
        const array = [];
        for (let i = 0; i < binary.length; i++) {
          array.push(binary.charCodeAt(i));
        }
        const blob = new Blob([new Uint8Array(array)], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = order.finalDocName || `Registration-Stamp-${order.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      } catch (err) {
        console.error("Failed to download custom uploaded document, falling back to stub", err);
      }
    }

    // Set headers
    const content = `REGISTAPP OFFICIAL REGISTRATION CERTIFICATE\n` +
                    `Uzbekistan State Border and Tourism Inspectorate\n` +
                    `---------------------------------------------\n` +
                    `Order ID: ${order.id}\n` +
                    `Citizen Name: ${order.clientName}\n` +
                    `Citizenship: ${translateCountry(order.country, currentLanguage)}\n` +
                    `Visa Type: ${order.visaType}\n` +
                    `Period: From ${order.startDate} to ${order.endDate} (${order.totalDays} Days)\n` +
                    `Payment: ${order.totalPrice} ${order.currency}\n` +
                    `Receipt: ${order.paymentTxId}\n` +
                    `Verified On: ${order.confirmedAt}\n` +
                    `---------------------------------------------\n` +
                    `VERIFICATION QR HASH: eMehmon-uz-${order.id}-9821\n` +
                    `Status: CERTIFIED AND COMPLIANT WITH MIGRATION CODE\n`;
                    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Uzbekistan-Registration-${order.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadViolationPDFForOrder = (order: Order) => {
    let targetLang = currentLanguage;
    if (order.violationReportUrl === 'VIOLATION-GUIDE-RU.pdf' || order.id.endsWith('R')) {
      targetLang = 'ru';
    } else if (order.violationReportUrl === 'VIOLATION-GUIDE-FR.pdf' || order.id.endsWith('F')) {
      targetLang = 'fr';
    } else if (order.violationReportUrl === 'VIOLATION-GUIDE-EN.pdf' || order.id.endsWith('E')) {
      targetLang = 'en';
    }

    const content = getViolationGuideText(targetLang);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let filename = `Migration_Law_Violation_Warning_Guide.txt`;
    if (targetLang === 'ru') {
      filename = `Pamyatka_Narushitelya_Migracionnogo_Zakonodatelstva.txt`;
    } else if (targetLang === 'fr') {
      filename = `Guide_Avertissement_Violation_Loi_Migration.txt`;
    }
    
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadViolationPDF = () => {
    const orderWithViolation = orders.find(o => o.violationReportUrl);
    let targetLang = currentLanguage;
    if (orderWithViolation) {
      if (orderWithViolation.violationReportUrl === 'VIOLATION-GUIDE-RU.pdf' || orderWithViolation.id.endsWith('R')) {
        targetLang = 'ru';
      } else if (orderWithViolation.violationReportUrl === 'VIOLATION-GUIDE-FR.pdf' || orderWithViolation.id.endsWith('F')) {
        targetLang = 'fr';
      } else if (orderWithViolation.violationReportUrl === 'VIOLATION-GUIDE-EN.pdf' || orderWithViolation.id.endsWith('E')) {
        targetLang = 'en';
      }
    }

    const content = getViolationGuideText(targetLang);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let filename = `Migration_Law_Violation_Warning_Guide.txt`;
    if (targetLang === 'ru') {
      filename = `Pamyatka_Narushitelya_Migracionnogo_Zakonodatelstva.txt`;
    } else if (targetLang === 'fr') {
      filename = `Guide_Avertissement_Violation_Loi_Migration.txt`;
    }
    
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Filter list of selectable countries based on citizenship category
  const activeCountryList = visaType === 'Visa-free' ? VISA_FREE_COUNTRIES[currentLanguage] : VISA_REQUIRED_COUNTRIES[currentLanguage];

  // Active Card details from DB Config
  const cardDetails = config.bankCards;
  const currentCardNumber = cardDetails[currency] || '8600 0000 0000 0000';

  return (
    <div id="div-client-dashboard-root" className="min-h-screen bg-[#111827] text-gray-100 font-sans p-4 sm:p-6 md:p-8 selection:bg-[#65a30d]/40 selection:text-white">
      
      {/* Mini Breadcrumb Status Header */}
      <div id="div-client-main-shell" className="max-w-6xl mx-auto">
        <header id="header-client-panel" className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-800 pb-6 mb-8 gap-4">
          <div className="flex items-center space-x-3">
            <BrandLogo id="client-header-logo" iconOnly={true} />
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white select-none">
                Regist<span className="text-[#7A9A3C]">App</span><sup className="text-[10px] md:text-xs font-normal align-super">®</sup> —{' '}
                <span className="font-normal text-gray-400 text-sm md:text-lg">
                  {currentLanguage === 'ru' 
                    ? 'онлайн-портал туристической регистрации.' 
                    : currentLanguage === 'fr' 
                    ? 'portail d\'enregistrement touristique en ligne.' 
                    : 'online tourist registration portal.'}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="flex items-center space-x-1.5 justify-end">
                <span className="text-sm font-semibold text-gray-200">{currentUser.firstName} {currentUser.lastName}</span>
              </div>
              <p className="text-xs text-[#a2e635] font-mono">{currentUser.email}</p>
            </div>
            
            {/* Language Switcher */}
            <div className="flex items-center space-x-1.5 border border-gray-800 bg-[#1f2937]/40 px-3 py-2 rounded-xl">
              <Languages className="h-3.5 w-3.5 text-gray-400" />
              <select
                id="select-client-language"
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                className="bg-transparent text-xs text-gray-300 outline-none cursor-pointer pr-1"
              >
                <option value="en" className="bg-[#111827]">EN</option>
                <option value="ru" className="bg-[#111827]">RU</option>
                <option value="fr" className="bg-[#111827]">FR</option>
              </select>
            </div>

            <button
              id="btn-client-logout"
              onClick={onLogout}
              className="flex items-center space-x-2 rounded-xl border border-gray-800 bg-[#1f2937]/60 px-4 py-2 text-xs text-gray-400 hover:border-red-900 hover:text-red-400 transition"
            >
              <LogOut className="h-4 w-4" />
              <span>{t('logOut')}</span>
            </button>
          </div>
        </header>

        {/* Any Violation Warnings Issued by Operators */}
        {orders.some(o => o.violationReportUrl) && (
          <div id="alert-client-violation-severe" className="mb-8 rounded-2xl border border-red-800 bg-red-950/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-500 mt-1 shrink-0 animate-pulse" />
              <div>
                <h4 className="text-sm font-bold text-red-400 tracking-tight">CRITICAL ADVISORY: MIGRATION COMPLIANCE FLAG</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                  The local immigration authorities have detected discrepancies or delay on your registration timeline. Please download and review the detailed Migration Law Violation instructions immediately to avoid deportation or court penalties.
                </p>
              </div>
            </div>
            <button
              id="btn-download-violation-guide"
              onClick={handleDownloadViolationPDF}
              className="w-full md:w-auto shrink-0 flex items-center justify-center space-x-2 rounded-xl bg-red-650 hover:bg-red-750 text-white text-xs font-semibold px-4 py-2.5 transition shadow-lg"
            >
              <FileText className="h-4 w-4" />
              <span>{t('violationReport')}</span>
            </button>
          </div>
        )}

        {/* View Router */}

        {/* 1. Client Personal Cabinet View */}
        {view === 'cabinet' && (
          <div id="view-client-history" className="space-y-8">
            {/* Elegant Profile Summary Banner */}
            <div id="client-profile-summary-banner" className="bg-gradient-to-r from-zinc-900 via-[#1f2937]/50 to-zinc-900 border border-gray-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-xl bg-[#65a30d]/10 border border-[#65a30d]/30 flex items-center justify-center text-[#a2e635] shrink-0">
                  <span className="text-lg font-bold font-mono">
                    {(currentUser.firstName?.[0] || 'U').toUpperCase()}{(currentUser.lastName?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="text-base font-bold text-white flex flex-wrap items-center gap-2">
                    <span>{currentUser.firstName} {currentUser.lastName}</span>
                    {(currentUser.lastName === 'User' || currentUser.firstName === currentUser.email.split('@')[0]) && (
                      <span className="text-[10px] bg-amber-500/10 text-[#f59e0b] border border-[#d97706]/30 px-2 py-0.5 rounded font-normal font-sans animate-pulse">
                        {currentLanguage === 'ru' ? 'Рекомендуется настроить фамилию' : 'Please configure proper names'}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">{currentLanguage === 'ru' ? 'Электронная почта:' : 'Email address:'} <span className="font-mono text-gray-500">{currentUser.email}</span></p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-tight">{t('yourOrders')}</h3>
              {(orders.some(o => o.status === 'Rejected due to violations' || o.status === 'Violation')) ? (
                <div className="flex items-center space-x-2 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 px-4 py-2.5 text-xs font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0 animate-pulse text-red-500" />
                  <span>{currentLanguage === 'ru' ? 'Новые регистрации заблокированы' : currentLanguage === 'fr' ? 'Inscriptions bloquées' : 'New registrations blocked'}</span>
                </div>
              ) : (
                <button
                  id="btn-new-registration-order"
                  onClick={handleStartNewOrder}
                  className="flex items-center space-x-2 rounded-xl bg-[#65a30d] px-4 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#4d7c0f] hover:text-white select-none transition duration-300"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t('newOrderBtn')}</span>
                </button>
              )}
            </div>

            {orders.length === 0 ? (
              <div id="card-history-empty" className="rounded-2xl border border-dashed border-gray-800 bg-[#1f2937]/20 p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-700 mb-4 animate-pulse" />
                <p className="text-sm text-gray-400 max-w-sm mx-auto leading-relaxed">
                  {t('orderHistoryEmpty')}
                </p>
                {(orders.some(o => o.status === 'Rejected due to violations' || o.status === 'Violation')) ? (
                  <div className="mt-6 inline-flex items-center space-x-2 rounded-xl bg-red-950/40 border border-red-900/60 text-red-400 px-4 py-2 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0 animate-pulse text-red-500" />
                    <span>{currentLanguage === 'ru' ? 'Новые регистрации заблокированы' : 'New registrations blocked'}</span>
                  </div>
                ) : (
                  <button
                    id="btn-empty-state-new-order"
                    onClick={handleStartNewOrder}
                    className="mt-6 inline-flex items-center space-x-2 rounded-xl border border-gray-800 bg-[#1f2937]/50 px-4 py-2 text-xs text-[#a2e635] hover:border-[#65a30d] transition"
                  >
                    {t('newOrderBtn')}
                  </button>
                )}
              </div>
            ) : (
              <div id="table-client-orders-container" className="overflow-x-auto rounded-xl border border-gray-800 bg-[#1f2937]/40">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#111827]/80 border-b border-gray-800 select-none text-gray-400 font-mono tracking-wider">
                      <th className="p-4">{t('orderId')}</th>
                      <th className="p-4">{currentLanguage === 'ru' ? 'Размещено (Ожидание)' : currentLanguage === 'fr' ? 'Dépôt (Attente)' : 'Placement (Waiting)'}</th>
                      <th className="p-4">{t('countryLabel')}</th>
                      <th className="p-4">{t('registeredDates')}</th>
                      <th className="p-4">{t('cost')}</th>
                      <th className="p-4">{t('status')}</th>
                      <th className="p-4 text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {orders.map((o) => {
                      const isExpanded = expandedOrderId === o.id;
                      const isUrgent = isUrgentOrder(o.createdAt, o.status);
                      return (
                        <React.Fragment key={o.id}>
                          <tr 
                            id={`row-order-${o.id}`} 
                            className={`transition ${
                              isUrgent 
                                ? 'bg-red-950/10 hover:bg-red-950/20 border-l-[4px] border-l-red-500 shadow-[inset_4px_0_12px_rgba(239,68,68,0.06)]' 
                                : 'hover:bg-[#1f2937]/40 border-l-[4px] border-l-transparent'
                            }`}
                          >
                            <td className="p-4 font-mono font-bold text-white selection:bg-none">{o.id}</td>
                            <td className="p-4 font-mono text-gray-300 select-all font-medium">
                              <div>{formatPlacementAndWaiting(o.createdAt, o.status, o.completedAt, currentLanguage)}</div>
                              {isUrgent && (
                                <div className="mt-1.5 flex items-center space-x-1.5 px-2 py-0.5 rounded bg-red-950/95 text-red-300 border border-red-500/50 w-fit text-[9px] font-bold font-mono tracking-wider animate-pulse uppercase select-none">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                  </span>
                                  <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                                  <span>{currentLanguage === 'ru' ? 'СРОЧНО: >12 Ч' : currentLanguage === 'fr' ? 'URGENT: >12 H' : 'URGENT: >12H'}</span>
                                </div>
                              )}
                              {o.status === 'Completed' && o.completedAt && (
                                <div className="text-[10px] text-[#a2e635] mt-1 pt-1 border-t border-gray-800/20">
                                  <span className="text-gray-500 font-sans font-normal uppercase text-[8px] block tracking-wide">
                                    {currentLanguage === 'ru' ? 'Ответ' : currentLanguage === 'fr' ? 'Réponse' : 'Response'}:
                                  </span>
                                  <span>{formatResponseTimeAndExecution(o.createdAt, o.completedAt, currentLanguage)}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-4">{translateCountry(o.country, currentLanguage)} <span className="text-[10px] text-gray-500 font-sans block mt-0.5">{o.visaType === 'Visa' ? (currentLanguage === 'ru' ? 'визовый режим' : currentLanguage === 'fr' ? 'régime visa' : 'Visa status') : (currentLanguage === 'ru' ? 'безвизовый режим' : currentLanguage === 'fr' ? 'régime sans visa' : 'Visa-free status')}</span></td>
                            <td className="p-4">
                              <div className="flex items-center space-x-1.5">
                                <Calendar className="h-3.5 w-3.5 text-[#a2e635]" />
                                <span className="font-mono">{o.startDate} ~ {o.endDate}</span>
                              </div>
                              <span className="text-[10px] text-gray-500 font-sans block mt-0.5">{o.totalDays} {t('daysText')}</span>
                            </td>
                            <td className="p-4 font-bold text-gray-200">
                              {o.currency === 'UZS' ? `${o.totalPrice.toLocaleString()} UZS` : o.currency === 'EUR' ? `€${o.totalPrice}` : o.currency === 'RUB' ? `${o.totalPrice} RUB` : `$${o.totalPrice} USD`}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                o.status === 'Completed'
                                  ? 'bg-[#65a30d]/10 border border-[#65a30d]/30 text-[#a2e635]'
                                  : o.status === 'Paid'
                                  ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-400'
                                  : o.status === 'In Progress'
                                  ? 'bg-amber-950/40 border border-amber-800 text-amber-400'
                                  : (o.status === 'Rejected due to violations' || o.status === 'Violation')
                                  ? 'bg-red-950/40 border border-red-900 text-red-400'
                                  : 'bg-gray-850 border border-gray-700 text-gray-400'
                              }`}>
                                <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
                                  o.status === 'Completed' ? 'bg-[#65a30d]' : o.status === 'Paid' ? 'bg-emerald-500' : o.status === 'In Progress' ? 'bg-amber-500 animate-pulse' : (o.status === 'Rejected due to violations' || o.status === 'Violation') ? 'bg-red-500 shrink-0' : 'bg-gray-400'
                                }`} />
                                {o.status === 'Completed' ? (currentLanguage === 'ru' ? 'Завершен' : currentLanguage === 'fr' ? 'Terminé' : 'Completed') 
                                : o.status === 'Paid' ? (currentLanguage === 'ru' ? 'Оплачено' : currentLanguage === 'fr' ? 'Payé' : 'Paid') 
                                : o.status === 'In Progress' ? (currentLanguage === 'ru' ? 'В работе' : currentLanguage === 'fr' ? 'En cours' : 'In Progress') 
                                : (o.status === 'Rejected due to violations' || o.status === 'Violation') ? (currentLanguage === 'ru' ? 'Отказано (нарушение)' : currentLanguage === 'fr' ? 'Refusé infraction' : 'Violation / Rejected')
                                : (currentLanguage === 'ru' ? 'Ожидает оплаты' : currentLanguage === 'fr' ? 'En attente' : o.status)}
                              </span>
                              {o.status === 'Payment Pending' && o.paymentFailedMessage && (
                                <div className="mt-1.5 text-[10px] text-red-400 bg-red-950/30 border border-red-900/60 rounded-lg p-2 max-w-xs leading-relaxed font-sans" id={`payment-failed-alert-${o.id}`}>
                                  <span className="font-bold uppercase tracking-wide block text-[8px] text-red-550 mb-0.5">{currentLanguage === 'ru' ? 'Отказ по оплате' : 'Payment Failed Notice'}:</span>
                                  {o.paymentFailedMessage}
                                </div>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  id={`btn-toggle-files-${o.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedOrderId(isExpanded ? null : o.id);
                                  }}
                                  className={`flex items-center space-x-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition border ${
                                    isExpanded
                                      ? 'bg-gray-800 text-white border-gray-700'
                                      : 'bg-[#111827] text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                                  }`}
                                  title={currentLanguage === 'ru' ? 'Посмотреть загруженные файлы' : 'View uploaded files'}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  <span>{isExpanded ? (currentLanguage === 'ru' ? 'Скрыть файлы' : 'Hide Files') : (currentLanguage === 'ru' ? 'Все файлы' : 'All Files')}</span>
                                </button>

                                {o.status === 'Completed' ? (
                                  <button
                                    id={`btn-dl-pdf-${o.id}`}
                                    onClick={() => handleDownloadStubPDF(o)}
                                    className="flex items-center space-x-1.5 rounded-lg bg-[#65a30d] px-3 py-1.5 text-[11px] font-bold text-[#111827] hover:bg-[#4d7c0f] hover:text-white transition"
                                  >
                                    <Plus className="h-3 w-3 transform rotate-45" />
                                    <span>{t('downloadPdf')}</span>
                                  </button>
                                ) : (o.status === 'Rejected due to violations' || o.status === 'Violation') ? (
                                  <button
                                    id={`btn-dl-warning-${o.id}`}
                                    onClick={() => handleDownloadViolationPDFForOrder(o)}
                                    className="flex items-center space-x-1 border border-red-900 bg-red-950/30 text-red-400 px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-red-900 hover:text-white transition"
                                  >
                                    <FileText className="h-3.5 w-3.5 shrink-0" />
                                    <span>{currentLanguage === 'ru' ? 'Скачать памятку' : currentLanguage === 'fr' ? 'Guide d\'infractions' : 'Download Guide'}</span>
                                  </button>
                                ) : o.status === 'Payment Pending' ? (
                                  <button
                                    id={`btn-resume-pay-${o.id}`}
                                    onClick={() => {
                                      setActivePayingOrder(o);
                                      setView('payment');
                                    }}
                                    className="flex items-center space-x-1 border border-[#65a30d]/40 hover:bg-[#65a30d]/10 rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#a2e635] transition"
                                  >
                                    <DollarSign className="h-3 w-3" />
                                    <span>{t('payNow')}</span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-gray-500 italic block py-1">{t('verifyingStatus')}</span>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="bg-[#111827]/90 p-5 border-t border-b border-gray-800 relative">
                                <div className="space-y-4 animate-fade-in text-gray-350">
                                  <div className="flex items-center justify-between border-b border-gray-800/60 pb-2">
                                    <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-[#a2e635] flex items-center space-x-2">
                                      <FileText className="h-3.5 w-3.5 text-[#a2e635]" />
                                      <span>
                                        {currentLanguage === 'ru' ? 'Документы и файлы по заказу' : currentLanguage === 'fr' ? 'Documents et fichiers de la commande' : 'Order Documents & Files'}
                                      </span>
                                    </h4>
                                    <span className="text-[10px] text-gray-500 font-mono tracking-wide">ID: {o.id}</span>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                                    {/* Passport */}
                                    <div className="bg-[#1f2937]/50 rounded-xl border border-gray-800 p-3.5 flex flex-col justify-between space-y-3">
                                      <div>
                                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest block">
                                          {currentLanguage === 'ru' ? 'Копия паспорта' : currentLanguage === 'fr' ? 'Passeport' : 'Passport Page'}
                                        </span>
                                        <span className="text-xs text-white font-bold block mt-1 line-clamp-1">
                                          {currentLanguage === 'ru' ? 'Основной разворот' : currentLanguage === 'fr' ? 'Page principale' : 'Photo & Info'}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadFile(o.passportScan, `Passport-${o.clientName.replace(/\s+/g, '_')}.png`)}
                                        className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-[#111827] hover:bg-gray-800 text-[10px] font-bold text-gray-300 transition hover:text-white border border-gray-800 hover:border-gray-750"
                                      >
                                        <Plus className="h-3 w-3 transform rotate-45 shrink-0 text-gray-400" />
                                        <span>{currentLanguage === 'ru' ? 'Скачать файл' : currentLanguage === 'fr' ? 'Télécharger' : 'Download copy'}</span>
                                      </button>
                                    </div>

                                    {/* Entry Stamp */}
                                    <div className="bg-[#1f2937]/50 rounded-xl border border-gray-800 p-3.5 flex flex-col justify-between space-y-3">
                                      <div>
                                        <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest block">
                                          {currentLanguage === 'ru' ? 'Штамп о въезде' : currentLanguage === 'fr' ? 'Tampon d\'entrée' : 'Entry Stamp'}
                                        </span>
                                        <span className="text-xs text-white font-bold block mt-1 line-clamp-1">
                                          {currentLanguage === 'ru' ? 'Отметка КПП границы' : currentLanguage === 'fr' ? 'Contrôle frontière' : 'Border Control Mark'}
                                        </span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleDownloadFile(o.arrivalStamp, `Entry-Stamp-${o.clientName.replace(/\s+/g, '_')}.png`)}
                                        className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-[#111827] hover:bg-gray-800 text-[10px] font-bold text-gray-300 transition hover:text-white border border-gray-800 hover:border-gray-750"
                                      >
                                        <Plus className="h-3 w-3 transform rotate-45 shrink-0 text-gray-400" />
                                        <span>{currentLanguage === 'ru' ? 'Скачать файл' : currentLanguage === 'fr' ? 'Télécharger' : 'Download copy'}</span>
                                      </button>
                                    </div>

                                    {/* Visa Scan if Visa status */}
                                    {o.visaType === 'Visa' && o.visaScan && (
                                      <div className="bg-[#1f2937]/50 rounded-xl border border-gray-800 p-3.5 flex flex-col justify-between space-y-3">
                                        <div>
                                          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-widest block">
                                            {currentLanguage === 'ru' ? 'Визовый документ' : currentLanguage === 'fr' ? 'Visa' : 'Visa Slip'}
                                          </span>
                                          <span className="text-xs text-white font-bold block mt-1 line-clamp-1">
                                            {currentLanguage === 'ru' ? 'Сканированная виза' : currentLanguage === 'fr' ? 'Visa officiel' : 'Official Visa Scan'}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadFile(o.visaScan!, `Visa-${o.clientName.replace(/\s+/g, '_')}.png`)}
                                          className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-[#111827] hover:bg-gray-800 text-[10px] font-bold text-gray-300 transition hover:text-white border border-gray-800 hover:border-gray-750"
                                        >
                                          <Plus className="h-3 w-3 transform rotate-45 shrink-0 text-gray-400" />
                                          <span>{currentLanguage === 'ru' ? 'Скачать файл' : currentLanguage === 'fr' ? 'Télécharger' : 'Download copy'}</span>
                                        </button>
                                      </div>
                                    )}

                                    {/* Final Registration if completed */}
                                    {o.status === 'Completed' && o.finalDocUrl && (
                                      <div className="bg-[#65a30d]/10 rounded-xl border border-[#65a30d]/40 p-3.5 flex flex-col justify-between space-y-3 col-span-1 md:col-span-1">
                                        <div>
                                          <span className="text-[9px] font-semibold text-[#a2e635] uppercase tracking-widest block">
                                            {currentLanguage === 'ru' ? 'Итоговая регистрация (PDF)' : currentLanguage === 'fr' ? 'Enregistrement' : 'Issued Registration'}
                                          </span>
                                          <span className="text-xs text-white font-extrabold block mt-1 line-clamp-1">
                                            {o.finalDocName || `Registration-${o.id}.pdf`}
                                          </span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => handleDownloadStubPDF(o)}
                                          className="w-full flex items-center justify-center space-x-1.5 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-[10px] font-black text-white hover:shadow-md transition cursor-pointer"
                                        >
                                          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                                          <span>{currentLanguage === 'ru' ? 'Скачать PDF' : currentLanguage === 'fr' ? 'Télécharger PDF' : 'Download PDF'}</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. Step-by-Step Registration Wizard View */}
        {view === 'order_wizard' && (
          <div id="wizard-client-new-request" className="max-w-2xl mx-auto rounded-2xl border border-gray-800 bg-[#1f2937]/40 p-6 md:p-8 shadow-2xl">
            <div className="mb-6 border-b border-gray-800 pb-4">
              <button
                id="btn-wizard-back"
                onClick={() => setView('cabinet')}
                className="text-xs text-gray-400 hover:text-gray-200 transition"
              >
                ← {t('back')}
              </button>
              <h2 className="text-xl font-bold text-white tracking-tight mt-3">{t('newOrderBtn')}</h2>
              <p className="text-xs text-gray-400 mt-1">
                {currentLanguage === 'ru' 
                  ? 'Предоставьте данные паспорта и иммиграционный штамп въезда для регистрации.' 
                  : currentLanguage === 'fr' 
                  ? 'Fournissez les détails de votre passeport et de votre tampon d\'entrée d\'immigration pour vous enregistrer.' 
                  : 'Provide your passport bio details and immigration arrival stamp to register.'}
              </p>
            </div>

            <form id="form-registration-wizard" onSubmit={handleCreateOrderSubmit} className="space-y-6">
              
              {/* Citizenship category button selection */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">{t('visaChoiceTitle')}</label>
                <div className="grid grid-cols-2 gap-3" id="selection-visa-category">
                  <button
                    id="btn-visa-category-free"
                    type="button"
                    onClick={() => {
                      setVisaType('Visa-free');
                      setCountry('');
                    }}
                    className={`rounded-xl border p-4 text-center text-xs font-semibold transition ${
                      visaType === 'Visa-free'
                        ? 'border-[#65a30d] bg-[#65a30d]/10 text-[#a2e635]'
                        : 'border-gray-800 bg-[#111827] text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span>{t('visaFreeBtn')}</span>
                  </button>
                  <button
                    id="btn-visa-category-required"
                    type="button"
                    onClick={() => {
                      setVisaType('Visa');
                      setCountry('');
                    }}
                    className={`rounded-xl border p-4 text-center text-xs font-semibold transition ${
                      visaType === 'Visa'
                        ? 'border-[#65a30d] bg-[#65a30d]/10 text-[#a2e635]'
                        : 'border-gray-800 bg-[#111827] text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span>{t('visaRequiredBtn')}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Filtered Country Selector */}
              <div>
                <label htmlFor="select-citizen-country" className="block text-xs font-medium text-gray-400 mb-1.5">{t('countryLabel')}</label>
                <div className="relative">
                  <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${country ? 'text-[#a2e635]' : 'text-gray-500'}`} />
                  <select
                    id="select-citizen-country"
                    required
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-xs outline-none transition ${
                      country
                        ? 'border-[#65a30d] bg-[#65a30d]/10 text-[#a2e635] focus:border-[#65a30d]'
                        : 'border-gray-800 bg-[#111827] text-gray-400 hover:border-gray-700 focus:border-[#65a30d]'
                    }`}
                  >
                    <option value="" className="bg-[#111827] text-gray-400">-- {t('selectCountryPlaceholder')} --</option>
                    {activeCountryList.map(c => (
                      <option key={c} value={c} className="bg-[#111827] text-white">{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Document slots */}
              <div className="border-t border-gray-800/80 pt-6">
                <h4 className="text-xs font-semibold text-gray-300 font-mono uppercase tracking-wider mb-3">{t('docsUploadTitle')}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Slot 1: Passport Page Scan */}
                  <div id="upload-slot-passport" className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${passportScan ? 'border-[#65a30d] bg-[#65a30d]/10' : 'border-gray-800 bg-[#111827]'}`}>
                    <div>
                      <span className={`text-[11px] font-bold block mb-1 transition-colors ${passportScan ? 'text-[#a2e635]' : 'text-gray-300'}`}>{t('passportScanLabel')} <span className="text-red-500">*</span></span>
                      <p className="text-[10px] text-gray-500 leading-normal mb-3">
                        {currentLanguage === 'ru' ? 'Главная страница с фото полностью читаема, без бликов.' : currentLanguage === 'fr' ? 'Page principale avec photo bien lisible, sans reflets.' : 'Front photo bio page fully legible, no screen glares.'}
                      </p>
                    </div>
                    <label className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-300 ${passportScan ? 'border-solid border-[#65a30d]/55 bg-[#65a30d]/10 hover:bg-[#65a30d]/20' : 'border-dashed border-gray-800 bg-[#1f2937]/40 hover:border-gray-700 hover:bg-[#1f2937]'}`}>
                      <UploadCloud className={`h-5 w-5 mb-1 transition-colors ${passportScan ? 'text-[#a2e635]' : 'text-gray-500'}`} />
                      <span className={`text-[9px] text-center font-medium ${passportScan ? 'text-[#a2e635]' : 'text-gray-400'}`}>
                        {passportName 
                          ? (currentLanguage === 'ru' ? 'Выбрано: ' : currentLanguage === 'fr' ? 'Sélectionné: ' : 'Selected: ') + passportName.slice(0, 20) + '...' 
                          : t('dragDropLabel')}
                      </span>
                      <input
                        id="input-file-passport"
                        type="file"
                        accept="image/*"
                        required
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setPassportScan, setPassportName)}
                      />
                    </label>
                  </div>

                  {/* Slot 2: Arrival border Stamp scan */}
                  <div id="upload-slot-stamp" className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${arrivalStamp ? 'border-[#65a30d] bg-[#65a30d]/10' : 'border-gray-800 bg-[#111827]'}`}>
                    <div>
                      <span className={`text-[11px] font-bold block mb-1 transition-colors ${arrivalStamp ? 'text-[#a2e635]' : 'text-gray-300'}`}>{t('arrivalStampLabel')} <span className="text-red-500">*</span></span>
                      <p className="text-[10px] text-gray-500 leading-normal mb-3">
                        {currentLanguage === 'ru' ? 'Штамп пограничного контроля при въезде самолетом или сухопутным путем.' : currentLanguage === 'fr' ? 'Tampon de contrôle des frontières à l\'entrée par avion ou par voie terrestre.' : 'Immigration entry stamp from flight or land crossing.'}
                      </p>
                    </div>
                    <label className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-300 ${arrivalStamp ? 'border-solid border-[#65a30d]/55 bg-[#65a30d]/10 hover:bg-[#65a30d]/20' : 'border-dashed border-gray-800 bg-[#1f2937]/40 hover:border-gray-700 hover:bg-[#1f2937]'}`}>
                      <UploadCloud className={`h-5 w-5 mb-1 transition-colors ${arrivalStamp ? 'text-[#a2e635]' : 'text-gray-500'}`} />
                      <span className={`text-[9px] text-center font-medium ${arrivalStamp ? 'text-[#a2e635]' : 'text-gray-400'}`}>
                        {stampName 
                          ? (currentLanguage === 'ru' ? 'Выбрано: ' : currentLanguage === 'fr' ? 'Sélectionné: ' : 'Selected: ') + stampName.slice(0, 20) + '...' 
                          : t('dragDropLabel')}
                      </span>
                      <input
                        id="input-file-stamp"
                        type="file"
                        accept="image/*"
                        required
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, setArrivalStamp, setStampName)}
                      />
                    </label>
                  </div>

                  {/* Slot 3 (Conditional): Uzbekistan visa stamp scan */}
                  {visaType === 'Visa' && (
                    <div id="upload-slot-visa" className={`rounded-xl border p-4 flex flex-col justify-between md:col-span-2 transition-all duration-300 ${visaScan ? 'border-[#65a30d] bg-[#65a30d]/10' : 'border-gray-800 bg-[#111827]'}`}>
                      <div>
                        <span className={`text-[11px] font-bold block mb-1 transition-colors ${visaScan ? 'text-[#a2e635]' : 'text-gray-300'}`}>{t('visaScanLabel')} <span className="text-red-500">*</span></span>
                        <p className="text-[10px] text-gray-500 leading-normal mb-3">
                          {currentLanguage === 'ru' ? 'Бумажная виза из посольства или электронная виза с QR-кодом.' : currentLanguage === 'fr' ? 'Visa physique de l\'ambassade ou e-Visa avec code QR.' : 'Physical embassy sticker or QR PDF of your eVisa.'}
                        </p>
                      </div>
                      <label className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-300 ${visaScan ? 'border-solid border-[#65a30d]/55 bg-[#65a30d]/10 hover:bg-[#65a30d]/20' : 'border-dashed border-gray-800 bg-[#1f2937]/40 hover:border-gray-700 hover:bg-[#1f2937]'}`}>
                        <UploadCloud className={`h-5 w-5 mb-1 transition-colors ${visaScan ? 'text-[#a2e635]' : 'text-gray-500'}`} />
                        <span className={`text-[9px] text-center font-medium ${visaScan ? 'text-[#a2e635]' : 'text-gray-400'}`}>
                          {visaName 
                            ? (currentLanguage === 'ru' ? 'Выбрано: ' : currentLanguage === 'fr' ? 'Sélectionné: ' : 'Selected: ') + visaName.slice(0, 20) + '...' 
                            : t('dragDropLabel')}
                        </span>
                        <input
                          id="input-file-visa"
                          type="file"
                          accept="image/*"
                          required={visaType === 'Visa'}
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, setVisaScan, setVisaName)}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Start & End Dates Calendar Picker */}
              <div className="border-t border-gray-800 pt-6">
                <h4 className="text-xs font-semibold text-gray-300 font-mono uppercase tracking-wider mb-3">{t('calendarTitle')}</h4>
                
                {/* Backdrop click shield to handle clicking outside */}
                {activeDatePicker && (
                  <div 
                    id="calendar-click-shield"
                    className="fixed inset-0 z-40 bg-transparent cursor-default"
                    onClick={() => setActiveDatePicker(null)}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className="block text-[11px] text-gray-400 mb-1">{t('startDateLabel')}</label>
                    <button
                      id="btn-date-start-picker"
                      type="button"
                      onClick={() => openDatePicker('start')}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs outline-none font-mono text-left transition-all cursor-pointer relative ${
                        startDate
                          ? 'border-[#65a30d] bg-[#65a30d]/10 text-[#a2e635]'
                          : 'border-gray-800 bg-[#111827] text-gray-500 hover:border-gray-700'
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <Calendar className={`h-4 w-4 transition-colors ${startDate ? 'text-[#a2e635]' : 'text-gray-500'}`} />
                        <span className={startDate ? "text-[#a2e635] font-semibold" : "text-gray-500"}>
                          {startDate ? formatDisplayDate(startDate, currentLanguage) : CALENDAR_LOCALS[currentLanguage]?.selectDate || 'Select Date'}
                        </span>
                      </span>
                    </button>
                    <input type="hidden" name="startDate" value={startDate} />
                    
                    {activeDatePicker === 'start' && renderCalendar('start')}
                  </div>
                  
                  <div className="relative">
                    <label className="block text-[11px] text-gray-400 mb-1">{t('endDateLabel')}</label>
                    <button
                      id="btn-date-end-picker"
                      type="button"
                      onClick={() => openDatePicker('end')}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs outline-none font-mono text-left transition-all cursor-pointer relative ${
                        endDate
                          ? 'border-[#65a30d] bg-[#65a30d]/10 text-[#a2e635]'
                          : 'border-gray-800 bg-[#111827] text-gray-500 hover:border-gray-700'
                      }`}
                    >
                      <span className="flex items-center space-x-2.5">
                        <Calendar className={`h-4 w-4 transition-colors ${endDate ? 'text-[#a2e635]' : 'text-gray-500'}`} />
                        <span className={endDate ? "text-[#a2e635] font-semibold" : "text-gray-500"}>
                          {endDate ? formatDisplayDate(endDate, currentLanguage) : CALENDAR_LOCALS[currentLanguage]?.selectDate || 'Select Date'}
                        </span>
                      </span>
                    </button>
                    <input type="hidden" name="endDate" value={endDate} />
                    
                    {activeDatePicker === 'end' && renderCalendar('end')}
                  </div>
                </div>
              </div>

              {/* Currency Selector & Dynamic rate breakdown panel */}
              <div className="border-t border-gray-800 pt-6">
                <h4 className="text-xs font-semibold text-gray-300 font-mono uppercase tracking-wider mb-3">{t('pricingTitle')}</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#111827] border border-gray-800 rounded-xl p-4">
                  <div>
                    <label htmlFor="select-paying-currency" className="block text-[10px] uppercase font-mono tracking-wide text-gray-400 mb-1">{t('currencyLabel')}</label>
                    <select
                      id="select-paying-currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                      className={`w-full rounded-lg border px-3 py-2 text-xs outline-none transition ${
                        currency
                          ? 'border-[#65a30d] bg-[#65a30d]/10 text-[#a2e635] focus:border-[#65a30d]'
                          : 'border-gray-800 bg-[#1f2937] text-gray-400 focus:border-[#65a30d]'
                      }`}
                    >
                      <option value="" disabled className="bg-[#111827] text-gray-500">
                        {currentLanguage === 'ru' ? 'Выберите валюту' : currentLanguage === 'fr' ? 'Sélectionner une devise' : 'Select currency'}
                      </option>
                      <option value="USD" className="bg-[#111827] text-white">USD ($)</option>
                      <option value="EUR" className="bg-[#111827] text-white">EUR (€)</option>
                      <option value="RUB" className="bg-[#111827] text-white">RUB (₽)</option>
                      <option value="UZS" className="bg-[#111827] text-white">UZS (сум)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 text-xs select-none">
                    <div className="flex justify-between border-b border-gray-800 pb-1.5 text-gray-400">
                      <span>{t('dailyRateText')}:</span>
                      <span className="text-gray-200 font-bold font-mono">
                        {!currency ? '—' : currency === 'UZS' ? '70,000 UZS' : currency === 'RUB' ? '500 RUB' : currency === 'EUR' ? '€5 EUR' : '$5 USD'}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 pb-1.5 text-gray-400">
                      <span>{t('totalDaysText')}:</span>
                      <span className="text-gray-200 font-bold font-mono">{days} {t('daysText')}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold pt-1 text-sm bg-[#65a30d]/10 px-2 py-1 rounded border border-[#65a30d]/45">
                      <span>{t('totalPriceText')}:</span>
                      <span className="text-[#a2e635] font-mono">
                        {!currency ? '—' : currency === 'UZS' ? `${finalPrice.toLocaleString()} UZS` : currency === 'EUR' ? `€${finalPrice}` : currency === 'RUB' ? `${finalPrice} RUB` : `$${finalPrice} USD`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Public Offer Agreement checkbox and legal details modal popup */}
              <div className="flex items-start space-x-3 bg-[#111827]/40 p-4 rounded-xl border border-gray-800">
                <input
                  id="checkbox-public-offer-agree"
                  type="checkbox"
                  required
                  checked={agreeOffer}
                  onChange={(e) => setAgreeOffer(e.target.checked)}
                  className="mt-1 h-4.5 w-4.5 rounded border-gray-800 bg-[#111827] text-[#65a30d] outline-none accent-[#65a30d] transition"
                />
                <label htmlFor="checkbox-public-offer-agree" className="text-xs text-gray-400 leading-normal">
                  {t('agreementText')}{' '}
                  <button
                    id="btn-trigger-public-offer-modal"
                    type="button"
                    onClick={() => setShowOfferModal(true)}
                    className="text-[#a2e635] font-bold underline hover:text-[#84cc16]"
                  >
                    {t('publicOfferLink')}
                  </button>
                  {' '}{currentLanguage === 'ru' ? 'выпущенной RegistApp® от Jules Verne Hostel.' : currentLanguage === 'fr' ? 'émis par RegistApp® par Jules Verne Hostel.' : 'issued by RegistApp® by Jules Verne Hostel.'} <span className="text-red-500">*</span>
                </label>
              </div>

              {wizardError && (
                <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-wizard-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{wizardError}</span>
                </div>
              )}

              <button
                id="btn-wizard-submit-finalize"
                type="submit"
                className={`w-full rounded-xl py-3 text-sm font-semibold transition duration-300 ${
                  startDate && endDate
                    ? "bg-[#65a30d] text-[#111827] hover:bg-[#4d7c0f] hover:text-white shadow-lg shadow-[#65a30d]/10 cursor-pointer"
                    : "bg-zinc-800 border border-zinc-750/60 text-zinc-500 cursor-not-allowed opacity-60"
                }`}
              >
                {t('proceedPaymentBtn')}
              </button>
            </form>
          </div>
        )}

        {/* 3. Dedicated System Peer-to-Peer Payment Screen */}
        {view === 'payment' && activePayingOrder && (
          <div id="payment-gate-screen" className="max-w-xl mx-auto rounded-2xl border border-gray-800 bg-[#1f2937]/40 p-6 md:p-8 shadow-2xl">
            <div className="mb-6 border-b border-gray-800 pb-4 text-center">
              <span className="inline-flex rounded-full bg-[#65a30d]/10 border border-[#65a30d]/40 px-3 py-1 text-[11px] font-mono tracking-widest text-[#a2e635] uppercase">
                {currentLanguage === 'ru' ? 'БЕЗОПАСНЫЙ ПЛАТЕЖНЫЙ ШЛЮЗ' : currentLanguage === 'fr' ? 'PASSERELLE DE PAIEMENT SÉCURISÉE' : 'SECURE BILLING GATEWAY'}
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight mt-3">{t('paymentTitle')}</h2>
              <p className="text-xs text-gray-400 mt-1">{t('paymentDesc')}</p>
            </div>

            {/* Bill Info Card */}
            <div id="card-bill-ledger-details" className="rounded-xl border border-gray-800 bg-[#111827] p-4 space-y-2 mb-6">
              <div className="flex justify-between text-xs text-gray-400 pb-2 border-b border-gray-900">
                <span>{t('orderIdText')}:</span>
                <span className="font-mono font-bold text-gray-200">{activePayingOrder.id}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 pb-2 border-b border-gray-900">
                <span>{currentLanguage === 'ru' ? 'Страна назначения' : currentLanguage === 'fr' ? 'Pays de destination' : 'Destination Country'}:</span>
                <span className="text-gray-200">{translateCountry(activePayingOrder.country, currentLanguage)} ({activePayingOrder.visaType === 'Visa' ? (currentLanguage === 'ru' ? 'визовый' : currentLanguage === 'fr' ? 'visa' : 'Visa') : (currentLanguage === 'ru' ? 'безвизовый' : currentLanguage === 'fr' ? 'sans visa' : 'Visa-free')})</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 pb-2 border-b border-gray-900">
                <span>{currentLanguage === 'ru' ? 'Календарь верификации' : currentLanguage === 'fr' ? 'Calendrier de vérification' : 'Verification Calendar'}:</span>
                <span className="font-mono text-gray-200">{activePayingOrder.startDate} {currentLanguage === 'ru' ? 'по' : currentLanguage === 'fr' ? 'au' : 'to'} {activePayingOrder.endDate} ({activePayingOrder.totalDays} {t('daysText')})</span>
              </div>
              <div className="flex justify-between text-sm pt-1.5 text-white font-bold bg-[#65a30d]/10 px-2 rounded">
                <span>{t('exactAmount')}:</span>
                <span className="text-[#a2e635] font-mono">
                  {activePayingOrder.currency === 'UZS' ? `${activePayingOrder.totalPrice.toLocaleString()} UZS` : activePayingOrder.currency === 'EUR' ? `€${activePayingOrder.totalPrice}` : activePayingOrder.currency === 'RUB' ? `${activePayingOrder.totalPrice} RUB` : `$${activePayingOrder.totalPrice} USD`}
                </span>
              </div>
            </div>

            {/* Target Card details based currency */}
            <div id="card-payment-target-details" className="relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-[#111827] to-[#1f2937] p-5 mb-6">
              <div className="absolute top-0 right-0 h-28 w-28 -translate-y-6 translate-x-6 rounded-full bg-[#65a30d]/5 blur-xl"></div>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-4">{t('transferDetails')}</p>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block mb-1">
                    {currentLanguage === 'ru' ? 'Назначенная платежная карта' : currentLanguage === 'fr' ? 'Carte bancaire de paiement assignée' : 'Assigned Payment Bank Card'}
                  </span>
                  <div className="flex items-center justify-between bg-[#111827] rounded-lg border border-gray-800 px-3 py-2 hover:border-[#65a30d] transition">
                    <span id="text-card-number" className="font-mono text-white text-base tracking-wider font-bold">{currentCardNumber}</span>
                    <button
                      id="btn-copy-card-number"
                      type="button"
                      onClick={() => handleCopyCard(currentCardNumber)}
                      className="text-gray-450 hover:text-[#a2e635] p-1 rounded hover:bg-gray-800 transition flex items-center space-x-1"
                      title={currentLanguage === 'ru' ? 'Скопировать номер карты' : currentLanguage === 'fr' ? 'Copier le numéro de carte' : 'Copy Card Number'}
                    >
                      {copiedState ? <Check className="h-4 w-4 text-[#a2e635]" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 uppercase block mb-0.5">{t('cardHolder')}</span>
                  <span className="text-xs text-gray-200 font-bold block">SAID TULYAGANOV</span>
                </div>
              </div>
            </div>

            {/* Manual transaction form confirmation */}
            <form id="form-p2p-payment-confirmation" onSubmit={handleConfirmPayment} className="space-y-4">

              <div className="flex items-start space-x-3 bg-[#111827] border border-gray-800 p-4 rounded-xl">
                <input
                  id="checkbox-confirm-payment-transfer"
                  type="checkbox"
                  required
                  checked={confirmCheckbox}
                  onChange={(e) => setConfirmCheckbox(e.target.checked)}
                  className="mt-1 h-4.5 w-4.5 rounded border-gray-800 bg-[#111827] text-[#65a30d] outline-none accent-[#65a30d] transition"
                />
                <label htmlFor="checkbox-confirm-payment-transfer" className="text-xs text-gray-400 leading-normal">
                  {t('paymentCheckLabel')}
                </label>
              </div>

              {paymentError && (
                <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-payment-error">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              {paymentSuccess && (
                <div className="flex items-center space-x-2 rounded-lg bg-[#65a30d]/10 border border-[#65a30d]/30 px-3 py-2.5 text-xs text-[#a2e635] animate-pulse" id="alert-payment-success">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[#a2e635]" />
                  <span>{paymentSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  id="btn-payment-cancel-back"
                  type="button"
                  onClick={() => {
                    setView('cabinet');
                    setActivePayingOrder(null);
                    setPaymentError('');
                  }}
                  className="flex-1 rounded-xl border border-gray-800 bg-[#1f2937]/50 py-3 text-xs text-gray-400 hover:text-gray-200 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  id="btn-payment-confirm-submit"
                  type="submit"
                  className="flex-1 rounded-xl bg-[#65a30d] py-3 text-xs font-bold text-[#111827] hover:bg-[#4d7c0f] hover:text-white transition duration-300"
                >
                  {t('confirmPaymentBtn')}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* 4. Public Offer Modal */}
      {showOfferModal && (
        <div id="modal-public-offer" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#1f2937] overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-800 bg-[#111827]/80 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white tracking-tight">{t('publicOfferLink')}</h3>
              <button
                id="btn-close-offer-modal"
                onClick={() => setShowOfferModal(false)}
                className="text-gray-400 hover:text-gray-300 text-xs py-1 px-2 border border-gray-800 rounded bg-[#111827]"
              >
                {t('close')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 text-gray-400 text-xs leading-relaxed whitespace-pre-wrap font-sans">
              {currentLanguage === 'fr' 
                ? (config.publicOfferTextFR || config.publicOfferText) 
                : currentLanguage === 'ru' 
                  ? (config.publicOfferTextRU || config.publicOfferText) 
                  : config.publicOfferText}
            </div>
            <div className="p-4 border-t border-gray-800 bg-[#111827]/55 text-right">
              <button
                id="btn-offer-modal-acknowledge"
                onClick={() => {
                  setAgreeOffer(true);
                  setShowOfferModal(false);
                }}
                className="rounded-xl bg-[#65a30d] text-[#111827] hover:bg-[#4d7c0f] hover:text-white px-4 py-2 text-xs font-bold transition"
              >
                Accept & Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Profile Update Modal */}
      {showProfileModal && (
        <div id="modal-profile-edit" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-[#1f2937] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-800 bg-[#111827]/80 flex justify-between items-center">
              <h3 className="text-sm font-bold text-white tracking-tight">
                {currentLanguage === 'ru' ? 'Редактировать данные профиля' : currentLanguage === 'fr' ? 'Modifier le profil' : 'Edit Profile Details'}
              </h3>
              <button
                id="btn-close-profile-modal"
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileError('');
                  setProfileSuccess('');
                }}
                className="text-gray-400 hover:text-gray-300 text-xs py-1 px-2 border border-gray-800 rounded bg-[#111827]"
              >
                {t('close')}
              </button>
            </div>
            
            <form onSubmit={handleProfileSubmit} id="form-update-profile" className="p-6 space-y-4">
              <div>
                <label htmlFor="input-profile-firstname" className="block text-xs text-gray-400 mb-1">
                  {currentLanguage === 'ru' ? 'Имя (как в паспорте)' : currentLanguage === 'fr' ? 'Prénom (comme dans le passeport)' : 'First Name (as in passport)'} <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-profile-firstname"
                  type="text"
                  required
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] px-4 py-2.5 text-xs text-white outline-none focus:border-[#65a30d] transition"
                  placeholder="e.g. Wei"
                />
              </div>

              <div>
                <label htmlFor="input-profile-lastname" className="block text-xs text-gray-400 mb-1">
                  {currentLanguage === 'ru' ? 'Фамилия (как в паспорте)' : currentLanguage === 'fr' ? 'Nom (comme dans le passeport)' : 'Last Name (as in passport)'} <span className="text-red-500">*</span>
                </label>
                <input
                  id="input-profile-lastname"
                  type="text"
                  required
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] px-4 py-2.5 text-xs text-white outline-none focus:border-[#65a30d] transition"
                  placeholder="e.g. Chen"
                />
              </div>

              {profileError && (
                <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-300" id="profile-edit-error">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{profileError}</span>
                </div>
              )}

              {profileSuccess && (
                <div className="flex items-center space-x-2 rounded-lg bg-[#65a30d]/10 border border-[#65a30d]/30 px-3 py-2.5 text-xs text-[#a2e635]" id="profile-edit-success">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[#a2e635]" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2 text-right justify-end">
                <button
                  id="btn-cancel-profile-edit"
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false);
                    setProfileError('');
                    setProfileSuccess('');
                  }}
                  className="rounded-xl border border-gray-800 bg-[#1f2937]/50 px-4 py-2.5 text-xs text-gray-450 hover:text-gray-200 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  id="btn-submit-profile-edit"
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="rounded-xl bg-[#65a30d] text-[#111827] hover:bg-[#4d7c0f] hover:text-white px-5 py-2.5 text-xs font-bold transition disabled:opacity-50"
                >
                  {isUpdatingProfile ? (currentLanguage === 'ru' ? 'Сохранение...' : 'Saving...') : (currentLanguage === 'ru' ? 'Сохранить' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
