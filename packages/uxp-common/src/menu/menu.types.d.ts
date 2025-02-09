export type MenuItemMetadata = {
    sidebar: boolean;
    external: boolean;
};
export type MenuItemPublic = {
    name: string;
    url: string;
    metadata: MenuItemMetadata;
};
export type MenuItemResponse = {
    menuItems: MenuItemPublic[];
};
//# sourceMappingURL=menu.types.d.ts.map