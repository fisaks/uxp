export type ChromecastConfig = {
    /** Host name or IP address of the Chromecast. When not set, the Chromecast is not watched. */
    host?: string;
};

export const chromecastConfig: ChromecastConfig = {
    host: process.env.AUD_CHROMECAST_HOST || undefined,
};
