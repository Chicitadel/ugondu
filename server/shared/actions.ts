export interface FetchRepositoryPayload {
    url: string;
    branch: string;
}

export interface SyncEnvironmentPayload {
    strategy: string;
}

export interface PruneReleasesPayload {
    retention: number;
}

export interface UpsellNoticePayload {
    message: string;
}

export interface NodeInstallPayload {
    [key: string]: any;
}

export interface ComposerInstallPayload {
    [key: string]: any;
}

export interface ShellExecPayload {
    [key: string]: any;
}

export type ActionType = 
    | 'FETCH_REPOSITORY'
    | 'SYNC_ENVIRONMENT'
    | 'PRUNE_RELEASES'
    | 'UPSELL_NOTICE'
    | 'NODE_INSTALL'
    | 'COMPOSER_INSTALL'
    | 'SHELL_EXEC';

export interface TypedAction {
    action: ActionType;
    payload: any;
}
