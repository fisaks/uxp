import { AppLogger, SearchIndexSettings, SearchService } from "@uxp/bff-common";

const SCOPED_KEY_NAME = "vid";
const SCOPED_KEY_INDEXES = "vid_*";
const SCOPED_KEY_ACTIONS = ["search", "documents.*", "indexes.create", "indexes.get", "settings.update", "tasks.get"];
/** A burst of edits is indexed once. */
const DEBOUNCE_MS = 1_000;
const MAX_HITS = 1_000;

type SearchEnv = { url?: string; apiKey?: string; masterKey?: string };

/** Where Meilisearch is, from the environment. */
export const meiliEnv = (): SearchEnv => ({
    url: process.env.MEILI_URL || undefined,
    apiKey: process.env.MEILI_API_KEY || undefined,
    masterKey: process.env.MEILI_MASTER_KEY || undefined,
});

type LibrarySearchOptions<Doc> = {
    /** The name of the Meilisearch index. */
    index: string;
    settings: SearchIndexSettings;
    /** What the documents are, for the log: "home video clips". */
    what: string;
    /** The documents, which are the truth: the index is made equal to them. */
    docs: () => Doc[];
};

/**
 * Keeps one Meilisearch index equal to the documents of a library: the index is rebuilt in full at the start and again after a change.
 */
export class LibrarySearch<Doc extends { id: string }> {
    private search?: SearchService;
    private timer?: NodeJS.Timeout;
    private running?: Promise<void>;
    private again = false;

    constructor(
        private readonly options: LibrarySearchOptions<Doc>,
        private readonly env: SearchEnv
    ) {}

    /** Creates the index. Never throws: without Meilisearch the library works, only without search. Call `reindex` when the documents are known. */
    async start() {
        const { url, masterKey } = this.env;
        if (!url) {
            AppLogger.info(undefined, { message: "[Search] MEILI_URL is not set, search is off" });
            return;
        }
        try {
            const apiKey = this.env.apiKey || (masterKey ? await this.devKey(url, masterKey) : undefined);
            const search = new SearchService({ url, apiKey });
            await search.ensureIndex(this.options.index, this.options.settings);
            this.search = search;
        } catch (error) {
            AppLogger.error(undefined, {
                message: `[Search] Could not set up the index of the ${this.options.what}, search is off`,
                error,
            });
            this.search = undefined;
        }
    }

    get available(): boolean {
        return this.search !== undefined;
    }

    /** Indexes the documents soon; many calls close together make one run. */
    reindex() {
        if (!this.search) {
            return;
        }
        clearTimeout(this.timer);
        this.timer = setTimeout(() => void this.flush(), DEBOUNCE_MS);
    }

    /** The ids of the documents that match all the words, best match first. Throws when Meilisearch does not answer. */
    async find(query: string): Promise<string[]> {
        const search = this.search;
        if (!search) {
            throw new Error("Search is off");
        }
        const [result] = await search.multiSearch<Doc>([
            { indexUid: this.options.index, q: query, limit: MAX_HITS, matchingStrategy: "all", attributesToRetrieve: ["id"] },
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
            const docs = this.options.docs();
            await this.search?.replaceDocuments(this.options.index, docs);
            AppLogger.info(undefined, { message: `[Search] Indexed ${docs.length} ${this.options.what}` });
        } catch (error) {
            AppLogger.error(undefined, {
                message: `[Search] Could not index the ${this.options.what}, trying again at the next change`,
                error,
            });
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
