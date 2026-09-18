import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, BarChart2, Megaphone, ChevronRight, X, Sliders, Check } from 'lucide-react';
import { LanguageCode } from '../types';
import {
  getStoredCookieConsent,
  saveCookieConsent,
  acceptAllCookies,
  acceptNecessaryCookiesOnly,
  CookieConsent,
} from '../services/cookieConsent';

interface CookieConsentBannerProps {
  currentLanguage: LanguageCode;
  onNavigate?: (path: string) => void;
}

export default function CookieConsentBanner({
  currentLanguage,
  onNavigate,
}: CookieConsentBannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Preference states inside Customize panel
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [marketingEnabled, setMarketingEnabled] = useState(false);

  // Initialize and listen to open-cookie-settings event
  useEffect(() => {
    const existing = getStoredCookieConsent();
    if (!existing) {
      // First visit: show banner
      setIsOpen(true);
      setIsCustomizeOpen(false);
    } else {
      // Already consented: initialize internal states in case user opens settings
      setAnalyticsEnabled(existing.analytics);
      setMarketingEnabled(existing.marketing);
    }

    const handleOpenSettings = () => {
      const current = getStoredCookieConsent();
      if (current) {
        setAnalyticsEnabled(current.analytics);
        setMarketingEnabled(current.marketing);
      }
      setIsOpen(true);
      setIsCustomizeOpen(true);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => {
      window.removeEventListener('open-cookie-settings', handleOpenSettings);
    };
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    if (typeof window !== 'undefined' && window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { path } }));
    }
    if (onNavigate) {
      onNavigate(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAcceptAll = () => {
    acceptAllCookies();
    setAnalyticsEnabled(true);
    setMarketingEnabled(true);
    setIsOpen(false);
    setIsCustomizeOpen(false);
  };

  const handleAcceptNecessaryOnly = () => {
    acceptNecessaryCookiesOnly();
    setAnalyticsEnabled(false);
    setMarketingEnabled(false);
    setIsOpen(false);
    setIsCustomizeOpen(false);
  };

  const handleSaveCustom = () => {
    saveCookieConsent({
      analytics: analyticsEnabled,
      marketing: marketingEnabled,
    });
    setIsOpen(false);
    setIsCustomizeOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      id="cookie-consent-container"
      role="region"
      aria-label={currentLanguage === 'ru' ? 'Согласие на использование файлов cookie' : 'Cookie Consent'}
      className="fixed inset-x-0 bottom-0 z-50 pointer-events-none p-3 sm:p-5 flex justify-center items-end"
    >
      <div
        id="cookie-consent-card"
        className="pointer-events-auto w-full max-w-4xl rounded-2xl border border-zinc-700/80 bg-zinc-900/95 text-zinc-100 shadow-2xl backdrop-blur-md transition-all duration-300 ring-1 ring-black/50 overflow-hidden"
      >
        {!isCustomizeOpen ? (
          /* ============================================================== */
          /* 1. COMPACT NON-BLOCKING BOTTOM BANNER                          */
          /* ============================================================== */
          <div className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            {/* Banner Icon & Text */}
            <div className="flex items-start gap-3.5 flex-1 pr-2">
              <div className="p-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-[#a2e635] shrink-0 mt-0.5">
                <Cookie className="w-5 h-5" id="icon-cookie-banner" />
              </div>
              <div className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {currentLanguage === 'ru' ? (
                  <p id="text-cookie-notice-ru">
                    Мы используем{' '}
                    <a
                      id="link-cookie-policy-ru"
                      href="/cookies"
                      onClick={(e) => handleLinkClick(e, '/cookies')}
                      className="text-[#a2e635] font-semibold underline underline-offset-2 hover:text-[#bef264] transition cursor-pointer"
                    >
                      файлы cookie
                    </a>
                    , чтобы сайт работал корректно и чтобы понимать, как им пользуются. Необходимые cookie нужны для работы сервиса, остальные — только с вашего согласия.
                  </p>
                ) : currentLanguage === 'fr' ? (
                  <p id="text-cookie-notice-fr">
                    Nous utilisons des{' '}
                    <a
                      id="link-cookie-policy-fr"
                      href="/cookies"
                      onClick={(e) => handleLinkClick(e, '/cookies')}
                      className="text-[#a2e635] font-semibold underline underline-offset-2 hover:text-[#bef264] transition cursor-pointer"
                    >
                      cookies
                    </a>{' '}
                    pour assurer le bon fonctionnement du site et comprendre son utilisation. Les cookies nécessaires sont indispensables au service, les autres ne sont utilisés qu’avec votre consentement.
                  </p>
                ) : (
                  <p id="text-cookie-notice-en">
                    We use{' '}
                    <a
                      id="link-cookie-policy-en"
                      href="/cookies"
                      onClick={(e) => handleLinkClick(e, '/cookies')}
                      className="text-[#a2e635] font-semibold underline underline-offset-2 hover:text-[#bef264] transition cursor-pointer"
                    >
                      cookies
                    </a>{' '}
                    to ensure the website works properly and to understand how it is used. Strictly necessary cookies are required for the service, while other cookies are only used with your consent.
                  </p>
                )}
              </div>
            </div>

            {/* Three Action Buttons */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full md:w-auto shrink-0">
              <button
                id="btn-cookie-accept-all"
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-[#7A9A3C] hover:bg-[#a2e635] text-black text-xs font-bold transition shadow-lg shadow-[#7A9A3C]/20 cursor-pointer whitespace-nowrap"
              >
                {currentLanguage === 'ru' ? 'Принять все' : currentLanguage === 'fr' ? 'Tout accepter' : 'Accept all'}
              </button>

              <button
                id="btn-cookie-necessary-only"
                type="button"
                onClick={handleAcceptNecessaryOnly}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
              >
                {currentLanguage === 'ru' ? 'Только необходимые' : currentLanguage === 'fr' ? 'Nécessaires uniquement' : 'Necessary only'}
              </button>

              <button
                id="btn-cookie-customize"
                type="button"
                onClick={() => setIsCustomizeOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-zinc-700/80 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer whitespace-nowrap"
              >
                {currentLanguage === 'ru' ? 'Настроить' : currentLanguage === 'fr' ? 'Personnaliser' : 'Customize'}
              </button>
            </div>

          </div>
        ) : (
          /* ============================================================== */
          /* 2. CUSTOMIZE PREFERENCES PANEL (THREE CATEGORIES)              */
          /* ============================================================== */
          <div className="p-5 sm:p-6 space-y-5 max-h-[85vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-zinc-800 text-[#a2e635]">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {currentLanguage === 'ru'
                      ? 'Настройки использования файлов cookie'
                      : currentLanguage === 'fr'
                      ? 'Préférences de cookies'
                      : 'Cookie Preferences'}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {currentLanguage === 'ru'
                      ? 'Выберите, какие категории файлов cookie вы разрешаете использовать'
                      : currentLanguage === 'fr'
                      ? 'Choisissez les catégories de cookies autorisées'
                      : 'Select which categories of cookies you authorize'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                id="btn-close-cookie-customize"
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                title={currentLanguage === 'ru' ? 'Назад' : 'Back'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category 1: Strictly Necessary (Always On & Locked) */}
            <div
              id="card-cookie-category-necessary"
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {currentLanguage === 'ru'
                      ? 'Необходимые cookie'
                      : currentLanguage === 'fr'
                      ? 'Cookies strictement nécessaires'
                      : 'Strictly Necessary Cookies'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {currentLanguage === 'ru' ? 'Всегда включены' : currentLanguage === 'fr' ? 'Toujours actifs' : 'Always Active'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {currentLanguage === 'ru'
                    ? 'Обеспечивают базовую работоспособность платформы: авторизацию сессии в Личном кабинете, язык интерфейса и фиксацию статуса согласия. Без них работа сервиса технически невозможна.'
                    : currentLanguage === 'fr'
                    ? 'Essentiels au fonctionnement de la plateforme : authentification sécurisée, langue de l’interface et conservation de votre consentement.'
                    : 'Required for fundamental website functionality: session authentication, language selection, and consent storage. Cannot be disabled.'}
                </p>
              </div>

              {/* Locked switch */}
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">
                  {currentLanguage === 'ru' ? 'Заблокировано' : 'Locked'}
                </span>
                <div className="relative inline-flex h-6 w-11 shrink-0 cursor-not-allowed items-center rounded-full bg-emerald-600/60 p-0.5 opacity-80">
                  <div className="h-5 w-5 rounded-full bg-white shadow-md translate-x-5 flex items-center justify-center">
                    <Check className="w-3 h-3 text-emerald-700" />
                  </div>
                </div>
              </div>
            </div>

            {/* Category 2: Analytical Cookies */}
            <div
              id="card-cookie-category-analytics"
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {currentLanguage === 'ru'
                      ? 'Аналитические cookie'
                      : currentLanguage === 'fr'
                      ? 'Cookies analytiques'
                      : 'Analytical Cookies'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    {currentLanguage === 'ru' ? 'С согласия' : 'Optional'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {currentLanguage === 'ru'
                    ? 'Позволяют собирать обезличенную статистику посещений, скорость загрузки страниц и ошибки для улучшения сервиса. Скрипты загружаются исключительно при вашем согласии.'
                    : currentLanguage === 'fr'
                    ? 'Permettent de mesurer l’audience de façon anonyme pour améliorer l’ergonomie. Les scripts ne sont chargés qu’avec votre accord.'
                    : 'Collects anonymous performance and usage metrics to optimize system usability. Scripts only load after your explicit consent.'}
                </p>
              </div>

              {/* Interactive switch */}
              <div className="shrink-0 flex items-center">
                <label
                  htmlFor="switch-cookie-analytics"
                  className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-[#7A9A3C]"
                >
                  <input
                    id="switch-cookie-analytics"
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-11 rounded-full transition-colors ${
                      analyticsEnabled ? 'bg-[#7A9A3C]' : 'bg-zinc-700'
                    }`}
                  />
                  <div
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                      analyticsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>

            {/* Category 3: Marketing Cookies */}
            <div
              id="card-cookie-category-marketing"
              className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1 pr-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-white">
                    {currentLanguage === 'ru'
                      ? 'Маркетинговые cookie'
                      : currentLanguage === 'fr'
                      ? 'Cookies marketing'
                      : 'Marketing Cookies'}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {currentLanguage === 'ru' ? 'С согласия' : 'Optional'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {currentLanguage === 'ru'
                    ? 'Используются для отображения актуальных туристических предложений (отели, трансферы) и оценки партнерских кампаний. Скрипты блокируются до подтверждения согласия.'
                    : currentLanguage === 'fr'
                    ? 'Utilisés pour présenter des offres touristiques pertinentes et mesurer nos partenariats. Bloqués par défaut sans consentement.'
                    : 'Used to provide relevant travel recommendations and evaluate partner campaigns. Strictly blocked until authorized.'}
                </p>
              </div>

              {/* Interactive switch */}
              <div className="shrink-0 flex items-center">
                <label
                  htmlFor="switch-cookie-marketing"
                  className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus-within:ring-2 focus-within:ring-[#7A9A3C]"
                >
                  <input
                    id="switch-cookie-marketing"
                    type="checkbox"
                    checked={marketingEnabled}
                    onChange={(e) => setMarketingEnabled(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`h-6 w-11 rounded-full transition-colors ${
                      marketingEnabled ? 'bg-[#7A9A3C]' : 'bg-zinc-700'
                    }`}
                  />
                  <div
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
                      marketingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>

            {/* Full Policy Link inside customize modal */}
            <div className="text-xs text-zinc-400 flex items-center justify-between pt-1">
              <span>
                {currentLanguage === 'ru'
                  ? 'Подробнее о категориях и сроках хранения в '
                  : currentLanguage === 'fr'
                  ? 'Plus de détails dans la '
                  : 'Learn more in the '}
                <a
                  id="link-customize-cookie-policy"
                  href="/cookies"
                  onClick={(e) => handleLinkClick(e, '/cookies')}
                  className="text-[#a2e635] hover:underline cursor-pointer font-medium"
                >
                  {currentLanguage === 'ru'
                    ? 'Политике использования cookie'
                    : currentLanguage === 'fr'
                    ? 'Politique des cookies'
                    : 'Cookie Policy'}
                </a>
              </span>
            </div>

            {/* Action Buttons in Customize view */}
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                id="btn-cookie-save-custom"
                type="button"
                onClick={handleSaveCustom}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#7A9A3C] hover:bg-[#a2e635] text-black text-xs font-bold transition cursor-pointer"
              >
                {currentLanguage === 'ru'
                  ? 'Сохранить выбор'
                  : currentLanguage === 'fr'
                  ? 'Enregistrer mes choix'
                  : 'Save preferences'}
              </button>

              <button
                id="btn-cookie-customize-accept-all"
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-semibold transition cursor-pointer"
              >
                {currentLanguage === 'ru' ? 'Принять все' : currentLanguage === 'fr' ? 'Tout accepter' : 'Accept all'}
              </button>

              <button
                id="btn-cookie-customize-cancel"
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs transition cursor-pointer"
              >
                {currentLanguage === 'ru' ? 'Назад' : currentLanguage === 'fr' ? 'Retour' : 'Back'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
