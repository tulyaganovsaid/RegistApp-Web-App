import React, { useState, useEffect } from 'react';
import { 
  Plus, LogOut, Calendar, DollarSign, FileText, CheckCircle, UploadCloud, 
  MapPin, AlertCircle, Copy, Check, Eye, Languages, ChevronLeft, ChevronRight,
  AlertTriangle, ExternalLink, Hotel, Home, Clock, Tent, Bot, Loader2
} from 'lucide-react';
import { User, Order, LanguageCode, CurrencyCode, OrderStatus, ConsentRecord } from '../types';
import { 
  getOrders, createOrder, submitPayment, getConfig, getTashkentTime, formatTashkentDate, updateUserProfile, saveClientDraftStep, saveConsentToFirestore 
} from '../db';
import { getViolationGuideText } from '../violationGuides';
import { translations, translateCountry } from '../translations';
import { LegalSlug, getActiveDocumentVersions } from '../locales/legal';
import { BrandLogo } from './BrandLogo';
import { TouristNewsBlock } from './TouristNewsBlock';
import { TouristAISupportBlock } from './TouristAISupportBlock';
import LegalDocModal from './LegalDocModal';
import AppFooter from './AppFooter';

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
  onNavigate?: (path: string) => void;
}

export default function ClientDashboard({ currentLanguage, setLanguage, currentUser, onLogout, onProfileUpdate, onNavigate }: ClientDashboardProps) {
  // Views: 'cabinet' (Personal cabinet / history) or 'order_wizard' or 'payment'
  const [view, setView] = useState<'cabinet' | 'order_wizard' | 'payment'>('cabinet');
  const [orders, setOrders] = useState<Order[]>([]);
  const [config, setConfig] = useState(getConfig());

  // Wizard state variables
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [agreeTouristStatus, setAgreeTouristStatus] = useState(false);
  const [visaType, setVisaType] = useState<'Visa-free' | 'Visa'>('Visa-free');
  const [country, setCountry] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode | ''>('');
  
  // 5 individual checkboxes on step 3 (none pre-filled by default)
  const [agreePersonalData, setAgreePersonalData] = useState(false);
  const [agreeThirdParties, setAgreeThirdParties] = useState(false);
  const [agreeCrossBorder, setAgreeCrossBorder] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Legal Document Preview Modal (opens without losing form data)
  const [legalModalState, setLegalModalState] = useState<{
    isOpen: boolean;
    slug: LegalSlug;
    sectionId?: string;
    targetConsentIndex?: 1 | 2 | 3 | 4;
  }>({
    isOpen: false,
    slug: 'privacy',
  });

  const openLegalModal = (slug: LegalSlug, sectionId?: string, targetConsentIndex?: 1 | 2 | 3 | 4) => {
    setLegalModalState({
      isOpen: true,
      slug,
      sectionId,
      targetConsentIndex,
    });
  };

  const closeLegalModal = () => {
    setLegalModalState(prev => ({ ...prev, isOpen: false }));
  };

  const isAllRequiredConsentsChecked =
    agreePersonalData && agreeThirdParties && agreeCrossBorder && agreeTerms;

  useEffect(() => {
    if (currentUser && currentUser.id && currentUser.role === 'Client' && view === 'order_wizard') {
      saveClientDraftStep(currentUser.id, wizardStep);
    }
  }, [wizardStep, view, currentUser]);
  
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
    setWizardStep(1);
    setAgreeTouristStatus(false);
    setVisaType('Visa-free');
    setCountry('');
    setStartDate('');
    setEndDate('');
    setCurrency('');
    setAgreePersonalData(false);
    setAgreeThirdParties(false);
    setAgreeCrossBorder(false);
    setAgreeTerms(false);
    setAgreeMarketing(false);
    setSubmitAttempted(false);
    setPassportScan('');
    setArrivalStamp('');
    setVisaScan('');
    setPassportName('');
    setStampName('');
    setVisaName('');
    setWizardError('');
    setView('order_wizard');
  };

  const handleOpenAiOtherCase = () => {
    const query = currentLanguage === 'ru'
      ? 'Здравствуйте! Мой случай проживания отличается от отеля, аренды квартиры, долгосрочного пребывания свыше 30 дней или палатки/автодома. Подскажите, пожалуйста, как мне правильно оформить регистрацию в Узбекистане в моей конкретной ситуации?'
      : currentLanguage === 'fr'
      ? "Bonjour ! Ma situation d'hébergement est différente d'un hôtel, d'un appartement, d'un séjour de plus de 30 jours ou d'une tente/camping-car. Pouvez-vous m'indiquer comment enregistrer légalement mon séjour en Ouzbékistan dans mon cas précis ?"
      : "Hello! My accommodation situation is different from a hotel, rented apartment, stay over 30 days, or tent/camper. Could you advise how I should correctly register in Uzbekistan for my specific situation?";

    window.dispatchEvent(new CustomEvent('open-support-chat', {
      detail: { query }
    }));
  };

  // Step 1: Legal options informing -> requires independent tourist consent
  const handleNextStep1 = () => {
    setWizardError('');
    if (!agreeTouristStatus) {
      setWizardError(
        currentLanguage === 'ru'
          ? 'Пожалуйста, подтвердите согласие на регистрацию в статусе самостоятельного туриста'
          : currentLanguage === 'fr'
          ? 'Veuillez confirmer votre accord pour l\'enregistrement sous le statut de touriste indépendant'
          : 'Please confirm your consent to be registered as an independent tourist'
      );
      return;
    }
    setWizardStep(2);
  };

  // Step 2: Passport Bio Scan & Country of Citizenship
  const handleNextStep2 = () => {
    setWizardError('');
    if (!country) {
      setWizardError(t('countryError'));
      return;
    }
    if (!passportScan) {
      setWizardError(
        currentLanguage === 'ru' 
          ? 'Пожалуйста, загрузите скан или четкое фото первой страницы паспорта' 
          : currentLanguage === 'fr'
          ? 'Veuillez télécharger le scan de la page principale de votre passeport'
          : 'Please upload your passport photo page scan'
      );
      return;
    }
    setWizardStep(3);
  };

  // Step 3: Entry Stamp & Dates
  const handleNextStep3 = () => {
    setWizardError('');
    if (!arrivalStamp) {
      setWizardError(
        currentLanguage === 'ru'
          ? 'Пожалуйста, загрузите штамп о въезде пограничного контроля КПП'
          : currentLanguage === 'fr'
          ? 'Veuillez télécharger le tampon d\'entrée de l\'immigration'
          : 'Please upload arrival border control stamp'
      );
      return;
    }
    if (visaType === 'Visa' && !visaScan) {
      setWizardError(
        currentLanguage === 'ru'
          ? 'Для визового режима необходимо прикрепить скан визы'
          : currentLanguage === 'fr'
          ? 'Le scan du visa est requis pour les pays soumis à visa'
          : 'Visa scan is required for visa category'
      );
      return;
    }
    if (!startDate || !endDate) {
      setWizardError(
        currentLanguage === 'ru'
          ? 'Выберите даты заезда и выезда в календаре'
          : currentLanguage === 'fr'
          ? 'Sélectionnez les dates de séjour dans le calendrier'
          : 'Select registration start and end dates'
      );
      return;
    }
    if (startDate < todayString) {
      setWizardError(t('pastDateError'));
      return;
    }
    if (endDate < startDate) {
      setWizardError(t('endDateError'));
      return;
    }
    setWizardStep(4);
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

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWizardError('');

    if (!agreeTouristStatus) {
      setWizardError(
        currentLanguage === 'ru'
          ? 'Пожалуйста, подтвердите согласие на регистрацию в статусе самостоятельного туриста'
          : 'Please confirm your consent to be registered as an independent tourist'
      );
      setWizardStep(1);
      return;
    }

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
    if (!isAllRequiredConsentsChecked) {
      setSubmitAttempted(true);
      setWizardError(
        currentLanguage === 'ru'
          ? 'Пожалуйста, отметьте все обязательные пункты согласий (1–4) для перехода к оплате'
          : currentLanguage === 'fr'
          ? 'Veuillez cocher les 4 consentements obligatoires pour passer au paiement'
          : 'Please check all 4 mandatory consent items to proceed to payment'
      );
      return;
    }

    setIsSubmittingOrder(true);
    try {
      // 1. Fetch network client info (IP address, user agent, server timestamp)
      let clientInfo = {
        ipAddress: '127.0.0.1',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        serverTimestamp: new Date().toISOString(),
      };

      try {
        const res = await fetch('/api/client-info');
        if (res.ok) {
          const data = await res.json();
          clientInfo = {
            ipAddress: data.ipAddress || clientInfo.ipAddress,
            userAgent: data.userAgent || clientInfo.userAgent,
            serverTimestamp: data.serverTimestamp || clientInfo.serverTimestamp,
          };
        }
      } catch (netErr) {
        console.warn('Could not query /api/client-info, falling back to local client environment:', netErr);
      }

      // 2. Resolve active legal documents versions
      const currentConfig = getConfig();
      const docVersions = getActiveDocumentVersions(currentConfig);

      // 3. Pre-generate order identifier
      const prefix = currency || 'ORD';
      let langSuffix = 'E';
      if (currentLanguage === 'ru') langSuffix = 'R';
      else if (currentLanguage === 'fr') langSuffix = 'F';
      const generatedOrderId = `${prefix}-${Math.floor(10000 + Math.random() * 90000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${langSuffix}`;

      // 4. Construct legal consent record matching exact specification:
      // orderId, timestamp (server time), ipAddress, userAgent, locale, consents, documentsVersion
      const consentRecord: ConsentRecord = {
        orderId: generatedOrderId,
        timestamp: clientInfo.serverTimestamp,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        locale: currentLanguage,
        consents: {
          dataProcessing: Boolean(agreePersonalData),
          thirdPartyTransfer: Boolean(agreeThirdParties),
          crossBorderTransfer: Boolean(agreeCrossBorder),
          termsAccepted: Boolean(agreeTerms),
          marketing: Boolean(agreeMarketing),
          selfTravellerStatus: Boolean(agreeTouristStatus),
        },
        documentsVersion: {
          privacyVersion: docVersions.privacyVersion,
          termsVersion: docVersions.termsVersion,
          cookiesVersion: docVersions.cookiesVersion,
        },
        userId: currentUser.id,
        userEmail: currentUser.email,
      };

      // 5. MANDATORY STEP: Persist consent to Firestore 'consents' collection.
      // If this write fails, the order MUST NOT be created and user gets an explicit error!
      await saveConsentToFirestore(consentRecord);

      // 6. Build order matching schema only after consent record is firmly secured
      const orderData = {
        id: generatedOrderId,
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
      saveClientDraftStep(currentUser.id, 0);
      
      // Clear forms
      setCountry('');
      setPassportScan('');
      setArrivalStamp('');
      setVisaScan('');
      setPassportName('');
      setStampName('');
      setVisaName('');
      setAgreePersonalData(false);
      setAgreeThirdParties(false);
      setAgreeCrossBorder(false);
      setAgreeTerms(false);
      setAgreeMarketing(false);
      setSubmitAttempted(false);

      // Route straight to card payment terminal
      setView('payment');
    } catch (err: any) {
      console.error('Critical: Order creation blocked due to consent recording failure:', err);
      const consentError =
        currentLanguage === 'ru'
          ? `Ошибка фиксации юридических согласий: ${err?.message || 'Не удалось записать согласие в реестр Firestore'}. Заказ не создан. Пожалуйста, проверьте подключение и повторите попытку.`
          : currentLanguage === 'fr'
          ? `Échec de l'enregistrement des consentements : ${err?.message || 'Erreur Firestore'}. La commande n'a pas été créée. Veuillez vérifier votre connexion et réessayer.`
          : `Failed to record legal consent: ${err?.message || 'Firestore write error'}. Order has not been created. Please check your connection and try again.`;
      setWizardError(consentError);
    } finally {
      setIsSubmittingOrder(false);
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
                <div className="h-12 w-12 rounded-xl bg-[#7A9A3C]/10 border border-[#7A9A3C]/30 flex items-center justify-center text-[#90B24A] shrink-0">
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

            {/* Tourist Registration Track: 5 Steps Roadmap */}
            <div id="section-tourist-registration-track" className="rounded-2xl border border-[#7A9A3C]/40 bg-gradient-to-br from-[#182313] via-[#111827] to-[#141d10] p-6 shadow-xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800/80 pb-5">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-[#90B24A] animate-pulse" />
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#90B24A] font-bold">
                      {currentLanguage === 'ru' ? 'Клиентский трек туриста' : currentLanguage === 'fr' ? 'Parcours client touriste' : 'Tourist Registration Track'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {currentLanguage === 'ru' ? 'Шаги по регистрации в Республике Узбекистан' : currentLanguage === 'fr' ? 'Étapes pour l\'enregistrement en Ouzbékistan' : 'Official 5-Step Registration in Uzbekistan'}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 max-w-2xl leading-relaxed">
                    {currentLanguage === 'ru' 
                      ? 'В соответствии с ПКМ №433 и законодательством РУз, иностранные туристы обязаны оформить регистрацию e-mehmon в течение 3 рабочих дней со дня въезда.'
                      : currentLanguage === 'fr'
                      ? 'Conformément au décret n°433, les touristes doivent effectuer leur enregistrement e-mehmon dans les 3 jours ouvrables suivant leur arrivée.'
                      : 'Under Decree No. 433, foreign tourists must be registered via e-mehmon within 3 business days of entry into Uzbekistan.'}
                  </p>
                </div>

                {(!orders.some(o => o.status === 'Rejected due to violations' || o.status === 'Violation')) && (
                  <button
                    id="btn-track-start-registration"
                    onClick={handleStartNewOrder}
                    className="shrink-0 inline-flex items-center space-x-2 rounded-xl bg-[#7A9A3C] hover:bg-[#5E7A2A] hover:text-white px-5 py-3 text-xs font-bold text-[#111827] shadow-lg shadow-[#7A9A3C]/20 transition duration-300"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{currentLanguage === 'ru' ? 'Начать регистрацию (Шаг 1)' : currentLanguage === 'fr' ? 'Démarrer l\'enregistrement' : 'Start Registration (Step 1)'}</span>
                  </button>
                )}
              </div>

              {/* 5-Step Visual Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-5" id="pipeline-registration-steps">
                {/* Step 1 */}
                <div className="rounded-xl border border-gray-800/90 bg-[#111827]/80 p-3.5 flex flex-col justify-between relative group hover:border-[#7A9A3C]/50 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7A9A3C]/20 text-[#90B24A] font-mono text-xs font-bold">1</span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">{currentLanguage === 'ru' ? 'Паспорт' : 'Passport'}</span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">{currentLanguage === 'ru' ? 'Гражданство и паспорт' : 'Citizenship & Bio'}</h5>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {currentLanguage === 'ru' ? 'Выбор безвизового/визового режима и скан главной страницы паспорта.' : 'Visa category choice and clear scan of front passport photo page.'}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="rounded-xl border border-gray-800/90 bg-[#111827]/80 p-3.5 flex flex-col justify-between relative group hover:border-[#7A9A3C]/50 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7A9A3C]/20 text-[#90B24A] font-mono text-xs font-bold">2</span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">{currentLanguage === 'ru' ? 'Въезд' : 'Entry'}</span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">{currentLanguage === 'ru' ? 'Штамп границы' : 'Arrival Stamp'}</h5>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {currentLanguage === 'ru' ? 'Штамп КПП границы для подтверждения правила 3 рабочих дней.' : 'Border control arrival stamp confirming 3-day window.'}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="rounded-xl border border-gray-800/90 bg-[#111827]/80 p-3.5 flex flex-col justify-between relative group hover:border-[#7A9A3C]/50 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7A9A3C]/20 text-[#90B24A] font-mono text-xs font-bold">3</span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">{currentLanguage === 'ru' ? 'Сроки' : 'Period'}</span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">{currentLanguage === 'ru' ? 'Даты проживания' : 'Stay Dates'}</h5>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {currentLanguage === 'ru' ? 'Период пребывания (заезд и выезд) с автоподсчетом количества суток.' : 'Stay start & end dates with automatic duration counter.'}
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="rounded-xl border border-gray-800/90 bg-[#111827]/80 p-3.5 flex flex-col justify-between relative group hover:border-[#7A9A3C]/50 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7A9A3C]/20 text-[#90B24A] font-mono text-xs font-bold">4</span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">{currentLanguage === 'ru' ? 'Оплата' : 'Payment'}</span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">{currentLanguage === 'ru' ? 'Расчет и оплата' : 'Tariff & Payment'}</h5>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {currentLanguage === 'ru' ? 'Выбор валюты (UZS, USD, EUR, RUB), реквизиты и чек об оплате.' : 'Currency selection, transparent calculation, and card payment transfer.'}
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="rounded-xl border border-gray-800/90 bg-[#111827]/80 p-3.5 flex flex-col justify-between relative group hover:border-[#7A9A3C]/50 transition">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#7A9A3C]/20 text-[#90B24A] font-mono text-xs font-bold">5</span>
                      <span className="text-[10px] font-mono text-gray-500 uppercase">e-mehmon</span>
                    </div>
                    <h5 className="text-xs font-bold text-white mb-1">{currentLanguage === 'ru' ? 'Сертификат с QR' : 'Official QR Doc'}</h5>
                    <p className="text-[10px] text-gray-400 leading-normal">
                      {currentLanguage === 'ru' ? 'Проверка оператором и официальное свидетельство с QR-кодом МВД РУз.' : 'Operator verification and downloadable e-mehmon QR certificate.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Active Order Context Helper */}
              {orders.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400">{currentLanguage === 'ru' ? 'Ваша активная заявка:' : 'Your active order:'}</span>
                    <span className="font-mono font-bold text-white">#{orders[0].id}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      orders[0].status === 'Completed' 
                        ? 'bg-green-950/60 text-green-400 border border-green-800' 
                        : orders[0].status === 'Payment Pending'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800'
                        : 'bg-blue-950/60 text-blue-400 border border-blue-800'
                    }`}>
                      {orders[0].status === 'Completed' ? (currentLanguage === 'ru' ? 'Шаг 5: Завершено' : 'Step 5: Completed')
                       : orders[0].status === 'Payment Pending' ? (currentLanguage === 'ru' ? 'Шаг 4: Требуется оплата' : 'Step 4: Payment Pending')
                       : (currentLanguage === 'ru' ? 'Шаг 5: На проверке у оператора' : 'Step 5: In Operator Review')}
                    </span>
                  </div>

                  {orders[0].status === 'Payment Pending' && (
                    <button
                      onClick={() => {
                        setActivePayingOrder(orders[0]);
                        setView('payment');
                      }}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs transition"
                    >
                      <span>{currentLanguage === 'ru' ? 'Перейти к оплате (Шаг 4) →' : 'Complete Payment (Step 4) →'}</span>
                    </button>
                  )}

                  {orders[0].status === 'Completed' && (
                    <button
                      onClick={() => handleDownloadStubPDF(orders[0])}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#7A9A3C] hover:bg-[#5E7A2A] hover:text-white text-black font-bold text-xs transition"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>{currentLanguage === 'ru' ? 'Скачать свидетельство с QR' : 'Download QR Certificate'}</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
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
                  className="flex items-center space-x-2 rounded-xl bg-[#7A9A3C] px-4 py-2.5 text-xs font-bold text-[#111827] hover:bg-[#5E7A2A] hover:text-white select-none transition duration-300 shadow-md shadow-[#7A9A3C]/20"
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
                    className="mt-6 inline-flex items-center space-x-2 rounded-xl border border-[#7A9A3C]/40 bg-[#7A9A3C]/10 px-4 py-2 text-xs text-[#90B24A] hover:bg-[#7A9A3C] hover:text-black font-semibold transition"
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
                                    className="flex items-center space-x-1 border border-[#7A9A3C]/40 hover:bg-[#7A9A3C]/10 rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#90B24A] transition"
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
                                    <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-[#90B24A] flex items-center space-x-2">
                                      <FileText className="h-3.5 w-3.5 text-[#90B24A]" />
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
                                      <div className="bg-[#7A9A3C]/10 rounded-xl border border-[#7A9A3C]/40 p-3.5 flex flex-col justify-between space-y-3 col-span-1 md:col-span-1">
                                        <div>
                                          <span className="text-[9px] font-semibold text-[#90B24A] uppercase tracking-widest block">
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

            {/* Tourist AI Legal Support Block */}
            <TouristAISupportBlock currentLanguage={currentLanguage} />

            {/* Uzbekistan Tourist News Block (Top 3 Stories & Archive) */}
            <TouristNewsBlock currentLanguage={currentLanguage} />

          </div>
        )}

        {/* 2. Step-by-Step Registration Wizard View */}
        {view === 'order_wizard' && (
          <div id="wizard-client-new-request" className="max-w-2xl mx-auto rounded-2xl border border-gray-800 bg-[#1f2937]/40 p-6 md:p-8 shadow-2xl">
            <div className="mb-6 border-b border-gray-800 pb-4">
              <button
                id="btn-wizard-back"
                onClick={() => setView('cabinet')}
                className="text-xs text-gray-400 hover:text-gray-200 transition mb-2 block"
              >
                ← {t('back')}
              </button>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{t('newOrderBtn')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {currentLanguage === 'ru' 
                      ? 'Оформление заявки на регистрацию e-mehmon' 
                      : currentLanguage === 'fr' 
                      ? 'Demande d\'enregistrement e-mehmon' 
                      : 'e-mehmon tourist registration application'}
                  </p>
                </div>
                <span className="self-start sm:self-auto text-xs font-mono px-2.5 py-1 rounded-full bg-[#7A9A3C]/10 border border-[#7A9A3C]/30 text-[#90B24A] font-bold">
                  {currentLanguage === 'ru' ? `Шаг ${wizardStep} из 4` : `Step ${wizardStep} of 4`}
                </span>
              </div>

              {/* Progress Steps Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5" id="wizard-steps-indicator">
                {/* Step 1: Где вы остановились? */}
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition ${
                    wizardStep === 1
                      ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-white'
                      : wizardStep > 1
                      ? 'border-gray-800 bg-[#111827] text-[#90B24A] hover:border-gray-700'
                      : 'border-gray-800 bg-[#111827]/50 text-gray-500'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    {currentLanguage === 'ru' ? 'Шаг 1' : 'Step 1'}
                  </span>
                  <span className="text-xs font-semibold truncate mt-0.5">
                    {currentLanguage === 'ru' ? 'Где остановились?' : currentLanguage === 'fr' ? 'Hébergement' : 'Where staying?'}
                  </span>
                </button>

                {/* Step 2: Паспорт и страна */}
                <button
                  type="button"
                  onClick={() => {
                    if (agreeTouristStatus) setWizardStep(2);
                    else handleNextStep1();
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition ${
                    wizardStep === 2
                      ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-white'
                      : wizardStep > 2
                      ? 'border-gray-800 bg-[#111827] text-[#90B24A] hover:border-gray-700'
                      : 'border-gray-800 bg-[#111827]/50 text-gray-500'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    {currentLanguage === 'ru' ? 'Шаг 2' : 'Step 2'}
                  </span>
                  <span className="text-xs font-semibold truncate mt-0.5">
                    {currentLanguage === 'ru' ? 'Паспорт и страна' : 'Passport & Bio'}
                  </span>
                </button>

                {/* Step 3: Въезд и даты */}
                <button
                  type="button"
                  onClick={() => {
                    if (agreeTouristStatus && country && passportScan) setWizardStep(3);
                    else if (!agreeTouristStatus) handleNextStep1();
                    else handleNextStep2();
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition ${
                    wizardStep === 3
                      ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-white'
                      : wizardStep > 3
                      ? 'border-gray-800 bg-[#111827] text-[#90B24A] hover:border-gray-700'
                      : 'border-gray-800 bg-[#111827]/50 text-gray-500'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    {currentLanguage === 'ru' ? 'Шаг 3' : 'Step 3'}
                  </span>
                  <span className="text-xs font-semibold truncate mt-0.5">
                    {currentLanguage === 'ru' ? 'Въезд и даты' : 'Entry & Dates'}
                  </span>
                </button>

                {/* Step 4: Расчет и оплата */}
                <button
                  type="button"
                  onClick={() => {
                    if (agreeTouristStatus && country && passportScan && arrivalStamp && startDate && endDate) setWizardStep(4);
                    else if (!agreeTouristStatus) handleNextStep1();
                    else if (!country || !passportScan) handleNextStep2();
                    else handleNextStep3();
                  }}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition ${
                    wizardStep === 4
                      ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-white'
                      : 'border-gray-800 bg-[#111827]/50 text-gray-500'
                  }`}
                >
                  <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-bold">
                    {currentLanguage === 'ru' ? 'Шаг 4' : 'Step 4'}
                  </span>
                  <span className="text-xs font-semibold truncate mt-0.5">
                    {currentLanguage === 'ru' ? 'Расчет и оплата' : 'Price & Pay'}
                  </span>
                </button>
              </div>
            </div>

            <form id="form-registration-wizard" onSubmit={handleCreateOrderSubmit} className="space-y-6">
              
              {/* STEP 1: Legal Accommodation Informing & Independent Tourist Consent */}
              {wizardStep === 1 && (
                <div className="space-y-6 animate-fadeIn" id="wizard-step-1-content">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7A9A3C] text-black text-xs font-bold shrink-0">1</span>
                      <span>{currentLanguage === 'ru' ? 'Где вы остановились?' : currentLanguage === 'fr' ? 'Où séjournez-vous ?' : 'Where are you staying?'}</span>
                    </h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      {currentLanguage === 'ru'
                        ? 'Ознакомьтесь со всеми предусмотренными законом Республики Узбекистан способами регистрации иностранных граждан перед оформлением заявки:'
                        : currentLanguage === 'fr'
                        ? 'Consultez toutes les modalités d’enregistrement des ressortissants étrangers prévues par la loi avant de faire votre demande :'
                        : 'Review all lawful methods for registering foreign citizens in Uzbekistan before proceeding with your application:'}
                    </p>
                  </div>

                  {/* Informational block with 4 variants (text, not selection — this is informing) */}
                  <div className="space-y-3" id="block-accommodation-legal-options">
                    {/* Option 1: Hotel, hostel, guest house, sanatorium */}
                    <div className="rounded-xl border border-gray-800 bg-[#111827]/70 p-4 transition hover:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-950/50 border border-blue-800/40 text-blue-400 shrink-0 mt-0.5">
                          <Hotel className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-white">
                              {currentLanguage === 'ru' 
                                ? 'Отель, хостел, гостевой дом, санаторий' 
                                : currentLanguage === 'fr' 
                                ? 'Hôtel, auberge, maison d\'hôtes, sanatorium' 
                                : 'Hotel, hostel, guest house, sanatorium'}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-900/30 text-blue-300 border border-blue-800/40">
                              {currentLanguage === 'ru' ? 'Регистрирует объект' : currentLanguage === 'fr' ? 'Par l\'établissement' : 'Auto-registered by facility'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            {currentLanguage === 'ru'
                              ? 'Объект регистрирует вас сам в день заезда. Наша услуга вам не нужна, попросите подтверждение на ресепшене.'
                              : currentLanguage === 'fr'
                              ? 'L\'établissement vous enregistre lui-même le jour de votre arrivée. Notre service n\'est pas nécessaire, demandez la confirmation à la réception.'
                              : 'The facility registers you on the day of check-in. You do not need our service, ask for confirmation at reception.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Option 2: Apartment, private house, staying with friends */}
                    <div className="rounded-xl border border-gray-800 bg-[#111827]/70 p-4 transition hover:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-950/40 border border-amber-800/40 text-amber-400 shrink-0 mt-0.5">
                          <Home className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-white">
                              {currentLanguage === 'ru' 
                                ? 'Квартира, дом, у знакомых' 
                                : currentLanguage === 'fr' 
                                ? 'Appartement, maison, chez des proches' 
                                : 'Apartment, house, staying with friends'}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-900/30 text-amber-300 border border-amber-800/40">
                              {currentLanguage === 'ru' ? 'Регистрирует собственник' : currentLanguage === 'fr' ? 'Par l\'hôte' : 'By host/owner'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            {currentLanguage === 'ru'
                              ? 'Регистрацию оформляет принимающая сторона или собственник жилья.'
                              : currentLanguage === 'fr'
                              ? 'L\'enregistrement est effectué par la partie accueillante ou le propriétaire du logement.'
                              : 'Registration is arranged by the host party or property owner.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Option 3: Stay longer than 30 days */}
                    <div className="rounded-xl border border-gray-800 bg-[#111827]/70 p-4 transition hover:border-gray-700">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-950/40 border border-purple-800/40 text-purple-400 shrink-0 mt-0.5">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <h4 className="text-xs sm:text-sm font-semibold text-white">
                              {currentLanguage === 'ru' 
                                ? 'Пребывание дольше 30 дней' 
                                : currentLanguage === 'fr' 
                                ? 'Séjour supérieur à 30 jours' 
                                : 'Stay longer than 30 days'}
                            </h4>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-800/40">
                              {currentLanguage === 'ru' ? 'Органы миграции МВД' : currentLanguage === 'fr' ? 'Police des migrations' : 'Internal Affairs Migration'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            {currentLanguage === 'ru'
                              ? 'Оформляется через подразделение миграции органов внутренних дел.'
                              : currentLanguage === 'fr'
                              ? 'S\'effectue auprès du service des migrations des organes des affaires intérieures.'
                              : 'Arranged through the migration division of the internal affairs bodies.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Option 4: Tent, camper van, or vehicle converted for sleeping (Our service) */}
                    <div className="rounded-xl border-2 border-[#7A9A3C]/60 bg-gradient-to-r from-[#1E2914]/90 via-[#182310]/80 to-[#111827] p-4 shadow-md transition">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7A9A3C] text-black shrink-0 mt-0.5 shadow">
                          <Tent className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                            <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                              <span>
                                {currentLanguage === 'ru' 
                                  ? 'Палатка, автодом или транспорт, переоборудованный для ночлега' 
                                  : currentLanguage === 'fr' 
                                  ? 'Tente, camping-car ou véhicule aménagé pour le couchage' 
                                  : 'Tent, camper van, or vehicle converted for sleeping'}
                              </span>
                            </h4>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#7A9A3C]/20 text-[#C2E86B] border border-[#7A9A3C]/50">
                              {currentLanguage === 'ru' ? '✓ Наша услуга (RegistApp)' : currentLanguage === 'fr' ? '✓ Notre service (RegistApp)' : '✓ Our service (RegistApp)'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            {currentLanguage === 'ru'
                              ? 'Статус самостоятельного туриста. Регистрируется через туристский центр или ближайшее средство размещения. Это та услуга, которую оказываем мы.'
                              : currentLanguage === 'fr'
                              ? 'Statut de touriste indépendant. S\'enregistre via un centre touristique ou l\'hébergement le plus proche. C\'est le service que nous fournissons.'
                              : 'Independent tourist status. Registered through a tourist center or the nearest accommodation facility. This is the service we provide.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mandatory Checkbox (not pre-filled) */}
                  <div className="pt-2">
                    <label 
                      id="label-consent-tourist-status"
                      className={`flex items-start gap-3 p-4 rounded-xl border transition cursor-pointer ${
                        agreeTouristStatus 
                          ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-white' 
                          : 'border-gray-800 bg-[#111827]/60 text-gray-300 hover:border-gray-700'
                      }`}
                    >
                      <input
                        id="checkbox-consent-tourist-status"
                        type="checkbox"
                        checked={agreeTouristStatus}
                        onChange={(e) => {
                          setAgreeTouristStatus(e.target.checked);
                          if (wizardError) setWizardError('');
                        }}
                        className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-[#7A9A3C] focus:ring-[#7A9A3C] shrink-0 cursor-pointer"
                      />
                      <span className="text-xs sm:text-sm font-medium leading-snug">
                        {currentLanguage === 'ru' 
                          ? 'Я ознакомлен с перечисленными способами регистрации и прошу зарегистрировать меня в статусе самостоятельного туриста' 
                          : currentLanguage === 'fr'
                          ? 'J\'ai pris connaissance des modes d\'enregistrement indiqués et demande à être enregistré sous le statut de touriste indépendant'
                          : 'I have read the listed registration methods and request to register me as an independent tourist'}
                        <span className="text-red-400 ml-1 font-bold">*</span>
                      </span>
                    </label>
                  </div>

                  {wizardError && (
                    <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-wizard-error-step1">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{wizardError}</span>
                    </div>
                  )}

                  {/* Continue Button & AI Assistant Link */}
                  <div className="pt-2 space-y-3">
                    <button
                      id="btn-wizard-step1-continue"
                      type="button"
                      disabled={!agreeTouristStatus}
                      onClick={handleNextStep1}
                      aria-disabled={!agreeTouristStatus}
                      className={`w-full rounded-xl py-3.5 text-sm font-bold transition duration-300 ${
                        agreeTouristStatus
                          ? 'bg-[#7A9A3C] text-black hover:bg-[#5E7A2A] hover:text-white shadow-lg shadow-[#7A9A3C]/20 cursor-pointer'
                          : 'bg-zinc-800 border border-zinc-750/60 text-zinc-500 cursor-not-allowed opacity-60'
                      }`}
                    >
                      {currentLanguage === 'ru' ? 'Продолжить →' : currentLanguage === 'fr' ? 'Continuer →' : 'Continue →'}
                    </button>

                    {/* Text link: "Мой случай другой" -> opens AI support chat */}
                    <div className="text-center pt-1">
                      <button
                        id="btn-wizard-other-case-ai"
                        type="button"
                        onClick={handleOpenAiOtherCase}
                        className="inline-flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-[#C2E86B] transition underline underline-offset-4 cursor-pointer hover:scale-[1.02] active:scale-95"
                      >
                        <Bot className="w-3.5 h-3.5 text-[#7A9A3C]" />
                        <span>
                          {currentLanguage === 'ru' 
                            ? 'Мой случай другой' 
                            : currentLanguage === 'fr' 
                            ? 'Mon cas est différent' 
                            : 'My case is different'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Citizenship, Visa Category & Passport Bio Scan */}
              {wizardStep === 2 && (
                <div className="space-y-6 animate-fadeIn" id="wizard-step-2-content">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7A9A3C] text-black text-[11px] font-bold">2</span>
                      <span>{currentLanguage === 'ru' ? 'Гражданство и паспортные данные' : 'Citizenship and Passport Details'}</span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      {currentLanguage === 'ru' ? 'Выберите категорию визового режима вашей страны и прикрепите фото разворота паспорта.' : 'Select visa category for your country and upload front photo bio page.'}
                    </p>
                  </div>

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
                            ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-[#90B24A]'
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
                            ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-[#90B24A]'
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
                      <MapPin className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${country ? 'text-[#90B24A]' : 'text-gray-500'}`} />
                      <select
                        id="select-citizen-country"
                        required
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className={`w-full rounded-xl border pl-10 pr-4 py-3 text-xs outline-none transition ${
                          country
                            ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-[#90B24A] focus:border-[#7A9A3C]'
                            : 'border-gray-800 bg-[#111827] text-gray-400 hover:border-gray-700 focus:border-[#7A9A3C]'
                        }`}
                      >
                        <option value="" className="bg-[#111827] text-gray-400">-- {t('selectCountryPlaceholder')} --</option>
                        {activeCountryList.map(c => (
                          <option key={c} value={c} className="bg-[#111827] text-white">{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Slot 1: Passport Page Scan */}
                  <div id="upload-slot-passport" className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${passportScan ? 'border-[#7A9A3C] bg-[#7A9A3C]/10' : 'border-gray-800 bg-[#111827]'}`}>
                    <div>
                      <span className={`text-[11px] font-bold block mb-1 transition-colors ${passportScan ? 'text-[#90B24A]' : 'text-gray-300'}`}>{t('passportScanLabel')} <span className="text-red-500">*</span></span>
                      <p className="text-[10px] text-gray-500 leading-normal mb-3">
                        {currentLanguage === 'ru' ? 'Главная страница с фото полностью читаема, без бликов.' : currentLanguage === 'fr' ? 'Page principale avec photo bien lisible, sans reflets.' : 'Front photo bio page fully legible, no screen glares.'}
                      </p>
                    </div>
                    <label className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-300 ${passportScan ? 'border-solid border-[#7A9A3C]/55 bg-[#7A9A3C]/10 hover:bg-[#7A9A3C]/20' : 'border-dashed border-gray-800 bg-[#1f2937]/40 hover:border-gray-700 hover:bg-[#1f2937]'}`}>
                      <UploadCloud className={`h-5 w-5 mb-1 transition-colors ${passportScan ? 'text-[#90B24A]' : 'text-gray-500'}`} />
                      <span className={`text-[9px] text-center font-medium ${passportScan ? 'text-[#90B24A]' : 'text-gray-400'}`}>
                        {passportName 
                          ? (currentLanguage === 'ru' ? 'Выбрано: ' : currentLanguage === 'fr' ? 'Sélectionné: ' : 'Selected: ') + passportName.slice(0, 25) + '...' 
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

                  {wizardError && (
                    <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-wizard-error-step2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{wizardError}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="w-1/3 rounded-xl py-3 text-xs font-semibold border border-gray-800 bg-[#111827] text-gray-300 hover:bg-gray-800 transition"
                    >
                      {currentLanguage === 'ru' ? '← Назад' : '← Back'}
                    </button>
                    <button
                      id="btn-wizard-next-step2"
                      type="button"
                      onClick={handleNextStep2}
                      className="w-2/3 rounded-xl py-3 text-sm font-bold bg-[#7A9A3C] text-black hover:bg-[#5E7A2A] hover:text-white transition duration-300 shadow-lg shadow-[#7A9A3C]/10 cursor-pointer"
                    >
                      {currentLanguage === 'ru' ? 'Далее: Штамп въезда и даты (Шаг 3) →' : 'Next: Border Stamp & Dates (Step 3) →'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Arrival Stamp, Visa & Stay Dates */}
              {wizardStep === 3 && (
                <div className="space-y-6 animate-fadeIn" id="wizard-step-3-content">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7A9A3C] text-black text-[11px] font-bold">3</span>
                      <span>{currentLanguage === 'ru' ? 'Штамп о въезде и период проживания' : 'Arrival Stamp & Stay Period'}</span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      {currentLanguage === 'ru' ? 'Прикрепите отметку КПП пограничного контроля и укажите даты заезда и выезда.' : 'Upload border control entry stamp and set your stay dates.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Slot 2: Arrival border Stamp scan */}
                    <div id="upload-slot-stamp" className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${arrivalStamp ? 'border-[#7A9A3C] bg-[#7A9A3C]/10' : 'border-gray-800 bg-[#111827]'}`}>
                      <div>
                        <span className={`text-[11px] font-bold block mb-1 transition-colors ${arrivalStamp ? 'text-[#90B24A]' : 'text-gray-300'}`}>{t('arrivalStampLabel')} <span className="text-red-500">*</span></span>
                        <p className="text-[10px] text-gray-500 leading-normal mb-3">
                          {currentLanguage === 'ru' ? 'Штамп пограничного контроля при въезде самолетом или сухопутным путем.' : currentLanguage === 'fr' ? 'Tampon de contrôle des frontières à l\'entrée par avion ou par voie terrestre.' : 'Immigration entry stamp from flight or land crossing.'}
                        </p>
                      </div>
                      <label className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-300 ${arrivalStamp ? 'border-solid border-[#7A9A3C]/55 bg-[#7A9A3C]/10 hover:bg-[#7A9A3C]/20' : 'border-dashed border-gray-800 bg-[#1f2937]/40 hover:border-gray-700 hover:bg-[#1f2937]'}`}>
                        <UploadCloud className={`h-5 w-5 mb-1 transition-colors ${arrivalStamp ? 'text-[#90B24A]' : 'text-gray-500'}`} />
                        <span className={`text-[9px] text-center font-medium ${arrivalStamp ? 'text-[#90B24A]' : 'text-gray-400'}`}>
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
                    {visaType === 'Visa' ? (
                      <div id="upload-slot-visa" className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-300 ${visaScan ? 'border-[#7A9A3C] bg-[#7A9A3C]/10' : 'border-gray-800 bg-[#111827]'}`}>
                        <div>
                          <span className={`text-[11px] font-bold block mb-1 transition-colors ${visaScan ? 'text-[#90B24A]' : 'text-gray-300'}`}>{t('visaScanLabel')} <span className="text-red-500">*</span></span>
                          <p className="text-[10px] text-gray-500 leading-normal mb-3">
                            {currentLanguage === 'ru' ? 'Бумажная виза из посольства или электронная виза с QR-кодом.' : currentLanguage === 'fr' ? 'Visa physique de l\'ambassade ou e-Visa avec code QR.' : 'Physical embassy sticker or QR PDF of your eVisa.'}
                          </p>
                        </div>
                        <label className={`flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-all duration-300 ${visaScan ? 'border-solid border-[#7A9A3C]/55 bg-[#7A9A3C]/10 hover:bg-[#7A9A3C]/20' : 'border-dashed border-gray-800 bg-[#1f2937]/40 hover:border-gray-700 hover:bg-[#1f2937]'}`}>
                          <UploadCloud className={`h-5 w-5 mb-1 transition-colors ${visaScan ? 'text-[#90B24A]' : 'text-gray-500'}`} />
                          <span className={`text-[9px] text-center font-medium ${visaScan ? 'text-[#90B24A]' : 'text-gray-400'}`}>
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
                    ) : (
                      <div className="rounded-xl border border-gray-800/80 bg-[#111827]/40 p-4 flex flex-col justify-center">
                        <div className="flex items-center space-x-2 text-[#90B24A] text-xs font-semibold mb-1">
                          <Check className="h-4 w-4" />
                          <span>{currentLanguage === 'ru' ? 'Безвизовый въезд активен' : 'Visa-Free Entry Active'}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          {currentLanguage === 'ru' 
                            ? 'Для граждан вашей страны действует безвизовый режим. Виза не требуется, достаточно штампа КПП.' 
                            : 'Visa-free entry regime is applied for your nationality. No visa attachment required.'}
                        </p>
                      </div>
                    )}
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
                              ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-[#90B24A]'
                              : 'border-gray-800 bg-[#111827] text-gray-500 hover:border-gray-700'
                          }`}
                        >
                          <span className="flex items-center space-x-2.5">
                            <Calendar className={`h-4 w-4 transition-colors ${startDate ? 'text-[#90B24A]' : 'text-gray-500'}`} />
                            <span className={startDate ? "text-[#90B24A] font-semibold" : "text-gray-500"}>
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
                              ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-[#90B24A]'
                              : 'border-gray-800 bg-[#111827] text-gray-500 hover:border-gray-700'
                          }`}
                        >
                          <span className="flex items-center space-x-2.5">
                            <Calendar className={`h-4 w-4 transition-colors ${endDate ? 'text-[#90B24A]' : 'text-gray-500'}`} />
                            <span className={endDate ? "text-[#90B24A] font-semibold" : "text-gray-500"}>
                              {endDate ? formatDisplayDate(endDate, currentLanguage) : CALENDAR_LOCALS[currentLanguage]?.selectDate || 'Select Date'}
                            </span>
                          </span>
                        </button>
                        <input type="hidden" name="endDate" value={endDate} />
                        
                        {activeDatePicker === 'end' && renderCalendar('end')}
                      </div>
                    </div>
                  </div>

                  {wizardError && (
                    <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-wizard-error-step3">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{wizardError}</span>
                    </div>
                  )}

                  <div className="flex items-center space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="w-1/3 rounded-xl py-3 text-xs font-semibold border border-gray-800 bg-[#111827] text-gray-300 hover:bg-gray-800 transition"
                    >
                      {currentLanguage === 'ru' ? '← Назад' : '← Back'}
                    </button>
                    <button
                      id="btn-wizard-next-step3"
                      type="button"
                      onClick={handleNextStep3}
                      className="w-2/3 rounded-xl py-3 text-sm font-bold bg-[#7A9A3C] text-black hover:bg-[#5E7A2A] hover:text-white transition duration-300 shadow-lg shadow-[#7A9A3C]/10 cursor-pointer"
                    >
                      {currentLanguage === 'ru' ? 'Далее: Расчет стоимости (Шаг 4) →' : 'Next: Price & Currency (Step 4) →'}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: Currency, Tariff Calculation, Public Offer Agreement */}
              {wizardStep === 4 && (
                <div className="space-y-6 animate-fadeIn" id="wizard-step-4-content">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7A9A3C] text-black text-[11px] font-bold">4</span>
                      <span>{currentLanguage === 'ru' ? 'Расчет стоимости, выбор валюты и оферта' : 'Calculation, Currency & Offer'}</span>
                    </h3>
                    <p className="text-xs text-gray-400">
                      {currentLanguage === 'ru' ? 'Выберите валюту платежа, проверьте итоговую стоимость и подтвердите согласие.' : 'Select payment currency, inspect total amount and confirm agreement.'}
                    </p>
                  </div>

                  {/* Currency Selector & Dynamic rate breakdown panel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#111827] border border-gray-800 rounded-xl p-4">
                    <div>
                      <label htmlFor="select-paying-currency" className="block text-[10px] uppercase font-mono tracking-wide text-gray-400 mb-1">{t('currencyLabel')}</label>
                      <select
                        id="select-paying-currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                        className={`w-full rounded-lg border px-3 py-2 text-xs outline-none transition ${
                          currency
                            ? 'border-[#7A9A3C] bg-[#7A9A3C]/10 text-[#90B24A] focus:border-[#7A9A3C]'
                            : 'border-gray-800 bg-[#1f2937] text-gray-400 focus:border-[#7A9A3C]'
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
                      <div className="flex justify-between text-white font-bold pt-1 text-sm bg-[#7A9A3C]/10 px-2 py-1 rounded border border-[#7A9A3C]/45">
                        <span>{t('totalPriceText')}:</span>
                        <span className="text-[#90B24A] font-mono">
                          {!currency ? '—' : currency === 'UZS' ? `${finalPrice.toLocaleString()} UZS` : currency === 'EUR' ? `€${finalPrice}` : currency === 'RUB' ? `${finalPrice} RUB` : `$${finalPrice} USD`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5-Checkbox Legal Consent Block before Payment Button */}
                  <div id="block-legal-consents" className="space-y-2.5 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-300">
                        {currentLanguage === 'ru' 
                          ? 'Правовые согласия и условия сервиса' 
                          : currentLanguage === 'fr' 
                          ? 'Consentements légaux et conditions' 
                          : 'Legal Consents & Terms of Service'}
                      </span>
                      <span className={`text-[11px] font-mono font-semibold ${
                        isAllRequiredConsentsChecked ? 'text-[#90B24A]' : 'text-amber-400'
                      }`}>
                        {[agreePersonalData, agreeThirdParties, agreeCrossBorder, agreeTerms].filter(Boolean).length}/4 {currentLanguage === 'ru' ? 'обязательных' : 'required'}
                      </span>
                    </div>

                    {/* Checkbox 1: Personal data processing */}
                    <div
                      id="consent-card-personal-data"
                      className={`flex items-start space-x-3 p-3.5 rounded-xl border transition-all duration-200 ${
                        submitAttempted && !agreePersonalData
                          ? 'border-red-500/80 bg-red-950/25 ring-1 ring-red-500/50 shadow-md shadow-red-950/30'
                          : agreePersonalData
                          ? 'border-[#7A9A3C]/50 bg-[#7A9A3C]/10'
                          : 'border-gray-800 bg-[#111827]/60 hover:border-gray-700'
                      }`}
                    >
                      <input
                        id="checkbox-consent-personal-data"
                        type="checkbox"
                        checked={agreePersonalData}
                        onChange={(e) => {
                          setAgreePersonalData(e.target.checked);
                          if (e.target.checked && wizardError) setWizardError('');
                        }}
                        className={`mt-1 h-4.5 w-4.5 rounded border outline-none accent-[#7A9A3C] transition cursor-pointer ${
                          submitAttempted && !agreePersonalData ? 'border-red-500 ring-2 ring-red-500/40' : 'border-gray-700 bg-[#111827]'
                        }`}
                      />
                      <div className="flex-1 text-xs text-gray-300 leading-relaxed">
                        <label htmlFor="checkbox-consent-personal-data" className="cursor-pointer select-none">
                          {currentLanguage === 'ru'
                            ? 'Я даю согласие на обработку моих персональных данных для оформления регистрации по месту пребывания'
                            : currentLanguage === 'fr'
                            ? "Je consens au traitement de mes données personnelles pour l'enregistrement au lieu de séjour"
                            : 'I give consent to the processing of my personal data for registration at the place of stay'}
                        </label>{' '}
                        <button
                          id="link-modal-privacy-main"
                          type="button"
                          onClick={() => openLegalModal('privacy', undefined, 1)}
                          className="inline-flex items-center gap-0.5 text-[#90B24A] hover:text-[#a2e635] underline font-semibold transition cursor-pointer ml-1"
                          title="Открыть документ в модальном окне"
                        >
                          <span>/privacy</span>
                          <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </button>
                        <span className="text-red-500 font-bold ml-1" title="Обязательное поле">*</span>

                        {submitAttempted && !agreePersonalData && (
                          <div className="text-[11px] text-red-400 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{currentLanguage === 'ru' ? 'Обязательно для продолжения оформления' : 'Required to proceed'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox 2: Third party data transfer */}
                    <div
                      id="consent-card-third-parties"
                      className={`flex items-start space-x-3 p-3.5 rounded-xl border transition-all duration-200 ${
                        submitAttempted && !agreeThirdParties
                          ? 'border-red-500/80 bg-red-950/25 ring-1 ring-red-500/50 shadow-md shadow-red-950/30'
                          : agreeThirdParties
                          ? 'border-[#7A9A3C]/50 bg-[#7A9A3C]/10'
                          : 'border-gray-800 bg-[#111827]/60 hover:border-gray-700'
                      }`}
                    >
                      <input
                        id="checkbox-consent-third-parties"
                        type="checkbox"
                        checked={agreeThirdParties}
                        onChange={(e) => {
                          setAgreeThirdParties(e.target.checked);
                          if (e.target.checked && wizardError) setWizardError('');
                        }}
                        className={`mt-1 h-4.5 w-4.5 rounded border outline-none accent-[#7A9A3C] transition cursor-pointer ${
                          submitAttempted && !agreeThirdParties ? 'border-red-500 ring-2 ring-red-500/40' : 'border-gray-700 bg-[#111827]'
                        }`}
                      />
                      <div className="flex-1 text-xs text-gray-300 leading-relaxed">
                        <label htmlFor="checkbox-consent-third-parties" className="cursor-pointer select-none">
                          {currentLanguage === 'ru'
                            ? 'Я согласен на передачу моих данных третьим лицам: в систему государственного учёта E-mehmon, оператору аккаунта в этой системе (хостел Jules Verne) и платёжному провайдеру'
                            : currentLanguage === 'fr'
                            ? "J'accepte le transfert de mes données à des tiers: au système d'enregistrement d'État E-mehmon, à l'opérateur du compte dans ce système (Jules Verne Hostel) et au prestataire de paiement"
                            : 'I agree to the transfer of my data to third parties: to the state accounting system E-mehmon, the account operator in this system (Jules Verne Hostel), and the payment provider'}
                        </label>{' '}
                        <button
                          id="link-modal-privacy-recipients"
                          type="button"
                          onClick={() => openLegalModal('privacy', 'recipients', 2)}
                          className="inline-flex items-center gap-0.5 text-[#90B24A] hover:text-[#a2e635] underline font-semibold transition cursor-pointer ml-1"
                          title="Открыть раздел о получателях данных"
                        >
                          <span>{currentLanguage === 'ru' ? 'раздел /privacy#recipients' : '/privacy#recipients'}</span>
                          <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </button>
                        <span className="text-red-500 font-bold ml-1" title="Обязательное поле">*</span>

                        {submitAttempted && !agreeThirdParties && (
                          <div className="text-[11px] text-red-400 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{currentLanguage === 'ru' ? 'Обязательно для продолжения оформления' : 'Required to proceed'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox 3: Cross-border transfer */}
                    <div
                      id="consent-card-cross-border"
                      className={`flex items-start space-x-3 p-3.5 rounded-xl border transition-all duration-200 ${
                        submitAttempted && !agreeCrossBorder
                          ? 'border-red-500/80 bg-red-950/25 ring-1 ring-red-500/50 shadow-md shadow-red-950/30'
                          : agreeCrossBorder
                          ? 'border-[#7A9A3C]/50 bg-[#7A9A3C]/10'
                          : 'border-gray-800 bg-[#111827]/60 hover:border-gray-700'
                      }`}
                    >
                      <input
                        id="checkbox-consent-cross-border"
                        type="checkbox"
                        checked={agreeCrossBorder}
                        onChange={(e) => {
                          setAgreeCrossBorder(e.target.checked);
                          if (e.target.checked && wizardError) setWizardError('');
                        }}
                        className={`mt-1 h-4.5 w-4.5 rounded border outline-none accent-[#7A9A3C] transition cursor-pointer ${
                          submitAttempted && !agreeCrossBorder ? 'border-red-500 ring-2 ring-red-500/40' : 'border-gray-700 bg-[#111827]'
                        }`}
                      />
                      <div className="flex-1 text-xs text-gray-300 leading-relaxed">
                        <label htmlFor="checkbox-consent-cross-border" className="cursor-pointer select-none">
                          {currentLanguage === 'ru'
                            ? 'Я согласен на передачу моих данных на серверы, расположенные за пределами Республики Узбекистан'
                            : currentLanguage === 'fr'
                            ? "Je consens au transfert de mes données vers des serveurs situés en dehors de la République d'Ouzbékistan"
                            : 'I consent to the transfer of my data to servers located outside the Republic of Uzbekistan'}
                        </label>{' '}
                        <button
                          id="link-modal-privacy-cross-border"
                          type="button"
                          onClick={() => openLegalModal('privacy', 'cross-border', 3)}
                          className="inline-flex items-center gap-0.5 text-[#90B24A] hover:text-[#a2e635] underline font-semibold transition cursor-pointer ml-1"
                          title="Открыть раздел о трансграничной передаче данных"
                        >
                          <span>{currentLanguage === 'ru' ? 'раздел /privacy#cross-border' : '/privacy#cross-border'}</span>
                          <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </button>
                        <span className="text-red-500 font-bold ml-1" title="Обязательное поле">*</span>

                        {submitAttempted && !agreeCrossBorder && (
                          <div className="text-[11px] text-red-400 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{currentLanguage === 'ru' ? 'Обязательно для продолжения оформления' : 'Required to proceed'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox 4: Public Offer / Terms */}
                    <div
                      id="consent-card-terms"
                      className={`flex items-start space-x-3 p-3.5 rounded-xl border transition-all duration-200 ${
                        submitAttempted && !agreeTerms
                          ? 'border-red-500/80 bg-red-950/25 ring-1 ring-red-500/50 shadow-md shadow-red-950/30'
                          : agreeTerms
                          ? 'border-[#7A9A3C]/50 bg-[#7A9A3C]/10'
                          : 'border-gray-800 bg-[#111827]/60 hover:border-gray-700'
                      }`}
                    >
                      <input
                        id="checkbox-consent-terms"
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => {
                          setAgreeTerms(e.target.checked);
                          if (e.target.checked && wizardError) setWizardError('');
                        }}
                        className={`mt-1 h-4.5 w-4.5 rounded border outline-none accent-[#7A9A3C] transition cursor-pointer ${
                          submitAttempted && !agreeTerms ? 'border-red-500 ring-2 ring-red-500/40' : 'border-gray-700 bg-[#111827]'
                        }`}
                      />
                      <div className="flex-1 text-xs text-gray-300 leading-relaxed">
                        <label htmlFor="checkbox-consent-terms" className="cursor-pointer select-none">
                          {currentLanguage === 'ru'
                            ? 'Я подтверждаю, что ознакомлен с публичной офертой и согласен с её условиями'
                            : currentLanguage === 'fr'
                            ? "Je confirme avoir pris connaissance de l'offre publique et accepter ses conditions"
                            : 'I confirm that I have read the public offer and agree to its terms'}
                        </label>{' '}
                        <button
                          id="link-modal-terms"
                          type="button"
                          onClick={() => openLegalModal('terms', undefined, 4)}
                          className="inline-flex items-center gap-0.5 text-[#90B24A] hover:text-[#a2e635] underline font-semibold transition cursor-pointer ml-1"
                          title="Открыть публичную оферту в модальном окне"
                        >
                          <span>/terms</span>
                          <ExternalLink className="w-3 h-3 inline shrink-0" />
                        </button>
                        <span className="text-red-500 font-bold ml-1" title="Обязательное поле">*</span>

                        {submitAttempted && !agreeTerms && (
                          <div className="text-[11px] text-red-400 font-semibold mt-1 flex items-center gap-1 animate-fadeIn">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{currentLanguage === 'ru' ? 'Обязательно для продолжения оформления' : 'Required to proceed'}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Checkbox 5: Informational messages (Optional) */}
                    <div
                      id="consent-card-marketing"
                      className={`flex items-start space-x-3 p-3.5 rounded-xl border transition-all duration-200 ${
                        agreeMarketing
                          ? 'border-[#7A9A3C]/40 bg-[#7A9A3C]/10'
                          : 'border-gray-800/80 bg-[#111827]/40 hover:border-gray-700'
                      }`}
                    >
                      <input
                        id="checkbox-consent-marketing"
                        type="checkbox"
                        checked={agreeMarketing}
                        onChange={(e) => setAgreeMarketing(e.target.checked)}
                        className="mt-1 h-4.5 w-4.5 rounded border border-gray-700 bg-[#111827] outline-none accent-[#7A9A3C] transition cursor-pointer"
                      />
                      <div className="flex-1 text-xs text-gray-300 leading-relaxed">
                        <label htmlFor="checkbox-consent-marketing" className="cursor-pointer select-none">
                          {currentLanguage === 'ru'
                            ? 'Я согласен получать информационные сообщения от RegistApp'
                            : currentLanguage === 'fr'
                            ? "J'accepte de recevoir des messages d'information de RegistApp"
                            : 'I agree to receive informational messages from RegistApp'}
                        </label>
                        <span className="text-gray-400 text-[11px] font-mono ml-1.5">
                          {currentLanguage === 'ru' ? '(необязательный)' : currentLanguage === 'fr' ? '(facultatif)' : '(optional)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {wizardError && (
                    <div className="flex items-center space-x-2 rounded-lg bg-red-950/40 border border-red-800 px-3 py-2 text-xs text-red-400" id="alert-wizard-error-step4">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{wizardError}</span>
                    </div>
                  )}

                  {/* Navigation buttons: Back (Step 3) & Proceed to Payment (Step 4) */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center space-x-3">
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        className="w-1/3 rounded-xl py-3 text-xs font-semibold border border-gray-800 bg-[#111827] text-gray-300 hover:bg-gray-800 transition"
                      >
                        {currentLanguage === 'ru' ? '← Назад' : '← Back'}
                      </button>
                      <button
                        id="btn-wizard-submit-finalize"
                        type={isAllRequiredConsentsChecked && startDate && endDate && currency && !isSubmittingOrder ? 'submit' : 'button'}
                        disabled={isSubmittingOrder}
                        onClick={(e) => {
                          if (isSubmittingOrder) return;
                          if (!isAllRequiredConsentsChecked || !startDate || !endDate || !currency) {
                            e.preventDefault();
                            setSubmitAttempted(true);
                            if (!isAllRequiredConsentsChecked) {
                              setWizardError(
                                currentLanguage === 'ru'
                                  ? 'Пожалуйста, отметьте все 4 обязательных согласия (пункты 1–4), чтобы перейти к оплате'
                                  : currentLanguage === 'fr'
                                  ? 'Veuillez cocher les 4 consentements obligatoires pour passer au paiement'
                                  : 'Please check all 4 mandatory consents to proceed to payment'
                              );
                            } else if (!currency) {
                              setWizardError(t('currencyError'));
                            }
                          }
                        }}
                        aria-disabled={!isAllRequiredConsentsChecked || !startDate || !endDate || !currency || isSubmittingOrder}
                        className={`w-2/3 rounded-xl py-3 text-sm font-semibold transition duration-300 flex items-center justify-center gap-2 ${
                          isAllRequiredConsentsChecked && startDate && endDate && currency && !isSubmittingOrder
                            ? 'bg-[#7A9A3C] text-black font-bold hover:bg-[#5E7A2A] hover:text-white shadow-lg shadow-[#7A9A3C]/10 cursor-pointer'
                            : 'bg-zinc-800 border border-zinc-750/60 text-zinc-500 cursor-not-allowed opacity-70'
                        }`}
                      >
                        {isSubmittingOrder ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                            <span>{currentLanguage === 'ru' ? 'Запись согласий в реестр...' : 'Recording legal consent...'}</span>
                          </>
                        ) : (
                          currentLanguage === 'ru' ? 'Оформить заявку и перейти к оплате (Шаг 4) →' : t('proceedPaymentBtn')
                        )}
                      </button>
                    </div>

                    {!isAllRequiredConsentsChecked && (
                      <p className="text-[11px] text-gray-500 text-center sm:text-right font-mono">
                        {currentLanguage === 'ru' 
                          ? 'Кнопка оплаты неактивна, пока не отмечены обязательные чекбоксы 1–4' 
                          : 'Payment button is locked until mandatory checkboxes 1–4 are checked'}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </form>
          </div>
        )}

        {/* 3. Dedicated System Peer-to-Peer Payment Screen */}
        {view === 'payment' && activePayingOrder && (
          <div id="payment-gate-screen" className="max-w-xl mx-auto rounded-2xl border border-gray-800 bg-[#1f2937]/40 p-6 md:p-8 shadow-2xl">
            <div className="mb-6 border-b border-gray-800 pb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="inline-flex rounded-full bg-[#7A9A3C]/10 border border-[#7A9A3C]/40 px-3 py-1 text-[11px] font-mono tracking-widest text-[#90B24A] uppercase font-bold">
                  {currentLanguage === 'ru' ? 'Шаг 4 из 5: Оплата по реквизитам' : currentLanguage === 'fr' ? 'Étape 4 sur 5: Paiement' : 'Step 4 of 5: Secure Payment'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight mt-1">{t('paymentTitle')}</h2>
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
              <div className="flex justify-between text-sm pt-1.5 text-white font-bold bg-[#7A9A3C]/10 px-2 rounded">
                <span>{t('exactAmount')}:</span>
                <span className="text-[#90B24A] font-mono">
                  {activePayingOrder.currency === 'UZS' ? `${activePayingOrder.totalPrice.toLocaleString()} UZS` : activePayingOrder.currency === 'EUR' ? `€${activePayingOrder.totalPrice}` : activePayingOrder.currency === 'RUB' ? `${activePayingOrder.totalPrice} RUB` : `$${activePayingOrder.totalPrice} USD`}
                </span>
              </div>
            </div>

            {/* Target Card details based currency */}
            <div id="card-payment-target-details" className="relative overflow-hidden rounded-xl border border-gray-800 bg-gradient-to-br from-[#111827] to-[#1f2937] p-5 mb-6">
              <div className="absolute top-0 right-0 h-28 w-28 -translate-y-6 translate-x-6 rounded-full bg-[#7A9A3C]/5 blur-xl"></div>
              <p className="text-[10px] text-gray-500 font-mono tracking-widest uppercase mb-4">{t('transferDetails')}</p>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase block mb-1">
                    {currentLanguage === 'ru' ? 'Назначенная платежная карта' : currentLanguage === 'fr' ? 'Carte bancaire de paiement assignée' : 'Assigned Payment Bank Card'}
                  </span>
                  <div className="flex items-center justify-between bg-[#111827] rounded-lg border border-gray-800 px-3 py-2 hover:border-[#7A9A3C] transition">
                    <span id="text-card-number" className="font-mono text-white text-base tracking-wider font-bold">{currentCardNumber}</span>
                    <button
                      id="btn-copy-card-number"
                      type="button"
                      onClick={() => handleCopyCard(currentCardNumber)}
                      className="text-gray-450 hover:text-[#90B24A] p-1 rounded hover:bg-gray-800 transition flex items-center space-x-1"
                      title={currentLanguage === 'ru' ? 'Скопировать номер карты' : currentLanguage === 'fr' ? 'Copier le numéro de carte' : 'Copy Card Number'}
                    >
                      {copiedState ? <Check className="h-4 w-4 text-[#90B24A]" /> : <Copy className="h-4 w-4" />}
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
                  className="mt-1 h-4.5 w-4.5 rounded border-gray-800 bg-[#111827] text-[#7A9A3C] outline-none accent-[#7A9A3C] transition"
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
                <div className="flex items-center space-x-2 rounded-lg bg-[#7A9A3C]/10 border border-[#7A9A3C]/30 px-3 py-2.5 text-xs text-[#90B24A] animate-pulse" id="alert-payment-success">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[#90B24A]" />
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
                  className="flex-1 rounded-xl bg-[#7A9A3C] py-3 text-xs font-bold text-black hover:bg-[#5E7A2A] hover:text-white transition duration-300"
                >
                  {t('confirmPaymentBtn')}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* 4. Legal Document Modal */}
      <LegalDocModal
        isOpen={legalModalState.isOpen}
        onClose={closeLegalModal}
        slug={legalModalState.slug}
        sectionId={legalModalState.sectionId}
        currentLanguage={currentLanguage}
        onAcknowledge={() => {
          if (legalModalState.targetConsentIndex === 1) {
            setAgreePersonalData(true);
          } else if (legalModalState.targetConsentIndex === 2) {
            setAgreeThirdParties(true);
          } else if (legalModalState.targetConsentIndex === 3) {
            setAgreeCrossBorder(true);
          } else if (legalModalState.targetConsentIndex === 4) {
            setAgreeTerms(true);
          }
          if (wizardError) setWizardError('');
        }}
      />

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
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] px-4 py-2.5 text-xs text-white outline-none focus:border-[#7A9A3C] transition"
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
                  className="w-full rounded-xl border border-gray-800 bg-[#111827] px-4 py-2.5 text-xs text-white outline-none focus:border-[#7A9A3C] transition"
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
                <div className="flex items-center space-x-2 rounded-lg bg-[#7A9A3C]/10 border border-[#7A9A3C]/30 px-3 py-2.5 text-xs text-[#90B24A]" id="profile-edit-success">
                  <CheckCircle className="h-4 w-4 shrink-0 text-[#90B24A]" />
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
                  className="rounded-xl bg-[#7A9A3C] text-black hover:bg-[#5E7A2A] hover:text-white px-5 py-2.5 text-xs font-bold transition disabled:opacity-50"
                >
                  {isUpdatingProfile ? (currentLanguage === 'ru' ? 'Сохранение...' : 'Saving...') : (currentLanguage === 'ru' ? 'Сохранить' : 'Save Changes')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shared Footer with Legal Navigation */}
      <AppFooter
        id="footer-client-dashboard"
        currentLanguage={currentLanguage}
        onNavigate={onNavigate}
        className="mt-16"
      />

    </div>
  );
}
