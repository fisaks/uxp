export const FileEntities = ["attachment"] as const;

export type FileEntityType = (typeof FileEntities)[number];

export type FileUploadResponse = { publicId: string; fileName: string };
