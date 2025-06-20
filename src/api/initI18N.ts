import type { i18n as I18nType } from "i18next";
import { conf } from "Settings";

/**
 * Registers a pre-configured i18next instance on the global Settings.
 * @param i18nInstance - An initialized i18next instance, already configured with plugins and options.
 */
export function initI18N(i18nInstance: I18nType): I18nType {
  conf.i18n = i18nInstance;
  conf.planNames = {
    basic: i18nInstance.t("userPlan.plans.basic.name"),
    plus: i18nInstance.t("userPlan.plans.plus.name"),
  };
  return i18nInstance;
}
