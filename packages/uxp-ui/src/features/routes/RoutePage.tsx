import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { generateFullLink } from "@uxp/common";

import { MainPageLayout } from "../../components/layout/MainPageLayout";
import DynamicComponentLoader from "../dynamic-components/DynamicComponentLoader";
import { selectLinksByTagLookup, selectPageByIdentifierLookup } from "../navigation/navigationSelectors";
import { PageRemoteApp } from "../remote-app/PageRemoteApp";

type RoutePageProps = {
    pageIdentifier: string;
    basePath?: string;
};

const RoutePage: React.FC<RoutePageProps> = ({ pageIdentifier, basePath }) => {
    const pages = useSelector(selectPageByIdentifierLookup);
    const page = pages[pageIdentifier];
    const location = useLocation();
    const linksByTag = useSelector(selectLinksByTagLookup);
    const links = linksByTag.get(page?.config.pageType === "leftNavigation" ? (page.config.routeLinkGroup ?? "") : "") || [];
    const sidebarMenuItems = useMemo(() => {
        return links.map(({ label, link }) => {
            const fullLink = generateFullLink(basePath, link);
            return {
                label,
                link: fullLink,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullLink,
            };
        });
    }, [links, basePath, location.pathname]);

    return (
        <MainPageLayout pageType={page!.config.pageType} leftSideBar={{ menuItems: sidebarMenuItems }}>
            {page?.contents.map((m) => {
                if (m.internalComponent) {
                    return <DynamicComponentLoader key={m.uuid} componentName={m.internalComponent} basePath={basePath} />;
                } else {
                    return <PageRemoteApp key={m.uuid} contentUuid={m.uuid} basePath={basePath} />;
                }
            })}
        </MainPageLayout>
    );
};
export default RoutePage;
