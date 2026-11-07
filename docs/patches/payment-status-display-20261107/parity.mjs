// Read-only diagnostics: this module never chooses one response as authoritative.
export const PROVIDERS = ['vpay', 'gspay', '1mpay'];
export const FIELDS = ['implemented', 'configured', 'enabled', 'submissionEnabled', 'verified', 'settlementVerified'];

export function capabilityMismatches(health, statuses) {
  const mismatches = [];
  for (const provider of PROVIDERS) {
    for (const capability of ['deposit', 'payout', 'balance']) {
      const healthCapability = health?.providerCapabilities?.[provider]?.[capability];
      const statusCapability = statuses?.[provider]?.capabilities?.[capability];
      if (!healthCapability || !statusCapability) {
        mismatches.push({provider, capability, field: 'capability', kind: 'unavailable'});
        continue;
      }
      for (const field of FIELDS) {
        if (healthCapability[field] !== statusCapability[field]) {
          mismatches.push({provider, capability, field, health: healthCapability[field], status: statusCapability[field]});
        }
      }
    }
  }
  return mismatches;
}
