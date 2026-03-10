import fs from "fs-extra";
import path from "path";

export type UploadOptions = {
    token: string;
    url: string;
    zipPath: string;
    activate: boolean;
};

export async function uploadBlueprint(opts: UploadOptions): Promise<void> {
    if (!await fs.pathExists(opts.zipPath)) {
        throw new Error(
            `${opts.zipPath} not found. Run \`uhn-blueprint build\` first.`
        );
    }

    const fileBuffer = await fs.readFile(opts.zipPath);
    const blob = new Blob([fileBuffer], { type: "application/zip" });

    const formData = new FormData();
    formData.append("type", "blueprint");
    formData.append("file", blob, path.basename(opts.zipPath));

    const uploadUrl = `${opts.url}/api/cli/upload-blueprint?activate=${opts.activate}`;

    console.log(`⬆️  Uploading blueprint to ${opts.url}...`);

    let response: Response;
    try {
        response = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${opts.token}`,
            },
            body: formData,
        });
    } catch (err: any) {
        throw new Error(`Could not connect to ${opts.url}: ${err?.message ?? err}`);
    }

    if (!response.ok) {
        let message = `Upload failed (HTTP ${response.status})`;
        try {
            const body = await response.json() as any;
            if (body.errors?.[0]?.message) {
                message = body.errors[0].message;
            } else if (body.message) {
                message = body.message;
            }
        } catch {
            // response body not JSON — use default message
        }
        throw new Error(message);
    }

    const result = await response.json() as {
        identifier: string;
        version: number;
        activated: boolean;
    };

    console.log(`✅ Blueprint uploaded successfully`);
    console.log(`   identifier: ${result.identifier}`);
    console.log(`   version:    ${result.version}`);
    console.log(`   activated:  ${result.activated}`);
}
