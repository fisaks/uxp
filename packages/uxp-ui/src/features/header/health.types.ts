export type HealthLevel = "unknown" | "ok" | "warning" | "error";

export type HealthItem = {
    id: string;
    appId: string;
    level: "unknown" | "warning" | "error"; // items are non-ok (or unknown)
    title: string;
    message?: string;
    action?: {
        label: string;
        to: string; // React Router link for now
    };
};

export type AppHealthSnapshot = {
    appId: string;
    appName: string;
    // undefined => not reporting => unknown
    items?: HealthItem[];
};
