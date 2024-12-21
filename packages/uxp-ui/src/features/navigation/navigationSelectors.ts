import { createSelector } from "@reduxjs/toolkit";

import { RootState } from "../../app/store";

export const selectNavigationState = (state: RootState) => state.navigation;

export const selectRoutesByGroupName = (groupName: string) =>
    createSelector(selectNavigationState, (navigationState) =>
        navigationState.routes.filter((route) => route.groupName === groupName)
    );

const mapRoutesToLinks = (routes: any[]) =>
    routes.map((route) => ({
        link: route.link,
        label: route.page?.name,
    }));

export const selectLinksForHeaderMenu = () => createSelector(selectRoutesByGroupName("header-menu"), mapRoutesToLinks);

export const selectLinksForProfileIcon = () =>
    createSelector(selectRoutesByGroupName("profile-icon"), mapRoutesToLinks);

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
