declare global {
    interface Window {
        __UXP_PORTAL__?: boolean;
        uxp?: {
            theme?: unknown;
            defaultTheme?: string;
            updateTheme?: (mode: unknown) => void;
        };
    }
}

export {};
