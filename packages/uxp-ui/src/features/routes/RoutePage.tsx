import React from "react";
import { useSelector } from "react-redux";
import DynamicComponentLoader from "../dynamic-components/DynamicComponentLoader";
import { selectPageByUuid } from "../navigation/navigationSelectors";

type RoutePageProps = {
    pageUuid: string;
};

const RoutePage: React.FC<RoutePageProps> = ({ pageUuid }) => {
    const page = useSelector(selectPageByUuid(pageUuid));
    return page?.contents.map((m) => {
        if (m.internalComponent) {
            return <DynamicComponentLoader key={m.uuid} componentName={m.internalComponent} />;
        } else {
            return <div key={m.uuid}>Remote component</div>;
        }
    });
};
export default RoutePage;
