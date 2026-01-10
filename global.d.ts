declare global {
    interface Window {
        __UXP_PORTAL__?: boolean;
        uxp?: {
            theme?: unknown;
            defaultTheme: string;
            updateTheme: (mode: unknown) => void;
            getUser: () => unknown | undefined;
            // Remote → UXP
            signal: {
                health: (snapshot: unknown) => void;
            };
            navigation: {
                updateRemoteSubRoute: (rootpath: string, subRoute: string) => void;
                requestBaseNavigation: (type: "route" | "hash", identifier: string, subRoute?: string) => void;
            }
        };
    }
}

export { };
