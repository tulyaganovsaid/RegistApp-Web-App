import React, { useEffect } from 'react';
import { 
  ArrowLeft, 
  AlertTriangle, 
  Calendar, 
  ListTree, 
  Globe2, 
  ShieldCheck, 
  FileText, 
  Cookie, 
  MapPin, 
  ExternalLink,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { LanguageCode } from '../types';
import { BrandLogo } from './BrandLogo';
import AppFooter from './AppFooter';
import { getLegalDocument, legalNavLinks, LegalSlug } from '../locales/legal';

interface LegalPageProps {
  slug: LegalSlug;
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  onNavigate: (path: string) => void;
}

export default function LegalPage({
  slug,
  currentLanguage,
  setLanguage,
  onNavigate,
}: LegalPageProps) {
  const doc = getLegalDocument(slug, currentLanguage);

  // Handle URL hash on mount or when slug changes
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash) {
      const targetId = window.location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [slug]);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `${window.location.pathname}#${targetId}`);
    }
  };

  const handlePageSwitch = (targetSlug: LegalSlug) => {
    const targetPath = `/${targetSlug}`;
    window.history.pushState(null, '', targetPath);
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { path: targetPath } }));
    onNavigate(targetPath);
  };

  const handleBackToApp = () => {
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { path: '/' } }));
    onNavigate('/');
  };

  const getSlugIcon = (s: LegalSlug) => {
    switch (s) {
      case 'privacy':
        return <ShieldCheck className="w-4 h-4" />;
      case 'terms':
        return <FileText className="w-4 h-4" />;
      case 'cookies':
        return <Cookie className="w-4 h-4" />;
      case 'contacts':
        return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div id={`legal-page-${slug}`} className="min-h-screen flex flex-col bg-[#0d0f11] text-zinc-200 selection:bg-[#a2e635] selection:text-black">
      
      {/* Top sticky header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#111414]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <button
              id="btn-legal-back-app"
              onClick={handleBackToApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-850 hover:bg-zinc-800 text-xs font-semibold text-zinc-200 hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">
                {currentLanguage === 'ru' ? 'В сервис' : currentLanguage === 'fr' ? 'Vers l\'app' : 'Back to App'}
              </span>
            </button>

            <div 
              onClick={handleBackToApp} 
              className="cursor-pointer flex items-center hover:opacity-90 transition"
              title="RegistApp"
            >
              <BrandLogo size="sm" />
            </div>
          </div>

          {/* Quick page switcher tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            {legalNavLinks.map((item) => {
              const isCurrent = item.slug === slug;
              return (
                <button
                  key={item.slug}
                  id={`top-tab-${item.slug}`}
                  onClick={() => handlePageSwitch(item.slug)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    isCurrent
                      ? 'bg-[#7A9A3C]/20 text-[#a2e635] border border-[#a2e635]/30 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  {getSlugIcon(item.slug)}
                  <span>{item.shortTitles[currentLanguage] || item.shortTitles.en}</span>
                </button>
              );
            })}
          </nav>

          {/* Language Switcher */}
          <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <Globe2 className="w-3.5 h-3.5 text-zinc-400 ml-1.5 hidden sm:inline" />
            {(['ru', 'en', 'fr'] as LanguageCode[]).map((lang) => (
              <button
                key={lang}
                id={`legal-lang-btn-${lang}`}
                onClick={() => setLanguage(lang)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider transition cursor-pointer ${
                  currentLanguage === lang
                    ? 'bg-[#7A9A3C] text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

        </div>
      </header>

      {/* Main Document Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-zinc-400">
          <button 
            onClick={handleBackToApp} 
            className="hover:text-zinc-200 transition cursor-pointer"
          >
            RegistApp
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-zinc-400">
            {currentLanguage === 'ru' ? 'Правовая информация' : currentLanguage === 'fr' ? 'Mentions légales' : 'Legal Documents'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[#a2e635] font-medium">{doc.title}</span>
        </nav>

        {/* Document Header */}
        <div className="border-b border-zinc-800 pb-8 mb-8">
          <div className="flex items-center gap-2 text-xs font-mono text-[#a2e635] uppercase tracking-wider mb-2">
            {getSlugIcon(slug)}
            <span>RegistApp • Legal Compliance</span>
          </div>

          <h1 id="legal-doc-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {doc.title}
          </h1>

          {doc.subtitle && (
            <p className="mt-3 text-sm sm:text-base text-zinc-400 leading-relaxed max-w-3xl">
              {doc.subtitle}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            {doc.version && (
              <span id="badge-legal-version" className="inline-flex items-center gap-1.5 bg-[#7A9A3C]/15 px-3 py-1 rounded-md border border-[#a2e635]/30 text-[#a2e635] font-semibold">
                <span>
                  {currentLanguage === 'ru' ? 'Редакция:' : currentLanguage === 'fr' ? 'Version :' : 'Version:'}{' '}
                  <strong className="text-white font-mono">v{doc.version}</strong>
                </span>
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 bg-zinc-900/80 px-3 py-1 rounded-md border border-zinc-800">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {currentLanguage === 'ru' ? 'Дата вступления в силу:' : currentLanguage === 'fr' ? 'Date d’entrée en vigueur :' : 'Effective date:'}{' '}
                <strong className="text-zinc-300">{doc.lastUpdated}</strong>
              </span>
            </span>

            <span className="text-zinc-400">
              URL: <code className="font-mono text-emerald-400">/{slug}</code>
            </span>
          </div>

          {/* Mandatory Warning Badge if draft / requires legal check */}
          {doc.disclaimerBadge && (
            <div 
              id="legal-disclaimer-badge"
              className="mt-6 rounded-2xl border-2 border-amber-500/40 bg-amber-950/20 p-4 text-amber-200 flex items-start gap-3.5 shadow-lg shadow-amber-950/30"
            >
              <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="text-xs leading-relaxed">
                <div className="font-extrabold text-amber-300 uppercase tracking-wide text-xs">
                  {doc.disclaimerBadge}
                </div>
                <p className="mt-1 text-amber-200/90">
                  {currentLanguage === 'ru'
                    ? 'Данный текст подготовлен как структурированная юридическая заготовка в строгом соответствии с требованиями Закона РУз «О персональных данных» № ЗРУ-547 и Постановления Кабинета Министров РУз № 433. Перед коммерческим использованием текст подлежит окончательному согласованию юридической службой оператора.'
                    : currentLanguage === 'fr'
                    ? 'Ce texte constitue un projet structuré conforme à la loi ouzbèke sur les données personnelles n° ZRU-547 et au décret n° 433. Il nécessite une validation finale par le conseiller juridique avant adoption définitive.'
                    : 'This document represents a structured legal draft prepared in accordance with the Law of Uzbekistan No. ZRU-547 "On Personal Data" and Cabinet Resolution No. 433. It requires final formal verification by legal counsel prior to commercial enforcement.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Table of Contents (Оглавление с якорными ссылками) */}
        <section 
          id="table-of-contents" 
          aria-labelledby="toc-heading" 
          className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 sm:p-6"
        >
          <div className="flex items-center gap-2 mb-4 text-sm font-bold text-white">
            <ListTree className="w-4 h-4 text-[#a2e635]" />
            <h2 id="toc-heading">{doc.tableOfContentsTitle}</h2>
          </div>

          <nav>
            <ol className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {doc.sections.map((section, idx) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={(e) => handleAnchorClick(e, section.id)}
                    className="flex items-center gap-2 p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition group"
                  >
                    <span className="w-5 h-5 rounded-md bg-zinc-800 group-hover:bg-[#7A9A3C] group-hover:text-black flex items-center justify-center font-mono text-[10px] text-zinc-400 transition shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate group-hover:text-[#a2e635] transition">
                      {section.title.replace(/^\d+\.\s*/, '')}
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </section>

        {/* Document Sections */}
        <div className="space-y-12">
          {doc.sections.map((section) => (
            <article 
              key={section.id} 
              id={section.id} 
              className="scroll-mt-24 border-t border-zinc-800/80 pt-8"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{section.title}</span>
                </h2>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => handleAnchorClick(e, section.id)}
                  className="text-zinc-600 hover:text-[#a2e635] text-xs font-mono transition p-1"
                  title="Ссылка на этот раздел"
                >
                  #
                </a>
              </div>

              {/* Paragraphs */}
              <div className="mt-4 space-y-3 text-sm text-zinc-300 leading-relaxed">
                {section.paragraphs.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              {/* Bullet Points */}
              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <ul className="mt-4 space-y-2.5 pl-2 text-sm text-zinc-300">
                  {section.bulletPoints.map((item, bIdx) => (
                    <li key={bIdx} className="flex items-start gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a2e635] mt-2 shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Subsections */}
              {section.subsections && section.subsections.length > 0 && (
                <div className="mt-5 space-y-4">
                  {section.subsections.map((sub, sIdx) => (
                    <div 
                      key={sIdx}
                      className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
                    >
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#a2e635] mb-1.5">
                        {sub.title}
                      </h3>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        {sub.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>

        {/* Bottom Support Banner */}
        <div className="mt-16 rounded-2xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/80 to-zinc-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-zinc-800 text-[#a2e635] shrink-0">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {currentLanguage === 'ru' ? 'Остались юридические вопросы?' : currentLanguage === 'fr' ? 'Des questions juridiques ?' : 'Legal Questions or Compliance?'}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md">
                {currentLanguage === 'ru'
                  ? 'Служба защиты персональных данных и юридический отдел RegistApp готовы предоставить официальные разъяснения по законодательству РУз.'
                  : currentLanguage === 'fr'
                  ? 'Notre délégué à la protection des données est disponible pour tout éclaircissement réglementaire.'
                  : 'Our Data Protection Officer and compliance team are available to answer inquiries regarding Uzbekistan migration regulations.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="mailto:registapp@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7A9A3C] hover:bg-[#a2e635] text-black text-xs font-bold transition cursor-pointer"
            >
              <span>registapp@gmail.com</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </main>

      {/* Shared Footer */}
      <AppFooter
        id={`footer-legal-${slug}`}
        currentLanguage={currentLanguage}
        onNavigate={onNavigate}
        activeSlug={slug}
      />

    </div>
  );
}
