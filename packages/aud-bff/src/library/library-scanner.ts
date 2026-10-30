import { createHash } from "crypto";
import { Dirent } from "fs";
import { readdir, stat } from "fs/promises";
import { parseFile } from "music-metadata";
import path from "path";
import { ScanResult, ScannedAlbumFolder, ScannedTrack } from "./library.types";

const AUDIO_EXTENSIONS = new Set([".mp3", ".wma"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png"]);
// Tags are read a few files at a time: enough to keep the disk busy, little enough for a Raspberry Pi.
const PARALLEL_FILES = 3;
const UNKNOWN_ARTIST = "Unknown artist";
const UNKNOWN_ALBUM = "Unknown album";

/** The names a cover picture is looked for by, best first. A picture that is none of these is used last, unless it is a back or disc picture. */
const COVER_NAMES = [/^folder$/i, /^cover$/i, /^front$/i, /large/i, /small/i];
const NOT_A_COVER = /back|cd|disc|inlay|tray/i;

/** The id of a file, folder or name. The salt keeps the ids of one root from being those of another with the same paths. */
export const idOf = (relativePath: string, salt = "") =>
    createHash("sha1")
        .update(salt + relativePath)
        .digest("hex")
        .slice(0, 16);

const isVisible = (entry: Dirent) => !entry.name.startsWith(".");

/** All files below a folder, folders first-found order, as paths relative to the folder. */
const filesBelow = async (folder: string, relative = ""): Promise<string[]> => {
    const entries = (await readdir(path.join(folder, relative), { withFileTypes: true })).filter(isVisible);
    const nested = await Promise.all(entries.filter((e) => e.isDirectory()).map((e) => filesBelow(folder, path.join(relative, e.name))));
    return [...entries.filter((e) => e.isFile()).map((e) => path.join(relative, e.name)), ...nested.flat()];
};

/** The best cover picture of an album folder: pictures right in the folder go before those in subfolders such as "Artwork". */
export const pickCover = (files: string[]): string | undefined => {
    const pictures = files.filter((f) => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()));
    const rank = (file: string) => {
        const name = path.basename(file, path.extname(file));
        const byName = COVER_NAMES.findIndex((pattern) => pattern.test(name));
        if (byName !== -1) return byName;
        return NOT_A_COVER.test(name) ? undefined : COVER_NAMES.length;
    };
    return pictures
        .flatMap((file) => {
            const nameRank = rank(file);
            return nameRank === undefined ? [] : [{ file, depth: file.split(path.sep).length, nameRank }];
        })
        .sort((a, b) => a.depth - b.depth || a.nameRank - b.nameRank || a.file.localeCompare(b.file))[0]?.file;
};

const titleFromFile = (file: string) =>
    path
        .basename(file, path.extname(file))
        .replace(/^\d+\s*[-._)]*\s*/, "")
        .trim();

const trackNoFromFile = (file: string) => {
    const digits = /^(\d+)/.exec(path.basename(file))?.[1];
    return digits ? Number(digits) : undefined;
};

/** Disc folders such as "Disc 01" or "CD2" give the disc number when the tags have none. */
const discNoFromFolders = (file: string) => {
    const digits = /^(?:disc|cd)\s*(\d+)/i.exec(path.basename(path.dirname(file)))?.[1];
    return digits ? Number(digits) : undefined;
};

const positive = (value: number | null | undefined) => (value && value > 0 ? value : undefined);

type Placement = { artistName: string; albumTitle: string; folder: string };

/** Artist/Album/... gives the artist and the album from the folders. A file higher up gets placeholders. */
const placementOf = (file: string): Placement => {
    const parts = file.split(path.sep);
    if (parts.length >= 3) {
        return { artistName: parts[0], albumTitle: parts[1], folder: path.join(parts[0], parts[1]) };
    }
    return {
        artistName: parts.length === 2 ? parts[0] : UNKNOWN_ARTIST,
        albumTitle: UNKNOWN_ALBUM,
        folder: parts.slice(0, -1).join(path.sep),
    };
};

const readTrack = async (
    root: string,
    file: string,
    size: number,
    modifiedMs: number,
    salt: string
): Promise<{ track: ScannedTrack; readable: boolean }> => {
    const { artistName, folder } = placementOf(file);
    const base = {
        id: idOf(file, salt),
        albumId: idOf(folder, salt),
        artistId: idOf(artistName, salt),
        file,
        size,
        modifiedMs,
        title: titleFromFile(file),
        artist: artistName,
        trackNo: trackNoFromFile(file),
        discNo: discNoFromFolders(file),
    };
    try {
        const { common, format } = await parseFile(path.join(root, file), { duration: true, skipCovers: true });
        return {
            readable: true,
            track: {
                ...base,
                title: common.title?.trim() || base.title,
                artist: common.artist?.trim() || artistName,
                trackNo: positive(common.track.no) ?? base.trackNo,
                discNo: positive(common.disk.no) ?? base.discNo,
                durationSec: format.duration ? Math.round(format.duration) : undefined,
                year: positive(common.year),
            },
        };
    } catch {
        return { readable: false, track: base };
    }
};

const inBatches = async <T, R>(items: T[], work: (item: T) => Promise<R>): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let next = 0;
    await Promise.all(
        Array.from({ length: PARALLEL_FILES }, async () => {
            while (next < items.length) {
                const index = next++;
                results[index] = await work(items[index]);
            }
        })
    );
    return results;
};

/**
 * Walks `root/Artist/Album/...` and reads the tags of the audio files (mp3 and wma). A file that is the same size and
 * has the same modification time as in `previous` is not read again. Tags win over the names of the folders and files,
 * except for the artist and the album of an album, which are the folders.
 */
export const scanLibrary = async (root: string, previous: Map<string, ScannedTrack>, idSalt = ""): Promise<ScanResult> => {
    const files = (await filesBelow(root)).sort((a, b) => a.localeCompare(b));
    const audioFiles = files.filter((f) => AUDIO_EXTENSIONS.has(path.extname(f).toLowerCase()));

    const unreadable: string[] = [];
    const tracks = await inBatches(audioFiles, async (file) => {
        const { size, mtimeMs } = await stat(path.join(root, file));
        const known = previous.get(file);
        if (known && known.size === size && known.modifiedMs === mtimeMs) {
            return known;
        }
        const { track, readable } = await readTrack(root, file, size, mtimeMs, idSalt);
        if (!readable) unreadable.push(file);
        return track;
    });

    const folders = new Map<string, ScannedAlbumFolder>();
    for (const track of tracks) {
        const { artistName, albumTitle, folder } = placementOf(track.file);
        if (!folders.has(track.albumId)) {
            const prefix = folder === "" ? "" : `${folder}${path.sep}`;
            const own = files.filter((f) => f.startsWith(prefix)).map((f) => f.slice(prefix.length));
            const cover = pickCover(own);
            folders.set(track.albumId, {
                id: track.albumId,
                artistId: track.artistId,
                artistName,
                title: albumTitle,
                cover: cover && path.join(folder, cover),
            });
        }
    }
    return { tracks, albumFolders: [...folders.values()], unreadable };
};
