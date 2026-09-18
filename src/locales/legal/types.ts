import { LanguageCode } from '../../types';

export interface LegalSubsection {
  title: string;
  text: string;
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  bulletPoints?: string[];
  subsections?: LegalSubsection[];
}

export interface LegalDocument {
  slug: 'privacy' | 'terms' | 'cookies' | 'contacts';
  title: string;
  subtitle?: string;
  version?: string;
  effectiveDate?: string;
  lastUpdated: string;
  disclaimerBadge?: string;
  tableOfContentsTitle: string;
  sections: LegalSection[];
}

export type LegalLocaleContent = Record<LanguageCode, LegalDocument>;
