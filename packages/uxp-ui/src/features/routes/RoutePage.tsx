import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation } from "react-router-dom";

import { PageLayout } from "@uxp/ui-lib";
import DynamicComponentLoader from "../dynamic-components/DynamicComponentLoader";
import { selectLinksByGroupName, selectPageByUuid } from "../navigation/navigationSelectors";
import RemoteApp from "./RemoteApp";

type RoutePageProps = {
    pageUuid: string;
    basePath?: string;
};

const generateFullLink = (basePath: string | undefined, link: string) => {
    if (!basePath || link.startsWith("/")) return link;
    return basePath.endsWith("/") ? `${basePath}${link}` : `${basePath}/${link}`;
};

const RoutePage: React.FC<RoutePageProps> = ({ pageUuid, basePath }) => {
    const page = useSelector(selectPageByUuid(pageUuid));

    const location = useLocation();

    const sidebarMenuItems = useMemo(() => {
        return (
            page?.config.pageType === "leftNavigation" && page.config.routeLinkGroup
                ? useSelector(selectLinksByGroupName(page.config.routeLinkGroup))
                : []
        ).map(({ label, link }) => {
            const fullLink = generateFullLink(basePath, link);
            return {
                label,
                link: fullLink,
                component: Link,
                componentProp: "to",
                active: location.pathname === fullLink,
            };
        });
    }, [page, basePath, location.pathname]);

    return (
        <PageLayout pageType={page!.config.pageType} leftSideBar={{ menuItems: sidebarMenuItems }}>
            {page?.contents.map((m) => {
                if (m.internalComponent) {
                    return <DynamicComponentLoader key={m.uuid} componentName={m.internalComponent} />;
                } else {
                    return <RemoteApp key={m.uuid} contentUuid={m.uuid} />;
                }
            })}
        </PageLayout>
    );
};
export default RoutePage;
