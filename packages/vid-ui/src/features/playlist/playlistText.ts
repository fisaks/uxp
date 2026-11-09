import { Playlist } from "@vid/common";

/** The same rule as the server: names that differ only in case are one name. */
export const samePlaylistName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;

/** The playlists by name, as a list shows them. */
export const byName = (a: Playlist, b: Playlist) => a.name.localeCompare(b.name);

/** The warning colour of a button that replaces or deletes. Some themes give every button one colour that beats the colour prop. */
export const WARNING_SX = { bgcolor: "warning.main", color: "warning.contrastText", "&:hover": { bgcolor: "warning.dark" } };
