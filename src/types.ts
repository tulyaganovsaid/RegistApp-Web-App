export type UserRole = 'Client' | 'Operator' | 'Admin';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified?: boolean;
}

export type OrderStatus = 'Payment Pending' | 'In Progress' | 'Paid' | 'Completed' | 'Rejected due to violations' | 'Violation';

export interface Order {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
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
  bankCards: {
    USD: string;
    UZS: string;
    EUR: string;
    RUB: string;
  };
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // HH:MM
}

export type LanguageCode = 'en' | 'ru' | 'fr';

export type CurrencyCode = 'USD' | 'EUR' | 'RUB' | 'UZS';
