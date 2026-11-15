import { SearchIndexSettings } from "@uxp/bff-common";
import { HOME_VIDEO_SEARCH_INDEX, HomeVideoClip, HomeVideoSearchDoc } from "@vid/common";
import { LibrarySearch, meiliEnv } from "../search/library-search";

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

/** The search of the home videos, which are the truth for their index. */
export const homeVideoSearch = (clips: () => HomeVideoClip[]) =>
    new LibrarySearch(
        { index: HOME_VIDEO_SEARCH_INDEX, settings: SETTINGS, what: "home video clips", docs: () => clips().map(toDoc) },
        meiliEnv()
    );
