/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Localization
 * File           : i18n.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 ******************************************************************************/

export type SupportedLocale = 'en' | 'fr' | 'de' | 'es' | 'it';

let currentLocale: SupportedLocale = (process.env.UGONDU_LOCALE as SupportedLocale) || 'en';

const dictionaries: Record<SupportedLocale, Record<string, string>> = {
    en: {
        "event_req": "Event name required.",
        "dispatching": "Dispatching event:",
        "notified": "Notified %d subscribers for %s",
        "delivered": "Successfully delivered to %s",
        "delivery_failed": "Delivery failed to %s: %s",
        "event_success": "Event %s dispatched successfully to %d subscribers.",
        "subscribed": "Subscribed.",
        "new_sub": "New subscriber for event: %s -> %s",
        "listening": "%s listening on port %d",
        "invalid_ctx": "Invalid DeploymentContext. Missing required fields or token.",
        "blocked": "Deployment blocked by Billing Gateway. License invalid or quota exceeded.",
        "atomic_denied": "Notice: Atomic strategy requested but denied by %s license. Falling back to quota-sync.",
        "max_plugins": "Notice: Max plugins (%d) reached for %s edition. Skipping %s.",
        "plugin_failed": "Plugin execution failed:",
        "rollback_denied": "Notice: Rollbacks and release pruning are exclusive to Professional/Enterprise editions.",
        "upsell_notice": "Upgrade to Ugondu Professional to enable rollback snapshots.",
        "internal_err": "Internal Engine Error: %s",
        "invalid_telemetry": "Invalid ExecutionTelemetry.",
        "telemetry_rec": "Telemetry Received - TX: %s | Status: %s",
        "telemetry_saved": "Telemetry recorded."
    },
    fr: {
        "event_req": "Nom d'événement requis.",
        "dispatching": "Distribution de l'événement:",
        "notified": "Notifié %d abonnés pour %s",
        "delivered": "Livré avec succès à %s",
        "delivery_failed": "Échec de la livraison à %s: %s",
        "event_success": "Événement %s distribué avec succès à %d abonnés.",
        "subscribed": "Abonné.",
        "new_sub": "Nouvel abonné pour l'événement: %s -> %s",
        "listening": "%s en écoute sur le port %d",
        "invalid_ctx": "DeploymentContext invalide. Champs requis ou jeton manquants.",
        "blocked": "Déploiement bloqué par la passerelle de facturation. Licence invalide ou quota dépassé.",
        "atomic_denied": "Avis: Stratégie atomique demandée mais refusée par la licence %s. Retour à quota-sync.",
        "max_plugins": "Avis: Maximum de plugins (%d) atteint pour l'édition %s. Ignorer %s.",
        "plugin_failed": "L'exécution du plugin a échoué:",
        "rollback_denied": "Avis: Les restaurations et la suppression des versions sont exclusives aux éditions Professionnelle/Entreprise.",
        "upsell_notice": "Passez à Ugondu Professionnel pour activer les instantanés de restauration.",
        "internal_err": "Erreur interne du moteur: %s",
        "invalid_telemetry": "ExecutionTelemetry invalide.",
        "telemetry_rec": "Télémétrie reçue - TX: %s | Statut: %s",
        "telemetry_saved": "Télémétrie enregistrée."
    },
    de: {
        "event_req": "Ereignisname erforderlich.",
        "dispatching": "Ereignis wird versendet:",
        "notified": "%d Abonnenten für %s benachrichtigt",
        "delivered": "Erfolgreich an %s zugestellt",
        "delivery_failed": "Zustellung an %s fehlgeschlagen: %s",
        "event_success": "Ereignis %s erfolgreich an %d Abonnenten versendet.",
        "subscribed": "Abonniert.",
        "new_sub": "Neuer Abonnent für Ereignis: %s -> %s",
        "listening": "%s hört auf Port %d",
        "invalid_ctx": "Ungültiger DeploymentContext. Fehlende Pflichtfelder oder Token.",
        "blocked": "Bereitstellung durch Billing Gateway blockiert. Lizenz ungültig oder Kontingent überschritten.",
        "atomic_denied": "Hinweis: Atomare Strategie angefordert, aber von %s-Lizenz verweigert. Rückfall auf Quota-Sync.",
        "max_plugins": "Hinweis: Maximale Plugins (%d) für %s-Edition erreicht. Überspringe %s.",
        "plugin_failed": "Plugin-Ausführung fehlgeschlagen:",
        "rollback_denied": "Hinweis: Rollbacks und Release-Bereinigung sind exklusiv für Professional/Enterprise-Editionen.",
        "upsell_notice": "Führen Sie ein Upgrade auf Ugondu Professional durch, um Rollback-Snapshots zu aktivieren.",
        "internal_err": "Interner Motorfehler: %s",
        "invalid_telemetry": "Ungültige ExecutionTelemetry.",
        "telemetry_rec": "Telemetrie empfangen - TX: %s | Status: %s",
        "telemetry_saved": "Telemetrie aufgezeichnet."
    },
    es: {} as any,
    it: {} as any
};

export function setLocale(locale: SupportedLocale): void {
    if (dictionaries[locale]) {
        currentLocale = locale;
    }
}

export function getLocale(): SupportedLocale {
    return currentLocale;
}

/**
 * Air Roofers Tokenization Standard
 * Translates a key and prefixes it with the active locale token (e.g., `[en]`).
 * Supports basic %s (string) and %d (number) substitution.
 */
export function __t(key: string, ...args: any[]): string {
    const dict = dictionaries[currentLocale] || dictionaries['en'];
    let message = dict[key] || dictionaries['en'][key] || key;
    
    // Simple placeholder substitution for %s and %d
    if (args.length > 0) {
        let i = 0;
        message = message.replace(/%[sd]/g, () => {
            if (i < args.length) {
                return String(args[i++]);
            }
            return '';
        });
    }

    return `[${currentLocale}] ${message}`;
}
