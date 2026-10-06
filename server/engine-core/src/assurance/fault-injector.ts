export interface CertificationFaultInjector {
    injectTagDrift(resourceId: string, expectedKey: string, driftedValue: string): Promise<void>;
}

export interface ResidualScanner {
    scanForLeakedResources(transactionId: string): Promise<boolean>;
}
