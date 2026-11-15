# 🔬 Ugondu Forensics: Federated 500 Errors Root Cause Analysis

**Target Environment:** `ny210.whpservers.com` (DirectAdmin)
**Analyzed Subdomains:** `products.airroofers.eu`, `identity.airroofers.eu`, `billing.airroofers.eu`

Following the successful patch of the `license` system and the universal `Mandatag` framework deployment, Ugondu proceeded to analyze the remaining HTTP 500 errors across the federation. 

## 🚨 The Primary Failure: Omitted Shared Repositories
The DirectAdmin migration tool operates strictly on registered domain names. When it migrated the tenant, it only copied folders that were explicitly bound as subdomains (e.g., `identity.airroofers.eu`, `billing.airroofers.eu`).

It **completely abandoned** any underlying shared library directories that were not bound as domains.

### 🔍 Evidence from `identity.airroofers.eu`
Execution of `index.php` results in:
`PHP Fatal error: Uncaught Error: Class "AirRoofers\PlatformCore\Repository\BaseRepository" not found`

Upon inspecting the `composer.json` file inside `identity/current/public_html`, the architecture explicitly declares local path repositories:
```json
"repositories": [
    {
        "type": "path",
        "url": "../platform-core"
    },
    {
        "type": "path",
        "url": "../operations.airroofers.eu"
    }
]
```
The `platform-core` directory physically does not exist on the DirectAdmin server. The Composer autoloader is attempting to load classes from a ghost directory, causing the immediate 500 crash.

### 🔍 Evidence from `products.airroofers.eu`
Execution of `index.php` results in:
`PHP Warning: require_once(.../releases/platform-core/src/Http/ResponseFormatter.php): Failed to open stream: No such file or directory`

The entry point aggressively traverses the symlink tree attempting to find `platform-core`:
`require_once(__DIR__ . '/../../platform-core/src/Http/ResponseFormatter.php')`
Because `platform-core` was left behind by the migration tool, the require fails, and the application hard-crashes.

### 🔍 Evidence from `billing.airroofers.eu`
`billing` also relies on a cascading fallback mechanism. If it doesn't find its files locally, it searches for `platform-core`:
```php
$coreSrc = __DIR__ . '/src';
if (!file_exists($coreSrc . '/Http/BrandedErrorPage.php')) {
    $coreSrc = __DIR__ . '/../src';
}
if (!file_exists($coreSrc . '/Http/BrandedErrorPage.php')) {
    $coreSrc = __DIR__ . '/../../platform-core/src'; // <-- FALLBACK TO SHARED CORE
}
```
Because the files are completely unreadable or missing, it fails to boot.

---

## 🛠️ Ugondu Engine Evolution Proposal
To allow Ugondu to autonomously heal this class of federated failure, the Capabilities Matrix must be expanded:

1. **`PathRepositoryReconstruction` (Sovereign Tier):**
   Ugondu must be able to read `composer.json` or entry-point ASTs on the live server, detect missing `type: "path"` repositories or missing `require_once` targets, and autonomously `git clone` or deploy those shared libraries from the secure GitHub vault directly onto the server to reconstruct the physical dependencies.
   
2. **`ComposerIntegrityValidation` (Enterprise Tier):**
   Ugondu must automatically run `composer dump-autoload` or validate the presence of all PSR-4 namespaces mapped in `composer.json` before certifying a repair as complete.

> **Engineering Action Required Today:** The missing `platform-core` repository must be manually deployed to the `/home/ujomorco/domains/platform-core` directory on the server, and `composer install` must be re-run on the affected subdomains to regenerate the symlinked path repositories.
