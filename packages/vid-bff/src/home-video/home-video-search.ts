import { AppLogger, SearchIndexSettings, SearchService } from "@uxp/bff-common";
import { HOME_VIDEO_SEARCH_INDEX, HomeVideoClip, HomeVideoSearchDoc } from "@vid/common";

const SCOPED_KEY_NAME = "vid";
const SCOPED_KEY_INDEXES = "vid_*";
const SCOPED_KEY_ACTIONS = ["search", "documents.*", "indexes.create", "indexes.get", "settings.update", "tasks.get"];
/** A burst of edits is indexed once. */
const DEBOUNCE_MS = 1_000;
const MAX_HITS = 1_000;

const SETTINGS: SearchIndexSettings = {
    primaryKey: "id",
    searchableAttributes: ["title", "description", "people", "tags", "date", "year"],
};

const toDoc = (clip: HomeVideoClip): HomeVideoSearchDoc => ({
    id: clip.id,
    title: clip.title,
    description: clip.description,
    people: clip.people,
    tags: clip.tags,
    date: clip.date ?? "",
    year: clip.date?.slice(0, 4) ?? "",
});

/**
 * Keeps the Meilisearch index of the home videos equal to the clips, which are the truth: the index is rebuilt in full at the start
 * and again after a change.
 */
export class HomeVideoSearch {
    private search?: SearchService;
    private timer?: NodeJS.Timeout;
    private running?: Promise<void>;
    private again = false;

    constructor(
        private readonly clips: () => HomeVideoClip[],
        private readonly env: { url?: string; apiKey?: string; masterKey?: string }
    ) {}

    /** Creates the index. Never throws: without Meilisearch the videos work, only without search. Call `reindex` when the clips are known. */
    async start() {
        const { url, masterKey } = this.env;
        if (!url) {
            AppLogger.info(undefined, { message: "[Search] MEILI_URL is not set, search is off" });
            return;
        }
        try {
            const apiKey = this.env.apiKey || (masterKey ? await this.devKey(url, masterKey) : undefined);
            const search = new SearchService({ url, apiKey });
            await search.ensureIndex(HOME_VIDEO_SEARCH_INDEX, SETTINGS);
            this.search = search;
        } catch (error) {
            AppLogger.error(undefined, { message: "[Search] Could not set up the index, search is off", error });
            this.search = undefined;
        }
    }

    get available(): boolean {
        return this.search !== undefined;
    }

    /** Indexes the clips soon; many calls close together make one run. */
    reindex() {
        if (!this.search) {
            return;
        }
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
    }

    /** The ids of the clips that match all the words, best match first. Throws when Meilisearch does not answer. */
    async find(query: string): Promise<string[]> {
        const search = this.search;
        if (!search) {
            throw new Error("Search is off");
        }
        const [result] = await search.multiSearch<HomeVideoSearchDoc>([
            { indexUid: HOME_VIDEO_SEARCH_INDEX, q: query, limit: MAX_HITS, matchingStrategy: "all", attributesToRetrieve: ["id"] },
        ]);
        return result.hits.map((hit) => hit.doc.id);
    }

    /** One run at a time: a change during a run is picked up by the next. */
    private flush(): Promise<void> {
        if (this.running) {
            this.again = true;
            return this.running;
        }
        this.running = this.index().finally(() => {
            this.running = undefined;
            if (this.again) {
                this.again = false;
                this.reindex();
            }
        });
        return this.running;
    }

    private async index() {
        try {
            const docs = this.clips().map(toDoc);
            await this.search?.replaceDocuments(HOME_VIDEO_SEARCH_INDEX, docs);
            AppLogger.info(undefined, { message: `[Search] Indexed ${docs.length} home video clips` });
        } catch (error) {
            AppLogger.error(undefined, { message: "[Search] Could not index the home video clips, trying again at the next change", error });
        }
    }

    /** In the dev environment the BFF holds the master key and makes the key of the app itself. In production it is given the scoped key. */
    private devKey(url: string, masterKey: string): Promise<string> {
        return new SearchService({ url, apiKey: masterKey }).ensureScopedKey({
            name: SCOPED_KEY_NAME,
            description: "VID: search and index its own indexes",
            indexes: [SCOPED_KEY_INDEXES],
            actions: SCOPED_KEY_ACTIONS,
        });
    }
}
