// TEST-ONLY: Never import from production service entry points
/******************************************************************************
 * Governance: Air Roofers / UAIGOS
 * Classification: INTERNAL
 ******************************************************************************/
import { tokenStore } from '../db';

export function seedTestTokens(): void {
    tokenStore.registerToken('ugp_demo123', 'tenant_prof_99', 'professional');
    tokenStore.registerToken('uge_corp456', 'tenant_ent_11', 'enterprise');
}
