import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { conf } from "Settings";

export const defaultNS = "default";
export const resources = {
  en: {
    default: {},
  },
  ru: {
    default: {},
  },
};
export function initDefaultI18N(): typeof i18n {
  i18n
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

  conf.i18n = i18n;
  conf.planNames = {
    basic: i18n.t("userPlan.plans.basic.name"),
    plus: i18n.t("userPlan.plans.plus.name"),
  };

  return i18n;
}
