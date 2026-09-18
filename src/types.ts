export type UserRole = 'Client' | 'Operator' | 'Admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified?: boolean;
  createdAt?: string;
  passwordHash?: string;
  phone?: string;
  draftStep?: number; // 0: not started, 1: legal options consent, 2: passport bio, 3: stamp & dates
}

export type OrderStatus = 'Payment Pending' | 'In Progress' | 'Paid' | 'Completed' | 'Rejected due to violations' | 'Violation';

export interface Order {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  passportNumber?: string;
  visaType: 'Visa-free' | 'Visa';
  country: string;
  passportScan: string; // Base64 or placeholder URL
  arrivalStamp: string; // Base64 or placeholder URL
  visaScan?: string; // Base64 or placeholder URL
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  currency: string;
  dailyRate: number;
  totalDays: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string; // ISO String
  paymentTxId?: string;
  confirmedAt?: string;
  completedAt?: string;
  operatorId?: string;
  operatorNotes?: string;
  paymentFailedMessage?: string;
  rejectedByOperatorId?: string;
  finalDocUrl?: string; // Base64 or dummy download path
  finalDocName?: string;
  violationReportUrl?: string; // Predefined violation report text/PDF identifier if violation sent
}

export interface SystemConfig {
  supportAiScript: string;
  publicOfferText: string;
  publicOfferTextFR?: string;
  publicOfferTextRU?: string;
  migrationViolationGuide: string;
  legalKnowledgeBase?: string;
  legalKnowledgeBaseUpdatedAt?: string;
  bankCards: {
    USD: string;
    UZS: string;
    EUR: string;
    RUB: string;
  };
  legalDocumentVersions?: {
    privacyVersion: string;
    privacyDate: string;
    termsVersion: string;
    termsDate: string;
    cookiesVersion: string;
    cookiesDate: string;
  };
}

export interface ConsentRecord {
  id?: string;
  orderId: string;
  timestamp: string; // server time
  ipAddress: string;
  userAgent: string;
  locale: string;
  consents: {
    dataProcessing: boolean;
    thirdPartyTransfer: boolean;
    crossBorderTransfer: boolean;
    termsAccepted: boolean;
    marketing: boolean;
    selfTravellerStatus: boolean;
  };
  documentsVersion: {
    privacyVersion: string;
    termsVersion: string;
    cookiesVersion: string;
  };
  userId?: string;
  userEmail?: string;
}

export interface TouristNews {
  id: string;
  title: string;
  illustration: string; // Base64 data URL or image URL
  body: string; // Markdown or plain text news body
  summary?: string; // Brief excerpt
  category?: string; // e.g. "Законодательство", "Туризм", "Транспорт", "Визы"
  publishedAt: string; // YYYY-MM-DD or ISO string
  isFeatured?: boolean; // Main / Top 3 news flag
  author?: string;
  viewsCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // HH:MM
}

export type LanguageCode = 'en' | 'ru' | 'fr';

export type CurrencyCode = 'USD' | 'EUR' | 'RUB' | 'UZS';
