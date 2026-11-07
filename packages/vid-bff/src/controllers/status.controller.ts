import { Route } from "@uxp/bff-common";
import { VidStatus } from "@vid/common";
import { accessSync, constants } from "fs";

/** The folder with the videos, set by VID_MEDIA_ROOT. Without it the library is empty. */
const mediaRootAvailable = (): boolean => {
    const root = process.env.VID_MEDIA_ROOT;
    if (!root) {
        return false;
    }
    try {
        accessSync(root, constants.R_OK);
        return true;
    } catch {
        return false;
    }
};

export class StatusController {
    @Route("get", "/status", { authenticate: true })
    async getStatus(): Promise<VidStatus> {
        return { mediaRootAvailable: mediaRootAvailable() };
    }
}
