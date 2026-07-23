import { seedAccessControl } from "./access-control";
import { seedRecordAccess } from "./record-access";
import { seedStandardPricing } from "./pricing";
import { seedAppModules } from "./app-modules";
import { seedDefaultScoringRules } from "./lead-scoring";

/** Seeds a brand-new organization with the same default RBAC/module
 *  configuration the Default Organization got at boot, so it's usable
 *  immediately instead of starting as an empty shell. */
export async function seedOrgDefaults(orgId: number): Promise<void> {
  await seedAccessControl(orgId);
  await seedRecordAccess(orgId);
  await seedStandardPricing(orgId);
  await seedAppModules(orgId);
  await seedDefaultScoringRules(orgId);
}
