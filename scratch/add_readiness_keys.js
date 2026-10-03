const fs = require('fs');
const path = require('path');
const dir = 'D:\\ujomor-platform\\products\\ugondu\\server\\shared\\locales';
const LANGS = ['en', 'fr', 'es', 'de', 'it'];
const cat = {
  'messages.error.readiness_replication_lag': ['Replication lag is {lag} ms (must be 0).', 'Le retard de réplication est de {lag} ms (doit être 0).', 'El retraso de replicación es de {lag} ms (debe ser 0).', 'Die Replikationsverzögerung beträgt {lag} ms (muss 0 sein).', 'Il ritardo di replica è di {lag} ms (deve essere 0).'],
  'messages.error.readiness_health_failed': ['System health checks failed.', 'Les contrôles de santé du système ont échoué.', 'Las comprobaciones de estado del sistema fallaron.', 'Die Systemintegritätsprüfungen sind fehlgeschlagen.', 'I controlli di integrità del sistema non sono riusciti.'],
  'messages.error.readiness_error_rate': ['Error rate {errorRate} exceeds the maximum allowed {maxAllowed}.', "Le taux d'erreur {errorRate} dépasse le maximum autorisé {maxAllowed}.", 'La tasa de errores {errorRate} supera el máximo permitido {maxAllowed}.', 'Die Fehlerrate {errorRate} überschreitet den zulässigen Höchstwert {maxAllowed}.', "Il tasso di errore {errorRate} supera il massimo consentito {maxAllowed}."],
  'messages.error.readiness_probe_unavailable': ["Readiness probe '{probe}' is unavailable; cutover is blocked.", "La sonde de disponibilité « {probe} » est indisponible ; la bascule est bloquée.", "La sonda de preparación '{probe}' no está disponible; el cambio queda bloqueado.", "Die Bereitschaftsprüfung '{probe}' ist nicht verfügbar; die Umschaltung ist blockiert.", "La sonda di prontezza '{probe}' non è disponibile; il cutover è bloccato."],
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
console.log('inserted', n);
