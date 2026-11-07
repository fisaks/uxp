/** How a Chromecast reaches this server: its address on the network, with the port. Without it casting is off. */
const baseUrl = process.env.VID_PUBLIC_BASE_URL?.replace(/\/+$/, "") || undefined;

export const castConfig = { baseUrl };
export type CastConfig = typeof castConfig;
