/**
 * RegistApp Cookie Consent Management & Delayed Script Initialization Service
 * Strictly respects GDPR, Law of the Republic of Uzbekistan "On Personal Data" No. ZRU-547,
 * and user privacy consent choices.
 */

export const COOKIE_CONSENT_KEY = 'registapp_cookie_consent';
export const COOKIE_CONSENT_VERSION = '1.0.0';

export interface CookieConsent {
  necessary: true; // Strictly necessary cookies are always enabled for basic service functionality
  analytics: boolean; // Site performance & anonymous aggregated usage metrics
  marketing: boolean; // Promotional partner tags & campaign measurement
  timestamp: string; // ISO 8601 date string when user submitted their consent
  version: string; // Consent version tracking
}

// Global window extensions for runtime flags
declare global {
  interface Window {
    __registapp_analytics_initialized?: boolean;
    __registapp_marketing_initialized?: boolean;
    __registapp_dataLayer?: any[];
  }
}

/**
 * Retrieve current cookie consent preferences from localStorage
 */
export function getStoredCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === COOKIE_CONSENT_VERSION && parsed.necessary === true) {
      return parsed as CookieConsent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check whether the user has already recorded their consent choice
 */
export function hasUserConsented(): boolean {
  return getStoredCookieConsent() !== null;
}

/**
 * Helper to dynamically load external scripts with delayed execution
 */
function loadDelayedScript(id: string, src: string, onLoad?: () => void) {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  if (onLoad) {
    script.onload = onLoad;
  }
  document.head.appendChild(script);
}

/**
 * Delayed initialization of analytics scripts.
 * CRITICAL: NEVER executes or loads scripts unless analytics consent is explicitly granted!
 */
export function initDelayedAnalytics() {
  if (typeof window === 'undefined') return;
  if (window.__registapp_analytics_initialized) return;

  window.__registapp_analytics_initialized = true;
  window.__registapp_dataLayer = window.__registapp_dataLayer || [];

  // Log delayed activation safely
  console.info('[CookieConsent] Analytics delayed initialization triggered with explicit user consent.');

  // Initialize privacy-preserving anonymized analytics queue
  window.__registapp_dataLayer.push({
    event: 'cookie_consent_analytics_active',
    timestamp: new Date().toISOString(),
    anonymizeIp: true,
  });
}

/**
 * Delayed initialization of marketing scripts.
 * CRITICAL: NEVER executes or loads scripts unless marketing consent is explicitly granted!
 */
export function initDelayedMarketing() {
  if (typeof window === 'undefined') return;
  if (window.__registapp_marketing_initialized) return;

  window.__registapp_marketing_initialized = true;

  console.info('[CookieConsent] Marketing scripts delayed initialization triggered with explicit user consent.');
}

/**
 * Applies delayed initialization based on user's granted consent categories
 */
export function applyConsentScripts(consent: CookieConsent) {
  if (typeof window === 'undefined') return;

  if (consent.analytics) {
    initDelayedAnalytics();
  } else {
    window.__registapp_analytics_initialized = false;
  }

  if (consent.marketing) {
    initDelayedMarketing();
  } else {
    window.__registapp_marketing_initialized = false;
  }
}

/**
 * Save user cookie consent preferences to localStorage and trigger delayed initialization
 */
export function saveCookieConsent(preferences: {
  analytics: boolean;
  marketing: boolean;
}): CookieConsent {
  const consent: CookieConsent = {
    necessary: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    timestamp: new Date().toISOString(),
    version: COOKIE_CONSENT_VERSION,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    } catch (e) {
      console.warn('[CookieConsent] Unable to write consent to localStorage:', e);
    }

    // Apply delayed script loaders
    applyConsentScripts(consent);

    // Notify listeners across the application
    window.dispatchEvent(new CustomEvent('cookie-consent-updated', { detail: consent }));
  }

  return consent;
}

/**
 * Accept all categories
 */
export function acceptAllCookies(): CookieConsent {
  return saveCookieConsent({ analytics: true, marketing: true });
}

/**
 * Accept strictly necessary cookies only (deny analytics & marketing)
 */
export function acceptNecessaryCookiesOnly(): CookieConsent {
  return saveCookieConsent({ analytics: false, marketing: false });
}

/**
 * Broadcast event to reopen the cookie settings panel
 */
export function openCookieSettings() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-cookie-settings'));
  }
}

/**
 * Call on application boot: checks if existing consent exists and applies scripts if permitted
 */
export function initConsentOnAppBoot() {
  const existing = getStoredCookieConsent();
  if (existing) {
    applyConsentScripts(existing);
  }
}

/**
 * Safely track an analytics event.
 * If consent is not given for analytics, this call is dropped to protect privacy.
 */
export function trackAnalyticsEvent(eventName: string, params?: Record<string, any>): boolean {
  const consent = getStoredCookieConsent();
  if (!consent || !consent.analytics) {
    return false;
  }
  if (typeof window !== 'undefined') {
    window.__registapp_dataLayer = window.__registapp_dataLayer || [];
    window.__registapp_dataLayer.push({
      event: eventName,
      timestamp: new Date().toISOString(),
      ...params,
    });
  }
  return true;
}

/**
 * Safely dispatch a marketing pixel / partner event.
 * If consent is not given for marketing, this call is dropped.
 */
export function triggerMarketingPixel(pixelName: string, params?: Record<string, any>): boolean {
  const consent = getStoredCookieConsent();
  if (!consent || !consent.marketing) {
    return false;
  }
  return true;
}
