import { User, Order, SystemConfig, UserRole, SimulatedEmail } from './types';
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
                      
      const isKnownStaffEmail = userEmail === 'operator@registapp.uz' || 
                                userEmail === 'admin@registapp.uz' ||
                                userEmail.endsWith('@registapp.uz');
                                
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
          const users: any[] = [];
          snapshot.forEach(docSnap => {
            users.push(docSnap.data());
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

    let initialLoadDone = false;
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
        
        if (initialLoadDone) {
          try {
            const prevOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
            const prevIds = new Set(prevOrders.map((o: any) => o.id));
            orders.forEach((o: any) => {
              if (o && o.id && !prevIds.has(o.id)) {
                if (resolvedRole === 'Admin' || resolvedRole === 'Operator') {
                  window.dispatchEvent(new CustomEvent('registapp-new-order-alert', { detail: o }));
                }
              }
            });
          } catch (e) {
            console.warn('New order detection error:', e);
          }
        }
        
        if (resolvedRole === 'Admin' || resolvedRole === 'Operator') {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
        } else {
          // Client: merge their orders with other locally saved orders
          const allOrders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
          const external = allOrders.filter((o: any) => o && o.clientEmail && typeof o.clientEmail === 'string' && o.clientEmail.toLowerCase() !== normalizedEmail);
          const merged = [...external, ...orders];
          localStorage.setItem(ORDERS_KEY, JSON.stringify(merged));
        }
        initialLoadDone = true;
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
}


const USERS_KEY = 'registapp_users';
const ORDERS_KEY = 'registapp_orders';
const CONFIG_KEY = 'registapp_config';
const AUDIT_KEY = 'registapp_audit';

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
    firstName: 'Dilshod',
    lastName: 'Alimov',
    role: 'Admin',
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
Customer Support E-mail: support@registapp.uz`,
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
E-mail du support client : support@registapp.uz`,
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
E-mail службы поддержки: support@registapp.uz`,
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

  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify(DEFAULT_USERS));
  } else {
    // Migrate pre-existing storage to 5-digit Staff IDs for Operators and Admins
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      let updated = false;
      users.forEach((u: any) => {
        if (u.role === 'Operator' || u.role === 'Admin') {
          if (u.id === 'user-operator') {
            u.id = '28194';
            updated = true;
          } else if (u.id === 'user-admin') {
            u.id = '51972';
            updated = true;
          } else if (!/^\d{5}$/.test(u.id)) {
            // Generate a deterministic 5-digit ID from old dynamic IDs like staff-17171717
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
    } catch (e) {
      localStorage.setItem(CONFIG_KEY, JSON.stringify(DEFAULT_CONFIG));
    }
  }

  if (!localStorage.getItem(AUDIT_KEY)) {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(DEFAULT_AUDIT));
  }
}

export function getUsers(): Array<User & { passwordHash: string }> {
  initializeDB();
  return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
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

export function getConfig(): SystemConfig {
  initializeDB();
  return JSON.parse(localStorage.getItem(CONFIG_KEY) || JSON.stringify(DEFAULT_CONFIG));
}

export function saveConfig(config: SystemConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  saveConfigToFirestore(config);
  addAuditLog('admin@registapp.uz', 'System Config Update', 'Modified system files or cards configuration in Content Management.');
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
      } else if (lowEmail.endsWith('@registapp.uz')) {
        forcedRole = lowEmail === 'admin@registapp.uz' ? 'Admin' : 'Operator';
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
        } else if (lowEmail.endsWith('@registapp.uz')) {
          forcedRole = lowEmail === 'admin@registapp.uz' ? 'Admin' : 'Operator';
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
    if (matchedLocalUser) {
      addAuditLog(matchedLocalUser.email, 'Local Auth Fallback', 'Failed Firebase Auth but signed in via local credentials fallback.');
      return {
        id: matchedLocalUser.id,
        email: matchedLocalUser.email,
        firstName: matchedLocalUser.firstName,
        lastName: matchedLocalUser.lastName,
        role: matchedLocalUser.role,
        isVerified: matchedLocalUser.isVerified
      };
    }
    
    console.error('Firebase Auth sign-in failed:', error);
    throw new Error('Invalid email or password combination.');
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
  
  try {
    sendNewOrderStaffEmail(newOrder);
  } catch (err) {
    console.warn('Error sending simulated staff email:', err);
  }
  
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
  
  try {
    sendCompletedOrderClientEmail(orders[index]);
  } catch (err) {
    console.warn('Error sending simulated client email:', err);
  }
  
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
  if (email === 'admin@registapp.uz' || email === 'operator@registapp.uz') {
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
  if ((oldEmail === 'admin@registapp.uz' || oldEmail === 'operator@registapp.uz') && newEmail !== oldEmail) {
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

const SIMULATED_EMAILS_KEY = 'registapp_simulated_emails';

export function getSimulatedEmails(): SimulatedEmail[] {
  try {
    return JSON.parse(localStorage.getItem(SIMULATED_EMAILS_KEY) || '[]');
  } catch (e) {
    return [];
  }
}

export function saveSimulatedEmails(emails: SimulatedEmail[]) {
  localStorage.setItem(SIMULATED_EMAILS_KEY, JSON.stringify(emails));
  window.dispatchEvent(new CustomEvent('emails-updated'));
}

export function sendSimulatedEmail(recipient: string, subject: string, body: string, attachmentName?: string, attachmentUrl?: string) {
  const emails = getSimulatedEmails();
  const newEmail: SimulatedEmail = {
    id: `email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sender: 'notify@registapp.uz',
    recipient: recipient.toLowerCase(),
    subject,
    body,
    timestamp: new Date().toISOString(),
    attachmentName,
    attachmentUrl,
    isRead: false
  };
  emails.unshift(newEmail);
  saveSimulatedEmails(emails);
}

export function sendNewOrderStaffEmail(order: Order) {
  const subject = `[RegistApp System] NEW ORDER ALERT: ${order.id}`;
  const body = `
    <div style="font-family: sans-serif; color: #1E2222; background-color: #f7f7f7; padding: 20px; border-radius: 8px;">
      <h2 style="color: #7A9A3C; margin-top: 0; border-bottom: 2px solid #7A9A3C; padding-bottom: 8px;">⚠️ New Registration Order Initiated</h2>
      <p>A new visitor registration request has been created in the RegistApp system and is awaiting your operational review.</p>
      <table border="1" cellpadding="8" style="border-collapse: collapse; border-color: #3E4747; background-color: #FFFFFF; width: 100%; border-radius: 6px; overflow: hidden;">
        <tr style="background-color: #23292A; color: #E5E5E5;"><td style="font-weight: bold; width: 30%;">Order/Doc ID:</td><td>${order.id}</td></tr>
        <tr><td style="font-weight: bold;">Client Name:</td><td>${order.clientName}</td></tr>
        <tr><td style="font-weight: bold;">Client Email:</td><td>${order.clientEmail}</td></tr>
        <tr><td style="font-weight: bold;">Country of Origin:</td><td>${order.country}</td></tr>
        <tr><td style="font-weight: bold;">Stay Period:</td><td>${order.startDate} to ${order.endDate} (${order.totalDays} days)</td></tr>
        <tr><td style="font-weight: bold;">Visa Requirements:</td><td>${order.visaType}</td></tr>
        <tr><td style="font-weight: bold;">Total Amount:</td><td><strong>${order.totalPrice.toLocaleString()} ${order.currency}</strong></td></tr>
        <tr style="background-color: #f0fdf4;"><td style="font-weight: bold; color: #166534;">Workflow Status:</td><td style="color: #166534; font-weight: bold;">${order.status}</td></tr>
      </table>
      <p style="margin-top: 15px; font-size: 13px; color: #3e4747;">Please log in to the RegistApp Control Panel to verify the submitted documents (passport scans and border stamps) and process the registration entry.</p>
      <hr style="border: 0; border-top: 1px solid #ddd; margin-top: 20px;" />
      <p style="font-size: 11px; color: #646B6B;">RegistApp Security System. Operating under Family Enterprise "Jules Verne Hostel" (Tashkent, Uzbekistan).</p>
    </div>
  `;
  sendSimulatedEmail('operator@registapp.uz', subject, body);
  sendSimulatedEmail('admin@registapp.uz', subject, body);
}

export function sendCompletedOrderClientEmail(order: Order) {
  const subject = `[RegistApp] Your Uzbekistan State Registration is Ready / Ваша Гос.Регистрация Готова (Ref: ${order.id})`;
  const body = `
    <div style="font-family: sans-serif; color: #1E2222; background-color: #f7f7f7; padding: 25px; border-radius: 8px; line-height: 1.5;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://img.icons8.com/color/96/000000/uzbekistan-embassy.png" alt="Uzbekistan" style="height: 60px;" />
        <h2 style="color: #7A9A3C; margin-top: 10px;">🎉 Registration Successful! / Регистрация Успешна</h2>
      </div>
      <p>Dear <strong>${order.clientName}</strong>,</p>
      <p>We are pleased to inform you that your official remote temporary state registration for your independent travel in the Republic of Uzbekistan has been successfully processed and recorded in the state <strong>"E-mehmon"</strong> database.</p>
      
      <div style="background-color: #f0fdf4; border: 1px solid #7A9A3C; border-radius: 8px; padding: 15px; color: #166534; margin: 15px 0;">
        <h3 style="margin-top: 0; color: #14532d; border-bottom: 1px solid #7a9a3c; padding-bottom: 5px;">📋 Registration Voucher Details</h3>
        <table style="width: 100%; font-size: 14px;">
          <tr><td style="font-weight: bold; width: 40%;">Registration ID:</td><td>${order.id}</td></tr>
          <tr><td style="font-weight: bold;">Country of Passport:</td><td>${order.country}</td></tr>
          <tr><td style="font-weight: bold;">Valid Dates:</td><td>${order.startDate} to ${order.endDate}</td></tr>
          <tr><td style="font-weight: bold;">State System:</td><td>e-mehmon.uz (Ministry of Tourism and Cultural Heritage of Uzbekistan)</td></tr>
          <tr><td style="font-weight: bold;">Registered Operator:</td><td>Jules Verne Hostel (RegistApp License)</td></tr>
        </table>
      </div>

      <p>Your official registration voucher has been attached directly to this notification and is ready for download below.</p>

      <div style="margin: 25px 0; text-align: center;">
        <a href="${order.finalDocUrl || '#'}" download="${order.finalDocName || 'uzb-registration.pdf'}" style="background-color: #7A9A3C; color: #E5E5E5; padding: 12px 24px; font-weight: bold; border-radius: 6px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px rgba(122,154,58,0.2);">
          📥 Download Registration Badge PDF (Скачать Ваучер)
        </a>
      </div>

      <p style="font-size: 12px; background-color: #fffbeb; border: 1px solid #fbbf24; padding: 12px; border-radius: 6px; color: #78350f;">
        <strong>⚠️ Important Legal Note for Travelers:</strong><br/>
        This digital extract contains an encrypted secure QR-code representing your official legal temporary stay. Border control and immigration checkpoints at all airports, land border crossings, and train connections can verify this document digitally. You do not need to print it out physically; keeping the PDF file on any mobile device is 100% sufficient by migration law.
      </p>

      <hr style="border: 0; border-top: 1px solid #ddd; margin: 20px 0;" />
      <p style="font-size: 11px; color: #646B6B; text-align: center;">Thank you for using RegistApp! Have an incredible journey through our historical heritage in Samarkand, Bukhara, and Khiva.</p>
    </div>
  `;
  sendSimulatedEmail(order.clientEmail, subject, body, order.finalDocName || 'registration-stamp.pdf', order.finalDocUrl);
}

