import { AsyncContent, mapApiErrorsToMessageString, PrintPreview, ReadOnlyTextField, useSafeState } from "@uxp/ui-lib";


import { HouseGetVersionResponse } from "@h2c/common";
import { Box, Divider, Grid2 } from "@mui/material";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { DocumentPreview } from "../../document/components/DocumentPreview";
import { FieldKeyViewer } from "../../field-key/FieldKeyViewer";
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
        <PrintPreview title={house?.name} meta={{}} >
            <Box sx={{ mt: 0, pt: 2 }}>

                <Grid2 container spacing={2} >

                    <Grid2 size={6} >
                        <ReadOnlyTextField
                            label="House Name"
                            value={house?.name}
                        />
                    </Grid2>
                    <Grid2 size={2}>
                        <ReadOnlyTextField
                            label="Year Built"
                            value={house?.yearBuilt ?? " "}
                        />
                    </Grid2>
                    <Grid2 size={4}>
                        <ReadOnlyTextField
                            label="Legal Registration Number"
                            value={house?.legalRegistrationNumber ?? " "}
                        />
                    </Grid2>
                    <Grid2 size={12}>
                        <ReadOnlyTextField
                            label="Address"
                            value={house?.address ?? " "}
                        />
                    </Grid2>
                    <Grid2 size={12}>
                        <Divider textAlign="center" sx={{ fontWeight: 'bold' }}>Additional Details</Divider>

                        <FieldKeyViewer
                            printLayout
                            value={house?.details ?? {}}
                        />

                    </Grid2>
                    <Grid2 size={12}>
                        <Divider textAlign="center" sx={{ fontWeight: 'bold' }}>{house?.name} Notes</Divider>
                        <DocumentPreview documentId={house?.documentId!} version={`${house?.documentVersion}`} />
                    </Grid2>
                    {house?.buildings?.map((building) => (<>
                        <Grid2 key={building.uuid} size={12}>
                            <Divider textAlign="center" sx={{ fontWeight: 'bold' }}>{building.name}</Divider>
                        </Grid2>
                        <Grid2 size={6} >
                            <ReadOnlyTextField
                                label="Building Name"
                                value={building?.name}
                            />
                        </Grid2>
                        <Grid2 size={2}>
                            <ReadOnlyTextField
                                label="Year Built"
                                value={building?.yearBuilt ?? " "}
                            />
                        </Grid2>

                        <Grid2 size={12}>
                            <Divider textAlign="center" sx={{ fontWeight: 'bold' }}>{building.name} Additional Details</Divider>

                            <FieldKeyViewer
                                printLayout
                                value={building?.details ?? {}}
                            />

                        </Grid2>


                        <Grid2 size={12}>
                            <Divider textAlign="center" sx={{ fontWeight: 'bold' }}>{building?.name} Notes</Divider>
                            <DocumentPreview documentId={building.documentId} version={`${building.documentVersion}`} />
                        </Grid2>

                    </>

                    ))}
                </Grid2>
            </Box>

        </PrintPreview>
    </AsyncContent >)


}