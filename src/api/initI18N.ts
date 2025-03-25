import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
// import en from "../../shared/Lang/en.json";
// import ru from "../../shared/Lang/ru.json";
import { conf } from "Board/Settings";
import { defaultNS, resources } from "shared/Lang";

// export const defaultNS = "default";
// export const resources = {
// 	en: {
// 		default: en,
// 	},
// 	ru: {
// 		default: ru,
// 	},
// };
export function initI18N(isNode = false): typeof i18n {
	if (isNode) {
		console.log("return empty ctx");
		return {} as typeof i18n;
	}

	i18n.use(initReactI18next)
		.use(LanguageDetector)
		.init({
			// @ts-expect-error import.meta object didn't exists in common-js modules
			debug: import.meta.env.NODE_ENV === "development",
			detection: {
				order: ["navigator"],
			},
			supportedLngs: ["en", "ru"],
			defaultNS,
			resources,
			// @ts-expect-error import.meta object didn't exists in common-js modules
			fallbackLng: import.meta.env.FALLBACK_LNG ?? "en",
			interpolation: {
				escapeValue: false,
			},
		});
	conf.i18n = i18n;

	return i18n;
}
