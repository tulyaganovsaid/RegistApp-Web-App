import { LanguageCode } from '../../types';
import { LegalDocument } from './types';
import { privacyContent } from './privacy';
import { termsContent } from './terms';
import { cookiesContent } from './cookies';
import { contactsContent } from './contacts';
import { getDocumentVersionInfo } from './versions';

export * from './types';
export * from './versions';

export const legalSlugs = ['privacy', 'terms', 'cookies', 'contacts'] as const;
export type LegalSlug = (typeof legalSlugs)[number];

const legalRegistry: Record<LegalSlug, Record<LanguageCode, LegalDocument>> = {
  privacy: privacyContent,
  terms: termsContent,
  cookies: cookiesContent,
  contacts: contactsContent,
};

export function getLegalDocument(slug: LegalSlug, lang: LanguageCode, config?: any): LegalDocument {
  const docByLang = legalRegistry[slug];
  const baseDoc = docByLang ? (docByLang[lang] || docByLang.en || docByLang.ru) : (privacyContent[lang] || privacyContent.en);
  const versionInfo = getDocumentVersionInfo(slug, config);
  
  return {
    ...baseDoc,
    version: versionInfo.version,
    effectiveDate: versionInfo.effectiveDate,
    lastUpdated: versionInfo.formattedDate[lang] || versionInfo.formattedDate.en || baseDoc.lastUpdated,
  };
}

export interface LegalPageLink {
  slug: LegalSlug;
  path: string;
  titles: Record<LanguageCode, string>;
  shortTitles: Record<LanguageCode, string>;
}

export const legalNavLinks: LegalPageLink[] = [
  {
    slug: 'privacy',
    path: '/privacy',
    titles: {
      ru: 'Политика конфиденциальности',
      en: 'Privacy Policy',
      fr: 'Politique de confidentialité',
    },
    shortTitles: {
      ru: 'Политика конфиденциальности',
      en: 'Privacy Policy',
      fr: 'Confidentialité',
    },
  },
  {
    slug: 'terms',
    path: '/terms',
    titles: {
      ru: 'Публичная оферта',
      en: 'Public Offer',
      fr: 'Offre publique',
    },
    shortTitles: {
      ru: 'Публичная оферта',
      en: 'Public Offer',
      fr: 'Conditions',
    },
  },
  {
    slug: 'cookies',
    path: '/cookies',
    titles: {
      ru: 'Cookie',
      en: 'Cookie',
      fr: 'Cookie',
    },
    shortTitles: {
      ru: 'Cookie',
      en: 'Cookie',
      fr: 'Cookie',
    },
  },
  {
    slug: 'contacts',
    path: '/contacts',
    titles: {
      ru: 'Контакты',
      en: 'Contacts',
      fr: 'Contacts',
    },
    shortTitles: {
      ru: 'Контакты',
      en: 'Contacts',
      fr: 'Contacts',
    },
  },
];
