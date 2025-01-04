import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../../app/store";

export type RouteLink = {
    label: string;
    link: string;
};

export const selectNavigationState = (state: RootState) => state.navigation;

const selectRoutesByGroupName = (groupName: string) =>
    createSelector(selectNavigationState, (navigationState) =>
        navigationState.routes.filter((route) => route.groupName === groupName)
    );

const mapRoutesToLinks = (routes: any[]) =>
    routes.map((route) => ({
        link: route.link,
        label: route.page?.name,
    })) as RouteLink[];

export const selectLinksForHeaderMenu = () => createSelector(selectRoutesByGroupName("header-menu"), mapRoutesToLinks);

export const selectLinksForProfileIcon = () =>
    createSelector(selectRoutesByGroupName("profile-icon"), mapRoutesToLinks);

export const selectLinksByGroupName = (groupName: string) =>
    createSelector(selectRoutesByGroupName(groupName), mapRoutesToLinks);

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
