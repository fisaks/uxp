export type MenuItemMetadata = {
    sidebar: boolean;
    external: boolean;
};

export type MenuItemPublic = {
    name: string;
    url: string;
    metadata: MenuItemMetadata; // Or you can use a more specific type if needed
};

export type MenuItemResponse = {
    menuItems: MenuItemPublic[];
};
