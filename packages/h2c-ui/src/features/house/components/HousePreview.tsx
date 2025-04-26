import { BuildingData, BuildingDataVersion, House, HouseDataVersion, HouseGetVersionResponse } from "@h2c/common"
import { Box, Divider, Grid2 } from "@mui/material"
import { ReadOnlyTextField } from "@uxp/ui-lib"
import { DocumentPreview } from "../../document/components/DocumentPreview"
import { FieldKeyViewer } from "../../field-key/FieldKeyViewer"

type HousePreviewProps = {
    houseVersion?: HouseGetVersionResponse
    houseSnapshot?: House
}
export const HousePreview = ({ houseSnapshot, houseVersion }: HousePreviewProps) => {
    const house = houseVersion ? houseVersion.data : houseSnapshot;

    const getDocumentVersion = (house?: HouseDataVersion | House | BuildingDataVersion | BuildingData) => {
        if (!house) {
            return null;
        }
        if ((house as HouseDataVersion).documentVersion) {
            return (house as HouseDataVersion).documentVersion;
        }
        return "snapshot";
    }

    return (
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
                    <DocumentPreview documentId={house?.documentId!} version={`${getDocumentVersion(house)}`} />
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
                        <DocumentPreview documentId={building.documentId} version={`${getDocumentVersion(building)}`} />
                    </Grid2>

                </>

                ))}
            </Grid2>
        </Box>
    )
}