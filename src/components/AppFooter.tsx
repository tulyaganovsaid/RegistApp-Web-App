import React from 'react';
import { ShieldCheck, FileText, Cookie, MapPin, PhoneCall, Sliders, Info, Building2 } from 'lucide-react';
import { LanguageCode } from '../types';
import { legalNavLinks, LegalSlug } from '../locales/legal';

interface AppFooterProps {
  id?: string;
  currentLanguage: LanguageCode;
  onNavigate?: (path: string) => void;
  className?: string;
  activeSlug?: LegalSlug;
}

export default function AppFooter({
  id = 'app-shared-footer',
  currentLanguage,
  onNavigate,
  className = '',
  activeSlug,
}: AppFooterProps) {
  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault();
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { path } }));
    }
    if (onNavigate) {
      onNavigate(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCookieSettings = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('open-cookie-settings'));
  };

  const icons: Record<LegalSlug, React.ReactNode> = {
    privacy: <ShieldCheck className="w-3.5 h-3.5 text-[#a2e635]" />,
    terms: <FileText className="w-3.5 h-3.5 text-[#a2e635]" />,
    cookies: <Cookie className="w-3.5 h-3.5 text-[#a2e635]" />,
    contacts: <MapPin className="w-3.5 h-3.5 text-[#a2e635]" />,
  };

  // The 5 requested footer items in exact specified order:
  // 1. Политика конфиденциальности
  // 2. Публичная оферта
  // 3. Cookie
  // 4. Настройки cookie (interactive settings trigger)
  // 5. Контакты
  const privacyLink = legalNavLinks.find(l => l.slug === 'privacy');
  const termsLink = legalNavLinks.find(l => l.slug === 'terms');
  const cookiesLink = legalNavLinks.find(l => l.slug === 'cookies');
  const contactsLink = legalNavLinks.find(l => l.slug === 'contacts');

  // Multi-language disclaimer line
  const disclaimerText = {
    ru: 'RegistApp — справочно-сервисный проект. Не является государственным органом.',
    en: 'RegistApp is an informational and service project. It is not a government agency.',
    fr: 'RegistApp est un projet d’information et de services. N’est pas un organisme public.',
  }[currentLanguage] || 'RegistApp — справочно-сервисный проект. Не является государственным органом.';

  // Multi-language operator requisites line
  const operatorRequisitesText = {
    ru: 'Исполнитель услуги: Семейное предприятие «Jules Verne Hostel» (ИНН: 309 881 442, Сертификат соответствия средства размещения № UZ.SM.01.004.81923) • 100128, г. Ташкент, Шайхантаурский р-н, ул. Каттакурган, д. 33 • Тел: +998 (71) 200-88-11 • Email: info@registapp.online, admin@registapp.online',
    en: 'Service Provider: Family Enterprise "Jules Verne Hostel" (TIN: 309 881 442, Accommodation Certificate No. UZ.SM.01.004.81923) • 33 Kattakurgan St, Shaykhantakhur District, Tashkent 100128, Uzbekistan • Tel: +998 (71) 200-88-11 • Email: info@registapp.online, admin@registapp.online',
    fr: 'Prestataire de services : Entreprise Familiale « Jules Verne Hostel » (NIF : 309 881 442, Certificat d\'hébergement n° UZ.SM.01.004.81923) • 33 rue Kattakourgan, district de Shaykhantakhur, Tachkent 100128, Ouzbékistan • Tél : +998 (71) 200-88-11 • Courriel : info@registapp.online, admin@registapp.online',
  }[currentLanguage] || 'Исполнитель услуги: Семейное предприятие «Jules Verne Hostel» (ИНН: 309 881 442, Сертификат соответствия средства размещения № UZ.SM.01.004.81923) • 100128, г. Ташкент, Шайхантаурский р-н, ул. Каттакурган, д. 33 • Тел: +998 (71) 200-88-11 • Email: info@registapp.online, admin@registapp.online';

  return (
    <footer
      id={id}
      className={`border-t border-zinc-800/80 bg-transparent py-8 px-4 sm:px-6 lg:px-8 text-zinc-400 select-none ${className}`}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        
        {/* Navigation links: Политика конфиденциальности, Публичная оферта, Cookie, Настройки cookie, Контакты */}
        <div id="footer-nav-links-row" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs sm:text-sm font-medium">
          {/* 1. Политика конфиденциальности */}
          {privacyLink && (
            <a
              id="footer-nav-privacy"
              href={privacyLink.path}
              onClick={(e) => handleLinkClick(e, privacyLink.path)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                activeSlug === 'privacy'
                  ? 'bg-zinc-800/80 text-[#a2e635] font-semibold ring-1 ring-[#a2e635]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {icons.privacy}
              <span>{privacyLink.titles[currentLanguage] || privacyLink.titles.en}</span>
            </a>
          )}

          {/* 2. Публичная оферта */}
          {termsLink && (
            <a
              id="footer-nav-terms"
              href={termsLink.path}
              onClick={(e) => handleLinkClick(e, termsLink.path)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                activeSlug === 'terms'
                  ? 'bg-zinc-800/80 text-[#a2e635] font-semibold ring-1 ring-[#a2e635]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {icons.terms}
              <span>{termsLink.titles[currentLanguage] || termsLink.titles.en}</span>
            </a>
          )}

          {/* 3. Cookie */}
          {cookiesLink && (
            <a
              id="footer-nav-cookies"
              href={cookiesLink.path}
              onClick={(e) => handleLinkClick(e, cookiesLink.path)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                activeSlug === 'cookies'
                  ? 'bg-zinc-800/80 text-[#a2e635] font-semibold ring-1 ring-[#a2e635]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {icons.cookies}
              <span>{cookiesLink.titles[currentLanguage] || cookiesLink.titles.en}</span>
            </a>
          )}

          {/* 4. Настройки cookie */}
          <button
            id="footer-cookie-settings-btn"
            type="button"
            onClick={handleOpenCookieSettings}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/5 transition-colors duration-150 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-[#a2e635]" />
            <span>
              {currentLanguage === 'ru'
                ? 'Настройки cookie'
                : currentLanguage === 'fr'
                ? 'Paramètres des cookies'
                : 'Cookie Settings'}
            </span>
          </button>

          {/* 5. Контакты */}
          {contactsLink && (
            <a
              id="footer-nav-contacts"
              href={contactsLink.path}
              onClick={(e) => handleLinkClick(e, contactsLink.path)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-150 ${
                activeSlug === 'contacts'
                  ? 'bg-zinc-800/80 text-[#a2e635] font-semibold ring-1 ring-[#a2e635]/30'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {icons.contacts}
              <span>{contactsLink.titles[currentLanguage] || contactsLink.titles.en}</span>
            </a>
          )}
        </div>

        {/* Строка: «RegistApp — справочно-сервисный проект. Не является государственным органом.» */}
        <div 
          id="footer-disclaimer-bar" 
          className="flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-center text-xs text-amber-300/90 shadow-sm"
        >
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-medium tracking-wide">
            {disclaimerText}
          </span>
        </div>

        {/* Строка с реквизитами оператора */}
        <div 
          id="footer-requisites-row"
          className="flex items-start justify-center gap-2 text-center text-xs text-zinc-400 leading-relaxed max-w-4xl mx-auto"
        >
          <Building2 className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
          <span>
            {operatorRequisitesText}
          </span>
        </div>

        {/* Informational Sub-bar: Copyright, E-mehmon partner statement, and Tourist Police Hotline */}
        <div 
          id="footer-bottom-bar"
          className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-zinc-800/80 text-xs text-zinc-500 text-center sm:text-left"
        >
          <div>
            <p className="font-medium text-zinc-400">
              © {new Date().getFullYear()} Семейное предприятие «Jules Verne Hostel» • RegistApp (Ташкент, registapp.online)
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              {currentLanguage === 'ru'
                ? 'Аккредитованный партнер системы E-mehmon (emehmon.uz) • МВД РУз'
                : currentLanguage === 'fr'
                ? 'Partenaire accrédité du système national E-mehmon (emehmon.uz) • Ministère de l\'Intérieur'
                : 'Accredited Partner in the State E-mehmon System (emehmon.uz) • Ministry of Internal Affairs'}
            </p>
          </div>

          {/* Tourist Police Hotline Badge */}
          <div 
            id="footer-hotline-badge"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-[11px]"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-zinc-400">
              {currentLanguage === 'ru' ? 'Туристическая полиция Узбекистана:' : currentLanguage === 'fr' ? 'Police touristique :' : 'Uzbekistan Tourist Police:'}
            </span>
            <a href="tel:1173" className="font-mono font-bold text-emerald-400 hover:underline">
              1173 (24/7)
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
