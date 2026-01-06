import { SystemAppMeta } from "@uxp/common";
import { useSelector } from "react-redux";
import { selectHealthIndicatorApps } from "../../navigation/navigationSelectors";
import { HealthRemoteApp } from "../../remote-app/HealthRemoteApp";

export const HealthBootstraps = () => {
    const healthApps: SystemAppMeta[] = useSelector(selectHealthIndicatorApps())

    return healthApps.map(h => {
        return <HealthRemoteApp key={h.appId} appIdentifier={h.appId} />
    })
    
}