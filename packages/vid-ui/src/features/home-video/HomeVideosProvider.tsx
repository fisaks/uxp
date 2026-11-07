import { HomeVideoClip, HomeVideoClipUpdate, HomeVideoLabels } from "@vid/common";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchClips, fetchLabels, patchClip } from "../../api/home-video-api";
import { compareClips } from "./clipFormat";

type HomeVideos = {
    /** The clips in the order of the timeline. Undefined until they are read. */
    clips: HomeVideoClip[] | undefined;
    labels: HomeVideoLabels;
    /** Why the clips could not be read, when they could not. */
    loadError: boolean;
    /** Why the last change was not saved. */
    saveError: string | undefined;
    clearSaveError: () => void;
    /** Shows the change at once and saves it; the clip goes back to what it was if saving fails. */
    updateClip: (id: string, update: HomeVideoClipUpdate) => Promise<void>;
};

const NO_LABELS: HomeVideoLabels = { people: [], tags: [] };

const HomeVideosContext = createContext<HomeVideos | undefined>(undefined);

export const useHomeVideos = () => {
    const value = useContext(HomeVideosContext);
    if (!value) throw new Error("useHomeVideos needs a HomeVideosProvider");
    return value;
};

export const HomeVideosProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    const [clips, setClips] = useState<HomeVideoClip[]>();
    const [labels, setLabels] = useState(NO_LABELS);
    const [loadError, setLoadError] = useState(false);
    const [saveError, setSaveError] = useState<string>();

    const replaceClip = useCallback(
        (clip: HomeVideoClip) => setClips((current) => current?.map((c) => (c.id === clip.id ? clip : c))),
        []
    );

    useEffect(() => {
        fetchClips()
            .then((all) => setClips([...all].sort(compareClips)))
            .catch(() => setLoadError(true));
        fetchLabels()
            .then(setLabels)
            .catch(() => undefined);
    }, []);

    const updateClip = useCallback(
        async (id: string, update: HomeVideoClipUpdate) => {
            const before = clips?.find((c) => c.id === id);
            if (!before) return;
            replaceClip({ ...before, ...update } as HomeVideoClip);
            try {
                replaceClip(await patchClip(id, update));
                fetchLabels()
                    .then(setLabels)
                    .catch(() => undefined);
            } catch {
                replaceClip(before);
                setSaveError("The change could not be saved.");
            }
        },
        [clips, replaceClip]
    );

    const clearSaveError = useCallback(() => setSaveError(undefined), []);
    const value = useMemo(
        () => ({ clips, labels, loadError, saveError, clearSaveError, updateClip }),
        [clips, labels, loadError, saveError, clearSaveError, updateClip]
    );
    return <HomeVideosContext.Provider value={value}>{children}</HomeVideosContext.Provider>;
};
