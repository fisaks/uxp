// The room the rest of the page and the bars above it take, so that the cover is as large as fits with everything on the screen.
const ROOM_BESIDES_COVER = 440;
// The line with the next track (a caption of 20 px and the 16 px gap of the page, less the 16 px the buttons sit closer to the times)
// takes this much on a phone, where the page must not scroll for it: the cover gives up its height.
const NEXT_LINE_HEIGHT = 20;
const MIN_COVER_SIZE = 120;

const coverSize = (room: number) => `min(100%, max(${MIN_COVER_SIZE}px, calc(100dvh - ${room}px)))`;

/** The width (the cover is square) of the cover of the full screen player. */
export const NOW_PLAYING_COVER_WIDTH = { xs: coverSize(ROOM_BESIDES_COVER + NEXT_LINE_HEIGHT), sm: coverSize(ROOM_BESIDES_COVER) };
