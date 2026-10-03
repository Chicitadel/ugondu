const fs = require('fs');
const path = require('path');
const dir = 'D:\\ujomor-platform\\products\\ugondu\\server\\shared\\locales';
const LANGS = ['en', 'fr', 'es', 'de', 'it'];
const cat = {
  'linux_acl.validate.invalid_path': ["Invalid target path '{path}': it must be absolute and free of control characters and '..' segments.", "Chemin cible invalide « {path} » : il doit être absolu et exempt de caractères de contrôle et de segments « .. ».", "Ruta de destino no válida '{path}': debe ser absoluta y no contener caracteres de control ni segmentos '..'.", "Ungültiger Zielpfad '{path}': Er muss absolut sein und darf weder Steuerzeichen noch '..'-Segmente enthalten.", "Percorso di destinazione non valido '{path}': deve essere assoluto e privo di caratteri di controllo e segmenti '..'."],
  'linux_acl.validate.invalid_entry': ["Invalid ACL entry '{entry}'.", "Entrée ACL invalide « {entry} ».", "Entrada ACL no válida '{entry}'.", "Ungültiger ACL-Eintrag '{entry}'.", "Voce ACL non valida '{entry}'."],
  'linux_acl.validate.too_many_entries': ['ACL entry count {count} exceeds the limit of {limit}.', "Le nombre d'entrées ACL ({count}) dépasse la limite de {limit}.", 'El número de entradas ACL ({count}) supera el límite de {limit}.', 'Die Anzahl der ACL-Einträge ({count}) überschreitet das Limit von {limit}.', 'Il numero di voci ACL ({count}) supera il limite di {limit}.'],
  'linux_acl.validate.invalid_operation': ["Unsupported or invalid ACL operation or principal '{operation}'.", "Opération ACL ou principal non pris en charge ou invalide « {operation} ».", "Operación ACL o principal no admitido o no válido '{operation}'.", "Nicht unterstützte oder ungültige ACL-Operation bzw. ungültiger Principal '{operation}'.", "Operazione ACL o principal non supportato o non valido '{operation}'."],
  'linux_acl.validate.invalid_command': ["Invalid sudo rule: command or principal '{command}' is not allowed (commands must be absolute paths).", "Règle sudo invalide : la commande ou le principal « {command} » n'est pas autorisé (les commandes doivent être des chemins absolus).", "Regla sudo no válida: el comando o principal '{command}' no está permitido (los comandos deben ser rutas absolutas).", "Ungültige sudo-Regel: Befehl oder Principal '{command}' ist nicht zulässig (Befehle müssen absolute Pfade sein).", "Regola sudo non valida: il comando o principal '{command}' non è consentito (i comandi devono essere percorsi assoluti)."],
  'linux_acl.validate.mixed_document': ['ACL rules and sudo rules must be generated as separate policies.', 'Les règles ACL et les règles sudo doivent être générées dans des politiques distinctes.', 'Las reglas ACL y las reglas sudo deben generarse como políticas independientes.', 'ACL-Regeln und sudo-Regeln müssen als getrennte Richtlinien erzeugt werden.', 'Le regole ACL e le regole sudo devono essere generate come policy separate.'],
  'linux_acl.validate.invalid_spec': ["Invalid policy identifier '{spec}'.", "Identifiant de politique invalide « {spec} ».", "Identificador de política no válido '{spec}'.", "Ungültige Richtlinienkennung '{spec}'.", "Identificatore di policy non valido '{spec}'."],
  'linux_acl.validate.sudoers_check_failed': ['The sudoers drop-in failed validation and was not installed: {error}', "Le fichier sudoers a échoué à la validation et n'a pas été installé : {error}", 'El archivo sudoers no superó la validación y no se instaló: {error}', 'Die sudoers-Datei hat die Prüfung nicht bestanden und wurde nicht installiert: {error}', 'Il file sudoers non ha superato la validazione e non è stato installato: {error}'],
  'linux_acl.restore.no_snapshot': ['Restore failed: the retirement certificate contains no ACL snapshot.', "Échec de la restauration : le certificat de retrait ne contient aucun instantané ACL.", 'Error al restaurar: el certificado de retiro no contiene ninguna instantánea ACL.', 'Wiederherstellung fehlgeschlagen: Das Außerbetriebnahme-Zertifikat enthält keinen ACL-Snapshot.', 'Ripristino non riuscito: il certificato di ritiro non contiene alcuno snapshot ACL.'],
  'linux_acl.restore.path_mismatch': ["Restore refused: the snapshot does not belong to '{path}'.", "Restauration refusée : l'instantané n'appartient pas à « {path} ».", "Restauración rechazada: la instantánea no pertenece a '{path}'.", "Wiederherstellung abgelehnt: Der Snapshot gehört nicht zu '{path}'.", "Ripristino rifiutato: lo snapshot non appartiene a '{path}'."],
};
const setNested = (obj, dotted, value) => {
  const parts = dotted.split('.'); let o = obj;
  for (let i = 0; i < parts.length - 1; i++) { if (typeof o[parts[i]] !== 'object' || o[parts[i]] === null) { if (o[parts[i]] !== undefined) return false; o[parts[i]] = {}; } o = o[parts[i]]; }
  const last = parts[parts.length - 1]; if (o[last] !== undefined) return false; o[last] = value; return true;
};
let n = 0;
LANGS.forEach((lang, idx) => {
  const p = path.join(dir, `${lang}.json`);
  const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [k, v] of Object.entries(cat)) if (setNested(obj, k, v[idx])) n++;
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
});
console.log('inserted', n, 'expected', Object.keys(cat).length * 5);
