import { BookStreamLink, LibraryAlbum } from "@aud/common";
import { RefObject, useEffect } from "react";
import { coverUrl } from "../library/libraryFormat";

type Details = {
    audioRef: RefObject<HTMLAudioElement | null>;
    album?: LibraryAlbum;
    artistName?: string;
    partName?: string;
    link?: BookStreamLink;
    partIndex: number;
    positionSec: number;
    speed: number;
    skipSec: number;
    onGoToPart: (index: number) => void;
};

/** The notification and the lock screen of the phone: what plays, and the buttons that work while the screen is off. */
export const useMediaSession = ({
    audioRef,
    album,
    artistName,
    partName,
    link,
    partIndex,
    positionSec,
    speed,
    skipSec,
    onGoToPart,
}: Details) => {
    useEffect(() => {
        if (!("mediaSession" in navigator) || !album) return;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: partName ? `${album.title} · ${partName}` : album.title,
            artist: artistName,
            album: album.title,
            artwork: [{ src: coverUrl("audiobooks", album.id) }],
        });
    }, [album, artistName, partName]);

    useEffect(() => {
        if (!("mediaSession" in navigator)) return;
        const session = navigator.mediaSession;
        const audio = () => audioRef.current;
        const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
            ["play", () => void audio()?.play()],
            ["pause", () => audio()?.pause()],
            ["seekbackward", () => audio() && (audio()!.currentTime -= skipSec)],
            ["seekforward", () => audio() && (audio()!.currentTime += skipSec)],
            ["seekto", (details) => audio() && details.seekTime !== undefined && (audio()!.currentTime = details.seekTime)],
            ["previoustrack", () => onGoToPart(partIndex - 1)],
            ["nexttrack", () => onGoToPart(partIndex + 1)],
        ];
        handlers.forEach(([action, handler]) => session.setActionHandler(action, handler));
        return () => handlers.forEach(([action]) => session.setActionHandler(action, null));
    }, [audioRef, skipSec, onGoToPart, partIndex]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!("mediaSession" in navigator) || !link || !audio || !Number.isFinite(audio.duration)) return;
        navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: speed,
            position: Math.min(positionSec, audio.duration),
        });
    }, [audioRef, link, positionSec, speed]);
};
