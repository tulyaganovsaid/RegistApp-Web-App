import { User, Order, SystemConfig, UserRole, TouristNews, ConsentRecord } from './types';
import { DEFAULT_NEWS, DEFAULT_LEGAL_KNOWLEDGE_BASE } from './defaultContent';
import { db, auth } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, getDocs, query, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export async function saveUserToFirestore(u: any) {
  try {
    const { auth } = await import('./firebase');
    if (!auth.currentUser) return;
    const cleanUser = cleanForFirestore(u);
    await setDoc(doc(db, 'users', u.id), cleanUser);
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
    const { handleFirestoreError, OperationType } = await import('./firebase');
    handleFirestoreError(err, OperationType.WRITE, `users/${u.id}`);
  }
}

export async function saveOrderToFirestore(o: any) {
  try {
    const { auth } = await import('./firebase');
    if (!auth.currentUser) return;
    
    const userEmail = auth.currentUser.email?.toLowerCase();
    if (userEmail) {
      const users = getUsers();
      const currentUser = users.find(u => u.email.toLowerCase() === userEmail);
      
      const activeUserStr = localStorage.getItem('registapp_active_user');
      let activeUserRole = 'Client';
      if (activeUserStr) {
        try {
          const parsed = JSON.parse(activeUserStr);
          activeUserRole = parsed.role;
        } catch (_) {}
      }

      const isStaff = (currentUser && (currentUser.role === 'Admin' || currentUser.role === 'Operator')) ||
                      (activeUserRole === 'Admin' || activeUserRole === 'Operator');
                      
      const isKnownStaffEmail = userEmail === 'registapp@gmail.com' ||
                                userEmail === 'tulyaganovsaid@gmail.com' ||
                                userEmail === 'operator@registapp.uz' || 
                                userEmail === 'admin@registapp.uz' ||
                                userEmail === 'admin@registapp.online' ||
                                userEmail === 'operator1@registapp.online' ||
                                userEmail === 'operator2@registapp.online' ||
                                userEmail === 'info@registapp.online' ||
                                userEmail.endsWith('@registapp.uz') ||
                                userEmail.endsWith('@registapp.online');
                                
      const isEmailMatch = o.clientEmail?.toLowerCase() === userEmail;
      
      if (!isStaff && !isKnownStaffEmail && !isEmailMatch) {
        // Skip saving to avoid Firebase permission denied error for orders belonging to others
        return;
      }
    }

    const cleanOrder = cleanForFirestore(o);
    await setDoc(doc(db, 'orders', o.id), cleanOrder);
  } catch (err) {
    console.error('Error saving order to Firestore:', err);
    const { handleFirestoreError, OperationType } = await import('./firebase');
    handleFirestoreError(err, OperationType.WRITE, `orders/${o.id}`);
  }
}

export async function saveConfigToFirestore(c: any) {
  try {
    const { auth } = await import('./firebase');
    if (!auth.currentUser) return;
    const cleanConfig = cleanForFirestore(c);
    await setDoc(doc(db, 'system_config', 'main'), cleanConfig);
  } catch (err) {
    console.error('Error saving config to Firestore:', err);
    const { handleFirestoreError, OperationType } = await import('./firebase');
    handleFirestoreError(err, OperationType.WRITE, 'system_config/main');
  }
}

export async function saveAuditLogToFirestore(al: any) {
  try {
    const { auth } = await import('./firebase');
    if (!auth.currentUser) return;
    const cleanAuditLog = cleanForFirestore(al);
    await setDoc(doc(db, 'audit_logs', al.id), cleanAuditLog);
  } catch (err) {
    console.error('Error saving audit log to Firestore:', err);
    const { handleFirestoreError, OperationType } = await import('./firebase');
    handleFirestoreError(err, OperationType.WRITE, `audit_logs/${al.id}`);
  }
}

export async function saveNewsToFirestore(n: TouristNews) {
  try {
    const { auth } = await import('./firebase');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    if (!auth.currentUser) {
      try {
        await signInWithEmailAndPassword(auth, 'admin@registapp.uz', 'admin123');
      } catch (_) {}
    }
    const cleanNews = cleanForFirestore(n);
    await setDoc(doc(db, 'tourist_news', n.id), cleanNews, { merge: true });
  } catch (err) {
    console.warn('Error saving news to Firestore:', err);
  }
}

export async function deleteNewsFromFirestore(newsId: string) {
  try {
    const { auth } = await import('./firebase');
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    if (!auth.currentUser) {
      try {
        await signInWithEmailAndPassword(auth, 'admin@registapp.uz', 'admin123');
      } catch (_) {}
    }
    await deleteDoc(doc(db, 'tourist_news', newsId));
  } catch (err) {
    console.warn('Error deleting news from Firestore:', err);
  }
}

export const CONSENTS_KEY = 'registapp_consents';

export function getConsents(): ConsentRecord[] {
  initializeDB();
  const raw = localStorage.getItem(CONSENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveConsentsLocally(consents: ConsentRecord[]) {
  localStorage.setItem(CONSENTS_KEY, JSON.stringify(consents));
}

/**
 * Persists an immutable user consent document into the Firestore 'consents' collection.
 * This is a mandatory condition for creating an order: if writing fails, it throws
 * to prevent order placement in compliance with personal data laws.
 */
export async function saveConsentToFirestore(consent: ConsentRecord): Promise<void> {
  const { auth, handleFirestoreError, OperationType } = await import('./firebase');

  if (!consent.orderId) {
    throw new Error('Missing orderId in consent document payload');
  }

  const currentUser = auth.currentUser;
  const payload: ConsentRecord = {
    ...consent,
    id: consent.orderId,
    userId: consent.userId || currentUser?.uid || '',
    userEmail: (consent.userEmail || currentUser?.email || '').toLowerCase(),
  };

  try {
    const cleanConsent = cleanForFirestore(payload);
    await setDoc(doc(db, 'consents', consent.orderId), cleanConsent);

    // Update local cache
    const existing = getConsents();
    const updated = [payload, ...existing.filter((c) => c.orderId !== consent.orderId)];
    saveConsentsLocally(updated);

    addAuditLog(
      payload.userEmail || 'client',
      'Legal Consent Recorded',
      `Registered user consent for Order ${consent.orderId}. Versions: Privacy v${consent.documentsVersion?.privacyVersion}, Terms v${consent.documentsVersion?.termsVersion}, Cookies v${consent.documentsVersion?.cookiesVersion}. IP: ${consent.ipAddress}`
    );
  } catch (err: any) {
    console.error('CRITICAL: Failed to save legal consent to Firestore:', err);
    handleFirestoreError(err, OperationType.WRITE, `consents/${consent.orderId}`);
    throw err;
  }
}

let activeUnsubscribers: (() => void)[] = [];

export function clearFirebaseListeners() {
  activeUnsubscribers.forEach(unsub => {
    try {
      unsub();
    } catch (e) {
      // Ignored
    }
  });
  activeUnsubscribers = [];
}

export function registerFirebaseListenersForUser(email: string, role: UserRole, uid: string) {
  const normalizedEmail = email.toLowerCase();
  clearFirebaseListeners();

  let resolvedRole = role;
  if (uid === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2') {
    resolvedRole = 'Admin';
  } else if (uid === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3') {
    resolvedRole = 'Operator';
  }

  // 1. Users sync
  try {
    if (resolvedRole === 'Admin' || resolvedRole === 'Operator') {
      const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
        if (snapshot.empty) {
          // Seed if first time on Firebase (Admin only holds permissions to seed other users)
          if (resolvedRole === 'Admin') {
            const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const seedUsers = users.length > 0 ? users : DEFAULT_USERS;
            seedUsers.forEach((u: any) => saveUserToFirestore(u));
          }
        } else {
          const deletedUserIds: string[] = JSON.parse(localStorage.getItem('registapp_deleted_user_ids') || '[]');
          const deletedSet = new Set(deletedUserIds.map((x: string) => x.toLowerCase()));

          const users: any[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const em = (data.email || '').toLowerCase();
            const uid = (docSnap.id || '').toLowerCase();
            if (em === 'client@test.com' || em === 'operator@test.com' || docSnap.id === 'user-client-test' || docSnap.id === 'operator-test' || deletedSet.has(em) || deletedSet.has(uid)) {
              if (resolvedRole === 'Admin') {
                deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
              }
            } else {
              users.push(data);
            }
          });
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          window.dispatchEvent(new CustomEvent('db-sync'));
        }
      }, (error) => {
        console.warn('Users Snapshot error:', error);
      });
      activeUnsubscribers.push(unsub);
    } else {
      // Client only syncs their own user document
      const unsub = onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if (docSnap.exists()) {
          const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
          const uData = docSnap.data();
          const filtered = users.filter((u: any) => u.id !== uid);
          filtered.push(uData);
          localStorage.setItem(USERS_KEY, JSON.stringify(filtered));
          window.dispatchEvent(new CustomEvent('db-sync'));
        }
      }, (error) => {
        console.warn('User Profile Snapshot error:', error);
      });
      activeUnsubscribers.push(unsub);
    }
  } catch (e) {
    console.warn('Users subscribe failed:', e);
  }

  // 2. Orders sync
  try {
    let ordersQuery;
    if (resolvedRole === 'Admin' || resolvedRole === 'Operator') {
      ordersQuery = collection(db, 'orders');
    } else {
      ordersQuery = query(collection(db, 'orders'), where('clientEmail', '==', normalizedEmail));
    }

    const unsub = onSnapshot(ordersQuery, (snapshot) => {
      if (snapshot.empty && (resolvedRole === 'Admin' || resolvedRole === 'Operator')) {
        // Seed if empty
        const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
        const seedOrders = orders.length > 0 ? orders : DEFAULT_ORDERS;
        seedOrders.forEach((o: any) => saveOrderToFirestore(o));
      } else {
        const orders: any[] = [];
        snapshot.forEach(docSnap => {
          orders.push(docSnap.data());
        });
        
        if (resolvedRole === 'Admin' || resolvedRole === 'Operator') {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        } else {
          // Client: merge their orders with other locally saved orders
          const allOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
          const external = allOrders.filter((o: any) => o && o.clientEmail && typeof o.clientEmail === 'string' && o.clientEmail.toLowerCase() !== normalizedEmail);
          const merged = [...external, ...orders];
          localStorage.setItem(ORDERS_KEY, JSON.stringify(merged));
        }
        window.dispatchEvent(new CustomEvent('db-sync'));
      }
    }, (error) => {
      console.warn('Orders Snapshot error:', error);
    });
    activeUnsubscribers.push(unsub);
  } catch (e) {
    console.warn('Orders subscribe failed:', e);
  }

  // 3. System Config sync
  try {
    const unsub = onSnapshot(collection(db, 'system_config'), (snapshot) => {
      if (snapshot.empty) {
        if (resolvedRole === 'Admin') {
          saveConfigToFirestore(DEFAULT_CONFIG);
        }
      } else {
        snapshot.forEach(docSnap => {
          if (docSnap.id === 'main') {
            localStorage.setItem(CONFIG_KEY, JSON.stringify(docSnap.data()));
            window.dispatchEvent(new CustomEvent('db-sync'));
          }
        });
      }
    }, (error) => {
      console.warn('Config Snapshot error:', error);
    });
    activeUnsubscribers.push(unsub);
  } catch (e) {
    console.warn('Config subscribe failed:', e);
  }

  // 4. Audit sync
  if (resolvedRole === 'Admin' || resolvedRole === 'Operator') {
    try {
      const unsub = onSnapshot(collection(db, 'audit_logs'), (snapshot) => {
        if (snapshot.empty) {
          DEFAULT_AUDIT.forEach((al: any) => saveAuditLogToFirestore(al));
        } else {
          const logs: any[] = [];
          snapshot.forEach(docSnap => {
            logs.push(docSnap.data());
          });
          // Sort by timestamp descending
          logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
          window.dispatchEvent(new CustomEvent('db-sync'));
        }
      }, (error) => {
        console.warn('Audit logs Snapshot error:', error);
      });
      activeUnsubscribers.push(unsub);
    } catch (e) {
      console.warn('Audit subscribe failed:', e);
    }
  }

  // 5. Tourist News sync
  initPublicNewsListener();

  // 6. Consents sync
  try {
    const consentsQuery = (resolvedRole === 'Admin' || resolvedRole === 'Operator')
      ? collection(db, 'consents')
      : query(collection(db, 'consents'), where('userEmail', '==', normalizedEmail));

    const unsub = onSnapshot(consentsQuery, (snapshot) => {
      const records: ConsentRecord[] = [];
      snapshot.forEach(docSnap => {
        records.push(docSnap.data() as ConsentRecord);
      });
      records.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      localStorage.setItem(CONSENTS_KEY, JSON.stringify(records));
      window.dispatchEvent(new CustomEvent('db-sync'));
    }, (error) => {
      console.warn('Consents Snapshot error:', error);
    });
    activeUnsubscribers.push(unsub);
  } catch (e) {
    console.warn('Consents subscribe failed:', e);
  }
}


const USERS_KEY = 'registapp_users';
export const DELETED_USERS_KEY = 'registapp_deleted_user_ids';
const ORDERS_KEY = 'registapp_orders';
const CONFIG_KEY = 'registapp_config';
const AUDIT_KEY = 'registapp_audit';
const NEWS_KEY = 'registapp_news';

export function getDeletedUserIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DELETED_USERS_KEY) || '[]');
  } catch {
    return [];
  }
}

// Tashkent Time (UTC+5) helper
export function getTashkentTime(): Date {
  const now = new Date();
  // Get time in Tashkent (UTC+5)
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const tashkentOffset = 5;
  return new Date(utc + 3600000 * tashkentOffset);
}

export function formatTashkentDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const DEFAULT_USERS: Array<User & { passwordHash: string }> = [
  {
    id: 'user-client',
    email: 'client@registapp.uz',
    firstName: 'Said',
    lastName: 'Tulyaganov',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123', // Clean plain-text mock hash for development simplicity
  },
  {
    id: '28194',
    email: 'operator@registapp.uz',
    firstName: 'Zafar',
    lastName: 'Karimov',
    role: 'Operator',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: '51972',
    email: 'admin@registapp.uz',
    firstName: 'Саид',
    lastName: 'Туляганов',
    role: 'Admin',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: '70005',
    email: 'registapp@gmail.com',
    firstName: 'Саид',
    lastName: 'Туляганов',
    role: 'Admin',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: '70006',
    email: 'tulyaganovsaid@gmail.com',
    firstName: 'Саид',
    lastName: 'Туляганов',
    role: 'Admin',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: '70001',
    email: 'admin@registapp.online',
    firstName: 'Саид',
    lastName: 'Туляганов',
    role: 'Admin',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: '70002',
    email: 'operator1@registapp.online',
    firstName: 'Оператор 1',
    lastName: 'RegistApp',
    role: 'Operator',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: '70003',
    email: 'operator2@registapp.online',
    firstName: 'Оператор 2',
    lastName: 'RegistApp',
    role: 'Operator',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: '70004',
    email: 'info@registapp.online',
    firstName: 'Инфо-служба',
    lastName: 'RegistApp',
    role: 'Operator',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: 'user-china',
    email: 'china.traveler@gmail.com',
    firstName: 'Wei',
    lastName: 'Chen',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123',
  },
  {
    id: 'user-france',
    email: 'jean.m@yahoo.fr',
    firstName: 'Jean',
    lastName: 'Matin',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123',
    createdAt: '2026-06-02T11:20:00Z',
  },
  {
    id: 'user-elena',
    email: 'elena.smirnova@mail.ru',
    firstName: 'Елена',
    lastName: 'Смирнова',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123',
    createdAt: '2026-06-04T12:00:00Z',
  },
  {
    id: 'user-david',
    email: 'david.miller@gmail.com',
    firstName: 'David',
    lastName: 'Miller',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123',
    createdAt: '2026-06-06T15:30:00Z',
    draftStep: 1, // Step 1: Legal options consent
  },
  {
    id: 'user-marcus',
    email: 'marcus.weber@gmx.de',
    firstName: 'Marcus',
    lastName: 'Weber',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123',
    createdAt: '2026-06-05T18:45:00Z',
    draftStep: 2, // Step 2: Passport Bio Upload
  },
  {
    id: 'user-sophie',
    email: 'sophie.laurent@orange.fr',
    firstName: 'Sophie',
    lastName: 'Laurent',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123',
    createdAt: '2026-06-03T10:00:00Z',
  },
  {
    id: 'user-alex',
    email: 'alexander.ivanov@yandex.ru',
    firstName: 'Александр',
    lastName: 'Иванов',
    role: 'Client',
    isVerified: true,
    passwordHash: 'admin123',
    createdAt: '2026-06-07T07:15:00Z',
    // 0 orders, no draft started yet
  }
];

const DEFAULT_CONFIG: SystemConfig = {
  supportAiScript: 'You are the RegistApp AI Support Bot, an intelligent assistant designed to help foreign tourists understand the complex rules of registration in Uzbekistan. Rule 1: Tourists staying for over 3 business days must register. Rule 2: Registration is done via certified operators or through e-mehmon.uz. Be polite, prompt, and output answers based on the language requested (English, Russian, or French). Provide contact info of migration authorities if requested.',
  publicOfferText: `PUBLIC OFFER (AGREEMENT)
FOR THE PROVISION OF INFORMATION AND INTERMEDIARY SERVICES FOR ONLINE REGISTRATION OF FOREIGN CITIZENS AND STATELESS PERSONS
Date of Publication: June 1, 2026
Effective Date: From the moment of publication

The Family Enterprise "Jules Verne Hostel" (hereinafter referred to as the "Service Provider"), represented by its Director, acting on the basis of the Articles of Association, hereby expresses its intent to conclude a Public Offer Agreement for the provision of information and intermediary services under the trademark "RegistApp" with any individual (foreign citizen or stateless person), hereinafter referred to as the "Customer", under the terms and conditions set forth in this Public Offer (hereinafter referred to as the "Offer" / "Agreement").

1. TERMS AND DEFINITIONS
•	Offer — this document, which constitutes an official public proposal by the Service Provider addressed to any individual to conclude an Agreement under the terms and conditions contained herein.
•	Acceptance of the Offer — the full, unconditional, and irrevocable acceptance of the terms and conditions of this Offer by the Customer through the execution of actions specified in Section 4 of this Offer (including checking the "I have read and agree" box and completing the payment).
•	Service Provider — Family Enterprise "Jules Verne Hostel", which administers the "RegistApp" Web Application and provides services to facilitate tourist registration.
•	Customer (Tourist) — a foreign citizen or a stateless person who has arrived in the Republic of Uzbekistan for tourism purposes, registered within the Web Application, and executed the Acceptance of the Offer.
•	"RegistApp" Web Application — a software complex (internet platform) accessible via the Internet address (including subdomains), designed to automate data, document collection, and payment processing for tourist registration.
•	Independent Tourist ("Free Tourist") — the legal status of a foreign citizen or a stateless person traveling within the Republic of Uzbekistan independently, who does not reside in hotels, hostels, guesthouses, or other accommodation facilities, and who is solely responsible (either personally or through an authorized agent) for the timely registration of their temporary stay.
•	"E-mehmon" System — the state-automated special electronic program of the Republic of Uzbekistan (emehmon.uz), designed for recording and managing the registration of place of stay for foreign citizens and stateless persons.
•	Official Registration Document — an extract from the "E-mehmon" system provided in PDF format with a unique QR code, confirming the legality of the Tourist's stay in the Republic of Uzbekistan for the specified period.

2. SUBJECT OF THE AGREEMENT
2.1. The Service Provider undertakes, upon the Customer's request, to provide information and intermediary services by generating, validating, and submitting an application for the temporary registration of the Customer under the status of an "Independent Tourist" ("Free Tourist") to the state information system "E-mehmon". The Customer, in turn, undertakes to pay for these services in accordance with the terms and conditions stipulated in this Agreement.
2.2. CRITICAL DISCLAIMER ON THE NATURE OF SERVICES: The Parties unconditionally agree that the services provided under the "RegistApp" trademark are strictly limited to remote assistance in processing the electronic registration of the Customer as an independent traveler. This Agreement DOES NOT imply, DOES NOT guarantee, and DOES NOT grant the Customer any right to physical residence, lodging, or accommodation in any real estate objects (including hostels, hotels, or guesthouses) owned or operated by the Family Enterprise "Jules Verne Hostel". The Customer is solely responsible for arranging their own overnight stays and accommodation within the Republic of Uzbekistan.

3. RIGHTS AND OBLIGATIONS OF THE PARTIES
3.1. The Service Provider shall:
•	Ensure round-the-clock access to the interface of the "RegistApp" Web Application for submitting requests (except for periods of scheduled technical maintenance).
•	Accept the necessary data and graphic copies of documents submitted by the Customer via the Web Application interface.
•	Verify the documents provided by the Customer for completeness, legibility, and compliance with the formal requirements of the migration legislation of the Republic of Uzbekistan.
•	Timely enter the data into the state system "E-mehmon" and, upon successful generation, provide the Customer with the Official Registration Document in PDF format in their Personal Account on "RegistApp".
•	In the event of discovering critical errors in documents, damaged files, unreadable images, or expired documents of the Customer — suspend the processing and provide the Customer with the "Guide on Next Steps in Case of Violation of Migration Laws".
3.2. The Customer shall:
•	Provide the Service Provider via the "RegistApp" Web Application with complete, accurate, and truthful personal data, as well as high-quality (clear, unblurred) photographs or scans of the following documents:
o	For citizens of visa-free countries: passport (photo page), entry stamp confirming arrival in the Republic of Uzbekistan.
o	For citizens of visa-required countries: passport (photo page), valid entry visa to the Republic of Uzbekistan, entry stamp.
•	Independently monitor the deadlines for submitting documents: in accordance with the legislation of the Republic of Uzbekistan, registration must be processed within 3 (three) working days from the moment of crossing the border.
•	Pay for the services of the Service Provider in full and in a timely manner according to the selected currency and tariffs indicated in the Web Application.
•	Bear sole responsibility for the authenticity of the provided documents and the accuracy of the specified arrival and stay dates.

4. CONCLUSION OF THE AGREEMENT AND PAYMENT
4.1. Concluding the agreement (Acceptance of the Offer) is recognized as the consecutive performance of the following actions by the Customer within the "RegistApp" Web Application:
•	Entering personal profile data and uploading the required scan-copies of documents.
•	Selecting the period of registration on the calendar strictly following Tashkent time (UTC+5).
•	Selecting the currency of calculation and checking the box "I have read and agree to the terms of the Public Offer".
•	Executing the transfer of funds in the amount of 100% advance payment.
4.2. Service Cost and Tariffs: The cost of services is calculated automatically based on the number of days selected by the Customer on the calendar and a fixed rate per 1 (one) day for one person in the chosen currency:
•	USD: 5 USD per day.
•	EUR: 5 EUR per day.
•	RUB: 500 RUB per day.
•	UZS: 70,000 UZS per day.
4.3. Payment is made by the Customer manually by transferring funds to the bank card details of the Service Provider specified in the payment screen interface corresponding to the selected currency. After making the transfer, the Customer confirms the transaction by clicking the "Confirm Payment" button. 4.4. The Customer's payment obligations are deemed fulfilled from the moment the Service Provider actually confirms the successful receipt of funds.

5. SERVICE DELIVERY AND ACCEPTANCE OF WORK
5.1. From the moment the payment is confirmed, the Service Provider (represented by the Operator) begins processing the order. The status of the order in the Customer's Personal Account shifts to "In Progress". 5.2. The standard order processing time does not exceed 24 hours from the moment payment is confirmed, provided that the Customer has submitted a complete and correct package of documents. 5.3. Upon successful entry of data into the "E-mehmon" system, the Service Provider uploads the final registration PDF document to the Customer's Personal Account. The order status changes to "Completed". 5.4. The service is considered properly rendered by the Service Provider, delivered in full, and accepted by the Customer without any reservations at the exact moment the order status changes to "Completed" and access to download the PDF document is granted. Signing additional physical acceptance certificates is not required.

6. LIMITATION OF LIABILITY AND DISCLAIMERS
6.1. The Parties shall be held liable for non-performance or improper performance of their obligations under this Agreement in accordance with the current legislation of the Republic of Uzbekistan. 6.2. Exclusion of Service Provider's Liability:
•	The Service Provider shall NOT be held liable for any fines, deportation, administrative penalties, or other sanctions applied to the Customer by law enforcement or migration authorities of the Republic of Uzbekistan if such sanctions are caused by:
o	The Customer providing inaccurate, fraudulent, forged, or unreadable documents/data.
o	The Customer missing the statutory 3-day deadline for initial registration registration.
o	Actual violation by the Customer of the rules of stay for foreign citizens in the Republic of Uzbekistan (including staying illegally at addresses that do not correspond to the "Independent Tourist" status, committing offenses, etc.).
•	The Service Provider shall NOT be held liable for temporary downtimes, technical updates, or long-term unavailability of the state system "E-mehmon" (emehmon.uz), which is completely outside the technical control of the Service Provider. In case registration is impossible due to the fault of the state system, the Service Provider zeroes out its fee, notifies the Customer, and refunds the paid amount minus the banking fees incurred during transactions.

7. REFUND POLICY
7.1. Due to the nature of the Service Provider's services being urgent mediation and rapid data transmission, no refunds shall be issued after the Service Provider's Operator has commenced reviewing the documents (status "In Progress") and/or the data has been sent to the "E-mehmon" system. 7.2. If the payment was completed, but the Customer explicitly requested cancellation before the Operator started processing the order, the Service Provider shall issue a refund to the Customer minus the standard transaction/gateway fees charged by banks and payment systems. 7.3. In the event that registration is rejected by state authorities due to violations of law identified on the part of the Tourist themselves (e.g., the Tourist is already blacklisted, wanted, or has a critical overdue period of unregistered stay), the funds paid for processing the documents shall not be refunded.

8. PERSONAL DATA PROTECTION
8.1. By executing the Acceptance of the Offer, the Customer gives their voluntary, informed, and unambiguous consent to the Family Enterprise "Jules Verne Hostel" to collect, process, store, systematize, and transfer their personal data (including passport data, biometric data from photos, visa details, and border crossing data) to the extent necessary to fulfill obligations under this Agreement and to integrate them into the state accounting system "E-mehmon". 8.2. The Service Provider guarantees the confidentiality of the Customer's personal data and utilizes modern cloud storage and encryption methods to prevent unauthorized access by third parties.

9. VALIDITY, AMENDMENT, AND TERMINATION
9.1. This Agreement enters into force from the moment of the Acceptance of the Offer by the Customer and remains valid until both Parties have fully performed their obligations. 9.2. The Service Provider reserves the right to unilaterally amend the terms of this Offer, tariffs, and payment details by publishing a revised edition within the "RegistApp" Web Application. Such modifications shall not apply to orders that have already been paid and are currently in progress.

10. LEGAL REQUISITES OF THE SERVICE PROVIDER
Service Provider: Family Enterprise "Jules Verne Hostel"
Republic of Uzbekistan
IT-Platform Trademark: RegistApp 
Customer Support E-mail: registapp@gmail.com`,
  publicOfferTextFR: `OFFRE PUBLIQUE (CONTRAT)
POUR LA PRESTATION DE SERVICES D'INFORMATION ET D'INTERMÉDIATION POUR L'ENREGISTREMENT EN LIGNE DES CITOYENS ÉTRANGERS ET DES APATRIDES
Date de publication : 1 juin 2026
Date d'entrée en vigueur : Dès sa publication

L'Entreprise Familiale « Jules Verne Hostel » (ci-après dénommée le « Prestataire »), représentée par son Directeur, agissant sur la base des Statuts de la société, exprime par la présente son intention de conclure un Contrat de prestation de services d'information et d'intermédiation sous la marque commerciale « RegistApp » mit tout individu (citoyen étranger ou apatride), ci-après dénommé le « Client », selon les termes et conditions énoncés dans la présente Offre Publique (ci-après dénommée l'« Offre » / le « Contrat »).

1. TERMES ET DÉFINITIONS
•	Offre — Le présent document, qui constitue une proposition publique officielle du Prestataire adressée à tout individu pour conclure un Contrat selon les termes et conditions y figurant.
•	Acceptation de l'Offre — L'acceptation pleine, entière et irrévocable des termes et conditions de la présente Offre par le Client par l'exécution des actions spécifiées à la Section 4 du présent document (y compris le fait de cocher la case « J'ai lu et j'accepte » et de procéder au paiement).
•	Prestataire — L'Entreprise Familiale « Jules Verne Hostel », qui administre l'Application Web « RegistApp » et fournit des services visant à faciliter l'enregistrement touristique.
•	Client (Touriste) — Un citoyen étranger ou un apatride arrivé en République d'Ouzbékistan à des fins touristiques, s'étant inscrit sur l'Application Web et ayant effectué l'Acceptation de l'Offre.
•	Application Web « RegistApp » — Le complexe logiciel (plateforme Internet) accessible via son adresse Internet (y compris ses sous-domaines), conçu pour automatiser la collecte de données, de documents et le traitement des paiements pour l'enregistrement des touristes.
•	Touriste Indépendant (« Free Tourist ») — Le statut légal d'un citoyen étranger ou d'un apatride voyageant de manière autonome en République d'Ouzbékistan, qui ne réside pas dans des hôtels, des auberges, des maisons d'hôtes ou d'autres établissements d'hébergement, et qui assume l'entière et unique responsabilité (personnellement ou via un agent autorisé) de l'enregistrement en temps voulu de son séjour temporaire.
•	Système « E-mehmon » — Le programme électronique spécialisé et automatisé de l'État de la République d'Ouzbékistan (emehmon.uz), conçu pour l'enregistrement et la gestion des lieux de séjour des citoyens étrangers et des apatrides.
•	Document Officiel d'Enregistrement — Un extrait du système « E-mehmon » fourni au format PDF avec un code QR unique, confirmant la légalité du séjour du Touriste en République d'Ouzbékistan pour la période spécifiée.

2. OBJET DU CONTRAT
2.1. Le Prestataire s'engage, à la demande du Client, à fournir des services d'information et d'intermédiation en générant, validant et soumettant une demande d'enregistrement temporaire du Client sous le statut de « Touriste Indépendant » auprès du système d'information de l'État « E-mehmon ». Le Client s'engage, en contrepartie, à payer ces services conformément aux termes et conditions stipulés dans le présent Contrat.
2.2. AVERTISSEMENT CRUCIAL SUR LA NATURE DES SERVICES : Les Parties conviennent sans réserve que les services fournis sous la marque « RegistApp » se limitent strictement à une assistance à distance pour le traitement de l'enregistrement électronique du Client en tant que voyageur indépendant. Le présent Contrat N'IMPLIQUE PAS, NE GARANTIT PAS et N'ACCORDE PAS au Client un droit de résidence physique, de logement ou d'hébergement dans des biens immobiliers (y compris les auberges, hôtels ou maisons d'hôtes) détenus ou exploités par l'Entreprise Familiale « Jules Verne Hostel ». Le Client est seul responsable de l'organisation de ses propres nuitées et de son hébergement sur le territoire de la République d'Ouzbékistan.

3. DROITS ET OBLIGATIONS DES PARTIES
3.1. Le Prestataire s'engage à :
•	Assurer un accès 24h/24 à l'interface de l'Application Web « RegistApp » pour la soumission des demandes (sauf pendant les périodes de maintenance technique planifiée).
•	Accepter les données nécessaires et les copies graphiques des documents soumis par le Client via l'interface de l'Application Web.
•	Vérifier les documents fournis par le Client afin de s'assurer qu'ils sont complets, lisibles et conformes aux exigences formelles de la législation migratoire de la République d'Ouzbékistan.
•	Saisir les données en temps voulu dans le système d'État « E-mehmon » et, après génération réussie, mettre à la disposition du Client le Document Officiel d'Enregistrement au format PDF dans son Espace Personnel sur « RegistApp ».
•	En cas de détection d'erreurs critiques dans les documents, de fichiers endommagés, d'images illisibles ou de documents expirés appartenant au Client — suspendre le traitement et fournir au Client le « Guide des étapes à suivre en cas de violation des lois sur la migration ».
3.2. Le Client s'engage à :
•	Fournir au Prestataire via l'Application Web « RegistApp » des données personnelles complètes, exactes et véridiques, ainsi que des photographies ou des scans de haute qualité (clairs et non flous) des documents suivants :
o	Pour les citoyens des pays exemptés de visa : passeport (page photo), cachet d'entrée confirmant l'arrivée en République d'Ouzbékistan.
o	Pour les citoyens des pays soumis à visa : passeport (page photo), visa d'entrée valide pour la République d'Ouzbékistan, cachet d'entrée.
•	Surveiller de manière indépendante les délais de soumission des documents : conformément à la législation de la République d'Ouzbékistan, l'enregistrement doit être effectué dans les 3 (trois) jours ouvrables suivant le passage de la frontière.
•	Payer les services du Prestataire en totalité et en temps voulu, selon la devise sélectionnée et les tarifs indiqués dans l'Application Web.
•	Assumer l'entière et unique responsabilité de l'authenticité des documents fournis et de l'exactitude des dates d'arrivée et de séjour spécifiées.

4. CONCLUSION DU CONTRAT ET PAIEMENT
4.1. La conclusion du contrat (Acceptation de l'Offre) est matérialisée par l'exécution consécutive des actions suivantes par le Client au sein de l'Application Web « RegistApp » :
•	Saisie des données du profil personnel et téléchargement des copies scannées requises des documents.
•	Sélection de la période d'enregistrement sur le calendrier en suivant strictement l'heure de Tachkent (UTC+5).
•	Sélection de la devise de calcul et coche de la case « J'ai lu et j'accepte les conditions de l'Offre Publique ».
•	Exécution du transfert de fonds correspondant à 100 % du paiement d'avance.
4.2. Coût des services et Tarifs : Le coût des services est calculé automatiquement sur la base du nombre de jours sélectionnés par le Client sur le calendrier et d'un tarif fixe par jour et par personne dans la devise choisie :
•	USD : 5 USD par jour.
•	EUR : 5 EUR par jour.
•	RUB : 500 RUB par jour.
•	UZS : 70 000 UZS par jour.
4.3. Le paiement est effectué manuellement par le Client en transférant les fonds vers les coordonnées de carte bancaire du Prestataire spécifiées sur l'écran de paiement correspondant à la devise sélectionnée. Après avoir effectué le transfert, le Client confirme la transaction en cliquant sur le bouton « Confirm Payment ». 4.4. Les obligations de paiement du Client sont considérées comme remplies à partir du moment où le Prestataire confirme formellement la réception effective des fonds.

5. PRESTATION DE SERVICES ET ACCEPTATION DES TRAVAUX
5.1. Dès la confirmation du paiement, le Prestataire (représenté par l'Opérateur) commence le traitement de la commande. Le statut de la commande dans l'Espace Personnel du Client passe à « En cours ». 5.2. Le d'un dossier documentaire complet et correct. 5.3. Suite à l'intégration réussie des données dans le système « E-mehmon », le Prestataire télécharge le document d'enregistrement final au format PDF dans l'Espace Personnel du Client. Le statut de la commande passe à « Terminé ». 5.4. Le service est considéré comme correctement rendu par le Prestataire, fourni dans son intégralité et accepté par le Client sans aucune réserve au moment précis où le statut de la commande passe à « Terminé » et où l'accès au téléchargement du document PDF est accordé. La signature de procès-verbaux de réception physiques supplémentaires n'est pas requise.

6. LIMITATION DE RESPONSABILITÉ ET EXCLUSIONS
6.1. Les Parties seront tenues responsables de l'inexécution ou de l'exécution non conforme de leurs obligations au titre du présent Contrat conformément à la législation en vigueur en République d'Ouzbékistan. 6.2. Exclusion de la responsabilité du Prestataire :
•	Le Prestataire ne pourra EN AUCUN CAS être tenu responsable des amendes, expulsions, sanctions administratives ou autres mesures appliquées au Client par les forces de l'ordre ou les autorités migratoires de la République d'Ouzbékistan si ces sanctions sont causées par :
o	La fourniture par le Client de documents/données inexacts, frauduleux, falsifiés ou illisibles.
o	Le non-respect par le Client du délai légal de 3 jours pour l'enregistrement initial.
o	La violation effective par le Client des règles de séjour des citoyens étrangers en République d'Ouzbékistan (y compris le fait de séjourner illégalement à des adresses ne correspondant pas au statut de « Touriste Indépendant », de commettre des infractions, etc.).
•	Le Prestataire ne pourra EN AUCUN CAS être tenu responsable des interruptions temporaires, des mises à jour techniques ou de l'indisponibilité prolongée du système d'État « E-mehmon » (emehmon.uz), qui échappe totalement au contrôle technique du Prestataire. Dans le cas où l'enregistrement s'avérerait impossible par la faute du système d'État, le Prestataire annules ses frais, en informe le Client et rembourse le montant payé, déduction faite des frais bancaires occasionnés par les transactions.

7. POLITIQUE DE REMBOURSEMENT
7.1. En raison de la nature des services du Prestataire, qui consistent en une intermédiation urgente et une transmission rapide des données, aucun remboursement ne sera effectué après que l'Opérateur du Prestataire a commencé à examiner les documents (statut « En cours ») et/ou que les données ont été envoyées au système « E-mehmon ». 7.2. Si le paiement a été effectué, mais que le Client a explicitement demandé l'annulation avant que l'Opérateur ne commence à traiter la commande, le Prestataire effectuera un remboursement au Client, déduction faite des frais de transaction standards appliqués par les banques et les plateformes de paiement. 7.3. Dans le cas où l'enregistrement est rejeté par les autorités de l'État en raison de violations de la loi identifiées du côté du Touriste lui-même (par exemple, si le Touriste est déjà recherché, inscrit sur liste noire ou présente une période critique de séjour non enregistré déjà dépassée), les fonds versés pour le traitement des documents ne seront pas remboursés.

8. PROTECTION DES DONNÉES PERSONNELLES
8.1. En procédant à l'Acceptation de l'Offre, le Client donne son consentement volontaire, éclairé et univoque à l'Entreprise Familiale « Jules Verne Hostel » pour collecter, traiter, stocker, systématiser et transférer ses données personnelles (y compris les données de passeport, les données biométriques issues des photos, les détails des visas et les données de passage des frontières) dans la mesure nécessaire à l'exécution des obligations découlant du présent Contrat et à leur intégration dans le système comptable de l'État « E-mehmon ». 8.2. Le Prestataire garantit la confidentialité des données personnelles du Client et utilise des méthodes modernes de stockage cloud et de chiffrement pour empêcher tout accès non autorisé par des tiers.

9. VALIDITÉ, MODIFICATION ET RÉSILIATION
9.1. Le présent Contrat entre en vigueur à compter du moment de l'Acceptation de l'Offre par le Client et reste valable jusqu'à ce que les deux Parties aient entièrement exécuté leurs obligations. 9.2. Le Prestataire se réserve le droit de modifier unilatéralement les conditions de la présente Offre, les tarifs et les détails de paiement en publiant une version révisée au sein de l'Application Web « RegistApp ». Ces modifications ne s'appliqueront pas aux commandes déjà payées et actuellement en cours de traitement.

10. COORDONNÉES JURIDIQUES DU PRESTATAIRE
Prestataire : Entreprise Familiale « Jules Verne Hostel »
République d'Ouzbékistan
Marque commerciale de la plateforme IT : RegistApp 
E-mail du support client : registapp@gmail.com`,
  publicOfferTextRU: `ПУБЛИЧНАЯ ОФЕРТА (ДОГОВОР)
НА ОКАЗАНИЕ ИНФОРМАЦИОННО-ПОСРЕДНИЧЕСКИХ УСЛУГ ПО ОНЛАЙН-РЕГИСТРАЦИИ ИНОСТРАННЫХ ГРАЖДАН И ЛИЦ БЕЗ ГРАЖДАНСТВА
Дата публикации: 01 июня 2026 года
Дата вступления в силу: С момента публикации

Семейное предприятие «Jules Verne Hostel» (далее — «Исполнитель»), в лице Руководителя, действующего на основании Устава, выражает намерение заключить Договор на оказание информационно-посреднических услуг под товарным знаком «RegistApp» с любым физическим лицом (иностранным гражданином или лицом без гражданства), далее именуемым «Заказчик», на условиях, изложенных в настоящей Публичной оферте (далее — «Оферта» / «Договор»).

1. ТЕРМИНЫ И ОПРЕДЕЛЕНИЯ
•	Оферта — настоящий документ, являющийся официальным публичным предложением Исполнителя, адресованным любому физическому лицу, заключить Договор на условиях, содержащихся в Оферте.
•	Акцепт Оферты — полное и безоговорочное принятие условий настоящей Оферты Заказчиком путем совершения действий, указанных в разделе 4 настоящей Оферты (включая проставление галочки «Ознакомлен и согласен» и совершение оплаты).
•	Исполнитель — Семейное предприятие «Jules Verne Hostel», осуществляющее администрирование Веб-приложения «RegistApp» и оказывающее услуги по содействию в оформлении туристической регистрации.
•	Заказчик (Турист) — иностранный гражданин или лицо без гражданства, прибывшее в Республику Узбекистан в туристических целях, прошедшее регистрацию в Веб-приложении и осуществившее Акцепт Оферты.
•	Веб-приложение «RegistApp» — программный комплекс (интернет-платформа), доступный по адресу в сети Интернет (включая поддомены), предназначенный для автоматизации сбора данных, документов и оплаты услуг по регистрации туристов.
•	Свободный турист — статус иностранного гражданина или лица без гражданства, путешествующего по Республике Узбекистан самостоятельно, не проживающего в гостиницах, отелях, хостелах или иных средствах размещения, и самостоятельно (либо через уполномоченного агента) несущего ответственность за своевременное оформление своего временного пребывания.
•	Система «E-mehmon» — государственная автоматизированная специальная электронная программа Республики Узбекистан (emehmon.uz), предназначенная для ведения учета и регистрации по месту пребывания иностранных граждан и лиц без гражданства.
•	Официальный документ о регистрации — выписка из системы «E-mehmon» в формате PDF с уникальным QR-кодом, подтверждающая законность пребывания Туриста на территории Республики Узбекистан в указанный период.

2. ПРЕДМЕТ ДОГОВОРА
2.1. Исполнитель обязуется по поручению Заказчика оказать информационно-посреднические услуги по формированию, проверке и направлению заявки на временную регистрацию Заказчика в статусе «Свободный турист» в государственную информационную систему «E-mehmon», а Заказчик обязуется оплатить эти услуги в порядке и на условиях, предусмотренных настоящим Договором.
2.2. ВАЖНОЕ УВЕДОМЛЕНИЕ О ХАРАКТЕРЕ УСЛУГ: Стороны безоговорочно соглашаются, что услуги, оказываемые под торговой маркой «RegistApp», ограничиваются исключительно удаленным содействием в оформлении электронной регистрации Заказчика в качестве самостоятельного (свободного) путешественника. Настоящий Договор НЕ подразумевает, НЕ гарантирует и НЕ предоставляет Заказчику право на фактическое проживание или размещение в физических объектах недвижимости (включая хостелы, отели, гостевые дома), принадлежащих Семейному предприятию «Jules Verne Hostel». Заказчик самостоятельно организует места своего ночлега и пребывания на территории Республики Узбекистан.

3. ПРАВА И ОБЯЗАННОСТИ СТОРОН
3.1. Исполнитель обязуется:
•	Обеспечить круглосуточный доступ к интерфейсу Веб-приложения «RegistApp» для оформления заявок (за исключением периодов проведения технических работ).
•	Принять от Заказчика необходимые сведения и графические копии документов через интерфейс Веб-приложения.
•	Проверить предоставленные Заказчиком документы на предмет комплектности, читаемости и соответствия формальным требованиям миграционного законодательства Республики Узбекистан.
•	Своевременно внесить данные в государственную систему «E-mehmon» и, в случае успешной генерации, предоставить Заказчику в Личном кабинете «RegistApp» Официальный документ о регистрации в формате PDF.
•	В случае обнаружения критических ошибок в документах, порчи, нечитаемости файлов или истечения срока действия документов Заказчика — приостановить оформление и предоставить Заказчику «Гайд по дальнейшим шагам в случае нарушения миграционного законодательства».
3.2. Заказчик обязуется:
•	Предоставить Исполнителю через Веб-приложение «RegistApp» полные, точные и достоверные персональные данные, а также качественные (четкие, не размытые) фотографии или сканы следующих документов:
o	Для граждан безвизовых стран: паспорт (страница с фото), штамп о въезде (прибытии) в Республику Узбекистан.
o	Для граждан визовых стран: паспорт (страница с фото), въездная виза в Республику Узбекистан, штамп о въезде (прибытии).
•	Самостоятельно контролировать сроки подачи документов: согласно законодательству РУз, регистрация должна быть оформлена в течение 3 (трех) дней (рабочих) с момента пересечения границы.
•	Своевременно и в полном объеме оплатить услуги Исполнителя согласно выбранной валюте и тарифам, указанным в Веб-приложении.
•	Нести единоличную ответственность за подлинность предоставляемых документов и достоверность указанных дат пребывания.

4. ПОРЯДОК ЗАКЛЮЧЕНИЯ ДОГОВОРА И ОПЛАТА
4.1. Заключением договора (Акцептом Оферты) признается последовательное выполнение Заказчиком следующих действий в Веб-приложении «RegistApp»:
•	Ввод анкетных данных и загрузка необходимых скан-копий документов.
•	Выбор периода регистрации на календаре по Ташкентскому времени (UTC+5).
•	Выбор валюты расчета и проставление галочки в чек-боксе «Я ознакомлен и согласен с условиями Публичной оферты».
•	Осуществление перевода денежных средств в размере 100% предоплаты.
4.2. Стоимость услуг и тарификация:
Стоимость услуг рассчитывается автоматически исходя из количества дней, выбранных Заказчиком на календаре, и фиксированной стоимости за 1 (один) день для одного человека в выбранной валюте:
•	USD: 5 долларов США в день.
•	EUR: 5 евро в день.
•	RUB: 500 российских рублей в день.
•	UZS: 70 000 узбекских сумов в день.
4.3. Оплата производится Заказчиком вручную путем перевода денежных средств на указанные в интерфейсе платежного экрана реквизиты банковских карт Исполнителя, соответствующие выбранной валюте. После совершения перевода Заказчик подтверждает транзакцию нажатием кнопки «Confirm Payment».
4.4. Обязательства Заказчика по оплате считаются исполненными с момента фактического подтверждения Исполнителем успешного поступления денежных средств.

5. ПОРЯДОК ОКАЗАНИЯ УСЛУГ И ПРИЕМКИ РАБОТ
5.1. С момента подтверждения оплаты Исполнитель (в лице Operator) приступает к обработке заказа. Статус заказа в Личном кабинете Заказчика устанавливается как «В процессе».
5.2. Нормативный срок обработки заказа составляет не более 24 часов с момента подтверждения оплаты, при условии предоставления Заказчиком полного и корректного пакета документов.
5.3. По результатам успешного внесения данных в систему «E-mehmon» Исполнитель загружает регистрационный PDF-документ в Личный кабинет Заказчика. Статус заказа меняется на «Выполнено».
5.4. Услуга считается оказанной Исполнителем надлежащим образом, в полном объеме и принятой Заказчиком без замечаний в момент изменения статуса заказа на «Выполнено» и предоставления доступа к скачиванию PDF-документа. Подписание дополнительных актов приема-передачи не требуется.

6. ОТВЕТСТВЕННОСТЬ СТОРОН И ОТКАЗ ОТ ОТВЕТСТВЕННОСТИ
6.1. Стороны несут ответственность за неисполнение или надлежащее исполнение обязательств по настоящему Договоу в соответствии с действующим законодательством Республики Узбекистан.
6.2. Ограничение ответственности Исполнителя:
•	Исполнитель не несет ответственности за любые штрафы, депортацию, административные взыскания или иные санкции, примененные к Заказчику органами правопорядка или миграционными службами Республики Узбекистан, если такие санкции вызваны:
o	Предоставлением Заказчиком недостоверных, поддельных или нечитаемых документов/данных.
o	Пропуском Заказчиком установленного законом 3-дневного срока для первоначального обращения за регистрацией.
o	Фактическим нарушением Заказчиком правил пребывания иностранных граждан в РУз (включая нелегальное нахождение по адресам, не соответствующим статусу «Свободный турист», совершение правонарушений и т.д.).
•	Исполнитель не несет ответственности за временные сбои, технические работы или долгосрочную недоступность государственной системы «E-mehmon» (emehmon.uz), находящейся вне зоны технического контроля Исполнителя. В случае невозможности проведения регистрации по вине государственной системы, Исполнитель обязуется уведомить Заказчика и вернуть уплаченные средства за вычетом фактически понесенных банковских комиссий.

7. ПОЛИТИКА ВОЗВРАТА ДЕНЕЖНЫХ СРЕДСТВ
7.1. Ввиду того, что услуги Исполнителя носят характер оперативного посредничества, возврат денежных средств после того, как Оператор Исполнителя приступил к обработке документов (статус «В процессе») и/или данные были переданы в систему «E-mehmon», не производится.
7.2. Если оплата была совершена, но Заказчик до начала обработки заказа Оператором заявил об отказе от услуги, Исполнитель осуществляет возврат денежных средств Заказчику за вычетом комиссий платежных систем/банков, удерживаемых при транзакциях.
7.3. В случае если в регистрации отказано со стороны государственных органов по причине выявления нарушений законодательства самим Туристом (например, Турист уже находится в розыске или имеет критический просроченный период пребывания), денежные средства за обработку документов не возвращаются.

8. ПЕРСОНАЛЬНЫЕ ДАННЫЕ
8.1. Заказчик, совершая Акцепт Оферты, дает свое добровольное, информированное и однозначное согласие Семейному предприятию «Jules Verne Hostel» на сбор, обработку, хранение, систематизацию и передачу своих персональных данных (включая паспортные данные, биометрические данные с фотоснимков, сведения о визах и перемещениях) в объеме, необходимом для выполнения обязательств по настоящему Договору, а также для их интеграции в государственную систему учета «E-mehmon».
8.2. Исполнитель обязуется обеспечивать конфиденциальность персонаных данных Заказчика и использовать современные методы шифрования и облачного хранения для предотвращения несанкционированного доступа третьих лиц.

9. СРОК ДЕЙСТВИЯ, ИЗМЕНЕНИЕ И РАСТОРЖЕНИЕ ДОГОВОРА
9.1. Настоящий Договор вступает в силу с момента Акцепта Оферты Заказчиком и действует до момента полного выполнения Сторонами своих обязательств.
9.2. Исполнитель оставляет за собой право в одностороннем порядке изменять условия настоящей Оферты, тарифы и реквизиты для оплаты путем публикации новой редакции в Веб-приложении «RegistApp». Изменения не распространяются на уже оплаченные и находящиеся в обработке заказы.

10. ЮРИДИЧЕСКИЕ РЕКВИЗИТЫ ИСПОЛНИТЕЛЯ
Исполнитель: Семейное предприятие «Jules Verne Hostel»
Республика Узбекистан
Торговая марка IT-сервиса: RegistApp
E-mail службы поддержки: registapp@gmail.com`,
  migrationViolationGuide: `WARNING GUIDE: VIOLATIONS OF UZBEKISTANI MIGRATION & TOURISM LAWS
If you receive this guide, your tourist presence has triggered an operator or admin alert. Please read the following rules very carefully to avoid heavy fines or structural deportation:

1. THE THREE-DAY RULE
Foreign tourists are legally required to verify their address of stay within 3 business days of crossing the frontier (excluding Sundays and official public holidays).

2. OVERSTAY FINES (ARTICLE 224 OF ADMINISTRATIVE CODE)
Exceeding the registration period or visa expiration date is an administrative misdemeanor. 
- Overstays of 1 to 5 days trigger a fine ranging from $50 to $100 equivalent.
- Overstays of over 5 days may trigger administrative detention, court fines up to $500, and a 3-year deport list ban from re-entering Uzbekistan.

3. CORRECTIVE MEASURES
Please immediately visit the nearest UVViOG (Migration Department of Internal Affairs) or process your pending registration scans with high-resolution documents onto the RegistApp platform. Ensure your arrival visa and stamp are perfectly legible. Links: https://emehmon.uz/`,
  bankCards: {
    USD: '5423 5818 3652 6605',
    UZS: '5614 6821 1916 7676',
    EUR: '5423 5818 3652 6605',
    RUB: '2204 3206 0483 2297',
  },
  legalKnowledgeBase: DEFAULT_LEGAL_KNOWLEDGE_BASE,
  legalKnowledgeBaseUpdatedAt: '2026-06-01T00:00:00Z',
};

const DEFAULT_ORDERS: Order[] = [
  {
    id: 'ORD-98234-A',
    userId: 'user-client',
    clientName: 'Said Tulyaganov',
    clientEmail: 'client@registapp.uz',
    visaType: 'Visa-free',
    country: 'Turkey',
    passportScan: 'passport_seed.png',
    arrivalStamp: 'stamp_seed.png',
    startDate: '2026-06-01',
    endDate: '2026-06-05',
    currency: 'USD',
    dailyRate: 5,
    totalDays: 5,
    totalPrice: 25,
    status: 'Completed',
    createdAt: '2026-06-01T10:14:02Z',
    paymentTxId: 'TX-USD-12933',
    confirmedAt: '2026-06-01T11:00:00Z',
    completedAt: '2026-06-01T11:20:00Z',
    operatorId: '28194',
    finalDocUrl: 'REGISTRATION-ISSUED-98234-SUCCESS.pdf'
  },
  {
    id: 'ORD-12345-B',
    userId: 'user-client',
    clientName: 'Said Tulyaganov',
    clientEmail: 'client@registapp.uz',
    visaType: 'Visa',
    country: 'United States',
    passportScan: 'passport_seed.png',
    arrivalStamp: 'stamp_seed.png',
    visaScan: 'visa_seed.png',
    startDate: '2026-06-12',
    endDate: '2026-06-18',
    currency: 'UZS',
    dailyRate: 70000,
    totalDays: 7,
    totalPrice: 490000,
    status: 'In Progress',
    createdAt: '2026-06-05T09:00:00Z',
    paymentTxId: 'TX-UZS-99120',
    confirmedAt: '2026-06-05T09:12:00Z'
  },
  {
    id: 'ORD-43110-C',
    userId: 'user-china',
    clientName: 'Wei Chen',
    clientEmail: 'china.traveler@gmail.com',
    visaType: 'Visa',
    country: 'China',
    passportScan: 'passport_seed.png',
    arrivalStamp: 'stamp_seed.png',
    visaScan: 'visa_seed.png',
    startDate: '2026-06-03',
    endDate: '2026-06-08',
    currency: 'RUB',
    dailyRate: 500,
    totalDays: 6,
    totalPrice: 3000,
    status: 'In Progress',
    createdAt: '2026-06-03T08:15:00Z',
    paymentTxId: 'TX-RUB-72300',
    confirmedAt: '2026-06-03T08:30:00Z'
  },
  {
    id: 'ORD-77123-D',
    userId: 'user-france',
    clientName: 'Jean Matin',
    clientEmail: 'jean.m@yahoo.fr',
    visaType: 'Visa-free',
    country: 'France',
    passportScan: 'passport_seed.png',
    arrivalStamp: 'stamp_seed.png',
    startDate: '2026-06-02',
    endDate: '2026-06-09',
    currency: 'EUR',
    dailyRate: 5,
    totalDays: 8,
    totalPrice: 40,
    status: 'In Progress',
    createdAt: '2026-06-02T14:35:00Z',
    paymentTxId: 'TX-EUR-90088',
    confirmedAt: '2026-06-02T14:50:00Z'
  },
  {
    id: 'ORD-88102-E',
    userId: 'user-elena',
    clientName: 'Елена Смирнова',
    clientEmail: 'elena.smirnova@mail.ru',
    visaType: 'Visa-free',
    country: 'Russia',
    passportScan: 'passport_seed.png',
    arrivalStamp: 'stamp_seed.png',
    startDate: '2026-06-10',
    endDate: '2026-06-14',
    currency: 'USD',
    dailyRate: 5,
    totalDays: 4,
    totalPrice: 20,
    status: 'Payment Pending',
    createdAt: '2026-06-04T12:30:00Z'
  },
  {
    id: 'ORD-55291-S',
    userId: 'user-sophie',
    clientName: 'Sophie Laurent',
    clientEmail: 'sophie.laurent@orange.fr',
    visaType: 'Visa-free',
    country: 'France',
    passportScan: 'passport_seed.png',
    arrivalStamp: 'stamp_seed.png',
    startDate: '2026-06-08',
    endDate: '2026-06-15',
    currency: 'EUR',
    dailyRate: 5,
    totalDays: 7,
    totalPrice: 35,
    status: 'Paid',
    paymentTxId: 'TX-EUR-44102',
    confirmedAt: '2026-06-03T10:20:00Z',
    createdAt: '2026-06-03T10:05:00Z'
  }
];

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  action: string;
  details: string;
}

const DEFAULT_AUDIT: AuditLog[] = [
  {
    id: 'AUD-001',
    timestamp: '2026-06-01T11:00:00Z',
    userEmail: 'operator@registapp.uz',
    action: 'Order Processed',
    details: 'Completed registration and uploaded final PDF for ORD-98234-A.'
  },
  {
    id: 'AUD-002',
    timestamp: '2026-06-01T10:14:02Z',
    userEmail: 'client@registapp.uz',
    action: 'Order Created',
    details: 'Initiated Order ORD-98234-A, visa-free status, country Turkey.'
  },
  {
    id: 'AUD-003',
    timestamp: '2026-06-05T09:12:00Z',
    userEmail: 'client@registapp.uz',
    action: 'Payment Confirmed',
    details: 'Submitted dynamic transaction TX-UZS-99120 for ORD-12345-B.'
  }
];

let dbInitialized = false;

// DB Operations
export function initializeDB() {
  if (dbInitialized) return;
  dbInitialized = true;

  // Setup real-time Firebase listeners driven by Auth changes
  onAuthStateChanged(auth, async (authUser) => {
    if (authUser) {
      // Fetch or look up the user's role
      let role: UserRole = 'Client';
      if (authUser.uid === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2') {
        role = 'Admin';
      } else if (authUser.uid === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3') {
        role = 'Operator';
      } else {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', authUser.uid));
          if (userDocSnap.exists()) {
            role = userDocSnap.data().role as UserRole;
          } else {
            // Check local storage for matching email as a reliable fallback
            const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const matched = localUsers.find((u: any) => u.email.toLowerCase() === authUser.email?.toLowerCase());
            if (matched) {
              role = matched.role as UserRole;
            }
          }
        } catch (err) {
          console.warn('Error fetching user role on state change, falling back to client:', err);
        }
      }
      registerFirebaseListenersForUser(authUser.email || '', role, authUser.uid);
    } else {
      clearFirebaseListeners();
    }
  });

  const deletedUserIds: string[] = JSON.parse(localStorage.getItem(DELETED_USERS_KEY) || '[]');
  const deletedSet = new Set(deletedUserIds.map((x: string) => x.toLowerCase()));

  if (!localStorage.getItem(USERS_KEY)) {
    const initialUsers = DEFAULT_USERS.filter(u => !deletedSet.has(u.id.toLowerCase()) && !deletedSet.has(u.email.toLowerCase()));
    localStorage.setItem(USERS_KEY, JSON.stringify(initialUsers));
  } else {
    // Ensure all default test accounts exist in localStorage, and purge deleted test accounts
    try {
      let users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      let updated = false;
      
      // Filter out deleted test accounts
      const initialCount = users.length;
      users = users.filter((u: any) => {
        const em = (u.email || '').toLowerCase();
        const uid = (u.id || '').toLowerCase();
        if (em === 'client@test.com' || em === 'operator@test.com' || uid === 'user-client-test' || uid === 'operator-test') {
          return false;
        }
        if (deletedSet.has(em) || deletedSet.has(uid)) {
          return false;
        }
        return true;
      });
      if (users.length !== initialCount) {
        updated = true;
      }

      DEFAULT_USERS.forEach(defU => {
        if (deletedSet.has(defU.id.toLowerCase()) || deletedSet.has(defU.email.toLowerCase())) {
          return;
        }
        const exists = users.some((u: any) => u.email?.toLowerCase() === defU.email.toLowerCase() || u.id === defU.id);
        if (!exists) {
          users.push(defU);
          updated = true;
        }
      });

      users.forEach((u: any) => {
        const uEmail = (u.email || '').toLowerCase();
        if (uEmail === 'admin@registapp.uz' || uEmail === 'admin@registapp.online' || uEmail === 'registapp@gmail.com' || uEmail === 'tulyaganovsaid@gmail.com') {
          if (u.firstName !== 'Саид' || u.lastName !== 'Туляганов' || u.role !== 'Admin') {
            u.firstName = 'Саид';
            u.lastName = 'Туляганов';
            u.role = 'Admin';
            updated = true;
          }
        }
        if (uEmail === 'operator1@registapp.online') {
          if (u.firstName !== 'Оператор 1' || u.role !== 'Operator') {
            u.firstName = 'Оператор 1';
            u.lastName = 'RegistApp';
            u.role = 'Operator';
            updated = true;
          }
        }
        if (uEmail === 'operator2@registapp.online') {
          if (u.firstName !== 'Оператор 2' || u.role !== 'Operator') {
            u.firstName = 'Оператор 2';
            u.lastName = 'RegistApp';
            u.role = 'Operator';
            updated = true;
          }
        }
        if (uEmail === 'info@registapp.online') {
          if (u.firstName !== 'Инфо-служба' || u.role !== 'Operator') {
            u.firstName = 'Инфо-служба';
            u.lastName = 'RegistApp';
            u.role = 'Operator';
            updated = true;
          }
        }
        if (u.role === 'Operator' || u.role === 'Admin') {
          if (u.id === 'user-operator') {
            u.id = '28194';
            updated = true;
          } else if (u.id === 'user-admin') {
            u.id = '51972';
            updated = true;
          } else if (!/^\d{5}$/.test(u.id)) {
            let hashVal = 0;
            for (let i = 0; i < u.id.length; i++) {
              hashVal = (hashVal * 31 + u.id.charCodeAt(i)) % 90000;
            }
            u.id = String(10000 + hashVal);
            updated = true;
          }
        }
      });
      if (updated) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
      }

      // Also ensure active user session resets if it was one of the test accounts
      const activeUserStr = localStorage.getItem('registapp_active_user');
      if (activeUserStr) {
        try {
          const parsed = JSON.parse(activeUserStr);
          const activeEmail = (parsed.email || '').toLowerCase();
          if (activeEmail === 'client@test.com' || activeEmail === 'operator@test.com' || parsed.id === 'user-client-test' || parsed.id === 'operator-test') {
            localStorage.removeItem('registapp_active_user');
          } else if ((activeEmail === 'admin@registapp.uz' || activeEmail === 'registapp@gmail.com' || activeEmail === 'tulyaganovsaid@gmail.com') && (parsed.firstName !== 'Саид' || parsed.lastName !== 'Туляганов' || parsed.role !== 'Admin')) {
            parsed.firstName = 'Саид';
            parsed.lastName = 'Туляганов';
            parsed.role = 'Admin';
            localStorage.setItem('registapp_active_user', JSON.stringify(parsed));
          }
        } catch (_) {}
      }

      // Purge test accounts from Firestore collection 'users' if present
      try {
        deleteDoc(doc(db, 'users', 'user-client-test')).catch(() => {});
        deleteDoc(doc(db, 'users', 'operator-test')).catch(() => {});
        getDocs(collection(db, 'users')).then((snapshot) => {
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const em = (data.email || '').toLowerCase();
            if (em === 'client@test.com' || em === 'operator@test.com' || docSnap.id === 'user-client-test' || docSnap.id === 'operator-test') {
              deleteDoc(doc(db, 'users', docSnap.id)).catch(() => {});
            }
          });
        }).catch(() => {});
      } catch (_) {}
    } catch (e) {
      console.error('Migration error for users:', e);
    }
  }
  if (!localStorage.getItem(ORDERS_KEY)) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(DEFAULT_ORDERS));
  } else {
    // Migrate operator IDs in orders
    try {
      const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      let updated = false;
      orders.forEach((o: any) => {
        if (o.operatorId === 'user-operator') {
          o.operatorId = '28194';
          updated = true;
        } else if (o.operatorId && !/^\d{5}$/.test(o.operatorId)) {
          let hashVal = 0;
          for (let i = 0; i < o.operatorId.length; i++) {
            hashVal = (hashVal * 31 + o.operatorId.charCodeAt(i)) % 90000;
          }
          o.operatorId = String(10000 + hashVal);
          updated = true;
        }
      });
      DEFAULT_ORDERS.forEach(defO => {
        const exists = orders.some((o: any) => o.id === defO.id);
        if (!exists) {
          orders.push(defO);
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
      }
    } catch (e) {
      console.error('Migration error for orders:', e);
    }
  }
  
  const existingConfigStr = localStorage.getItem(CONFIG_KEY);
  if (!existingConfigStr) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
  } else {
    try {
      const configObj = JSON.parse(existingConfigStr);
      // If offter text is empty, contains the old placeholder, or doesn't mention Jules Verne, force reset to updated
      if (!configObj.publicOfferText || configObj.publicOfferText.includes('RegistApp Services LTD') || !configObj.publicOfferText.includes('Jules Verne Hostel')) {
        configObj.publicOfferText = DEFAULT_CONFIG.publicOfferText;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(configObj));
      }
      if (!configObj.publicOfferTextFR) {
        configObj.publicOfferTextFR = DEFAULT_CONFIG.publicOfferTextFR;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(configObj));
      }
      if (!configObj.publicOfferTextRU || !configObj.publicOfferTextRU.includes('Семейное предприятие «Jules Verne Hostel»')) {
        configObj.publicOfferTextRU = DEFAULT_CONFIG.publicOfferTextRU;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(configObj));
      }
      if (!configObj.bankCards || configObj.bankCards.UZS !== DEFAULT_CONFIG.bankCards.UZS) {
        configObj.bankCards = DEFAULT_CONFIG.bankCards;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(configObj));
      }
      if (!configObj.legalKnowledgeBase) {
        configObj.legalKnowledgeBase = DEFAULT_CONFIG.legalKnowledgeBase;
        configObj.legalKnowledgeBaseUpdatedAt = DEFAULT_CONFIG.legalKnowledgeBaseUpdatedAt;
        localStorage.setItem(CONFIG_KEY, JSON.stringify(configObj));
      }
    } catch (e) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
    }
  }

  if (!localStorage.getItem(AUDIT_KEY)) {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(DEFAULT_AUDIT));
  }

  if (!localStorage.getItem(NEWS_KEY)) {
    localStorage.setItem(NEWS_KEY, JSON.stringify(DEFAULT_NEWS));
  }

  // Ensure public real-time synchronization for tourist news from Firestore
  initPublicNewsListener();
}

export function getUsers(): Array<User & { passwordHash: string }> {
  initializeDB();
  let users: Array<User & { passwordHash: string }> = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  let updated = false;

  const filtered = users.filter((u: any) => {
    const em = (u.email || '').toLowerCase();
    return em !== 'client@test.com' && em !== 'operator@test.com' && u.id !== 'user-client-test' && u.id !== 'operator-test';
  });
  if (filtered.length !== users.length) {
    users = filtered;
    updated = true;
  }

  users.forEach(u => {
    const uEm = (u.email || '').toLowerCase();
    if (uEm === 'admin@registapp.uz' || uEm === 'registapp@gmail.com' || uEm === 'tulyaganovsaid@gmail.com') {
      if (u.firstName !== 'Саид' || u.lastName !== 'Туляганов' || u.role !== 'Admin') {
        u.firstName = 'Саид';
        u.lastName = 'Туляганов';
        u.role = 'Admin';
        updated = true;
      }
    }
  });
  if (updated) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
  return users;
}

export function saveUsers(users: Array<User & { passwordHash: string }>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  users.forEach(u => saveUserToFirestore(u));
  
  // Handshake deleted users
  getDocs(collection(db, 'users')).then((qSnapshot) => {
    qSnapshot.forEach((docSnap) => {
      if (!users.some(u => u.id === docSnap.id)) {
        deleteDoc(doc(db, 'users', docSnap.id)).catch(err => console.error('Delete user err:', err));
      }
    });
  }).catch(err => console.error('Sync users error:', err));
}

export function getOrders(): Order[] {
  initializeDB();
  return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
}

export function saveOrders(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  orders.forEach(o => saveOrderToFirestore(o));
}

export function deleteOrder(orderId: string, performerEmail: string = 'admin@registapp.uz'): boolean {
  initializeDB();
  const orders = getOrders();
  const target = orders.find(o => o.id === orderId);
  if (!target) return false;

  const filtered = orders.filter(o => o.id !== orderId);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(filtered));

  try {
    deleteDoc(doc(db, 'orders', orderId)).catch(err => {
      console.error('Error deleting order from Firestore:', err);
    });
  } catch (err) {
    console.error('Failed to trigger Firestore order deletion:', err);
  }

  addAuditLog(
    performerEmail,
    'Order Deleted',
    `Заказ #${orderId} (${target.clientName}, ${target.clientEmail}, ${target.totalDays} дн., статус: ${target.status}) был удален администратором Саид Туляганов.`
  );

  window.dispatchEvent(new CustomEvent('db-sync'));
  return true;
}

export function deleteMultipleOrders(orderIds: string[], performerEmail: string = 'admin@registapp.uz'): number {
  initializeDB();
  const orders = getOrders();
  const toDeleteSet = new Set(orderIds);
  const toDeleteOrders = orders.filter(o => toDeleteSet.has(o.id));
  if (toDeleteOrders.length === 0) return 0;

  const remaining = orders.filter(o => !toDeleteSet.has(o.id));
  localStorage.setItem(ORDERS_KEY, JSON.stringify(remaining));

  toDeleteOrders.forEach(o => {
    try {
      deleteDoc(doc(db, 'orders', o.id)).catch(err => {
        console.error(`Error deleting order ${o.id} from Firestore:`, err);
      });
    } catch (err) {
      console.error(`Failed to trigger Firestore order deletion for ${o.id}:`, err);
    }
  });

  addAuditLog(
    performerEmail,
    'Bulk Orders Deleted',
    `Администратор Саид Туляганов удалил ${toDeleteOrders.length} заказов: ${toDeleteOrders.map(o => '#' + o.id).join(', ')}.`
  );

  window.dispatchEvent(new CustomEvent('db-sync'));
  return toDeleteOrders.length;
}

export function getConfig(): SystemConfig {
  initializeDB();
  const loaded: SystemConfig = JSON.parse(localStorage.getItem(CONFIG_KEY) || JSON.stringify(DEFAULT_CONFIG));
  if (!loaded.legalKnowledgeBase) {
    loaded.legalKnowledgeBase = DEFAULT_LEGAL_KNOWLEDGE_BASE;
  }
  return loaded;
}

export function saveConfig(config: SystemConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  saveConfigToFirestore(config);
  addAuditLog('admin@registapp.uz', 'System Config Update', 'Modified system files or cards configuration in Content Management.');
}

let publicNewsUnsub: (() => void) | null = null;

export function initPublicNewsListener() {
  if (publicNewsUnsub) return;
  try {
    publicNewsUnsub = onSnapshot(collection(db, 'tourist_news'), (snapshot) => {
      if (snapshot.empty) {
        DEFAULT_NEWS.forEach(n => saveNewsToFirestore(n));
        return;
      }
      const remoteItems: TouristNews[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data() as TouristNews;
        if (d && d.id && d.title) {
          remoteItems.push(d);
        }
      });

      const localNews: TouristNews[] = (() => {
        try {
          return JSON.parse(localStorage.getItem(NEWS_KEY) || '[]');
        } catch {
          return [];
        }
      })();

      const newsMap = new Map<string, TouristNews>();
      // 1. Seed defaults first
      DEFAULT_NEWS.forEach(n => newsMap.set(n.id, n));
      // 2. Put remote items from Firestore
      remoteItems.forEach(n => newsMap.set(n.id, n));
      // 3. Preserve any local items not yet synced to Firestore, and sync them!
      localNews.forEach(n => {
        if (!newsMap.has(n.id)) {
          newsMap.set(n.id, n);
          saveNewsToFirestore(n);
        }
      });

      const merged = Array.from(newsMap.values());
      merged.sort((a, b) => {
        const timeA = new Date(a.publishedAt).getTime() || 0;
        const timeB = new Date(b.publishedAt).getTime() || 0;
        return timeB - timeA;
      });

      localStorage.setItem(NEWS_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent('db-sync'));
    }, (error) => {
      console.warn('Public news listener snapshot error:', error);
    });
  } catch (e) {
    console.warn('Failed to start public news listener:', e);
  }
}

export function getNews(): TouristNews[] {
  initializeDB();
  const raw = localStorage.getItem(NEWS_KEY);
  if (!raw) {
    localStorage.setItem(NEWS_KEY, JSON.stringify(DEFAULT_NEWS));
    return DEFAULT_NEWS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const defaultMap = new Map(DEFAULT_NEWS.map(n => [n.id, n]));
      const enriched = parsed.map((item: TouristNews) => {
        const def = defaultMap.get(item.id);
        if (def && (!item.translations || !item.translations.en || !item.translations.fr)) {
          return {
            ...item,
            translations: {
              ...(def.translations || {}),
              ...(item.translations || {})
            }
          };
        }
        return item;
      });

      return enriched.sort((a: TouristNews, b: TouristNews) => {
        const timeA = new Date(a.publishedAt).getTime() || 0;
        const timeB = new Date(b.publishedAt).getTime() || 0;
        return timeB - timeA;
      });
    }
    localStorage.setItem(NEWS_KEY, JSON.stringify(DEFAULT_NEWS));
    return DEFAULT_NEWS;
  } catch (e) {
    return DEFAULT_NEWS;
  }
}

export function seedDefaultNews(force = false): TouristNews[] {
  initializeDB();
  const raw = localStorage.getItem(NEWS_KEY);
  if (force || !raw) {
    let existingCustom: TouristNews[] = [];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const defaultIds = new Set(DEFAULT_NEWS.map(n => n.id));
          existingCustom = parsed.filter(n => !defaultIds.has(n.id));
        }
      } catch (_) {}
    }
    const merged = [...existingCustom, ...DEFAULT_NEWS];
    merged.sort((a, b) => (new Date(b.publishedAt).getTime() || 0) - (new Date(a.publishedAt).getTime() || 0));
    localStorage.setItem(NEWS_KEY, JSON.stringify(merged));
    merged.forEach(n => saveNewsToFirestore(n));
    window.dispatchEvent(new CustomEvent('db-sync'));
    addAuditLog('admin@registapp.uz', 'News Catalog Generated', 'Сгенерировано 10 официальных новостей о туризме в Узбекистане с 10 иллюстрациями.');
    return merged;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.sort((a: TouristNews, b: TouristNews) => {
        const timeA = new Date(a.publishedAt).getTime() || 0;
        const timeB = new Date(b.publishedAt).getTime() || 0;
        return timeB - timeA;
      });
    }
    localStorage.setItem(NEWS_KEY, JSON.stringify(DEFAULT_NEWS));
    return DEFAULT_NEWS;
  } catch (e) {
    localStorage.setItem(NEWS_KEY, JSON.stringify(DEFAULT_NEWS));
    return DEFAULT_NEWS;
  }
}

export function saveNews(newsList: TouristNews[]) {
  localStorage.setItem(NEWS_KEY, JSON.stringify(newsList));
  newsList.forEach(n => saveNewsToFirestore(n));
  window.dispatchEvent(new CustomEvent('db-sync'));
}

export function addNewsArticle(article: Omit<TouristNews, 'id' | 'publishedAt'> & { id?: string; publishedAt?: string }): TouristNews {
  const news = getNews();
  const id = article.id || `news-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = getTashkentTime();
  const publishedAt = article.publishedAt || now.toISOString();
  const newArticle: TouristNews = {
    ...article,
    id,
    publishedAt,
    viewsCount: article.viewsCount || 1,
    isFeatured: article.isFeatured ?? true
  };
  news.unshift(newArticle);
  saveNews(news);
  addAuditLog('admin@registapp.uz', 'News Published', `Published tourist news: "${newArticle.title}"`);
  return newArticle;
}

export function updateNewsArticle(id: string, updates: Partial<TouristNews>): TouristNews {
  const news = getNews();
  const index = news.findIndex(n => n.id === id);
  if (index === -1) throw new Error('News article not found');
  news[index] = { ...news[index], ...updates };
  saveNews(news);
  addAuditLog('admin@registapp.uz', 'News Updated', `Updated news: "${news[index].title}"`);
  return news[index];
}

export function deleteNewsArticle(id: string) {
  let news = getNews();
  const article = news.find(n => n.id === id);
  news = news.filter(n => n.id !== id);
  localStorage.setItem(NEWS_KEY, JSON.stringify(news));
  deleteNewsFromFirestore(id);
  window.dispatchEvent(new CustomEvent('db-sync'));
  if (article) {
    addAuditLog('admin@registapp.uz', 'News Deleted', `Deleted news: "${article.title}"`);
  }
}

export function toggleNewsFeatured(id: string): TouristNews {
  const news = getNews();
  const index = news.findIndex(n => n.id === id);
  if (index === -1) throw new Error('News article not found');
  news[index].isFeatured = !news[index].isFeatured;
  saveNews(news);
  return news[index];
}

export function getLegalKnowledgeBase(): string {
  const config = getConfig();
  return config.legalKnowledgeBase || DEFAULT_LEGAL_KNOWLEDGE_BASE;
}

export function saveLegalKnowledgeBase(content: string) {
  const config = getConfig();
  const updated: SystemConfig = {
    ...config,
    legalKnowledgeBase: content,
    legalKnowledgeBaseUpdatedAt: new Date().toISOString()
  };
  saveConfig(updated);
  addAuditLog('admin@registapp.uz', 'Legal Knowledge Base Updated', `Updated legal knowledge base for Tourist AI Support (${content.length} characters).`);
}

export function getAuditLogs(): AuditLog[] {
  initializeDB();
  return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
}

export function addAuditLog(userEmail: string, action: string, details: string) {
  const logs = getAuditLogs();
  const log: AuditLog = {
    id: `AUD-${Date.now().toString().slice(-5)}`,
    timestamp: new Date().toISOString(),
    userEmail,
    action,
    details
  };
  logs.unshift(log);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
  saveAuditLogToFirestore(log);
}

// User Actions
export async function loginUser(email: string, passwordHash: string): Promise<User | null> {
  const lowEmail = email.toLowerCase();
  if (lowEmail === 'client@test.com' || lowEmail === 'operator@test.com') {
    return null;
  }
  const { auth, db } = await import('./firebase');
  const { signInWithEmailAndPassword, createUserWithEmailAndPassword } = await import('firebase/auth');
  const { doc, getDoc, setDoc } = await import('firebase/firestore');

  const users = getUsers();
  const matchedUserByEmail = users.find(u => u.email.toLowerCase() === lowEmail);
  const matchedLocalUser = users.find(u => u.email.toLowerCase() === lowEmail && u.passwordHash === passwordHash);

  try {
    // Attempt Firebase Auth sign-in
    const userCredential = await signInWithEmailAndPassword(auth, lowEmail, passwordHash);
    const authUser = userCredential.user;

    // Load user role and details from Firestore
    const userDocRef = doc(db, 'users', authUser.uid);
    const userDocSnap = await getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const dbUser = userDocSnap.data() as any;
      let userRole = dbUser.role as any;
      if (authUser.uid === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2') {
        userRole = 'Admin';
      } else if (authUser.uid === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3') {
        userRole = 'Operator';
      }

      addAuditLog(dbUser.email, 'User Login', `Successfully logged in via Firebase Auth with role ${userRole}.`);
      
      // Update local storage user profile to match Firestore
      const targetUser = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: userRole,
        isVerified: dbUser.isVerified,
        passwordHash
      };
      const index = users.findIndex(u => u.email.toLowerCase() === lowEmail);
      if (index > -1) {
        users[index] = targetUser;
      } else {
        users.push(targetUser);
      }
      localStorage.setItem(USERS_KEY, JSON.stringify(users));

      // Correct role conflict in Firestore if mismatch
      if (dbUser.role !== userRole) {
        await setDoc(userDocRef, { role: userRole }, { merge: true });
      }

      return {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        role: userRole,
        isVerified: dbUser.isVerified
      };
    } else {
      let derivedFirst = '';
      let derivedLast = '';

      if (authUser.displayName) {
        const parts = authUser.displayName.split(' ');
        if (parts.length >= 2) {
          derivedFirst = parts[0];
          derivedLast = parts.slice(1).join(' ');
        } else if (parts.length === 1) {
          derivedFirst = parts[0];
          derivedLast = 'User';
        }
      }

      if (!derivedFirst) {
        // Intelligent email name splitting fallback
        const emailParts = email.split('@')[0];
        let words = emailParts.split(/[\._\-]+/);
        if (words.length === 1) {
          const camelSplit = emailParts.split(/(?=[A-Z])/);
          if (camelSplit.length > 1) {
            words = camelSplit;
          }
        }

        if (words.length >= 2) {
          derivedFirst = words[0].charAt(0).toUpperCase() + words[0].slice(1);
          derivedLast = words[1].charAt(0).toUpperCase() + words[1].slice(1);
        } else if (words.length === 1) {
          const str = words[0];
          let splitIndex = -1;
          
          // Check for common last name endings at start or end
          const lastNameEndings = ['ov', 'ova', 'ev', 'eva', 'in', 'ina'];
          for (const ending of lastNameEndings) {
            if (str.includes(ending)) {
              const idx = str.indexOf(ending) + ending.length;
              if (idx > 0 && idx < str.length) {
                splitIndex = idx;
                break;
              }
            }
          }
          
          if (splitIndex === -1) {
            const commonNames = ['said', 'bek', 'jon', 'mir', 'ali', 'abu', 'shox', 'shoh', 'murad', 'murod', 'rustam', 'shavkat', 'tulyagan', 'dil'];
            for (const cn of commonNames) {
              if (str.includes(cn)) {
                const idx = str.indexOf(cn);
                if (idx > 0 && idx < str.length) {
                  splitIndex = idx;
                  break;
                }
              }
            }
          }
          
          if (splitIndex !== -1) {
            const w1 = str.slice(0, splitIndex);
            const w2 = str.slice(splitIndex);
            // In Uzbek/Russian email prefix matching culture, last name often preceeds first name (e.g., "tulyaganovsaid")
            derivedFirst = w2.charAt(0).toUpperCase() + w2.slice(1);
            derivedLast = w1.charAt(0).toUpperCase() + w1.slice(1);
          } else {
            if (str.length > 8) {
              const boundary = Math.ceil(str.length / 2);
              derivedFirst = str.slice(0, boundary).charAt(0).toUpperCase() + str.slice(0, boundary).slice(1);
              derivedLast = str.slice(boundary).charAt(0).toUpperCase() + str.slice(boundary).slice(1);
            } else {
              derivedFirst = str.charAt(0).toUpperCase() + str.slice(1);
              derivedLast = 'User';
            }
          }
        } else {
          derivedFirst = 'Client';
          derivedLast = 'User';
        }
      }

      // Create user document in Firestore if not exists yet
      let forcedRole: UserRole = 'Client';
      if (authUser.uid === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2') {
        forcedRole = 'Admin';
      } else if (authUser.uid === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3') {
        forcedRole = 'Operator';
      } else if (lowEmail === 'tulyaganovsaid@gmail.com' || lowEmail === 'registapp@gmail.com') {
        forcedRole = 'Admin';
      } else if (lowEmail.endsWith('@registapp.uz') || lowEmail.endsWith('@registapp.online')) {
        forcedRole = (lowEmail === 'admin@registapp.uz' || lowEmail === 'admin@registapp.online') ? 'Admin' : 'Operator';
      }

      if (lowEmail === 'admin@registapp.uz' || lowEmail === 'admin@registapp.online' || lowEmail === 'registapp@gmail.com' || lowEmail === 'tulyaganovsaid@gmail.com') {
        derivedFirst = 'Саид';
        derivedLast = 'Туляганов';
      } else if (lowEmail === 'operator1@registapp.online') {
        derivedFirst = 'Оператор 1';
        derivedLast = 'RegistApp';
      } else if (lowEmail === 'operator2@registapp.online') {
        derivedFirst = 'Оператор 2';
        derivedLast = 'RegistApp';
      } else if (lowEmail === 'info@registapp.online') {
        derivedFirst = 'Инфо-служба';
        derivedLast = 'RegistApp';
      }

      const uDetails = matchedUserByEmail || {
        id: authUser.uid,
        email: lowEmail,
        firstName: derivedFirst,
        lastName: derivedLast,
        role: forcedRole,
        isVerified: true,
        passwordHash,
        createdAt: new Date().toISOString()
      };
      if (lowEmail === 'admin@registapp.uz' || lowEmail === 'admin@registapp.online') {
        uDetails.firstName = 'Саид';
        uDetails.lastName = 'Туляганов';
      }
      if (uDetails.role !== forcedRole) {
        uDetails.role = forcedRole;
      }
      await setDoc(userDocRef, uDetails);
      addAuditLog(uDetails.email, 'User Login', `Successfully logged in via Firebase Auth with role ${uDetails.role}.`);
      return {
        id: uDetails.id,
        email: uDetails.email,
        firstName: uDetails.firstName,
        lastName: uDetails.lastName,
        role: uDetails.role,
        isVerified: uDetails.isVerified
      };
    }
  } catch (error: any) {
    // Elegant fallback: If credentials don't exist in Firebase Auth yet, try to auto-register them
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/cannot-find-user') {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, lowEmail, passwordHash);
        const authUser = userCredential.user;

        const userDocRef = doc(db, 'users', authUser.uid);
        
        // Derive names on the fly
        let derivedFirst = '';
        let derivedLast = '';
        const emailParts = email.split('@')[0];
        let words = emailParts.split(/[\._\-]+/);
        if (words.length >= 2) {
          derivedFirst = words[0].charAt(0).toUpperCase() + words[0].slice(1);
          derivedLast = words[1].charAt(0).toUpperCase() + words[1].slice(1);
        } else {
          derivedFirst = emailParts.charAt(0).toUpperCase() + emailParts.slice(1);
          derivedLast = 'User';
        }

        let forcedRole: UserRole = 'Client';
        if (authUser.uid === 'YmHbaNrbd5U6kGgotrsZdlT2RBP2') {
          forcedRole = 'Admin';
        } else if (authUser.uid === 'pUrYJVVb31RYKK3pXRTz4Ih0jgG3') {
          forcedRole = 'Operator';
        } else if (lowEmail === 'tulyaganovsaid@gmail.com' || lowEmail === 'registapp@gmail.com') {
          forcedRole = 'Admin';
        } else if (lowEmail.endsWith('@registapp.uz') || lowEmail.endsWith('@registapp.online')) {
          forcedRole = (lowEmail === 'admin@registapp.uz' || lowEmail === 'admin@registapp.online') ? 'Admin' : 'Operator';
        }

        if (lowEmail === 'admin@registapp.uz' || lowEmail === 'admin@registapp.online' || lowEmail === 'registapp@gmail.com' || lowEmail === 'tulyaganovsaid@gmail.com') {
          derivedFirst = 'Саид';
          derivedLast = 'Туляганов';
        } else if (lowEmail === 'operator1@registapp.online') {
          derivedFirst = 'Оператор 1';
          derivedLast = 'RegistApp';
        } else if (lowEmail === 'operator2@registapp.online') {
          derivedFirst = 'Оператор 2';
          derivedLast = 'RegistApp';
        } else if (lowEmail === 'info@registapp.online') {
          derivedFirst = 'Инфо-служба';
          derivedLast = 'RegistApp';
        }

        const uDetails = matchedUserByEmail || {
          id: authUser.uid,
          email: lowEmail,
          firstName: derivedFirst,
          lastName: derivedLast,
          role: forcedRole,
          isVerified: true,
          passwordHash,
          createdAt: new Date().toISOString()
        };
        if (lowEmail === 'admin@registapp.uz' || lowEmail === 'admin@registapp.online') {
          uDetails.firstName = 'Саид';
          uDetails.lastName = 'Туляганов';
        }
        if (uDetails.role !== forcedRole) {
          uDetails.role = forcedRole;
          // Sync changes in local search matching if any
          if (matchedUserByEmail) {
            matchedUserByEmail.role = forcedRole;
          }
        }
        await setDoc(userDocRef, uDetails);
        
        // Update local memory list
        const index = users.findIndex(u => u.email.toLowerCase() === lowEmail);
        if (index > -1) {
          users[index] = uDetails;
        } else {
          users.push(uDetails);
        }
        localStorage.setItem(USERS_KEY, JSON.stringify(users));

        addAuditLog(uDetails.email, 'User Login', `Dynamically created credentials in Firebase Auth and logged in with role ${uDetails.role}.`);
        return {
          id: uDetails.id,
          email: uDetails.email,
          firstName: uDetails.firstName,
          lastName: uDetails.lastName,
          role: uDetails.role,
          isVerified: uDetails.isVerified
        };
      } catch (regErr: any) {
        console.warn('Auto-register failed (might already exist with different password):', regErr);
        if (regErr.code === 'auth/email-already-in-use') {
          throw new Error('Invalid email or password combination. Please try again.');
        }
      }
    }
    
    // Check local lookup as visual absolute fallback
    const localUsers = getUsers();
    const foundUser = localUsers.find(u => u.email.toLowerCase() === lowEmail);
    if (foundUser) {
      if (foundUser.email.toLowerCase() === 'admin@registapp.uz' || foundUser.email.toLowerCase() === 'admin@registapp.online' || foundUser.email.toLowerCase() === 'registapp@gmail.com' || foundUser.email.toLowerCase() === 'tulyaganovsaid@gmail.com') {
        foundUser.firstName = 'Саид';
        foundUser.lastName = 'Туляганов';
        foundUser.role = 'Admin';
      }
      addAuditLog(foundUser.email, 'Local Auth Fallback', 'Signed in via local credentials fallback.');
      return {
        id: foundUser.id,
        email: foundUser.email,
        firstName: foundUser.firstName,
        lastName: foundUser.lastName,
        role: foundUser.role,
        isVerified: foundUser.isVerified ?? true
      };
    }

    // If account doesn't exist locally, dynamically create client tourist user and log in immediately
    const emailPrefix = lowEmail.split('@')[0];
    const derivedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
    const isAdminEmail = lowEmail === 'admin@registapp.uz' || lowEmail === 'admin@registapp.online' || lowEmail === 'registapp@gmail.com' || lowEmail === 'tulyaganovsaid@gmail.com';
    const newTouristUser: User & { passwordHash: string } = {
      id: `user-${Date.now()}`,
      email: lowEmail,
      firstName: isAdminEmail ? 'Саид' : (derivedName || 'Client'),
      lastName: isAdminEmail ? 'Туляганов' : 'Tourist',
      role: isAdminEmail ? 'Admin' : (lowEmail.includes('operator') || lowEmail.includes('info') || lowEmail.endsWith('@registapp.online') || lowEmail.endsWith('@registapp.uz')) ? 'Operator' : 'Client',
      isVerified: true,
      passwordHash: passwordHash || 'admin123',
      createdAt: new Date().toISOString()
    };
    if (isAdminEmail) {
      newTouristUser.firstName = 'Саид';
      newTouristUser.lastName = 'Туляганов';
    }
    localUsers.push(newTouristUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
    addAuditLog(newTouristUser.email, 'Auto Registration', 'Automatically registered and logged in.');

    return {
      id: newTouristUser.id,
      email: newTouristUser.email,
      firstName: newTouristUser.firstName,
      lastName: newTouristUser.lastName,
      role: newTouristUser.role,
      isVerified: true
    };
  }
}

export async function updateUserProfile(userId: string, firstName: string, lastName: string): Promise<User> {
  const users = getUsers();
  const index = users.findIndex(u => u.id === userId);
  let userEmail = 'unknown';
  let userRole: UserRole = 'Client';
  let userVerified = true;
  let userPass = 'admin123';

  if (index !== -1) {
    users[index].firstName = firstName;
    users[index].lastName = lastName;
    userEmail = users[index].email;
    userRole = users[index].role;
    userVerified = users[index].isVerified;
    userPass = users[index].passwordHash;
    saveUsers(users);
  } else {
    // Attempt local retrieval or update anyway
    const activeStored = localStorage.getItem('registapp_active_user');
    if (activeStored) {
      try {
        const parsed = JSON.parse(activeStored);
        if (parsed.id === userId) {
          userEmail = parsed.email;
          userRole = parsed.role;
          userVerified = parsed.isVerified;
        }
      } catch (e) {}
    }
  }

  const { db } = await import('./firebase');
  const { doc, updateDoc, setDoc } = await import('firebase/firestore');
  const userDocRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userDocRef, { firstName, lastName });
  } catch (err) {
    console.warn('updateDoc failed, attempting setDoc fallback:', err);
    await setDoc(userDocRef, {
      id: userId,
      email: userEmail,
      firstName,
      lastName,
      role: userRole,
      isVerified: userVerified,
      passwordHash: userPass
    });
  }

  addAuditLog(userEmail, 'Update Profile', `Successfully updated profile details to ${firstName} ${lastName}`);

  return {
    id: userId,
    email: userEmail,
    firstName,
    lastName,
    role: userRole,
    isVerified: userVerified
  };
}

export function saveClientDraftStep(userIdOrEmail: string, step: number) {
  try {
    const users = getUsers();
    const low = userIdOrEmail.toLowerCase();
    const idx = users.findIndex(u => u.id === userIdOrEmail || u.email.toLowerCase() === low);
    if (idx !== -1) {
      users[idx].draftStep = step;
      saveUsers(users);
    }
    localStorage.setItem(`registapp_client_draft_step_${userIdOrEmail}`, String(step));
    localStorage.setItem(`registapp_client_draft_step_${low}`, String(step));
    window.dispatchEvent(new CustomEvent('db-sync'));
  } catch (e) {
    console.warn('saveClientDraftStep error:', e);
  }
}

export async function registerUser(email: string, firstName: string, lastName: string, passwordHash: string): Promise<User> {
  const lowEmail = email.toLowerCase();
  const { auth, db } = await import('./firebase');
  const { createUserWithEmailAndPassword } = await import('firebase/auth');
  const { doc, setDoc } = await import('firebase/firestore');

  const users = getUsers();
  const exists = users.find(u => u.email.toLowerCase() === lowEmail);
  if (exists) {
    throw new Error('Email is already registered!');
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, lowEmail, passwordHash);
    const authUser = userCredential.user;

    const newUser = {
      id: authUser.uid,
      email: lowEmail,
      firstName,
      lastName,
      role: 'Client' as UserRole,
      isVerified: true,
      passwordHash,
      createdAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', authUser.uid), newUser);

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    addAuditLog(email, 'User Registration', 'Created new account via Firebase Auth successfully.');
    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      role: newUser.role,
      isVerified: true
    };
  } catch (error: any) {
    console.error('Firebase Auth sign-up failed:', error);
    throw new Error(error.message || 'Registration failed');
  }
}

export function verifyUserCode(email: string): User {
  const users = getUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  if (index === -1) {
    throw new Error('User not found');
  }
  users[index].isVerified = true;
  saveUsers(users);
  
  addAuditLog(email, 'Email Verified', 'Completed email verification workflow. Account activated.');
  return {
    id: users[index].id,
    email: users[index].email,
    firstName: users[index].firstName,
    lastName: users[index].lastName,
    role: users[index].role,
    isVerified: true
  };
}

// Order Actions
export function createOrder(orderData: Omit<Order, 'id' | 'createdAt' | 'status'> & { id?: string }, lang?: string): Order {
  const orders = getOrders();
  
  // Check if client is blacklisted
  const isBlacklisted = orders.some(o => o.clientEmail === orderData.clientEmail && o.status === 'Rejected due to violations');
  if (isBlacklisted) {
    throw new Error(
      lang === 'ru' 
        ? 'Вы внесены в Черный список нарушителей. Создание новых заявок заблокировано.' 
        : lang === 'fr'
        ? 'Vous êtes inscrit sur la liste noire des contrevenants. La création de nouvelles demandes est bloquée.'
        : 'You have been blacklisted as a violator. Scope of creating new registration is restricted.'
    );
  }

  const prefix = orderData.currency || 'ORD';
  
  let langSuffix = 'E'; // Default to English
  if (lang === 'ru') {
    langSuffix = 'R';
  } else if (lang === 'fr') {
    langSuffix = 'F';
  } else if (lang === 'en') {
    langSuffix = 'E';
  }
  
  const orderId = orderData.id || `${prefix}-${Math.floor(10000 + Math.random() * 90000)}-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${langSuffix}`;
  
  const newOrder: Order = {
    ...orderData,
    clientEmail: orderData.clientEmail.toLowerCase(),
    id: orderId,
    status: 'Payment Pending',
    createdAt: new Date().toISOString(),
  };

  orders.push(newOrder);
  saveOrders(orders);
  
  addAuditLog(orderData.clientEmail, 'Order Initiated', `Created order ${orderId} in currency ${orderData.currency}.`);
  return newOrder;
}

export function submitPayment(orderId: string, txId: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  orders[index].status = 'In Progress';
  orders[index].paymentTxId = txId;
  orders[index].confirmedAt = new Date().toISOString();
  orders[index].paymentFailedMessage = undefined;
  orders[index].rejectedByOperatorId = undefined;

  saveOrders(orders);
  addAuditLog(orders[index].clientEmail, 'Payment Deposited', `Submitted payment transaction ${txId} for order ${orderId}`);
  return orders[index];
}

export function rejectPayment(orderId: string, message: string, operatorId: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  orders[index].status = 'Payment Pending';
  orders[index].paymentFailedMessage = message;
  orders[index].paymentTxId = undefined;
  orders[index].operatorId = undefined; // release back
  orders[index].rejectedByOperatorId = operatorId;
  
  saveOrders(orders);
  addAuditLog('operator@registapp.uz', 'Payment Rejected', `Operator (${operatorId}) rejected payment for order ${orderId}. Message: ${message}`);
  return orders[index];
}

export function confirmPaymentReceived(orderId: string, operatorId: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  orders[index].status = 'Paid';
  orders[index].paymentFailedMessage = undefined;
  orders[index].rejectedByOperatorId = undefined;
  orders[index].operatorId = operatorId;

  saveOrders(orders);
  addAuditLog('operator@registapp.uz', 'Payment Confirmed', `Operator (${operatorId}) confirmed payment received for order ${orderId}.`);
  return orders[index];
}

export function sendViolation(orderId: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  // Detect language based on orderId suffix
  let reportUrl = 'VIOLATION-GUIDE-EN.pdf';
  if (orderId.endsWith('R')) {
    reportUrl = 'VIOLATION-GUIDE-RU.pdf';
  } else if (orderId.endsWith('F')) {
    reportUrl = 'VIOLATION-GUIDE-FR.pdf';
  } else if (orderId.endsWith('E')) {
    reportUrl = 'VIOLATION-GUIDE-EN.pdf';
  } else {
    // If orderId is seeds like ORD-98234-A or anything without language suffix,
    // let's try to infer if we can, or fallback to EN.
    reportUrl = 'VIOLATION-GUIDE-EN.pdf';
  }

  orders[index].violationReportUrl = reportUrl; // sets report indicator for client
  orders[index].status = 'Violation'; // Transition to 'Violation' status as requested
  saveOrders(orders);
  
  addAuditLog('operator@registapp.uz', 'Violation Issued', `Uploaded Uzbekistan Tourist Guideline (${reportUrl}) and flagged order ${orderId} as Violation.`);
  return orders[index];
}

export function completeOrder(orderId: string, operatorId: string, finalDocUrl: string, notes?: string, finalDocName?: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  orders[index].status = 'Completed';
  orders[index].operatorId = operatorId;
  orders[index].finalDocUrl = finalDocUrl;
  orders[index].finalDocName = finalDocName;
  orders[index].operatorNotes = notes;
  orders[index].completedAt = new Date().toISOString();

  saveOrders(orders);
  addAuditLog('operator@registapp.uz', 'Order Verification Completed', `Successfully uploaded registration PDF and archived order ${orderId}.`);
  return orders[index];
}

export function claimOrder(orderId: string, operatorId: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  orders[index].operatorId = operatorId;
  saveOrders(orders);
  
  const users = getUsers();
  const opUser = users.find(u => u.id === operatorId);
  const operatorEmail = opUser ? opUser.email : 'operator@registapp.uz';
  addAuditLog(operatorEmail, 'Order Claimed', `Operator started verification processing for order ${orderId}.`);
  
  return orders[index];
}

export function releaseOrder(orderId: string): Order {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index === -1) {
    throw new Error('Order not found');
  }

  if (orders[index].status === 'In Progress') {
    orders[index].operatorId = undefined;
    saveOrders(orders);
    addAuditLog('operator@registapp.uz', 'Order Released', `Released order ${orderId} back into the verification pool.`);
  }
  return orders[index];
}

// User Management Actions
export function addStaffUser(email: string, firstName: string, lastName: string, role: UserRole, passwordHash: string) {
  const users = getUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    throw new Error('Email is already in use by another user!');
  }

  // Generate a unique 5-digit string ID
  let newId = '';
  do {
    newId = String(Math.floor(10000 + Math.random() * 90000));
  } while (users.some(u => u.id === newId));

  users.push({
    id: newId,
    email,
    firstName,
    lastName,
    role,
    isVerified: true,
    passwordHash
  });

  saveUsers(users);
  addAuditLog('admin@registapp.uz', 'Staff Account Created', `Created employee ${email} with assigned role ${role}.`);
}

export function deleteStaffUser(email: string) {
  let users = getUsers();
  const toDelete = users.find(u => u.email === email);
  if (!toDelete) return;
  const isProtectedSystemEmail = email === 'admin@registapp.uz' || 
                                 email === 'operator@registapp.uz' ||
                                 email === 'admin@registapp.online' ||
                                 email === 'operator1@registapp.online' ||
                                 email === 'operator2@registapp.online' ||
                                 email === 'info@registapp.online';
  if (isProtectedSystemEmail) {
    throw new Error('Cannot delete system default seeding accounts!');
  }

  users = users.filter(u => u.email !== email);
  saveUsers(users);
  addAuditLog('admin@registapp.uz', 'Staff Account Revoked', `Removed employee ${email} from authorized staff registry.`);
}

export function resetStaffPassword(email: string, newPass: string) {
  const users = getUsers();
  const index = users.findIndex(u => u.email === email);
  if (index === -1) throw new Error('User not found');

  users[index].passwordHash = newPass;
  saveUsers(users);
  addAuditLog('admin@registapp.uz', 'Password Reset', `Forced credentials reset for employee ${email}.`);
}

export function updateStaffUser(oldEmail: string, newEmail: string, firstName: string, lastName: string, newPass?: string) {
  const users = getUsers();
  const index = users.findIndex(u => u.email === oldEmail);
  if (index === -1) throw new Error('User not found');

  // Check email conflict if email changed
  if (newEmail !== oldEmail) {
    const conflict = users.find(u => u.email === newEmail);
    if (conflict) {
      throw new Error(`Email ${newEmail} is already in use by another user!`);
    }
  }

  // System seed accounts shouldn't have their email changed
  const isProtectedOldEmail = oldEmail === 'admin@registapp.uz' || 
                              oldEmail === 'operator@registapp.uz' ||
                              oldEmail === 'admin@registapp.online' ||
                              oldEmail === 'operator1@registapp.online' ||
                              oldEmail === 'operator2@registapp.online' ||
                              oldEmail === 'info@registapp.online';
  if (isProtectedOldEmail && newEmail !== oldEmail) {
    throw new Error('Cannot change email for default system accounts!');
  }

  users[index].email = newEmail;
  users[index].firstName = firstName;
  users[index].lastName = lastName;
  if (newPass) {
    users[index].passwordHash = newPass;
  }

  saveUsers(users);
  addAuditLog('admin@registapp.uz', 'Staff Account Updated', `Updated staff member ${newEmail}. Name: ${firstName} ${lastName}. Password changed: ${!!newPass}`);
}

export function deleteClient(
  clientIdOrEmail: string,
  deleteOrdersAlso: boolean = true,
  performerEmail: string = 'admin@registapp.uz'
): boolean {
  initializeDB();
  const users = getUsers();
  const target = users.find(
    u => u.id === clientIdOrEmail || u.email.toLowerCase() === clientIdOrEmail.toLowerCase()
  );

  if (!target) return false;
  if (target.role === 'Admin') {
    throw new Error('Невозможно удалить учетную запись Администратора!');
  }

  // Record into deleted tracking set
  const deleted = getDeletedUserIds();
  const deletedSet = new Set(deleted.map(x => x.toLowerCase()));
  if (target.id) deletedSet.add(target.id.toLowerCase());
  if (target.email) deletedSet.add(target.email.toLowerCase());
  localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(deletedSet)));

  // Remove draft steps
  if (target.id) {
    localStorage.removeItem(`registapp_client_draft_step_${target.id}`);
  }

  // Delete from Firestore
  try {
    deleteDoc(doc(db, 'users', target.id)).catch(err => {
      console.warn('Firestore user delete warning:', err);
    });
  } catch (e) {
    console.warn('Firestore user delete failed:', e);
  }

  // Filter local users and save
  const remainingUsers = users.filter(
    u => u.id !== target.id && u.email.toLowerCase() !== target.email.toLowerCase()
  );
  localStorage.setItem(USERS_KEY, JSON.stringify(remainingUsers));

  let deletedOrdersCount = 0;
  if (deleteOrdersAlso) {
    const orders = getOrders();
    const ordersToDelete = orders.filter(
      o => o.userId === target.id || (o.clientEmail && o.clientEmail.toLowerCase() === target.email.toLowerCase())
    );
    deletedOrdersCount = ordersToDelete.length;

    if (deletedOrdersCount > 0) {
      const deleteOrderIds = new Set(ordersToDelete.map(o => o.id));
      const remainingOrders = orders.filter(o => !deleteOrderIds.has(o.id));
      localStorage.setItem(ORDERS_KEY, JSON.stringify(remainingOrders));

      ordersToDelete.forEach(o => {
        try {
          deleteDoc(doc(db, 'orders', o.id)).catch(() => {});
        } catch (_) {}
      });
    }
  }

  addAuditLog(
    performerEmail,
    'Client Account Deleted',
    `Клиент ${target.firstName} ${target.lastName} (${target.email}, ID: ${target.id}) был удален администратором.${
      deleteOrdersAlso && deletedOrdersCount > 0 ? ` Также удалено связанных заказов: ${deletedOrdersCount} шт.` : ''
    }`
  );

  window.dispatchEvent(new CustomEvent('db-sync'));
  return true;
}

export function deleteMultipleClients(
  clientIdsOrEmails: string[],
  deleteOrdersAlso: boolean = true,
  performerEmail: string = 'admin@registapp.uz'
): number {
  initializeDB();
  const users = getUsers();
  const toDeleteMap = new Map<string, User>();

  clientIdsOrEmails.forEach(idOrEmail => {
    const norm = idOrEmail.toLowerCase();
    const found = users.find(u => u.id.toLowerCase() === norm || u.email.toLowerCase() === norm);
    if (found && found.role !== 'Admin') {
      toDeleteMap.set(found.id, found);
    }
  });

  if (toDeleteMap.size === 0) return 0;

  const deleted = getDeletedUserIds();
  const deletedSet = new Set(deleted.map(x => x.toLowerCase()));

  toDeleteMap.forEach(client => {
    if (client.id) deletedSet.add(client.id.toLowerCase());
    if (client.email) deletedSet.add(client.email.toLowerCase());
    localStorage.removeItem(`registapp_client_draft_step_${client.id}`);
    try {
      deleteDoc(doc(db, 'users', client.id)).catch(() => {});
    } catch (_) {}
  });

  localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(Array.from(deletedSet)));

  const remainingUsers = users.filter(u => !toDeleteMap.has(u.id));
  localStorage.setItem(USERS_KEY, JSON.stringify(remainingUsers));

  let totalDeletedOrders = 0;
  if (deleteOrdersAlso) {
    const orders = getOrders();
    const clientEmailsSet = new Set(Array.from(toDeleteMap.values()).map(c => c.email.toLowerCase()));
    const clientIdsSet = new Set(Array.from(toDeleteMap.keys()));

    const ordersToDelete = orders.filter(
      o => (o.userId && clientIdsSet.has(o.userId)) || (o.clientEmail && clientEmailsSet.has(o.clientEmail.toLowerCase()))
    );
    totalDeletedOrders = ordersToDelete.length;

    if (totalDeletedOrders > 0) {
      const orderIdsToDeleteSet = new Set(ordersToDelete.map(o => o.id));
      const remainingOrders = orders.filter(o => !orderIdsToDeleteSet.has(o.id));
      localStorage.setItem(ORDERS_KEY, JSON.stringify(remainingOrders));

      ordersToDelete.forEach(o => {
        try {
          deleteDoc(doc(db, 'orders', o.id)).catch(() => {});
        } catch (_) {}
      });
    }
  }

  addAuditLog(
    performerEmail,
    'Bulk Clients Deleted',
    `Администратор удалил ${toDeleteMap.size} клиентов: ${Array.from(toDeleteMap.values()).map(c => c.email).join(', ')}.${
      deleteOrdersAlso && totalDeletedOrders > 0 ? ` Удалено связанных заказов: ${totalDeletedOrders} шт.` : ''
    }`
  );

  window.dispatchEvent(new CustomEvent('db-sync'));
  return toDeleteMap.size;
}

