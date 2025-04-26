import { AsyncContent, mapApiErrorsToMessageString, PrintPreview, useSafeState } from "@uxp/ui-lib";


import { HouseGetVersionResponse } from "@h2c/common";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { HousePreview } from "../components/HousePreview";
import { fetchHouseVersion } from "../house.api";



export const HousePrintPreviewPage = () => {
    const { houseId, version } = useParams()
    const [houseVersion, setHouseVersion] = useSafeState<HouseGetVersionResponse | undefined>(undefined)
    const [loading, setLoading] = useSafeState(true);
    const [error, setError] = useSafeState<string | undefined>(undefined);

    const loadHouseVersion = () => {
        setLoading(true);
        fetchHouseVersion(houseId as string, parseInt(version as string)).then((h) => {
            setHouseVersion(h)
        }).catch((e) => {
            console.error(e);
            setError(mapApiErrorsToMessageString(error, { NOT_FOUND: "House Not Found" }))
        }).finally(() => {
            setLoading(false);
        })

    }

    useEffect(() => {
        loadHouseVersion();
    }, [houseId, version])

    useEffect(() => {
        if (houseVersion) {
            setError(undefined);
        }
    }, [houseVersion])

    const house = houseVersion?.data;

    return (<AsyncContent
        loading={loading} props={{ loading: { fullHeight: true } }}
        error={error}
        noContent={!house ? "No House loaded" : undefined}
        onRetry={loadHouseVersion}
    >
        <PrintPreview title={house?.name} meta={{ version: `${houseVersion?.version}`, createdAt: houseVersion?.createdAt }} >
            <HousePreview houseVersion={houseVersion} />

        </PrintPreview>
    </AsyncContent >)


}