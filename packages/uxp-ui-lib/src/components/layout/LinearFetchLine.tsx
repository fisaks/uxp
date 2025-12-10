import { Box, LinearProgress } from "@mui/material"

export const LinearFetchLine = ({ isFetching }: { isFetching: boolean }) => {
    return <Box sx={{ height: 4, mb: 1 }}>
        {isFetching && <LinearProgress sx={{ height: 4 }} />}
    </Box>

}