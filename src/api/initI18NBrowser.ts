import i18n, { createInstance } from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import { conf } from "Settings";
import { defaultNS, resources } from "./initI18N";

export function initI18NReact(isNode = false): typeof i18n {
  const i18nBrowser = createInstance();

  i18nBrowser
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      debug: conf.debug,
      detection: {
        order: ["navigator"],
      },
      supportedLngs: ["en", "ru"],
      defaultNS,
      resources,
      fallbackLng: conf.FALLBACK_LNG,
      interpolation: {
        escapeValue: false,
      },
    });

  conf.i18n = i18nBrowser;

  return i18nBrowser;
}
