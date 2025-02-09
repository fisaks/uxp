import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../../app/store";

export type RouteLink = {
    label: string;
    link: string;
};

export const selectNavigationState = (state: RootState) => state.navigation;

const selectRoutesByTagName = (tagName: string) =>
    createSelector(selectNavigationState, (navigationState) => {
        const tagOrder = navigationState.tags[tagName] ?? [];

        return navigationState.routes
            .filter((route) => tagOrder.includes(route.identifier))
            .sort((a, b) => tagOrder.indexOf(a.identifier) - tagOrder.indexOf(b.identifier));
    });
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRoutesToLinks = (routes: any[]) =>
    routes.map((route) => ({
        link: route.link,
        label: route.page?.name,
    })) as RouteLink[];

export const selectLinksForHeaderMenu = () => createSelector(selectRoutesByTagName("header-menu"), mapRoutesToLinks);

export const selectLinksForProfileIcon = () => createSelector(selectRoutesByTagName("profile-icon"), mapRoutesToLinks);

export const selectLinksByTag = (tagName: string) => createSelector(selectRoutesByTagName(tagName), mapRoutesToLinks);

export const selectAllRoutes = () =>
    createSelector(selectNavigationState, (navigationState) =>
        navigationState.routes.map((route) => ({
            routePattern: route.routePattern,
            pageUuid: route.page?.uuid,
            config: route.config,
        }))
    );

export const selectPageByUuid = (uuid: string) =>
    createSelector(selectNavigationState, (navigationState) => navigationState.pageLookup[uuid]);
