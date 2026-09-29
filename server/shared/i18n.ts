/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Localization
 * File           : i18n.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 ******************************************************************************/

export type SupportedLocale = 'en' | 'fr' | 'de';

let currentLocale: SupportedLocale = 'en';

export function setLocale(locale: SupportedLocale): void {
    currentLocale = locale;
}

export function __t(message: string): string {
    // According to Air Roofers tokenization standard, all internal logs
    // and outputs must be prefixed with the active locale token.
    // E.g., [en] Starting deployment...
    return `[${currentLocale}] ${message}`;
}
