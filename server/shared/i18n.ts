/******************************************************************************
 * Project        : Ugondu - Universal Deployment Intelligence Platform
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
        "telemetry_saved": "Telemetry recorded.",
        
        "missing_repo": "repositoryUrl is required.",
        "missing_branch": "branch is required.",
        "auth_missing": "Missing authentication token. Deployment rejected.",
        "auth_validating": "Validating token with Identity Authority...",
        "auth_rejected": "Identity Authority rejected the token.",
        "billing_verified": "Billing and quota verified. Tenant: %s, Edition: %s.",
        "auth_success": "Authorization successful. Operating under %s license.",
        "auth_failed": "Authorization failed: %s",
        "payment_required": "Payment Required or License Exhausted.",
        "listening_port": "Ugondu %s listening on port %s",
        
        "plugin_discover": "Discovered %d installable plugins.",
        "plugin_err_scan": "Error scanning plugins: %s",
        "plugin_internal_err": "Internal Plugin Engine Error.",
        "plugin_exec_sandbox": "Executing sandbox action for plugin: %s",
        "plugin_not_found": "Plugin %s not found.",
        "plugin_success": "Plugin %s executed successfully.",
        "plugin_sandbox_err": "Plugin Sandbox Error: %s",
        "plugin_unauthorized": "Tenant %s is not authorized to use plugin %s (Requires %s).",
        
        "repo_detected": "Provider detected: %s. Credential env: %s",
        "repo_resolved": "Repository resolved: %s -> Provider: %s",
        "repo_all_providers": "All supported repository providers.",
        "repo_supported": "Supported providers: GitHub, GitLab, Bitbucket, Gitea, Gogs, Azure DevOps, AWS CodeCommit, Generic Git"
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
        "telemetry_saved": "Télémétrie enregistrée.",
        
        "missing_repo": "repositoryUrl manquant.",
        "missing_branch": "branch manquante.",
        "auth_missing": "Jeton d'authentification manquant. Déploiement rejeté.",
        "auth_validating": "Validation du jeton auprès de l'Autorité d'Identité...",
        "auth_rejected": "L'Autorité d'Identité a rejeté le jeton.",
        "billing_verified": "Facturation et quota vérifiés. Locataire: %s, Édition: %s.",
        "auth_success": "Autorisation réussie. Fonctionnement sous licence %s.",
        "auth_failed": "Échec de l'autorisation : %s",
        "payment_required": "Paiement Requis ou Licence Épuisée.",
        "listening_port": "Ugondu %s en écoute sur le port %s",
        
        "plugin_discover": "Découvert %d plugins installables.",
        "plugin_err_scan": "Erreur lors de l'analyse des plugins : %s",
        "plugin_internal_err": "Erreur interne du moteur de plugins.",
        "plugin_exec_sandbox": "Exécution de l'action bac à sable pour le plugin : %s",
        "plugin_not_found": "Plugin %s introuvable.",
        "plugin_success": "Plugin %s exécuté avec succès.",
        "plugin_sandbox_err": "Erreur du bac à sable du plugin : %s",
        "plugin_unauthorized": "Locataire %s non autorisé à utiliser le plugin %s (Nécessite %s).",
        
        "repo_detected": "Fournisseur détecté : %s. Env identifiant : %s",
        "repo_resolved": "Dépôt résolu : %s -> Fournisseur : %s",
        "repo_all_providers": "Tous les fournisseurs de dépôts pris en charge.",
        "repo_supported": "Fournisseurs pris en charge : GitHub, GitLab, Bitbucket, Gitea, Gogs, Azure DevOps, AWS CodeCommit, Generic Git"
    },
    de: {
        "event_req": "Ereignisname erforderlich."
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

export function __t(key: string, ...args: any[]): string {
    const dict = dictionaries[currentLocale] || dictionaries['en'];
    let message = dict[key] || dictionaries['en'][key] || key;
    
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
