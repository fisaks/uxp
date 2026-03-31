import { AccessType, AppConfigData, GlobalConfigKey, GlobalConfigPayload, PageAppsConfigData, PageConfigData, RouteConfigData, UserRole } from "@uxp/common";

export type WellKnownInternalComponent =
    | "LoginPage" | "RegisterPage" | "RegistrationThankYouPage"
    | "MyProfilePage" | "MySettingsPage" | "StartPage" | "ControlPanelPage"
    | (string & {});

export type TagConfig = { readonly name: string };

export type AppConfig = {
    readonly name: string;
    readonly baseUrl: string;
    readonly isActive?: boolean;
    readonly config: AppConfigData;
};

export type PageConfig = {
    readonly identifier: string;
    readonly name: string;
    readonly config?: PageConfigData;
};

export type PageAppConfig<TPages extends string, TApps extends string> = {
    readonly page: TPages;
    readonly app?: TApps;
    readonly internalComponent?: WellKnownInternalComponent;
    readonly order: number;
    readonly roles?: readonly UserRole[];
    readonly config?: PageAppsConfigData;
};

export type RouteConfig<TPages extends string> = {
    readonly identifier: string;
    readonly routePattern: string;
    readonly link?: string;
    readonly page?: TPages;
    readonly config?: RouteConfigData;
    readonly accessType: AccessType;
    readonly roles?: readonly UserRole[];
};

export type RouteTagConfig<TRoutes extends string, TTags extends string> = {
    readonly route: TRoutes;
    readonly tag: TTags;
    readonly routeOrder?: number;
};

export type ManagedField<T> = {
    readonly value: T;
    readonly managed: boolean;
};

/** Per-field managed config defaults using dotted key paths */
export type GlobalConfigDefaults = {
    readonly [P in GlobalConfigKey]?: ManagedField<Extract<GlobalConfigPayload, { key: P }>["value"]>;
};
