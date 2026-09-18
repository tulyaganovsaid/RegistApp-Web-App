import React, { useEffect, useRef } from 'react';
import { X, ShieldCheck, FileText, ExternalLink, CheckCircle2, ChevronRight } from 'lucide-react';
import { LanguageCode } from '../types';
import { getLegalDocument, LegalSlug } from '../locales/legal';

interface LegalDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: LegalSlug;
  sectionId?: string;
  currentLanguage: LanguageCode;
  onAcknowledge?: () => void;
}

export default function LegalDocModal({
  isOpen,
  onClose,
  slug,
  sectionId,
  currentLanguage,
  onAcknowledge,
}: LegalDocModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const targetElementRef = useRef<HTMLElement | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Scroll to section if sectionId is present
  useEffect(() => {
    if (!isOpen) return;

    if (sectionId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`modal-sec-${sectionId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          targetElementRef.current = el;
        }
      }, 150);
      return () => clearTimeout(timer);
    } else if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [isOpen, sectionId, slug]);

  if (!isOpen) return null;

  const doc = getLegalDocument(slug, currentLanguage);

  return (
    <div 
      id="modal-legal-doc-overlay" 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/85 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        id="modal-legal-doc-container"
        className="w-full max-w-3xl rounded-2xl border border-gray-800 bg-[#141923] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-800 bg-[#10141d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-[#7A9A3C]/15 border border-[#7A9A3C]/30 text-[#90B24A] shrink-0">
              {slug === 'privacy' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-[#7A9A3C]/10 text-[#90B24A] border border-[#7A9A3C]/30">
                  {slug === 'privacy' ? 'Политика конфиденциальности' : 'Публичная оферта'}
                </span>
                {doc.version && (
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    v{doc.version}
                  </span>
                )}
                {sectionId && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    #{sectionId}
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate mt-0.5">
                {doc.title}
              </h3>
            </div>
          </div>

          <button
            id="btn-close-legal-doc-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-gray-800 bg-[#1b2230] text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer shrink-0"
            title="Закрыть (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Highlight notification if section anchor specified */}
        {sectionId && (
          <div className="px-5 py-2.5 bg-amber-950/30 border-b border-amber-900/40 text-amber-200 text-xs flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span>
              {currentLanguage === 'ru'
                ? `Вы перешли к разделу: «${sectionId === 'recipients' ? 'Получатели персональных данных (E-mehmon, Jules Verne, платёжный провайдер)' : 'Трансграничная передача данных'}». Он подсвечен ниже.`
                : currentLanguage === 'fr'
                ? `Focus sur la section « ${sectionId} » ci-dessous.`
                : `Focused on section "${sectionId}" highlighted below.`}
            </span>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div 
          ref={containerRef}
          className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-xs text-gray-300 leading-relaxed font-sans"
        >
          {doc.subtitle && (
            <p className="text-xs text-gray-400 italic border-l-2 border-[#7A9A3C] pl-3 py-1">
              {doc.subtitle}
            </p>
          )}

          {doc.sections.map((sec) => {
            const isTarget = sectionId && sec.id === sectionId;
            return (
              <article
                key={sec.id}
                id={`modal-sec-${sec.id}`}
                className={`rounded-xl p-4 transition-all duration-300 ${
                  isTarget
                    ? 'border-2 border-[#7A9A3C] bg-[#7A9A3C]/10 shadow-lg shadow-[#7A9A3C]/10 ring-1 ring-[#90B24A]/40'
                    : 'border border-gray-800/80 bg-[#161c28]/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-gray-800/60 pb-2 mb-3">
                  <h4 className={`text-sm font-bold tracking-tight ${isTarget ? 'text-[#90B24A]' : 'text-white'}`}>
                    {sec.title}
                  </h4>
                  {isTarget && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#7A9A3C] text-black shrink-0">
                      {currentLanguage === 'ru' ? 'Целевой пункт' : 'Active Clause'}
                    </span>
                  )}
                </div>

                {/* Paragraphs */}
                <div className="space-y-2 text-gray-300 leading-relaxed">
                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>

                {/* Bullet Points */}
                {sec.bulletPoints && sec.bulletPoints.length > 0 && (
                  <ul className="mt-3 space-y-1.5 pl-1 text-gray-300">
                    {sec.bulletPoints.map((bp, bIdx) => (
                      <li key={bIdx} className="flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isTarget ? 'bg-[#90B24A]' : 'bg-gray-500'}`} />
                        <span>{bp}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-[#10141d] flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-gray-500 hidden sm:block">
            {currentLanguage === 'ru' 
              ? 'Закрытие окна не сбрасывает данные вашей заявки' 
              : 'Closing this preview retains all entered form data'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-modal-legal-close"
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-gray-800 bg-[#1b2230] text-gray-300 hover:text-white hover:bg-gray-800 text-xs font-semibold transition cursor-pointer"
            >
              {currentLanguage === 'ru' ? 'Закрыть' : currentLanguage === 'fr' ? 'Fermer' : 'Close'}
            </button>
            {onAcknowledge && (
              <button
                id="btn-modal-legal-agree"
                type="button"
                onClick={() => {
                  onAcknowledge();
                  onClose();
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#7A9A3C] text-black hover:bg-[#5E7A2A] hover:text-white text-xs font-bold transition shadow-md cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{currentLanguage === 'ru' ? 'Ознакомлен' : currentLanguage === 'fr' ? 'J\'ai compris' : 'I Understand'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
