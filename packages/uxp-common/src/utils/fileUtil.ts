export const normalizeFilename = (filename: string): string => {
    const name = filename.replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase(); // Remove special characters
    return name.replace(/-+/g, "-"); // Remove duplicate hyphens
};

// 74 nanoid_filename.filetype == 100
export const safeNormalizeFilename = (filename: string, maxLength = 74): string => {
    const safeFilename = normalizeFilename(filename);
    return safeFilename.length > maxLength ? safeFilename.substring(0, maxLength) : safeFilename;
};

export const getFileExtension = (filename: string) => {
    const lastDotIndex = filename.lastIndexOf(".");
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex + 1).toLowerCase() : "";
};

export const getFileBaseName = (filename: string): string => {
    // Support both Unix (`/`) and Windows (`\`) paths
    const lastSlashIndex = Math.max(filename.lastIndexOf("/"), filename.lastIndexOf("\\"));
    const lastDotIndex = filename.lastIndexOf(".");

    // Extract filename (remove path)
    const nameStart = lastSlashIndex === -1 ? 0 : lastSlashIndex + 1;

    // If no extension, return full filename
    if (lastDotIndex === -1 || lastDotIndex < nameStart) {
        return filename.substring(nameStart);
    }

    // Return filename without extension
    return filename.substring(nameStart, lastDotIndex);
};

export const getPublicFileName = (filename: string) => {
    const underscoreIndex = filename.indexOf("_");
    if (underscoreIndex === 21) {
        return filename.substring(22);
    }
    return filename;
};
