<!--
******************************************************************************
 * Project        : EAORCS — Enterprise Assurance, Orchestration & Certification System
 * Module         : Commercial Documentation & Consumer Protection
 * File           : Consumer_Product_Information_Sheet.md
 * Version        : 1.0.0-draft
 * Author         : Ignatus Chika Ujomor | Founder & System Architect
 * Organization   : AIR ROOFERS (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-09-25
 * Last Modified  : 2026-09-25
 * Classification : COMMERCIAL_AUTHORITY | DRAFT — PENDING LEGAL REVIEW
 *
 * Governance:
 * - Corporate Governance Baseline — Pending Formal Legal Review
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - French Consumer Code (Code de la consommation, Art. L. 221-5 amended June 2026,
 *   L. 221-18, L. 221-25, L. 221-28, L. 224-25-1 et seq., L. 616-1, R. 616-1)
 * - French Civil Code (Art. 1641 et seq. — Garantie des vices cachés)
 * - Directive 2011/83/EU (Consumer Rights Directive)
 * - Directive (EU) 2019/770 (Digital Content and Digital Services Directive)
 *
 * Signatures:
 * - Architecture Authority: Ignatus Chika Ujomor
 * - Corporate Authority: AIR ROOFERS SASU
 * - Governance Authority: Air Roofers Corporate Governance
 * - Legal Authority: PENDING FORMAL REVIEW (Gate 7 — Human Legal Review)
 *
 * Copyright (c) 2025-2026 AIR ROOFERS. All Rights Reserved.
 * Moral rights reserved by Ignatus Chika Ujomor under French CPI Art. L. 121-1.
******************************************************************************
-->

# Fiche d'Information Précontractuelle Consommateur  
## Standardized Consumer Pre-Contractual Information Sheet

**Product:** EAORCS — Enterprise Assurance, Orchestration & Certification System  
**Legal Framework:** Article L. 221-5 du Code de la consommation (modifié en juin 2026)  
**Vendor:** AIR ROOFERS (Société par actions simplifiée à associé unique)  
**Share Capital:** 500,00 €  
**Registered Office:** 229 rue Saint-Honoré, 75001 Paris, France  
**RCS:** 943 432 534 R.C.S. Paris | **TVA Intracommunautaire:** FR89943432534  
**Customer Contact:** `support@airroofers.eu` | `withdrawals@airroofers.eu`  
**Document Version:** 1.0.0-draft  
**Status:** DRAFT — PENDING FORMAL LEGAL REVIEW (Gate 7 — Human Legal Review)

---

> [!IMPORTANT]
> Conformément à l'article L. 221-5 du Code de la consommation français, la présente fiche récapitule de manière lisible et compréhensible l'ensemble des informations précontractuelles obligatoires fournies au consommateur préalablement à la conclusion de tout contrat de fourniture de contenu ou de service numérique.

---

## 1. Caractéristiques Essentielles du Produit / Service Numérique
*(Essential Characteristics)*

| Élément | Description |
|:---|:---|
| **Désignation du Logiciel** | **EAORCS** — Enterprise Assurance, Orchestration & Certification System |
| **Nature de la Prestation** | Logiciel d'assurance technique, de vérification continue et d'orchestration de conformité, fourni sous forme de contenu numérique téléchargeable (client léger) et/ou de services numériques d'attestation et de télémétrie. |
| **Éditions Disponibles** | COMMUNITY (gratuite), DEVELOPER, PROFESSIONAL, BUSINESS. *(Les offres ENTERPRISE et SOVEREIGN sont réservées aux professionnels et personnes morales).* |
| **Fonctionnalités Principales** | Analyse de conformité d'artefacts logiciels, génération de preuves cryptographiques, vérification de conformité aux standards de gouvernance, interface en ligne de commande (CLI) et journalisation sécurisée. |

---

## 2. Prix et Conditions de Paiement
*(Price and Payment Terms)*

| Élément | Modalités |
|:---|:---|
| **Prix Total** | Exprimé en **Euros (€) Toutes Taxes Comprises (TTC)** au taux de TVA légalement applicable (TVA française 20 % ou taux du pays de résidence dans l'UE). Le montant total TTC est affiché avant toute validation de commande. |
| **Modèle de Facturation** | Selon l'édition souscrite : abonnement mensuel avec tacite reconduction, abonnement annuel, ou licence d'évaluation sans frais. |
| **Frais Supplémentaires** | Aucun frais de livraison ou de télécommunication spécifique n'est facturé par Air Roofers au-delà du coût standard d'accès à Internet. |
| **Moyens de Paiement** | Carte bancaire (Visa, Mastercard, Carte Bancaire via prestataire certifié PCI-DSS Level 1) et prélèvement SEPA. |
| **Autorité de Facturation** | AeroBill (`billing.airroofers.eu`), autorité commerciale et fiscale exclusive d'Air Roofers. |

---

## 3. Exigences Techniques, Compatibilité et Interopérabilité
*(Technical Requirements, Compatibility & Interoperability)*

| Paramètre | Spécification Requise |
|:---|:---|
| **Systèmes d'Exploitation** | Linux (noyau 5.4+), macOS (12.0+), Windows 10/11 (x64) |
| **Environnement d'Exécution** | Node.js runtime (v20+ LTS recommandé) |
| **Connectivité Réseau** | Accès Internet sortant (HTTPS/TLS 1.3) vers `license.airroofers.eu` pour l'activation et la vérification des droits (sauf édition déconnectée). |
| **Mesures Techniques de Protection (MTP)** | Le logiciel intègre un mécanisme cryptographique de vérification de licence via jeton d'entitlement Mandatag (`license.airroofers.eu`). Aucun dispositif de surveillance intrusive ou d'accès aux fichiers personnels de l'utilisateur n'est déployé. |

---

## 4. Droit Légal de Rétractation
*(Statutory Right of Withdrawal)*

Conformément aux articles L. 221-18 et suivants du Code de la consommation :

### 4.1 Règle Générale
Le consommateur dispose d'un délai de **quatorze (14) jours calendaires** à compter de la conclusion du contrat pour exercer son droit de rétractation sans avoir à motiver sa décision.

### 4.2 Fourniture de Contenu Numérique Indépendant (Article L. 221-28, 13°)
Pour le téléchargement d'un contenu numérique non fourni sur un support matériel (binaire logiciel autonome, clé d'activation) :
- Le droit de rétractation ne peut être exercé si l'exécution a commencé avec **l'accord préalable exprès** du consommateur et son **renoncement exprès à son droit de rétractation** ;
- En cochant la case dédiée lors de la commande, le consommateur renonce à son droit de rétractation dès la survenance de l'Événement d'Activation ou le début du téléchargement.

### 4.3 Fourniture de Service Numérique Continu (Article L. 221-25)
Pour la souscription à un service numérique continu (accès plateforme hébergée, flux de vérification) :
- Le consommateur peut demander l'exécution immédiate du service avant la fin des 14 jours ;
- Il conserve la faculté de se rétracter pendant les 14 jours ; en ce cas, un montant proportionnel au service rendu jusqu'à la notification de rétractation reste dû (*pro rata temporis*).

### 4.4 Modalités d'Exercice
Pour exercer ce droit, le consommateur notifie sa décision par déclaration dénuée d'ambiguïté à `withdrawals@airroofers.eu` ou par courrier postal à :  
**AIR ROOFERS SASU — Service Rétractations, 229 rue Saint-Honoré, 75001 Paris, France**.  
Le formulaire type de rétractation figure à la fin de la présente fiche et dans la notice `Consumer_Withdrawal_Notice.md`.

---

## 5. Garanties Légales Obligatoires
*(Mandatory Legal Guarantees)*

Conformément à la réglementation française, Air Roofers est tenue des garanties légales suivantes :

### 5.1 Garantie Légale de Conformité des Contenus et Services Numériques
*(Articles L. 224-25-1 à L. 224-25-31 du Code de la consommation)*
- Le consommateur a droit à la mise en œuvre de la garantie légale de conformité en cas d'apparition d'un défaut de conformité durant la période de fourniture du contenu ou du service numérique.
- Le consommateur est en droit d'exiger la mise en conformité du contenu ou service numérique sans frais, dans un délai raisonnable (n'excédant pas 30 jours), et sans inconvénient majeur pour lui.
- Si la mise en conformité est impossible ou entraîne des coûts disproportionnés, ou si elle n'a pas été effectuée dans le délai imparti, le consommateur a droit à une réduction de prix ou à la résolution du contrat avec remboursement des sommes versées.
- Air Roofers s'engage à fournir les mises à jour nécessaires au maintien de la conformité du logiciel (mises à jour de sécurité et correctifs) pendant la durée normale prévisible pour ce type de logiciel ou pendant la durée de l'abonnement.

### 5.2 Garantie Légale des Vices Cachés
*(Articles 1641 à 1649 du Code civil)*
Le consommateur peut décider de mettre en œuvre la garantie contre les défauts cachés de la chose vendue au sens de l'article 1641 du Code civil. Dans cette hypothèse, il peut choisir entre la résolution de la vente ou une réduction du prix de vente conformément à l'article 1644 du Code civil.

---

## 6. Durée du Contrat, Résiliation et Renouvellement
*(Duration, Renewal and Termination)*

- **Abonnements mensuels :** Durée initiale d'un mois, renouvelables par tacite reconduction mensuelle. Résiliables à tout moment depuis l'espace client avec effet à la fin de la période mensuelle en cours.
- **Abonnements annuels :** Durée ferme d'un an, renouvelables tacitement par périodes annuelles. Résiliables avec préavis de 30 jours avant l'échéance.
- Conformément à l'article L. 215-1 du Code de la consommation, les conditions de reconduction et d'information préalable à l'échéance sont respectées pour les contrats à durée déterminée avec clause de reconduction tacite.

---

## 7. Réclamations et Médiation de la Consommation
*(Customer Complaints and Consumer Mediation)*

En cas de litige, le consommateur s'adresse en priorité au service client d'Air Roofers :  
**Email :** `support@airroofers.eu`  
**Courrier :** AIR ROOFERS SASU, 229 rue Saint-Honoré, 75001 Paris, France  

Si la réclamation n'a pas abouti à un règlement amiable dans un délai de deux (2) mois, le consommateur peut recourir gratuitement au médiateur de la consommation désigné par Air Roofers conformément aux articles L. 616-1 et R. 616-1 du Code de la consommation :

- **Médiateur Désigné :** `[CONSUMER_MEDIATOR_NAME]`
- **Entité de Médiation :** `[MEDIATOR_ENTITY]`
- **Saisine en Ligne :** `[MEDIATOR_WEBSITE]`
- **Adresse Postale :** `[MEDIATOR_ADDRESS]`

*(Les mentions entre crochets seront complétées avec les coordonnées officielles du médiateur accrédité dès finalisation de l'adhésion avant toute mise en vente aux consommateurs).*

---

## 8. Formulaire Type de Rétractation
*(Standard Withdrawal Form)*

```
--------------------------------------------------------------------------------
FORMULAIRE DE RÉTRACTATION (Code de la consommation, Art. R. 221-1)

À l'attention de :
AIR ROOFERS SASU — Service Rétractations
229 rue Saint-Honoré, 75001 Paris, France
Courriel : withdrawals@airroofers.eu

Je / Nous (*) vous notifie / notifions (*) par la présente ma / notre (*) rétractation
du contrat portant sur la vente du produit / la prestation de service ci-dessous :

- Produit / Service : EAORCS — Édition : ________________________________________
- Numéro de commande (Order ID) : _______________________________________________
- Commandé le (*) / Reçu le (*) : _______________________________________________
- Nom du (des) consommateur(s) : ________________________________________________
- Adresse du (des) consommateur(s) : ____________________________________________
  _______________________________________________________________________________
- Date : ____ / ____ / ________
- Signature du (des) consommateur(s) (en cas de notification sur papier) :

_____________________________________________

(*) Rayez la mention inutile.
--------------------------------------------------------------------------------
```

---

**AIR ROOFERS**  
Société par actions simplifiée (Société à associé unique) au capital de 500,00 €  
229 rue Saint-Honoré, 75001 Paris, France  
RCS Paris 943 432 534 | TVA : FR89943432534  

---
*Classification : COMMERCIAL_AUTHORITY | DRAFT — PENDING FORMAL LEGAL REVIEW*  
*Document d'information précontractuelle — Tous droits réservés AIR ROOFERS (c) 2025–2026*
