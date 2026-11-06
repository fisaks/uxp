import { HistoryPlay } from "@aud/common";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { Alert, Box, ButtonBase, Paper, Snackbar, Switch, Typography } from "@mui/material";
import React from "react";
import { Link } from "react-router-dom";
import { useAppSelector } from "../../hooks";
import { MENU_ITEMS } from "../../menu";
import { selectAmplifierState } from "../amplifier/amplifierSelectors";
import { useAmplifierCommand } from "../amplifier/useAmplifierCommand";
import { dayAndTime } from "../history/historyFormat";
import { AlbumCover } from "../library/AlbumCover";
import { TrackCover } from "../library/TrackCover";
import { NOW_PLAYING_PATH } from "../player/nowPlayingPath";
import { nowPlayingText } from "../player/nowPlayingText";
import { selectCurrentTrack, selectPlayerState, selectSpotify } from "../player/playerSelectors";
import { useRequest } from "../shared/useRequest";
import { ScanLibraries } from "./ScanLibraries";

const COVER_SIZE = 72;
const MOSAIC_COVERS = 4;

type TileProps = {
    to: string;
    icon: React.ReactElement;
    title: string;
    /** Lines of live information, the first one the most important. */
    lines: (string | undefined)[];
    picture?: React.ReactNode;
    /** A control in the top right corner, outside the link of the tile. */
    action?: React.ReactNode;
};

const Tile: React.FC<TileProps> = ({ to, icon, title, lines, picture, action }) => (
    <Paper variant="outlined" sx={{ overflow: "hidden", position: "relative" }}>
        <ButtonBase
            component={Link}
            to={to}
            sx={{
                display: "flex",
                width: "100%",
                height: "100%",
                minHeight: 112,
                p: 1.5,
                gap: 1.5,
                textAlign: "left",
                alignItems: "stretch",
            }}
        >
            <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 0.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "primary.main" }}>
                    {icon}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {title}
                    </Typography>
                </Box>
                <Box>
                    {lines.filter(Boolean).map((line, index) => (
                        <Typography key={index} variant="body2" color={index === 0 ? "text.primary" : "text.secondary"} noWrap>
                            {line}
                        </Typography>
                    ))}
                </Box>
            </Box>
            {picture && (
                <Box sx={{ display: { xs: "none", sm: "block" }, width: COVER_SIZE, flexShrink: 0, alignSelf: "center" }}>{picture}</Box>
            )}
        </ButtonBase>
        {action && <Box sx={{ position: "absolute", top: 4, right: 4 }}>{action}</Box>}
    </Paper>
);

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

/** The covers of what was played last, one album once: a 2x2 picture of up to four, or one big cover when there are fewer. */
const RecentCovers: React.FC<{ plays: HistoryPlay[] }> = ({ plays }) => {
    const covers = new Map<string, { albumId: string; hasCover: boolean }>();
    for (const { track } of plays) {
        if (track?.hasCover && track.collection === "music" && !covers.has(track.albumId)) {
            covers.set(track.albumId, { albumId: track.albumId, hasCover: true });
        }
        if (covers.size === MOSAIC_COVERS) break;
    }
    const list = [...covers.values()];
    if (list.length === 0) return null;
    if (list.length < MOSAIC_COVERS) return <AlbumCover collection="music" albumId={list[0].albumId} hasCover />;
    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            {list.map((cover) => (
                <AlbumCover key={cover.albumId} collection="music" albumId={cover.albumId} hasCover />
            ))}
        </Box>
    );
};

const useAmplifierLine = (): string | undefined => {
    const state = useAppSelector(selectAmplifierState);
    if (!state?.status || !state.info) return state?.reachable === false ? "Cannot be reached" : undefined;
    const { status, info } = state;
    if (!state.reachable) return "Cannot be reached";
    if (!status.power) return "Off";
    const input = info.inputs.find((candidate) => candidate.id === status.input)?.label ?? status.input;
    return ["On", input, status.muted ? "muted" : `${status.volumeDb} dB`].join(" · ");
};

/** The places of the app as tiles, each telling what is going on there. */
export const HomePage: React.FC = () => {
    const amplifierLine = useAmplifierLine();
    const amplifier = useAppSelector(selectAmplifierState);
    const { send: sendAmplifier, error: amplifierError, clearError } = useAmplifierCommand();
    const player = useAppSelector(selectPlayerState);
    const track = useAppSelector(selectCurrentTrack);
    const spotify = useAppSelector(selectSpotify);
    const { data: library } = useRequest("library_get_artists", {});
    const { data: books } = useRequest("audiobook_get_authors", {});
    const { data: playlists } = useRequest("playlist_list", {});
    const { data: history } = useRequest("history_get", {});

    const albumCount = library?.artists.reduce((sum, artist) => sum + artist.albumCount, 0) ?? 0;
    const bookCount = books?.artists.reduce((sum, author) => sum + author.albumCount, 0) ?? 0;
    const continuing = books?.continueListening[0];
    const lastPlay = history?.plays[0];
    const lastPlayedPlaylist = playlists
        ?.filter((playlist) => playlist.lastPlayedAt)
        .sort((a, b) => b.lastPlayedAt!.localeCompare(a.lastPlayedAt!))[0];
    const changed = playlists?.length ? playlists.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)) : undefined;

    const content: Record<string, Pick<TileProps, "lines" | "picture">> = {
        [NOW_PLAYING_PATH]: {
            lines: spotify
                ? [spotify.title, spotify.artist]
                : player && track && player.currentIndex !== undefined
                  ? (({ title, subtitle }) => [title, subtitle])(nowPlayingText(player.queue, player.currentIndex))
                  : ["Nothing is playing"],
            picture: spotify ? (
                <AlbumCover collection="music" albumId="" hasCover={!!spotify.coverUrl} imageUrl={spotify.coverUrl} banner="Spotify" />
            ) : (
                track && <TrackCover track={track} />
            ),
        },
        "/amplifier": {
            lines: [amplifierLine, amplifier?.status?.tuner?.programService || undefined],
        },
        "/library": {
            lines: library ? [`${plural(library.artists.length, "artist")} · ${plural(albumCount, "album")}`] : [],
            picture: history && <RecentCovers plays={history.plays} />,
        },
        "/audiobooks": {
            lines: books ? [plural(bookCount, "book"), continuing ? `Latest listened: ${continuing.album.title}` : undefined] : [],
        },
        "/playlists": {
            lines: playlists
                ? [
                      plural(playlists.length, "playlist"),
                      lastPlayedPlaylist ? `Played: ${lastPlayedPlaylist.name}` : undefined,
                      changed ? `Changed: ${changed.name}` : undefined,
                  ]
                : [],
        },
        "/queue": {
            lines: spotify
                ? [`Spotify · ${plural(spotify.upcoming.length, "track")} next`, `Now: ${spotify.title}`]
                : player && player.queue.length > 0 && player.currentIndex !== undefined
                  ? [
                        plural(player.queue.length, player.queue[0].collection === "audiobooks" ? "part" : "track"),
                        `Now: ${nowPlayingText(player.queue, player.currentIndex).title}`,
                    ]
                  : ["Empty"],
        },
        "/history": {
            lines: lastPlay ? [lastPlay.name, dayAndTime(lastPlay.playedAt)] : history ? ["Nothing played yet"] : [],
        },
    };

    const amplifierPowerSwitch = amplifier?.status && (
        <Switch
            checked={amplifier.status.power}
            disabled={!amplifier.reachable}
            onChange={(_event, on) => sendAmplifier("amplifier_set_power", { on })}
            slotProps={{ input: { "aria-label": "Amplifier power" } }}
        />
    );

    return (
        <>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(auto-fill, minmax(260px, 1fr))" }, gap: 1.5 }}>
                {MENU_ITEMS.map((item) => {
                    const { lines, picture } = content[item.path];
                    return (
                        <React.Fragment key={item.path}>
                            <Tile
                                to={item.path}
                                icon={item.icon}
                                title={item.label}
                                lines={lines}
                                picture={picture}
                                action={item.path === "/amplifier" && amplifier?.status && amplifierPowerSwitch}
                            />
                            {/* Next to the audiobooks, to go on with the book that was listened to last. */}
                            {item.path === "/audiobooks" && continuing && (
                                <Tile
                                    to={`/audiobooks/book/${continuing.album.id}`}
                                    icon={<PlayArrowIcon />}
                                    title="Continue"
                                    lines={[
                                        continuing.album.title,
                                        continuing.artist.name,
                                        continuing.totalSec > 0
                                            ? `${Math.floor((100 * continuing.listenedSec) / continuing.totalSec)} %`
                                            : undefined,
                                    ]}
                                    picture={
                                        <AlbumCover
                                            collection="audiobooks"
                                            albumId={continuing.album.id}
                                            hasCover={continuing.album.hasCover}
                                        />
                                    }
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </Box>
            <ScanLibraries />
            <Snackbar open={amplifierError !== undefined} autoHideDuration={6000} onClose={clearError}>
                <Alert severity="error" onClose={clearError}>
                    {amplifierError}
                </Alert>
            </Snackbar>
        </>
    );
};
