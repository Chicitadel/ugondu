const fs = require('fs');
const path = require('path');

const dir = 'D:\\ujomor-platform\\products\\ugondu\\server\\shared\\locales';
const LANGS = ['en', 'fr', 'es', 'de', 'it'];
const cat = {}; // key -> [en, fr, es, de, it]
const add = (k, en, fr, es, de, it) => { cat[k] = [en, fr, es, de, it]; };

// ── Offline licence / migration / identity ─────────────────────────────────
add('messages.error.manifest_schema_invalid', 'Offline manifest failed schema validation.', 'Le manifeste hors ligne a échoué à la validation du schéma.', 'El manifiesto sin conexión no superó la validación del esquema.', 'Das Offline-Manifest hat die Schemaprüfung nicht bestanden.', 'Il manifesto offline non ha superato la validazione dello schema.');
add('messages.error.manifest_expired', 'Offline manifest has expired.', 'Le manifeste hors ligne a expiré.', 'El manifiesto sin conexión ha caducado.', 'Das Offline-Manifest ist abgelaufen.', 'Il manifesto offline è scaduto.');
add('messages.error.fips_validation_failed', 'FIPS signature validation of the offline manifest failed.', 'La validation FIPS de la signature du manifeste hors ligne a échoué.', 'La validación FIPS de la firma del manifiesto sin conexión falló.', 'Die FIPS-Signaturprüfung des Offline-Manifests ist fehlgeschlagen.', 'La validazione FIPS della firma del manifesto offline non è riuscita.');
add('ui.responses.authorization_insufficient_for_operation_on_t', 'Authorization is insufficient for the requested operation on target {ctx_target}.', "L'autorisation est insuffisante pour l'opération demandée sur la cible {ctx_target}.", 'La autorización es insuficiente para la operación solicitada en el destino {ctx_target}.', 'Die Berechtigung reicht für den angeforderten Vorgang auf dem Ziel {ctx_target} nicht aus.', "L'autorizzazione non è sufficiente per l'operazione richiesta sulla destinazione {ctx_target}.");
add('messages.error.invalid_config', 'Invalid migration configuration.', 'Configuration de migration invalide.', 'Configuración de migración no válida.', 'Ungültige Migrationskonfiguration.', 'Configurazione di migrazione non valida.');
add('messages.error.invalid_vhosts_count', 'Virtual host count must not be negative.', "Le nombre d'hôtes virtuels ne doit pas être négatif.", 'El número de hosts virtuales no puede ser negativo.', 'Die Anzahl der virtuellen Hosts darf nicht negativ sein.', 'Il numero di host virtuali non può essere negativo.');
add('messages.error.invalid_db_size', 'Database size must not be negative.', 'La taille de la base de données ne doit pas être négative.', 'El tamaño de la base de datos no puede ser negativo.', 'Die Datenbankgröße darf nicht negativ sein.', 'La dimensione del database non può essere negativa.');
add('messages.error.invalid_oidc_client_id', 'OIDC client ID is required.', "L'identifiant client OIDC est obligatoire.", 'El ID de cliente OIDC es obligatorio.', 'Die OIDC-Client-ID ist erforderlich.', "L'ID client OIDC è obbligatorio.");
add('messages.error.invalid_oidc_client_secret', 'OIDC client secret is required.', 'Le secret client OIDC est obligatoire.', 'El secreto de cliente OIDC es obligatorio.', 'Das OIDC-Client-Secret ist erforderlich.', 'Il segreto client OIDC è obbligatorio.');
add('messages.error.invalid_oidc_issuer_url', 'OIDC issuer must be a valid URL.', "L'émetteur OIDC doit être une URL valide.", 'El emisor OIDC debe ser una URL válida.', 'Der OIDC-Aussteller muss eine gültige URL sein.', "L'emittente OIDC deve essere un URL valido.");
add('messages.error.invalid_oidc_redirect_url', 'OIDC redirect URI must be a valid URL.', "L'URI de redirection OIDC doit être une URL valide.", 'El URI de redirección OIDC debe ser una URL válida.', 'Der OIDC-Redirect-URI muss eine gültige URL sein.', "L'URI di reindirizzamento OIDC deve essere un URL valido.");
add('messages.error.invalid_saml_entity_id', 'SAML entity ID is required.', "L'identifiant d'entité SAML est obligatoire.", 'El ID de entidad SAML es obligatorio.', 'Die SAML-Entitäts-ID ist erforderlich.', "L'ID entità SAML è obbligatorio.");
add('messages.error.invalid_saml_sso_url', 'SAML SSO URL must be a valid URL.', "L'URL SSO SAML doit être une URL valide.", 'La URL de SSO SAML debe ser una URL válida.', 'Die SAML-SSO-URL muss eine gültige URL sein.', "L'URL SSO SAML deve essere un URL valido.");
add('messages.error.invalid_saml_cert', 'SAML X.509 certificate is required.', 'Le certificat X.509 SAML est obligatoire.', 'El certificado X.509 de SAML es obligatorio.', 'Das SAML-X.509-Zertifikat ist erforderlich.', 'Il certificato X.509 SAML è obbligatorio.');
add('messages.error.missing_oidc_token', 'OIDC token is missing.', 'Le jeton OIDC est manquant.', 'Falta el token OIDC.', 'Das OIDC-Token fehlt.', 'Il token OIDC è mancante.');
add('messages.error.missing_saml_assertion', 'SAML assertion is missing.', "L'assertion SAML est manquante.", 'Falta la aserción SAML.', 'Die SAML-Assertion fehlt.', "L'asserzione SAML è mancante.");

// ── SCIM adapters ───────────────────────────────────────────────────────────
const scim = {
  en: { u: 'user', g: 'group', creating: 'creating', updating: 'updating', deleting: 'deleting', getting: 'retrieving', fmt: (p, v, n) => `${p} SCIM: ${v} ${n} {id}` },
  fr: { u: "l'utilisateur", g: 'le groupe', creating: 'création de', updating: 'mise à jour de', deleting: 'suppression de', getting: 'récupération de', fmt: (p, v, n) => `${p} SCIM : ${v} ${n} {id}` },
  es: { u: 'usuario', g: 'grupo', creating: 'creando', updating: 'actualizando', deleting: 'eliminando', getting: 'obteniendo', fmt: (p, v, n) => `${p} SCIM: ${v} ${n} {id}` },
  de: { u: 'Benutzer', g: 'Gruppe', creating: 'Erstelle', updating: 'Aktualisiere', deleting: 'Lösche', getting: 'Rufe ab:', fmt: (p, v, n) => `${p} SCIM: ${v} ${n} {id}` },
  it: { u: "l'utente", g: 'il gruppo', creating: 'creazione di', updating: 'aggiornamento di', deleting: 'eliminazione di', getting: 'recupero di', fmt: (p, v, n) => `${p} SCIM: ${v} ${n} {id}` },
};
for (const [prov, label] of [['entraid', 'Entra ID'], ['okta', 'Okta']]) {
  for (const [verbKey, verbName] of [['creating', 'creating'], ['updating', 'updating'], ['deleting', 'deleting'], ['getting', 'getting']]) {
    for (const [noun, nk] of [['user', 'u'], ['group', 'g']]) {
      const row = LANGS.map(l => scim[l].fmt(label, scim[l][verbKey], scim[l][nk]));
      add(`${prov}.scim.${verbName}_${noun}`, ...row);
    }
  }
}

// ── URRE / execution kernel ─────────────────────────────────────────────────
add('messages.error.invalid_deployment_context', 'Invalid deployment context.', 'Contexte de déploiement invalide.', 'Contexto de despliegue no válido.', 'Ungültiger Bereitstellungskontext.', 'Contesto di distribuzione non valido.');
add('messages.error.invalid_rollback_event', 'Invalid rollback event identifier.', "Identifiant d'événement de restauration invalide.", 'Identificador de evento de reversión no válido.', 'Ungültige Rollback-Ereigniskennung.', 'Identificatore evento di rollback non valido.');
add('messages.error.checkpoint_save_failed', 'Failed to save checkpoint {checkpointId}: {error}', "Échec de l'enregistrement du point de contrôle {checkpointId} : {error}", 'No se pudo guardar el punto de control {checkpointId}: {error}', 'Prüfpunkt {checkpointId} konnte nicht gespeichert werden: {error}', 'Impossibile salvare il checkpoint {checkpointId}: {error}');
add('messages.system.checkpoint_saved', 'Checkpoint {checkpointId} saved ({size} bytes).', 'Point de contrôle {checkpointId} enregistré ({size} octets).', 'Punto de control {checkpointId} guardado ({size} bytes).', 'Prüfpunkt {checkpointId} gespeichert ({size} Bytes).', 'Checkpoint {checkpointId} salvato ({size} byte).');
add('messages.error.checkpoint_storage_endpoint_not_configured', 'providerStorageEndpoint is not configured for Enterprise/Sovereign tier.', "providerStorageEndpoint n'est pas configuré pour le niveau Enterprise/Sovereign.", 'providerStorageEndpoint no está configurado para el nivel Enterprise/Sovereign.', 'providerStorageEndpoint ist für die Stufe Enterprise/Sovereign nicht konfiguriert.', 'providerStorageEndpoint non è configurato per il livello Enterprise/Sovereign.');
add('messages.error.action_execution_failed', "Execution of action '{actionType}' failed: {error}", "L'exécution de l'action « {actionType} » a échoué : {error}", "Falló la ejecución de la acción '{actionType}': {error}", "Die Ausführung der Aktion '{actionType}' ist fehlgeschlagen: {error}", "L'esecuzione dell'azione '{actionType}' non è riuscita: {error}");
add('messages.system.action_executed', "Action '{actionType}' executed in {durationMs} ms.", "Action « {actionType} » exécutée en {durationMs} ms.", "Acción '{actionType}' ejecutada en {durationMs} ms.", "Aktion '{actionType}' in {durationMs} ms ausgeführt.", "Azione '{actionType}' eseguita in {durationMs} ms.");
add('messages.error.unknown_action_type', "Unknown action type '{actionType}'. Must be one of: {allowed}", "Type d'action inconnu « {actionType} ». Valeurs autorisées : {allowed}", "Tipo de acción desconocido '{actionType}'. Debe ser uno de: {allowed}", "Unbekannter Aktionstyp '{actionType}'. Zulässig sind: {allowed}", "Tipo di azione sconosciuto '{actionType}'. Deve essere uno tra: {allowed}");

// ── Plugin gate ─────────────────────────────────────────────────────────────
add('ui.responses.plugin_requires_edition_tenant_has', "Plugin '{plugin_pluginId}' requires the {plugin_minimumEdition} edition or higher; the tenant has the {tenantEdition} edition.", "Le plugin « {plugin_pluginId} » requiert l'édition {plugin_minimumEdition} ou supérieure ; le locataire dispose de l'édition {tenantEdition}.", "El plugin '{plugin_pluginId}' requiere la edición {plugin_minimumEdition} o superior; el inquilino tiene la edición {tenantEdition}.", "Das Plugin '{plugin_pluginId}' erfordert die Edition {plugin_minimumEdition} oder höher; der Mandant verfügt über die Edition {tenantEdition}.", "Il plugin '{plugin_pluginId}' richiede l'edizione {plugin_minimumEdition} o superiore; il tenant dispone dell'edizione {tenantEdition}.");
add('ui.responses.plugin_requires_capabilities_not_entitled', "Plugin '{plugin_pluginId}' requires capabilities that are not entitled: {missingCaps_join______}.", "Le plugin « {plugin_pluginId} » requiert des capacités non autorisées : {missingCaps_join______}.", "El plugin '{plugin_pluginId}' requiere capacidades sin derecho de uso: {missingCaps_join______}.", "Das Plugin '{plugin_pluginId}' erfordert nicht lizenzierte Funktionen: {missingCaps_join______}.", "Il plugin '{plugin_pluginId}' richiede funzionalità non autorizzate: {missingCaps_join______}.");
add('ui.responses.plugin_depends_on_missing_plugins', "Plugin '{plugin_pluginId}' depends on missing plugins: {missingDeps_join______}.", "Le plugin « {plugin_pluginId} » dépend de plugins manquants : {missingDeps_join______}.", "El plugin '{plugin_pluginId}' depende de plugins ausentes: {missingDeps_join______}.", "Das Plugin '{plugin_pluginId}' hängt von fehlenden Plugins ab: {missingDeps_join______}.", "Il plugin '{plugin_pluginId}' dipende da plugin mancanti: {missingDeps_join______}.");

// ── UPPIE provider adapters (per-operation failures) ────────────────────────
const ops = {
  en: { attach: 'attach the policy', detach: 'detach the policy', update: 'update the policy', clone: 'clone the policy', retire: 'retire the policy', restore: 'restore the policy', reconcile: 'reconcile the policy' },
  fr: { attach: 'attacher la politique', detach: 'détacher la politique', update: 'mettre à jour la politique', clone: 'cloner la politique', retire: 'retirer la politique', restore: 'restaurer la politique', reconcile: 'réconcilier la politique' },
  es: { attach: 'adjuntar la política', detach: 'desvincular la política', update: 'actualizar la política', clone: 'clonar la política', retire: 'retirar la política', restore: 'restaurar la política', reconcile: 'conciliar la política' },
  de: { attach: 'Die Richtlinie konnte nicht angehängt werden', detach: 'Die Richtlinie konnte nicht getrennt werden', update: 'Die Richtlinie konnte nicht aktualisiert werden', clone: 'Die Richtlinie konnte nicht geklont werden', retire: 'Die Richtlinie konnte nicht außer Dienst gestellt werden', restore: 'Die Richtlinie konnte nicht wiederhergestellt werden', reconcile: 'Die Richtlinie konnte nicht abgeglichen werden' },
  it: { attach: 'collegare la policy', detach: 'scollegare la policy', update: 'aggiornare la policy', clone: 'clonare la policy', retire: 'ritirare la policy', restore: 'ripristinare la policy', reconcile: 'riconciliare la policy' },
};
const failWith = (l, op, tail) => {
  const o = ops[l][op];
  if (l === 'en') return `Failed to ${o}${tail}`;
  if (l === 'fr') return `Échec : impossible de ${o}${tail}`;
  if (l === 'es') return `Error: no se pudo ${o}${tail}`;
  if (l === 'de') return `${o}${tail}`;
  return `Impossibile ${o}${tail}`;
};
const family = (prefixFn, opsList, tail) => {
  for (const op of opsList) add(prefixFn(op), ...LANGS.map(l => failWith(l, op, tail)));
};
family(op => `azure.rbac.${op}_failed`, ['attach', 'detach', 'update', 'clone', 'retire', 'restore'], ': {message}');
family(op => `gcp.iam.${op}_error`, ['attach', 'detach', 'update', 'clone', 'retire', 'restore'], ': {message}');
family(op => `linux_acl.${op}.failed`, ['attach', 'detach', 'update', 'clone', 'retire', 'restore'], ': {error}');
family(op => `uppie.adapter.k8s.${op}_error`, ['attach', 'detach', 'update', 'clone', 'retire', 'restore', 'reconcile'], '.');
add('uppie.adapter.k8s.restore_no_reference', 'Restore failed: the retirement certificate has no rollback reference.', "Échec de la restauration : le certificat de retrait ne contient aucune référence de restauration.", 'Error al restaurar: el certificado de retiro no tiene referencia de reversión.', 'Wiederherstellung fehlgeschlagen: Das Außerbetriebnahme-Zertifikat enthält keine Rollback-Referenz.', 'Ripristino non riuscito: il certificato di ritiro non contiene un riferimento di rollback.');
add('linux_acl.attach.no_entries', 'No ACL entries to apply.', 'Aucune entrée ACL à appliquer.', 'No hay entradas ACL que aplicar.', 'Keine ACL-Einträge zum Anwenden.', 'Nessuna voce ACL da applicare.');

// cPanel
const cp = (k, en, fr, es, de, it) => add(`cpanel.${k}`, en, fr, es, de, it);
cp('attach.fail', 'Failed to attach', "Échec de l'attachement", 'Error al adjuntar', 'Anhängen fehlgeschlagen', 'Collegamento non riuscito');
cp('attach.err', 'Error: {message}', 'Erreur : {message}', 'Error: {message}', 'Fehler: {message}', 'Errore: {message}');
cp('detach.fail', 'Failed to detach', 'Échec du détachement', 'Error al desvincular', 'Trennen fehlgeschlagen', 'Scollegamento non riuscito');
cp('detach.err', 'Error: {message}', 'Erreur : {message}', 'Error: {message}', 'Fehler: {message}', 'Errore: {message}');
cp('update.fail', 'Failed to update', 'Échec de la mise à jour', 'Error al actualizar', 'Aktualisierung fehlgeschlagen', 'Aggiornamento non riuscito');
cp('update.err', 'Error: {message}', 'Erreur : {message}', 'Error: {message}', 'Fehler: {message}', 'Errore: {message}');
cp('clone.read', 'Read failed', 'Échec de la lecture', 'Error de lectura', 'Lesen fehlgeschlagen', 'Lettura non riuscita');
cp('clone.write', 'Write failed', "Échec de l'écriture", 'Error de escritura', 'Schreiben fehlgeschlagen', 'Scrittura non riuscita');
cp('clone.err', 'Error: {message}', 'Erreur : {message}', 'Error: {message}', 'Fehler: {message}', 'Errore: {message}');
cp('retire.fail', 'Failed to retire', 'Échec du retrait', 'Error al retirar', 'Außerbetriebnahme fehlgeschlagen', 'Ritiro non riuscito');
cp('retire.err', 'Error: {message}', 'Erreur : {message}', 'Error: {message}', 'Fehler: {message}', 'Errore: {message}');
cp('restore.unsupported', 'Restore is not supported by the cPanel provider', "La restauration n'est pas prise en charge par le fournisseur cPanel", 'El proveedor cPanel no admite la restauración', 'Die Wiederherstellung wird vom cPanel-Anbieter nicht unterstützt', 'Il ripristino non è supportato dal provider cPanel');

// ── Analyzer / simulation ───────────────────────────────────────────────────
add('messages.warning.wildcard_action_and_resource', 'Wildcard action and wildcard resource grant unrestricted access.', "Une action générique et une ressource générique accordent un accès illimité.", 'La acción comodín y el recurso comodín otorgan acceso sin restricciones.', 'Platzhalter-Aktion und Platzhalter-Ressource gewähren uneingeschränkten Zugriff.', "Azione jolly e risorsa jolly concedono accesso senza restrizioni.");
add('messages.warning.wildcard_action', 'Wildcard action grants every operation on the resource.', "Une action générique autorise toutes les opérations sur la ressource.", 'La acción comodín concede todas las operaciones sobre el recurso.', 'Eine Platzhalter-Aktion gewährt jeden Vorgang auf der Ressource.', "Un'azione jolly concede ogni operazione sulla risorsa.");
add('messages.warning.wildcard_resource', 'Wildcard resource applies the action to every resource.', "Une ressource générique applique l'action à toutes les ressources.", 'El recurso comodín aplica la acción a todos los recursos.', 'Eine Platzhalter-Ressource wendet die Aktion auf alle Ressourcen an.', "Una risorsa jolly applica l'azione a tutte le risorse.");
add('ui.responses.wildcard_resource_scope_is_forbidden', "Wildcard resource scope '{rule_resource_scope}' is forbidden. LeastPrivilegeCompiler must reduce resource scope before simulation.", "La portée de ressource générique « {rule_resource_scope} » est interdite. LeastPrivilegeCompiler doit réduire la portée avant la simulation.", "El ámbito de recurso comodín '{rule_resource_scope}' está prohibido. LeastPrivilegeCompiler debe reducir el ámbito antes de la simulación.", "Der Platzhalter-Ressourcenbereich '{rule_resource_scope}' ist unzulässig. LeastPrivilegeCompiler muss den Bereich vor der Simulation einschränken.", "L'ambito di risorsa jolly '{rule_resource_scope}' è vietato. LeastPrivilegeCompiler deve ridurre l'ambito prima della simulazione.");
add('ui.responses.wildcard_action_is_forbidden_all_operations_m', 'Wildcard action is forbidden: all operations must be listed explicitly.', "L'action générique est interdite : toutes les opérations doivent être listées explicitement.", 'La acción comodín está prohibida: todas las operaciones deben enumerarse explícitamente.', 'Platzhalter-Aktionen sind unzulässig: Alle Vorgänge müssen explizit aufgeführt werden.', "L'azione jolly è vietata: tutte le operazioni devono essere elencate esplicitamente.");
add('ui.responses.deny_rule_submitted_to_adapter_which', "DENY rule submitted to adapter '{this_adapter_providerType}', which does not support simulation/DENY. cPanel and similar providers MUST NOT receive DENY rules.", "Règle DENY soumise à l'adaptateur « {this_adapter_providerType} », qui ne prend pas en charge la simulation/DENY. cPanel et les fournisseurs similaires NE DOIVENT PAS recevoir de règles DENY.", "Regla DENY enviada al adaptador '{this_adapter_providerType}', que no admite simulación/DENY. cPanel y proveedores similares NO DEBEN recibir reglas DENY.", "DENY-Regel an den Adapter '{this_adapter_providerType}' übergeben, der Simulation/DENY nicht unterstützt. cPanel und ähnliche Anbieter DÜRFEN KEINE DENY-Regeln erhalten.", "Regola DENY inviata all'adattatore '{this_adapter_providerType}', che non supporta simulazione/DENY. cPanel e provider simili NON DEVONO ricevere regole DENY.");

// ── Fabric providers (recovered originals) ──────────────────────────────────
const P = { aws: 'AWS', cpanel: 'cPanel', kubernetes: 'Kubernetes', linux: 'Linux' };
const prov = (name) => [
  `Provisioning ${name[0]} with config:`,
  `Provisionnement de ${name[1]} avec la configuration :`,
  `Aprovisionando ${name[2]} con la configuración:`,
  `Bereitstellung von ${name[3]} mit Konfiguration:`,
  `Provisioning di ${name[4]} con la configurazione:`,
];
const same = (n) => [n, n, n, n, n];
add('messages.system.provisioning_aws_ec2_ecs_lambda_with_config', ...prov(same('AWS EC2/ECS/Lambda')));
add('messages.system.provisioning_aws_rds_dynamodb_with_config', ...prov(same('AWS RDS/DynamoDB')));
add('messages.system.provisioning_cpanel_hosting_account_with_conf', ...prov(['cPanel hosting account', "un compte d'hébergement cPanel", 'una cuenta de hosting cPanel', 'einem cPanel-Hosting-Konto', 'un account di hosting cPanel']));
add('messages.system.provisioning_cpanel_mysql_database_with_confi', ...prov(['cPanel MySQL Database', 'une base de données MySQL cPanel', 'una base de datos MySQL de cPanel', 'einer cPanel-MySQL-Datenbank', 'un database MySQL cPanel']));
add('messages.system.provisioning_kubernetes_deployments_pods_with', ...prov(same('Kubernetes Deployments/Pods')));
add('messages.system.provisioning_kubernetes_statefulsets_for_db_w', ...prov(['Kubernetes StatefulSets for DB', 'Kubernetes StatefulSets pour la base de données', 'Kubernetes StatefulSets para la base de datos', 'Kubernetes StatefulSets für die Datenbank', 'Kubernetes StatefulSets per il database']));
add('messages.system.provisioning_linux_vps_with_config', ...prov(same('Linux VPS')));
add('messages.system.provisioning_linux_mysql_postgresql_with_conf', ...prov(same('Linux MySQL/PostgreSQL')));
for (const [k, n] of Object.entries(P)) {
  add(`messages.system.terminating_${k}_compute_resources`, `Terminating ${n} compute resources:`, `Arrêt des ressources de calcul ${n} :`, `Finalizando recursos de cómputo de ${n}:`, `${n}-Rechenressourcen werden beendet:`, `Terminazione delle risorse di calcolo ${n}:`);
}
add('ui.responses.same_kind_from_different_sources_with_differe', "Same kind '{evidence_i__kind}' from different sources with different hashes", "Même type « {evidence_i__kind} » provenant de sources différentes avec des empreintes différentes", "Mismo tipo '{evidence_i__kind}' de fuentes distintas con hashes distintos", "Gleiche Art '{evidence_i__kind}' aus unterschiedlichen Quellen mit unterschiedlichen Hashes", "Stesso tipo '{evidence_i__kind}' da fonti diverse con hash diversi");

// ── Insert (nested, no overwrite of existing values) ────────────────────────
const setNested = (obj, dotted, value) => {
  const parts = dotted.split('.');
  let o = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) {
      if (o[parts[i]] !== undefined) return false; // flat string collides with a path segment
      o[parts[i]] = {};
    }
    o = o[parts[i]];
  }
  const last = parts[parts.length - 1];
  if (o[last] !== undefined) return false;
  o[last] = value;
  return true;
};
let added = 0, skipped = 0;
LANGS.forEach((lang, idx) => {
  const p = path.join(dir, `${lang}.json`);
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [k, vals] of Object.entries(cat)) {
    if (setNested(obj, k, vals[idx])) added++; else skipped++;
  }
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
});
console.log(`catalog keys=${Object.keys(cat).length}; inserted=${added}; skipped(existing/collision)=${skipped}`);
