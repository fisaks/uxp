const managedFieldSchema = {
    type: "object",
    required: ["value", "managed"],
    properties: {
        value: {},
        managed: { type: "boolean" },
    },
};

export const ApplyConfigSchema = {
    body: {
        type: "object",
        required: ["tags", "apps", "pages", "pageApps", "routes", "routeTags"],
        properties: {
            tags: {
                type: "array",
                items: {
                    type: "object",
                    required: ["name"],
                    properties: { name: { type: "string" } },
                },
            },
            apps: {
                type: "array",
                items: {
                    type: "object",
                    required: ["name", "baseUrl", "config"],
                    properties: {
                        name: { type: "string" },
                        baseUrl: { type: "string" },
                        isActive: { type: "boolean" },
                        config: { type: "object" },
                    },
                },
            },
            pages: {
                type: "array",
                items: {
                    type: "object",
                    required: ["identifier", "name"],
                    properties: {
                        identifier: { type: "string" },
                        name: { type: "string" },
                        config: { type: "object" },
                    },
                },
            },
            pageApps: {
                type: "array",
                items: {
                    type: "object",
                    required: ["page", "order"],
                    properties: {
                        page: { type: "string" },
                        app: { type: "string" },
                        internalComponent: { type: "string" },
                        order: { type: "number" },
                        roles: { type: "array", items: { type: "string" } },
                        config: { type: "object" },
                    },
                },
            },
            routes: {
                type: "array",
                items: {
                    type: "object",
                    required: ["identifier", "routePattern", "accessType"],
                    properties: {
                        identifier: { type: "string" },
                        routePattern: { type: "string" },
                        link: { type: "string" },
                        page: { type: "string" },
                        config: { type: "object" },
                        accessType: { type: "string", enum: ["unauthenticated", "authenticated", "role-based"] },
                        roles: { type: "array", items: { type: "string" } },
                    },
                },
            },
            routeTags: {
                type: "array",
                items: {
                    type: "object",
                    required: ["route", "tag"],
                    properties: {
                        route: { type: "string" },
                        tag: { type: "string" },
                        routeOrder: { type: "number" },
                    },
                },
            },
            globalConfig: {
                type: "object",
                properties: {
                    siteName: managedFieldSchema,
                },
            },
        },
    },
};
