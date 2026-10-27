export interface CertificationProviderAdapter {
    resolveDefaultAmi(): Promise<string>;
    getNativeClient(): any;
    getFaultInjector(): any;
    getRepairExecutor(): any;
    getResidualScanner(): any;
}
