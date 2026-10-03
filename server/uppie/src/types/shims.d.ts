declare module '@aws-sdk/client-iam' {
  export class IAMClient {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }
  export const AttachRolePolicyCommand: any;
  export const AttachUserPolicyCommand: any;
  export const DetachRolePolicyCommand: any;
  export const DetachUserPolicyCommand: any;
  export const ListPolicyVersionsCommand: any;
  export const CreatePolicyVersionCommand: any;
  export const DeletePolicyVersionCommand: any;
  export const GetPolicyVersionCommand: any;
  export const DeletePolicyCommand: any;
  export const CreatePolicyCommand: any;
  export const GetPolicyCommand: any;
}

declare module '@azure/arm-authorization' {
  export class AuthorizationManagementClient {
    constructor(credentials?: any, subscriptionId?: any);
    roleAssignments: any;
    roleDefinitions: any;
  }
}

declare module '@azure/identity' {
  export class DefaultAzureCredential {
    constructor();
  }
}

declare module '@google-cloud/resource-manager';
declare module '@google-cloud/iam';
declare module '@google-cloud/policytroubleshooter';

declare module '@kubernetes/client-node' {
  export class KubeConfig {
    loadFromDefault(): void;
    makeApiClient<T>(apiClientClass: new () => T): T;
  }
  export class RbacAuthorizationV1Api {
    createClusterRole(role: any): Promise<any>;
    deleteClusterRole(name: any): Promise<any>;
    listClusterRole(): Promise<any>;
    readClusterRole(name: any): Promise<any>;
    replaceClusterRole(name: any, role: any): Promise<any>;
    createClusterRoleBinding(binding: any): Promise<any>;
    deleteClusterRoleBinding(name: any): Promise<any>;
  }
  export interface V1ClusterRole {
    apiVersion?: string;
    kind?: string;
    metadata?: any;
    rules?: any[];
  }
  export interface V1ClusterRoleBinding {
    apiVersion?: string;
    kind?: string;
    metadata?: any;
    roleRef?: any;
    subjects?: any[];
  }
  export interface V1PolicyRule {
    apiGroups?: string[];
    resources?: string[];
    verbs?: string[];
  }
}
