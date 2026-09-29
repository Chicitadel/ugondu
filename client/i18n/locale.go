package i18n

import (
	"fmt"
	"os"
	"strings"
)

var currentLocale = "en"

// Dictionaries map locale -> key -> value
var dict = map[string]map[string]string{
	"en": {
		"cli_title":          "Ugondu Universal Delivery Client v1.2.0",
		"cli_subtitle":       "Air Roofers - Commercial Delivery Platform",
		"err_not_repo":       "Error: Must be run inside a valid git repository.",
		"err_no_command":     "Error: No command provided.",
		"err_unknown_cmd":    "Error: Unknown command '%s'.",
		"did_you_mean":       "Did you mean '%s'?",
		"cmd_usage":          "Usage: ugondu <command>",
		"cmd_deploy_desc":    "Execute a deployment for the current repository",
		"cmd_rollback_desc":  "Rollback to a previous atomic release",
		"cmd_plugins_desc":   "Manage and list available deployment plugins",
		"cmd_version_desc":   "Print the client version",
		"cmd_help_desc":      "Print this comprehensive help message",
		"env_vars":           "Environment Variables:",
		"env_token":          "UGONDU_TOKEN        - Your commercial license token (ugp_ or uge_ prefix)",
		"env_api_url":        "UGONDU_API_URL      - Override the Governance Server URL",
		"env_target_env":     "UGONDU_TARGET_ENV   - Override target environment (cpanel|directadmin|cloud|kubernetes|baremetal)",
		"env_locale":         "UGONDU_LOCALE       - Active language (en|fr|de)",
		"community_fallback": "Notice: UGONDU_TOKEN not set. Operating in Community mode.",
		"repo_info":          "Repository : %s\nBranch      : %s\nEnvironment : %s",
		"req_recipe":         "Requesting execution recipe from Ugondu Governance Server...",
		"recipe_resolved":    "Recipe resolved. TX: %s | Edition: %s | Strategy: %s",
		"exec_failed":        "Execution Failed: %v",
		"dep_complete":       "✔ Deployment Complete.",
		"step_info":          "Step %d/%d: %s",
		"sync_git":           "Syncing from %s @ %s",
		"sync_files":         "Syncing files using '%s' strategy (Universal OS Engine)",
		"atomic_release":     "Atomic release created at %s",
		"pruning":            "Pruning releases. Retaining last %d.",
		"prune_skip":         "Notice: Release pruning skipped (no old releases to remove).",
		"upsell_notice":      "? UPGRADE REQUIRED: %s",
		"telemetry_warn":     "Warning: Telemetry report failed (non-fatal): %v",
		"telemetry_ok":       "Telemetry reported. Status: %s",
		"prompt_destructive": "WARNING: Destructive Action. This will wipe existing files in %s. Continue? [y/N]: ",
		"aborting":           "Operation aborted by user.",
	},
	"fr": {
		"cli_title":          "Client de Livraison Universel Ugondu v1.2.0",
		"cli_subtitle":       "Air Roofers - Plateforme de Livraison Commerciale",
		"err_not_repo":       "Erreur: Doit être exécuté dans un dépôt git valide.",
		"err_no_command":     "Erreur: Aucune commande fournie.",
		"err_unknown_cmd":    "Erreur: Commande inconnue '%s'.",
		"did_you_mean":       "Vouliez-vous dire '%s'?",
		"cmd_usage":          "Utilisation: ugondu <commande>",
		"cmd_deploy_desc":    "Exécuter un déploiement pour le dépôt actuel",
		"cmd_rollback_desc":  "Revenir à une version atomique précédente",
		"cmd_plugins_desc":   "Gérer et lister les plugins de déploiement disponibles",
		"cmd_version_desc":   "Afficher la version du client",
		"cmd_help_desc":      "Afficher ce message d'aide complet",
		"env_vars":           "Variables d'Environnement:",
		"env_token":          "UGONDU_TOKEN        - Votre jeton de licence commerciale (préfixe ugp_ ou uge_)",
		"env_api_url":        "UGONDU_API_URL      - Remplacer l'URL du Serveur de Gouvernance",
		"env_target_env":     "UGONDU_TARGET_ENV   - Remplacer l'environnement cible (cpanel|directadmin|cloud|kubernetes|baremetal)",
		"env_locale":         "UGONDU_LOCALE       - Langue active (en|fr|de)",
		"community_fallback": "Avis: UGONDU_TOKEN non défini. Fonctionnement en mode Communauté.",
		"repo_info":          "Dépôt       : %s\nBranche      : %s\nEnvironnement: %s",
		"req_recipe":         "Demande de recette d'exécution au Serveur de Gouvernance Ugondu...",
		"recipe_resolved":    "Recette résolue. TX: %s | Édition: %s | Stratégie: %s",
		"exec_failed":        "Échec de l'Exécution: %v",
		"dep_complete":       "✔ Déploiement Terminé.",
		"step_info":          "Étape %d/%d: %s",
		"sync_git":           "Synchronisation depuis %s @ %s",
		"sync_files":         "Synchronisation des fichiers avec la stratégie '%s' (Moteur OS Universel)",
		"atomic_release":     "Version atomique créée à %s",
		"pruning":            "Nettoyage des versions. Conservation des %d dernières.",
		"prune_skip":         "Avis: Nettoyage ignoré (aucune ancienne version à supprimer).",
		"upsell_notice":      "? MISE À NIVEAU REQUISE: %s",
		"telemetry_warn":     "Avertissement: Échec du rapport de télémétrie (non critique): %v",
		"telemetry_ok":       "Télémétrie signalée. Statut: %s",
		"prompt_destructive": "ATTENTION: Action Destructive. Cela effacera les fichiers existants dans %s. Continuer? [o/N]: ",
		"aborting":           "Opération annulée par l'utilisateur.",
	},
}

func init() {
	if loc := os.Getenv("UGONDU_LOCALE"); loc != "" {
		if _, ok := dict[loc]; ok {
			currentLocale = loc
		}
	}
}

// T translates a key and injects the active language token [locale].
func T(key string, args ...interface{}) string {
	d, ok := dict[currentLocale]
	if !ok {
		d = dict["en"]
	}
	
	val, ok := d[key]
	if !ok {
		// Fallback to english dictionary if key is missing in locale
		val, ok = dict["en"][key]
		if !ok {
			val = key
		}
	}

	formatted := val
	if len(args) > 0 {
		// Only substitute if args are provided and format verbs exist
		if strings.Contains(val, "%") {
			formatted = fmt.Sprintf(val, args...)
		}
	}

	return fmt.Sprintf("[%s] %s", currentLocale, formatted)
}
