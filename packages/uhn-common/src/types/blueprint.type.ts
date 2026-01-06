import { UhnFileType } from "./file.type";

export type BlueprintStatus =
    | 'idle'
    | 'extracted'
    | 'compiled'


export type BlueprintMetadata = {
    identifier: string;
    name: string;
    description?: string;
    schemaVersion: number;
};



export const BlueprintFileTypes: UhnFileType[] = ["blueprint"] as const;

export type BlueprintUploadResponse = { identifier: string; version: number };

export type BlueprintActivationDetails = {
    identifier: string;
    version: number;
    activatedAt: string;        
    activatedBy?: string;
    deactivatedAt?: string;
    deactivatedBy?: string;
};

export type BlueprintVersion = {
    identifier: string;
    name: string;
    version: number;
    status: BlueprintStatus;
    active: boolean;
    activatedAt?: string;
    activatedBy?: string;
    deactivatedAt?: string;
    deactivatedBy?: string;
    uploadedAt: string;
    uploadedBy: string;
    metadata: BlueprintMetadata;
    downloadUrl: string;
    errorSummary?: string;
  
};

export type BlueprintVersionLog = {
    identifier: string;
    version: number;
    status: BlueprintStatus;
    validationLog?: string;
    compileLog?: string;
    installLog?: string;
    errorSummary?: string;
};

export type Blueprint = {
    identifier: string;
    name: string;
    versions: BlueprintVersion[];
};