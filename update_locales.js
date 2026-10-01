const fs = require('fs');

const enNew = {
  'err_missing_public_key': 'Execution blocked: UGONDU_RECIPE_PUBLIC_KEY environment variable is not configured.',
  'err_signature_invalid': 'Execution blocked: Recipe signature verification failed.',
  'err_passport_required': 'Access denied: A valid delivery passport is required for this operation.',
  'err_passport_rejected': 'Access denied: The delivery passport was rejected by the admission controller.',
  'err_ssrf_blocked': 'Security violation: Request to target address is blocked by SSRF protection policy.',
  'err_invalid_protocol': 'Security violation: Only HTTPS and HTTP protocols are permitted for outbound requests.',
  'cli_deploy_receipt': 'Deploy execution receipt:',
  'cli_deploy_failed': 'Deployment failed:',
  'cli_move_receipt': 'Move execution receipt:',
  'cli_move_failed': 'Move failed:',
  'cli_remediation_receipt': 'Remediation execution receipt:',
  'cli_passport_details': 'Passport details:',
  'cli_emergency_created': 'Emergency passport created:',
  'cli_emergency_failed': 'Emergency passport creation failed:',
  'err_execution_blocked_no_envelope': 'Execution blocked: Missing valid ExecutionEnvelope.',
  'err_execution_blocked_invalid_sig': 'Execution blocked: Invalid ExecutionEnvelope signature format.',
  'err_tenant_id_required': 'Security violation: Tenant ID is required for key resolution. Zero-trust enforced.',
  'err_passport_freshness_failed': 'Delivery passport has failed freshness validation and cannot be used.',
  'err_plugin_entrypoint_not_found': 'Plugin activation failed: Plugin entrypoint not found.',
  'err_plugin_action_rejected': 'Plugin rejected: Action is not in the closed typed-action registry.',
  'err_urre_context_id_mismatch': 'Execution blocked: Context ID mismatch in ExecutionEnvelope.',
  'err_fatal_already_executed': 'Fatal: This recipe has already been successfully executed (replay protection).'
};

const frNew = {
  'err_missing_public_key': 'Exécution bloquée : La variable d\'environnement UGONDU_RECIPE_PUBLIC_KEY n\'est pas configurée.',
  'err_signature_invalid': 'Exécution bloquée : Échec de la vérification de la signature de la recette.',
  'err_passport_required': 'Accès refusé : Un passeport de livraison valide est requis pour cette operération.',
  'err_passport_rejected': 'Accès refusé : Le passeport de livraison a été rejeté par le contrôleur d\'admission.',
  'err_ssrf_blocked': 'Violation de sécurité : La requête vers l\'adresse cible est bloquée par la politique de protection SSRF.',
  'err_invalid_protocol': 'Violation de sécurité : Seuls les protocoles HTTPS et HTTP sont autorisés.',
  'cli_deploy_receipt': 'Reçu d\'exécution du déploiement :',
  'cli_deploy_failed': 'Échec du déploiement :',
  'cli_move_receipt': 'Reçu d\'esecuzione du déplacement :',
  'cli_move_failed': 'Échec du déplacement :',
  'cli_remediation_receipt': 'Reçu d\'exécution de la remédiation :',
  'cli_passport_details': 'Détails du passeport :',
  'cli_emergency_created': 'Passeport d\'urgence créé :',
  'cli_emergency_failed': 'Échec de la création du passeport d\'urgence :',
  'err_execution_blocked_no_envelope': 'Exécution bloquée : ExecutionEnvelope valide manquante.',
  'err_execution_blocked_invalid_sig': 'Exécution bloquée : Format de signature de l\'ExecutionEnvelope invalide.',
  'err_tenant_id_required': 'Violation de sécurité : L\'ID du locataire est requis pour la résolution de la clé. Confiance zéro appliquée.',
  'err_passport_freshness_failed': 'Le passeport de livraison a échoué à la validation de fraîcheur et ne peut pas être utilisé.',
  'err_plugin_entrypoint_not_found': 'Échec de l\'activation du plugin : Point d\'entrée du plugin introuvable.',
  'err_plugin_action_rejected': 'Plugin rejeté : L\'action ne figure pas dans le registre d\'actions typées fermé.',
  'err_urre_context_id_mismatch': 'Exécution bloquée : Incompatibilité de l\'ID de contexte dans l\'ExecutionEnvelope.',
  'err_fatal_already_executed': 'Fatal : Cette recette a déjà été exécutée avec succès.'
};

const deNew = {
  'err_missing_public_key': 'Ausführung blockiert: UGONDU_RECIPE_PUBLIC_KEY Umgebungsvariable ist nicht konfiguriert.',
  'err_signature_invalid': 'Ausführung blockiert: Rezept-Signaturüberprüfung fehlgeschlagen.',
  'err_passport_required': 'Zugriff verweigert: Ein gültiger Lieferpass ist für diese Operation erforderlich.',
  'err_passport_rejected': 'Zugriff verweigert: Der Lieferpass wurde vom Zulassungs-Controller abgelehnt.',
  'err_ssrf_blocked': 'Sicherheitsverletzung: Anfrage an die Zieladresse wird durch die SSRF-Schutzrichtlinie blockiert.',
  'err_invalid_protocol': 'Sicherheitsverletzung: Nur HTTPS und HTTP Protokolle sind zulässig.',
  'cli_deploy_receipt': 'Bereitstellungsausführungsbeleg:',
  'cli_deploy_failed': 'Bereitstellung fehlgeschlagen:',
  'cli_move_receipt': 'Verschiebungsausführungsbeleg:',
  'cli_move_failed': 'Verschiebung fehlgeschlagen:',
  'cli_remediation_receipt': 'Behebungsausführungsbeleg:',
  'cli_passport_details': 'Passdetails:',
  'cli_emergency_created': 'Notfallpass erstellt:',
  'cli_emergency_failed': 'Notfallpasserstellung fehlgeschlagen:',
  'err_execution_blocked_no_envelope': 'Ausführung blockiert: Fehlende gültige ExecutionEnvelope.',
  'err_execution_blocked_invalid_sig': 'Ausführung blockiert: Ungültiges Signaturformat der ExecutionEnvelope.',
  'err_tenant_id_required': 'Sicherheitsverletzung: Mandanten-ID wird für die Schlüsselauflösung benötigt. Zero-Trust erzwungen.',
  'err_passport_freshness_failed': 'Lieferpass hat die Frischevalidierung nicht bestanden und kann nicht verwendet werden.',
  'err_plugin_entrypoint_not_found': 'Plugin-Aktivierung fehlgeschlagen: Plugin-Einstiegspunkt nicht gefunden.',
  'err_plugin_action_rejected': 'Plugin abgelehnt: Aktion ist nicht im geschlossenen typisierten Aktionsregister.',
  'err_urre_context_id_mismatch': 'Ausführung blockiert: Kontext-ID-Konflikt in ExecutionEnvelope.',
  'err_fatal_already_executed': 'Fatal: Dieses Rezept wurde bereits erfolgreich ausgeführt.'
};

const esNew = {
  'err_missing_public_key': 'Ejecución bloqueada: La variable de entorno UGONDU_RECIPE_PUBLIC_KEY no está configurada.',
  'err_signature_invalid': 'Ejecución bloqueada: Falló la verificación de la firma de la receta.',
  'err_passport_required': 'Acceso denegado: Se requiere un pasaporte de entrega válido para esta operación.',
  'err_passport_rejected': 'Acceso denegado: El pasaporte de entrega fue rechazado por el controlador de admisión.',
  'err_ssrf_blocked': 'Violación de seguridad: La solicitud a la dirección de destino está bloqueada por la política de protección SSRF.',
  'err_invalid_protocol': 'Violación de seguridad: Solo se permiten protocolos HTTPS y HTTP.',
  'cli_deploy_receipt': 'Recibo de ejecución de implementación:',
  'cli_deploy_failed': 'Implementación fallida:',
  'cli_move_receipt': 'Recibo de ejecución de movimiento:',
  'cli_move_failed': 'Movimiento fallido:',
  'cli_remediation_receipt': 'Recibo de ejecución de remediación:',
  'cli_passport_details': 'Detalles del pasaporte:',
  'cli_emergency_created': 'Pasaporte de emergencia creado:',
  'cli_emergency_failed': 'Creación del pasaporte de emergencia fallida:',
  'err_execution_blocked_no_envelope': 'Ejecución bloqueada: Falta ExecutionEnvelope válido.',
  'err_execution_blocked_invalid_sig': 'Ejecución bloqueada: Formato de firma de ExecutionEnvelope no válido.',
  'err_tenant_id_required': 'Violación de seguridad: Se requiere el ID del inquilino para la resolución de claves. Zero-trust aplicado.',
  'err_passport_freshness_failed': 'El pasaporte de entrega ha fallado la validación de frescura y no se puede utilizar.',
  'err_plugin_entrypoint_not_found': 'Error en la activación del complemento: No se encontró el punto de entrada del complemento.',
  'err_plugin_action_rejected': 'Complemento rechazado: La acción no está en el registro cerrado de acciones tipificadas.',
  'err_urre_context_id_mismatch': 'Ejecución bloqueada: Discrepancia del ID de contexto en ExecutionEnvelope.',
  'err_fatal_already_executed': 'Fatal: Esta receta ya ha sido ejecutada exitosamente.'
};

const itNew = {
  'err_missing_public_key': 'Esecuzione bloccata: La variabile d\'ambiente UGONDU_RECIPE_PUBLIC_KEY non è configurata.',
  'err_signature_invalid': 'Esecuzione bloccata: Verifica della firma della ricetta fallita.',
  'err_passport_required': 'Accesso negato: È richiesto un passaporto di consegna valido per questa operazione.',
  'err_passport_rejected': 'Accesso negato: Il passaporto di consegna è stato rifiutato dal controller di ammissione.',
  'err_ssrf_blocked': 'Violazione di sicurezza: La richiesta all\'indirizzo di destinazione è bloccata dalla politica di protezione SSRF.',
  'err_invalid_protocol': 'Violazione di sicurezza: Sono consentiti solo i protocolli HTTPS e HTTP.',
  'cli_deploy_receipt': 'Ricevuta di esecuzione del rilascio:',
  'cli_deploy_failed': 'Rilascio fallito:',
  'cli_move_receipt': 'Ricevuta di esecuzione dello spostamento:',
  'cli_move_failed': 'Spostamento fallito:',
  'cli_remediation_receipt': 'Ricevuta di esecuzione del ripristino:',
  'cli_passport_details': 'Dettagli passaporto:',
  'cli_emergency_created': 'Passaporto di emergenza creato:',
  'cli_emergency_failed': 'Creazione del passaporto di emergenza fallita:',
  'err_execution_blocked_no_envelope': 'Esecuzione bloccata: ExecutionEnvelope valido mancante.',
  'err_execution_blocked_invalid_sig': 'Esecuzione bloccata: Formato firma ExecutionEnvelope non valido.',
  'err_tenant_id_required': 'Violazione di sicurezza: L\'ID del tenant è richiesto per la risoluzione della chiave. Zero-trust applicato.',
  'err_passport_freshness_failed': 'Il passaporto di consegna ha fallito la convalida di freschezza e non può essere utilizzato.',
  'err_plugin_entrypoint_not_found': 'Attivazione del plugin fallita: Punto di ingresso del plugin non trovato.',
  'err_plugin_action_rejected': 'Plugin rifiutato: L\'azione non è nel registro chiuso delle azioni tipizzate.',
  'err_urre_context_id_mismatch': 'Esecuzione bloccata: Mancata corrispondenza dell\'ID di contesto in ExecutionEnvelope.',
  'err_fatal_already_executed': 'Fatale: Questa ricetta è già stata eseguita con successo.'
};

const locales = {
  en: enNew,
  fr: frNew,
  de: deNew,
  es: esNew,
  it: itNew
};

['en','fr','de','es','it'].forEach(l => {
  let fp = 'locales/' + l + '.json';
  let data = JSON.parse(fs.readFileSync(fp));
  Object.assign(data, locales[l]);
  
  if (l === 'fr') {
    data['cli_title'] = 'Ugondu Client de Livraison Universel v1.2.0';
    data['locale_detect_recom_use'] = '  ugondu locale use %s (utiliser la locale)';
    data['locale_detect_recom_install'] = '  ugondu locale install %s (installer la locale)';
    data['locale_list_item'] = '  %-10s [%s] v%-8s %-20s %-8s (Liste) %s';
    data['locale_avail_item'] = '  %-10s [%s] v%-8s %-20s (Dispo) %s';
  } else if (l === 'de') {
    data['cli_title'] = 'Ugondu Universeller Auslieferungs-Client v1.2.0';
    data['locale_detect_recom_use'] = '  ugondu locale use %s (Lokale verwenden)';
    data['locale_detect_recom_install'] = '  ugondu locale install %s (Lokale installieren)';
    data['locale_list_item'] = '  %-10s [%s] v%-8s %-20s %-8s (Liste) %s';
    data['locale_avail_item'] = '  %-10s [%s] v%-8s %-20s (Verfügbar) %s';
  } else if (l === 'es') {
    data['cli_title'] = 'Ugondu Cliente de Entrega Universal v1.2.0';
    data['locale_detect_recom_use'] = '  ugondu locale use %s (usar local)';
    data['locale_detect_recom_install'] = '  ugondu locale install %s (instalar local)';
    data['locale_list_item'] = '  %-10s [%s] v%-8s %-20s %-8s (Lista) %s';
    data['locale_avail_item'] = '  %-10s [%s] v%-8s %-20s (Disp) %s';
  } else if (l === 'it') {
    data['cli_title'] = 'Ugondu Client di Consegna Universale v1.2.0';
    data['locale_detect_recom_use'] = '  ugondu locale use %s (usa locale)';
    data['locale_detect_recom_install'] = '  ugondu locale install %s (installa locale)';
    data['locale_list_item'] = '  %-10s [%s] v%-8s %-20s %-8s (Lista) %s';
    data['locale_avail_item'] = '  %-10s [%s] v%-8s %-20s (Disp) %s';
  }

  fs.writeFileSync(fp, JSON.stringify(data, null, 2) + '\n');
});
console.log('Done modifying locales.');
