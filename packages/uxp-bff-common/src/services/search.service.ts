import axios, { AxiosInstance } from "axios";
import { AppLogger } from "../utils/AppLogger";

const TASK_POLL_MS = 100;
const TASK_TIMEOUT_MS = 120_000;
const HEALTH_TIMEOUT_MS = 2_000;
const DEFAULT_BATCH_SIZE = 5_000;

export interface SearchServiceOptions {
    /** Meilisearch base url, e.g. http://localhost:7700. Unset = search disabled. */
    url?: string;
    /** API key (master key or a scoped key, depending on what the caller does). */
    apiKey?: string;
}

/** Subset of the Meilisearch index settings used by the platform. */
export interface SearchIndexSettings {
    primaryKey?: string;
    searchableAttributes?: string[];
    filterableAttributes?: string[];
    sortableAttributes?: string[];
    displayedAttributes?: string[];
    synonyms?: Record<string, string[]>;
    stopWords?: string[];
    rankingRules?: string[];
    typoTolerance?: Record<string, unknown>;
    pagination?: { maxTotalHits: number };
    faceting?: { maxValuesPerFacet?: number };
}

export interface SearchQuery {
    indexUid: string;
    q?: string;
    filter?: string | string[] | (string | string[])[];
    limit?: number;
    offset?: number;
    facets?: string[];
    sort?: string[];
    attributesToRetrieve?: string[];
    attributesToHighlight?: string[];
    attributesToCrop?: string[];
    highlightPreTag?: string;
    highlightPostTag?: string;
    matchingStrategy?: "all" | "last" | "frequency";
    /** Federated search only: a hit of this query is ranked as if its score were multiplied by weight. */
    federationOptions?: { weight?: number };
}

export interface SearchHit<T = Record<string, unknown>> {
    /** The stored document. */
    doc: T;
    /** Same document with matched text wrapped in the highlight tags, only for requested attributes. */
    highlighted?: Partial<T>;
    indexUid: string;
}

export interface SearchResult<T = Record<string, unknown>> {
    indexUid: string;
    hits: SearchHit<T>[];
    estimatedTotalHits?: number;
    /** facet name -> value -> count */
    facets?: Record<string, Record<string, number>>;
}

export interface FederatedSearchResult<T = Record<string, unknown>> {
    hits: SearchHit<T>[];
    estimatedTotalHits?: number;
    /** index uid -> facet name -> value -> count */
    facetsByIndex?: Record<string, Record<string, Record<string, number>>>;
}

export interface FederationOptions {
    limit?: number;
    offset?: number;
    facetsByIndex?: Record<string, string[]>;
}

export interface ScopedKeyRequest {
    /** Unique key name, used to find the key again (idempotent). */
    name: string;
    description?: string;
    /** Index uids or patterns, e.g. "aud_*". */
    indexes: string[];
    /** Meilisearch actions, e.g. "search", "documents.*", "indexes.create", "settings.update", "tasks.get". */
    actions: string[];
}

interface MeiliTask {
    uid: number;
    status: "enqueued" | "processing" | "succeeded" | "failed" | "canceled";
    error?: { message: string; code: string };
}

interface RawHit extends Record<string, unknown> {
    _formatted?: Record<string, unknown>;
}

interface RawSearchResult {
    indexUid: string;
    hits: RawHit[];
    estimatedTotalHits?: number;
    facetDistribution?: Record<string, Record<string, number>>;
}

interface RawFederatedResult {
    hits: (RawHit & { _federation?: { indexUid: string } })[];
    estimatedTotalHits?: number;
    facetsByIndex?: Record<string, { distribution: Record<string, Record<string, number>> }>;
}

interface MeiliKey {
    name: string | null;
    key: string;
    actions: string[];
    indexes: string[];
}

function sameSet(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v) => b.includes(v));
}

/**
 * Generic Meilisearch client for remote app BFFs. Knows nothing about any app's documents:
 * the app names its indexes (convention: `<app>_<kind>`), their settings and documents.
 *
 * Search is optional: without `url` the service is disabled and `isEnabled` is false, so
 * apps that do not use search are unaffected.
 *
 * @example
 * ```typescript
 * const search = new SearchService({ url: process.env.MEILI_URL, apiKey: process.env.MEILI_API_KEY });
 * if (search.isEnabled) {
 *     await search.ensureIndex("aud_tracks", { primaryKey: "id", searchableAttributes: ["title", "artist"] });
 *     await search.replaceDocuments("aud_tracks", tracks);
 *     const res = await search.multiSearch([{ indexUid: "aud_tracks", q: "bohem", attributesToHighlight: ["title"] }]);
 * }
 * ```
 */
export class SearchService {
    private readonly http: AxiosInstance | null;

    constructor(options: SearchServiceOptions) {
        const { url, apiKey } = options;
        this.http = url
            ? axios.create({
                baseURL: url.replace(/\/+$/, ""),
                headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
            })
            : null;
    }

    get isEnabled(): boolean {
        return this.http !== null;
    }

    /** True when Meilisearch answers its health endpoint. Never throws. */
    async health(): Promise<boolean> {
        if (!this.http) return false;
        try {
            const res = await this.http.get("/health", { timeout: HEALTH_TIMEOUT_MS });
            return res.data?.status === "available";
        } catch {
            return false;
        }
    }

    /** Creates the index when missing and applies the settings (waits for both). */
    async ensureIndex(indexUid: string, settings: SearchIndexSettings): Promise<void> {
        const http = this.client();
        const { primaryKey, ...rest } = settings;
        const exists = await http.get(`/indexes/${indexUid}`).then(() => true, (err) => {
            if (axios.isAxiosError(err) && err.response?.status === 404) return false;
            throw err;
        });
        if (!exists) {
            const res = await http.post("/indexes", { uid: indexUid, primaryKey });
            await this.waitForTask(res.data.taskUid);
        }
        const res = await http.patch(`/indexes/${indexUid}/settings`, rest);
        await this.waitForTask(res.data.taskUid);
    }

    /**
     * Replaces all documents of the index: clears it, then adds the documents in batches.
     * Not atomic, so a search during the call may see a partial index (acceptable: the data
     * is rebuildable and the index is refilled within seconds).
     */
    async replaceDocuments(indexUid: string, docs: object[], batchSize = DEFAULT_BATCH_SIZE): Promise<void> {
        const http = this.client();
        const cleared = await http.delete(`/indexes/${indexUid}/documents`);
        await this.waitForTask(cleared.data.taskUid);
        for (let i = 0; i < docs.length; i += batchSize) {
            const res = await http.post(`/indexes/${indexUid}/documents`, docs.slice(i, i + batchSize));
            await this.waitForTask(res.data.taskUid);
        }
    }

    /** Separate result list per query (one request). */
    async multiSearch<T = Record<string, unknown>>(queries: SearchQuery[]): Promise<SearchResult<T>[]> {
        const res = await this.client().post("/multi-search", { queries });
        return (res.data.results as RawSearchResult[]).map((r) => ({
            indexUid: r.indexUid,
            hits: r.hits.map((h) => this.toHit<T>(r.indexUid, h)),
            estimatedTotalHits: r.estimatedTotalHits,
            facets: r.facetDistribution,
        }));
    }

    /**
     * One merged, ranked hit list across the indexes. Use `federationOptions.weight` on a query
     * to boost its hits (needs Meilisearch >= 1.10).
     */
    async federatedSearch<T = Record<string, unknown>>(
        queries: SearchQuery[],
        federation: FederationOptions = {},
    ): Promise<FederatedSearchResult<T>> {
        const res = await this.client().post("/multi-search", { federation, queries });
        const data = res.data as RawFederatedResult;
        const facetsByIndex = data.facetsByIndex
            ? Object.fromEntries(Object.entries(data.facetsByIndex).map(([uid, f]) => [uid, f.distribution]))
            : undefined;
        return {
            hits: data.hits.map((h) => this.toHit<T>(h._federation?.indexUid ?? "", h)),
            estimatedTotalHits: data.estimatedTotalHits,
            facetsByIndex,
        };
    }

    /**
     * Returns the value of the API key with this name, creating it when missing.
     *
     * Purpose: only the master key can create API keys, and the master key must stay on the
     * server hosting Meilisearch. An app BFF running elsewhere (e.g. on the Pi) is given the
     * key returned here instead: it can create indexes and read/write documents, but only in
     * the indexes matching the request, and cannot manage keys or touch other apps' indexes.
     * So this must be called by something holding the master key (dev: the BFF itself, prod:
     * the deploy script), and the returned value handed to the app as its `apiKey`.
     *
     * Idempotent and stable: when a key with this name, the same actions and the same indexes
     * exists, its existing value is returned, so calling it on every deploy does not rotate
     * the key. Meilisearch cannot edit actions or indexes of an existing key, so when either
     * differs the key is deleted and recreated, which gives it a NEW value that the app must
     * be given and restarted with. The key does not expire. A wiped Meilisearch volume loses
     * the keys too, the next call then creates it again with a new value.
     *
     * Needs the master key.
     */
    async ensureScopedKey(request: ScopedKeyRequest): Promise<string> {
        const http = this.client();
        const list = await http.get("/keys", { params: { limit: 1000 } });
        const existing = (list.data.results as MeiliKey[]).find((k) => k.name === request.name);
        if (existing) {
            if (sameSet(existing.actions, request.actions) && sameSet(existing.indexes, request.indexes)) {
                return existing.key;
            }
            await http.delete(`/keys/${existing.key}`);
            AppLogger.info(undefined, { message: `[Search] Replacing API key ${request.name}: actions or indexes changed` });
        }
        const created = await http.post("/keys", {
            name: request.name,
            description: request.description,
            actions: request.actions,
            indexes: request.indexes,
            expiresAt: null,
        });
        return created.data.key as string;
    }

    private client(): AxiosInstance {
        if (!this.http) throw new Error("Search is not configured (MEILI_URL unset)");
        return this.http;
    }

    private toHit<T>(indexUid: string, raw: RawHit): SearchHit<T> {
        const { _formatted, _federation, _rankingScore, ...doc } = raw as RawHit & { _federation?: unknown; _rankingScore?: unknown };
        return { doc: doc as T, highlighted: _formatted as Partial<T> | undefined, indexUid };
    }

    private async waitForTask(taskUid: number): Promise<void> {
        const http = this.client();
        const deadline = Date.now() + TASK_TIMEOUT_MS;
        for (;;) {
            const task = (await http.get(`/tasks/${taskUid}`)).data as MeiliTask;
            if (task.status === "succeeded") return;
            if (task.status === "failed" || task.status === "canceled") {
                throw new Error(`Meilisearch task ${taskUid} ${task.status}: ${task.error?.message ?? "unknown"}`);
            }
            if (Date.now() > deadline) throw new Error(`Meilisearch task ${taskUid} timed out`);
            await new Promise((resolve) => setTimeout(resolve, TASK_POLL_MS));
        }
    }
}
