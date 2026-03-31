// --- Notification config ---

export type SmtpConfig = {
    host: string;
    port: number;
    secure: boolean;      // true = TLS (465), false = STARTTLS (587)
    user: string;
    password: string;     // stored encrypted in DB
    from: string;         // e.g. "UXP Platform <noreply@example.com>"
};

export type EmailChannelConfig = {
    enabled: boolean;
    smtp?: SmtpConfig;
    recipients?: string[];
};

export type NotificationConfig = {
    email?: EmailChannelConfig;
    // future: push?: PushChannelConfig;
    // future: slack?: SlackChannelConfig;
};

// --- Health check config ---

export type TlsCertCheckConfig = {
    enabled: boolean;
    domain: string;           // defaults to DOMAIN_NAME env var if empty
    warnDays: number;         // default 14
    errorDays: number;        // default 7
    intervalHours: number;    // default 6
};

export type HealthChecksConfig = {
    tlsCert?: TlsCertCheckConfig;
};

// --- Global config ---

/** Public fields — returned by unauthenticated GET, used by UI shell */
export type GlobalConfigPublic = {
    siteName: string;
};

/** Full config — admin-only read/write. Extends public with sensitive sections */
export type GlobalConfigData = GlobalConfigPublic & {
    notification?: NotificationConfig;
    healthChecks?: HealthChecksConfig;
};

export type FullGlobalConfigResponse = {
    updatedAt: string;
    config: GlobalConfigData;
};

export type PublicGlobalConfigResponse = {
    updatedAt: string;
    config: GlobalConfigPublic;
};

/** Generates all dotted key paths for an object type, e.g. "notification.smtp.host" */
type DotPaths<T, Prefix extends string = ""> = {
    [K in keyof T & string]: T[K] extends unknown[]
        ? `${Prefix}${K}`
        : T[K] extends object | undefined
            ? `${Prefix}${K}` | DotPaths<NonNullable<T[K]>, `${Prefix}${K}.`>
            : `${Prefix}${K}`;
}[keyof T & string];

/** Maps a dotted key path to its value type */
type DotPathValue<T, Path extends string> =
    Path extends `${infer Head}.${infer Rest}`
        ? Head extends keyof T
            ? DotPathValue<NonNullable<T[Head]>, Rest>
            : never
        : Path extends keyof T
            ? NonNullable<T[Path]>
            : never;

/** Discriminated union of { key, value } for all valid dotted paths */
type FieldPatch<T> = {
    [P in DotPaths<Required<T>>]: { key: P; value: DotPathValue<Required<T>, P> };
}[DotPaths<Required<T>>];

export type GlobalConfigKey = DotPaths<Required<GlobalConfigData>>;
export type GlobalConfigPayload = FieldPatch<GlobalConfigData>;

