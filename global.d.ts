declare global {
    interface Window {
        __UXP_PORTAL__?: boolean;
        uxp?: {
            theme?: unknown;
            updateTheme?: (mode: unknown) => void;
        };
    }
}

export {};
