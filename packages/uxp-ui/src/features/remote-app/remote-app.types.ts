export interface RemoteAppRuntimeOptions {
    html: string;
    container: HTMLElement;      // the host div where ShadowRoot is attached
    basePath?: string;           // optional data-base-route-path injection
    contentId?: string;          // optional data-uxp-content-id injection (page contentUuid)
    visible?: boolean;           // if false, keep host hidden (health)
}

export interface RemoteAppRuntimeInstance {
    mount(): void;
    unmount(): void;
}


declare global {
    interface Window {
        [key: `${string}`]: {
            initApplication: (container: ShadowRoot | HTMLElement) => undefined | (() => void);
        };
    }
}