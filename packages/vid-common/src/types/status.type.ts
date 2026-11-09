/** What the VID server reports about itself. */
export type VidStatus = {
    /** The folder with the videos exists and can be read. */
    mediaRootAvailable: boolean;
    /** The search index is set up, so the search endpoint answers. */
    searchAvailable: boolean;
};
