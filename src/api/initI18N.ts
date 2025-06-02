import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import { conf } from 'Settings';
import { defaultNS, resources } from 'shared/Lang';

export function initI18N(isNode = false): typeof i18n {
	i18n.use(initReactI18next)
		.use(LanguageDetector)
		.init({
			// @ts-expect-error import.meta object didn't exists in common-js modules
			debug: import.meta.env ? import.meta.env.NODE_ENV === 'development' : false,
			detection: {
				order: ['navigator'],
			},
			supportedLngs: ['en', 'ru'],
			defaultNS,
			resources,
			// @ts-expect-error import.meta object didn't exists in common-js modules
			fallbackLng: import.meta.env ? import.meta.env.FALLBACK_LNG : 'en',
			interpolation: {
				escapeValue: false,
			},
		});

	conf.i18n = i18n;
	conf.planNames = {
		basic: i18n.t('userPlan.plans.basic.name'),
		plus: i18n.t('userPlan.plans.plus.name'),
	};

	return i18n;
}
