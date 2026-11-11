import { MetadataStore } from "../metadata-store";

/** The metadata the user has set on a clip. `date` is only here when the user set it: null is a date the user cleared. */
export type HomeVideoMetadata = { date?: string | null; title?: string; description?: string; people?: string[]; tags?: string[] };

/** The metadata of the clips, keyed by the path of the clip. */
export class HomeVideoMetadataStore extends MetadataStore<HomeVideoMetadata> {
    constructor(file?: string) {
        super("home video", file);
    }
}
