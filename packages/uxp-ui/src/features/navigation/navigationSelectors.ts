import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../../app/store";
import { NavigationRoute } from "@uxp/common";

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

const mapRoutesToLinks = (routes: NavigationRoute[]) =>
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
            pageIdentifier: route.page?.identifier,
            config: route.config,
        }))
    );

export const selectPageByIdentifier = (identifier: string) =>
    createSelector(selectNavigationState, (navigationState) => navigationState.pageLookup[identifier]);

export const selectSystemApps = () =>
    createSelector(selectNavigationState, (navigationState) => navigationState.system);

export const selectSystemPanelApps = () =>
    createSelector(selectSystemApps(), (systemApps) => systemApps.filter((app) => app.capabilities.systemPanel));

export const selectHealthIndicatorApps = () =>
    createSelector(selectSystemApps(), (systemApps) => systemApps.filter((app) => app.capabilities.health));