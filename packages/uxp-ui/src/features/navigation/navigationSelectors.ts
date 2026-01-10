import { createSelector } from "@reduxjs/toolkit";

import { NavigationRoute } from "@uxp/common";
import { RootState } from "../../app/uxp.store";

export type RouteLink = {
    label: string;
    link: string;
};

export const selectNavigationState = (state: RootState) => state.navigation;

export const selectNavigationTags = createSelector(
    selectNavigationState,
    navigationState => navigationState.tags ?? {}
);

export const selectNavigationRoutes = createSelector(
    selectNavigationState,
    navigationState => navigationState.routes ?? []
);

const selectNavigationPageLookup = createSelector(
    selectNavigationState,
    navigationState => navigationState.pageLookup ?? {}
);

const selectNavigationSystemApps = createSelector(
    selectNavigationState,
    navigationState => navigationState.system ?? []
);

export const selectRoutesByIdentifierMap = createSelector(
    selectNavigationRoutes,
    (routes) => {
        const map = new Map<string, NavigationRoute>();
        for (const route of routes) {
            map.set(route.identifier, route);
        }

        return map;
    }
);

export const selectRoutesByTagMap = createSelector(
    [
        selectRoutesByIdentifierMap,
        selectNavigationTags,
    ],
    (routeById, tags) => {

        const result = new Map<string, NavigationRoute[]>();

        for (const [tagName, identifiers] of Object.entries(tags)) {
            const orderedRoutes: NavigationRoute[] = [];

            for (const id of identifiers) {
                const route = routeById.get(id);
                if (route) {
                    orderedRoutes.push(route);
                }
            }

            result.set(tagName, orderedRoutes);
        }

        return result;
    }
);

const mapRoutesToLinks = (routes: NavigationRoute[]) =>
    routes.map((route) => ({
        link: route.link,
        label: route.page?.name,
    })) as RouteLink[];

export const selectLinksForHeaderMenu = createSelector(
    selectRoutesByTagMap, (routesByTag) => {
        const routes = routesByTag.get("header-menu") || [];
        return mapRoutesToLinks(routes);
    }
);

export const selectLinksForProfileIcon = createSelector(
    selectRoutesByTagMap, (routesByTag) => {
        const routes = routesByTag.get("profile-icon") || [];
        return mapRoutesToLinks(routes);
    }
);

const mapRoute = (route: NavigationRoute) => ({
    routePattern: route.routePattern,
    pageIdentifier: route.page?.identifier,
    routeIdentifier: route.identifier,
    config: route.config,
});
export const selectAllRoutes =
    createSelector(selectNavigationRoutes, (routes) =>
        routes.map(mapRoute)
    );

export const selectLinksByTagLookup = createSelector(
    selectRoutesByTagMap,
    (routesByTag) => {
        const lookup = new Map<string, RouteLink[]>();
        for (const [tag, routes] of routesByTag.entries()) {
            lookup.set(tag, mapRoutesToLinks(routes));
        }
        return lookup;
    }
);
export const selectPageByIdentifierLookup = selectNavigationPageLookup;

export const selectSystemAppsLookup = selectNavigationSystemApps;


export const selectSystemPanelApps = createSelector(selectNavigationSystemApps, (systemApps) => systemApps.filter((app) => app.capabilities.systemPanel));

export const selectHealthIndicatorApps = createSelector(selectNavigationSystemApps, (systemApps) => systemApps.filter((app) => app.capabilities.health));