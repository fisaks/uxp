import { MetadataStore } from "../metadata-store";

/** The metadata of a clip. The user sets all of it but `uploadedBy`, `originalName` and `uploadedAt`, which the server sets when a clip is uploaded. `date` is only here when the user set it: null is a date the user cleared. */
export type HomeVideoMetadata = { date?: string | null; title?: string; description?: string; people?: string[]; tags?: string[]; uploadedBy?: string; originalName?: string; uploadedAt?: string };

/** The metadata of the clips, keyed by the path of the clip. */
export class HomeVideoMetadataStore extends MetadataStore<HomeVideoMetadata> {
    constructor(file?: string) {
        super("home video", file);
    }
}
