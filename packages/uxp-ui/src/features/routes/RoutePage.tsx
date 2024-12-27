import React from "react";
import { useSelector } from "react-redux";
import DynamicComponentLoader from "../dynamic-components/DynamicComponentLoader";
import { selectPageByUuid } from "../navigation/navigationSelectors";
import RemoteApp from "./RemoteApp";

type RoutePageProps = {
    pageUuid: string;
};

const RoutePage: React.FC<RoutePageProps> = ({ pageUuid }) => {
    const page = useSelector(selectPageByUuid(pageUuid));
    return page?.contents.map((m) => {
        if (m.internalComponent) {
            return <DynamicComponentLoader key={m.uuid} componentName={m.internalComponent} />;
        } else {
            return <RemoteApp key={m.uuid} uuid={m.uuid} />;
        }
    });
};
export default RoutePage;
