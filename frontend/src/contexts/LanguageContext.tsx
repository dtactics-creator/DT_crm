import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations, type SupportedLanguage, getTranslation } from '../lib/i18n';

interface LanguageContextType {
  lang: SupportedLanguage;
  setLang: (lang: SupportedLanguage) => void;
  t: (key: keyof typeof translations['en']) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key) => translations.en[key] || key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem('crm_competition_lang') as SupportedLanguage) || 'en';
  });

  const setLang = (newLang: SupportedLanguage) => {
    setLangState(newLang);
    localStorage.setItem('crm_competition_lang', newLang);
  };

  const t = (key: keyof typeof translations['en']) => {
    return getTranslation(lang, key);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
