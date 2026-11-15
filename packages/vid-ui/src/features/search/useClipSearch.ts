import { useSearchClipsQuery } from "../home-video/home-video.api";
import { useSettledQuery } from "./useSearchDebounce";

/** The ids of the clips that match the words, best first. Undefined while there are no words or no answer yet; a failed search has no answer. */
export const useClipSearch = (query: string) => {
    const settled = useSettledQuery(query);
    // `data` is the answer of an earlier query until the new one comes, so the list does not flash.
    const { data } = useSearchClipsQuery(settled, { skip: !settled });
    return query ? data : undefined;
};
