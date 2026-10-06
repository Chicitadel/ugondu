# 🏗️ Ugondu Migration Handover & Post-Mortem

**Target Environment:** \
y210.whpservers.com\ (DirectAdmin)
**Original Environment:** cPanel
**Tenant:** \irroofers.eu\ (Federated 33-Subdomain System)

This document serves as the formal engineering handover detailing the structural anomalies introduced during the cPanel-to-DirectAdmin migration and the autonomous repairs executed by the Ugondu Engine. The development team must use this to adjust the unified repository for deploy-anywhere compatibility.

---

## 🚨 1. ZDD Topology Fracture (DirectAdmin Migration Artifacts)

### 🔴 The Failure
During the migration, the DirectAdmin transfer tool failed to recognize your Zero-Downtime Deployment (ZDD) symlink structure (\public_html\ -> \current\ -> \eleases/release_YYYY...\). 
Instead of preserving the links, it:
1. Renamed your active domain directories to \_bkup\ (e.g., \pi.airroofers.eu_bkup\).
2. Created empty skeleton directories in their place.
3. Completely detached the web server's routing from the application logic.

### 🟢 The Ugondu Repair (\TopologyRepair\)
Ugondu autonomously traversed all 33 subdomains and:
* Deleted the dummy 0-byte directories.
* Restored the \_bkup\ directories to active status.
* Re-linked \current\ to the latest timestamped \elease_\ folder.
* Re-linked \public_html\ to \current\.

> **Engineering Action Required:** The deployment pipeline (e.g., Envoy, Deployer, or GitHub Actions) must be updated. DirectAdmin rigidly expects the \public_html\ directory to exist as the Document Root. Ensure your pipeline gracefully creates the \public_html -> current\ symlink post-deployment without deleting the entire domain root.

---

## 🚨 2. Hardcoded Framework Paths (\Mandatag\ Framework)

### 🔴 The Failure
Subdomains utilizing the \Mandatag\ framework (like \license.airroofers.eu\) returned a \500 Internal Server Error\ with \missing_environment_variable: DB_HOST\. 

The root cause was isolated to \public_html/Mandatag/Bootstrap/env.php\:
\\\php
$candidateEnvPaths = array_filter([
    dirname(dirname($realRoot)) . '/.mandatag.env',
    __DIR__ . '/../../../.mandatag.env',
    '/home2/ujomorco/domains/license.airroofers.eu/current/.mandatag.env',
    '/home2/ujomorco/domains/license.airroofers.eu/.mandatag.env',
    // ...
]);
\\\
1. **Host Change:** The migration moved the tenant from \/home2/ujomorco\ to \/home/ujomorco\. The hardcoded paths failed instantly.
2. **Symlink Traversal Depth:** The relative \dirname()\ paths did not resolve to the domain root because DirectAdmin's nested ZDD structure altered the logical path depth.

### 🟢 The Ugondu Repair (\FrontendValidation\ & Fleet Patch)
Ugondu utilized a fleet-wide SSH patch script to inject dynamic, environment-agnostic \DOCUMENT_ROOT\ resolution directly into the \nv.php\ file on the live server.
\\\php
/* UGONDU_UNIVERSAL_DOCROOT_PATCH */
$serverDocRoot = $SERVER["DOCUMENT_ROOT"] ?? "";
if (!empty($serverDocRoot)) {
    $candidateEnvPaths[] = dirname($serverDocRoot) . "/.mandatag.env";
    $candidateEnvPaths[] = dirname($serverDocRoot) . "/.env";
}
\\\
This successfully brought the \license\ system back online (HTTP 302 Found).

> **Engineering Action Required:** The \Mandatag\ framework code in your Git repository must be updated. Remove the hardcoded \/home2/\ paths. Replace them with the \\['DOCUMENT_ROOT']\ relative resolution shown above to ensure the framework can boot on any VPS, AWS, or Shared Host universally.

---

## 🚨 3. Missing Hidden Files & \shared/\ Directories

### 🔴 The Failure
The DirectAdmin migration tool **did not copy** hidden files (like \.env\) or directories that were outside the \public_html\ boundary but essential to the architecture (like the ZDD \shared/\ folder).
For instance, \products.airroofers.eu\ currently has no \.env\ file anywhere in its hierarchy.

### 🟢 The Ugondu Repair
Where backups were found in the root directory (e.g., \illing\ and \license\), Ugondu autonomously copied them into the \current/\ active releases. 

> **Engineering Action Required:** 
> 1. You must manually upload the missing \.env\ configurations for the remaining subdomains from your internal vault.
> 2. Ensure \DB_HOST\ in these \.env\ files is updated to \localhost\ (or the new DirectAdmin DB cluster IP), as the old \db-cluster.airroofers.internal\ no longer resolves on this host.

---

## 🎯 Universal Validation Capability
To ensure this never happens undetected again, the **\FrontendValidation\** capability has been formally added to the \Ugondu\ repository. Ugondu will now universally curl endpoints post-deployment or repair, detect structural 500s or missing DB configurations, and orchestrate the necessary \ConfigurationRepair\.
