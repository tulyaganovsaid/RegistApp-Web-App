import { SystemConfig } from '../../types';

export interface DocumentVersionMeta {
  version: string;
  effectiveDate: string; // YYYY-MM-DD
  formattedDate: {
    ru: string;
    en: string;
    fr: string;
  };
  changelogSummary: {
    ru: string;
    en: string;
    fr: string;
  };
}

export interface LegalDocumentsRegistry {
  privacy: DocumentVersionMeta;
  terms: DocumentVersionMeta;
  cookies: DocumentVersionMeta;
  contacts: DocumentVersionMeta;
}

export const BASE_LEGAL_VERSIONS: LegalDocumentsRegistry = {
  privacy: {
    version: '1.0',
    effectiveDate: '2026-09-17',
    formattedDate: {
      ru: '17 сентября 2026 г.',
      en: 'September 17, 2026',
      fr: '17 septembre 2026',
    },
    changelogSummary: {
      ru: 'Первоначальная редакция в соответствии с Законом РУз № ЗРУ-547 «О персональных данных»',
      en: 'Initial version compliant with Uzbekistan Law No. ZRU-547 "On Personal Data"',
      fr: 'Version initiale conforme à la loi ouzbèke n° ZRU-547 « Sur les données personnelles »',
    },
  },
  terms: {
    version: '1.0',
    effectiveDate: '2026-09-17',
    formattedDate: {
      ru: '17 сентября 2026 г.',
      en: 'September 17, 2026',
      fr: '17 septembre 2026',
    },
    changelogSummary: {
      ru: 'Первоначальная редакция публичной оферты на оформление регистрации в статусе свободного туриста',
      en: 'Initial version of the public offer for independent tourist registration assistance',
      fr: 'Version initiale de l’offre publique pour l’enregistrement de touriste indépendant',
    },
  },
  cookies: {
    version: '1.0',
    effectiveDate: '2026-09-17',
    formattedDate: {
      ru: '17 сентября 2026 г.',
      en: 'September 17, 2026',
      fr: '17 septembre 2026',
    },
    changelogSummary: {
      ru: 'Классификация обязательных технических файлов cookie и локального сессионного хранилища',
      en: 'Specification of mandatory technical cookies and local session storage requirements',
      fr: 'Classification des cookies techniques indispensables et du stockage local de session',
    },
  },
  contacts: {
    version: '1.0',
    effectiveDate: '2026-09-17',
    formattedDate: {
      ru: '17 сентября 2026 г.',
      en: 'September 17, 2026',
      fr: '17 septembre 2026',
    },
    changelogSummary: {
      ru: 'Официальные контакты туроператора и круглосуточная горячая линия Туристической полиции 1173',
      en: 'Official operator credentials and 24/7 Tourist Police hotline 1173',
      fr: 'Coordonnées officielles de l’opérateur et assistance téléphonique Police touristique 1173',
    },
  },
};

/**
 * Returns active document versions snapshot, incorporating any custom version overrides
 * configured by administrators in SystemConfig.
 */
export function getActiveDocumentVersions(config?: SystemConfig): {
  privacyVersion: string;
  termsVersion: string;
  cookiesVersion: string;
  effectiveDates: {
    privacy: string;
    terms: string;
    cookies: string;
  };
} {
  const privacyVer = config?.legalDocumentVersions?.privacyVersion || BASE_LEGAL_VERSIONS.privacy.version;
  const termsVer = config?.legalDocumentVersions?.termsVersion || BASE_LEGAL_VERSIONS.terms.version;
  const cookiesVer = config?.legalDocumentVersions?.cookiesVersion || BASE_LEGAL_VERSIONS.cookies.version;

  const privacyDate = config?.legalDocumentVersions?.privacyDate || BASE_LEGAL_VERSIONS.privacy.effectiveDate;
  const termsDate = config?.legalDocumentVersions?.termsDate || BASE_LEGAL_VERSIONS.terms.effectiveDate;
  const cookiesDate = config?.legalDocumentVersions?.cookiesDate || BASE_LEGAL_VERSIONS.cookies.effectiveDate;

  return {
    privacyVersion: privacyVer,
    termsVersion: termsVer,
    cookiesVersion: cookiesVer,
    effectiveDates: {
      privacy: privacyDate,
      terms: termsDate,
      cookies: cookiesDate,
    },
  };
}

/**
 * Returns full version and date info for a specific legal document slug.
 */
export function getDocumentVersionInfo(slug: string, config?: SystemConfig): DocumentVersionMeta {
  const base = (BASE_LEGAL_VERSIONS as any)[slug] || BASE_LEGAL_VERSIONS.privacy;
  if (!config?.legalDocumentVersions) {
    return base;
  }

  const vKey = `${slug}Version` as keyof typeof config.legalDocumentVersions;
  const dKey = `${slug}Date` as keyof typeof config.legalDocumentVersions;

  const customVersion = config.legalDocumentVersions[vKey];
  const customDate = config.legalDocumentVersions[dKey];

  if (customVersion || customDate) {
    return {
      ...base,
      version: customVersion || base.version,
      effectiveDate: customDate || base.effectiveDate,
      formattedDate: {
        ru: customDate || base.formattedDate.ru,
        en: customDate || base.formattedDate.en,
        fr: customDate || base.formattedDate.fr,
      },
    };
  }

  return base;
}

/**
 * Utility to calculate the next semantic version when legal text is revised.
 */
export function incrementVersion(currentVersion: string, type: 'major' | 'minor' = 'minor'): string {
  const parts = currentVersion.split('.').map((p) => parseInt(p, 10) || 0);
  const major = parts[0] || 1;
  const minor = parts[1] || 0;

  if (type === 'major') {
    return `${major + 1}.0`;
  }
  return `${major}.${minor + 1}`;
}
