import React, { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '../../../app/store';

import AddIcon from '@mui/icons-material/Add';
import {
    Box,
    Typography,
    useTheme
} from '@mui/material';
import { LoadingButton, ReloadIconButton, useThunkHandler } from '@uxp/ui-lib';
import { selectActionError, selectActionIsLoading } from '../../loading-error/loadingErrorSlice';
import HouseList from '../components/HouseList';
import { addHouse, fetcHouses } from '../houseThunks';



const HouseInfoPage: React.FC = () => {
    const dispatch: AppDispatch = useDispatch();
    const theme = useTheme();
    const fetchHouseLoading = useSelector(selectActionIsLoading("houses/fetch"));
    const fetchHouseError = useSelector(selectActionError("houses/fetch"));
    const [dispatchAddHouse, addHouseLoading, addHouseError, addHouseDone] =
        useThunkHandler(addHouse, dispatch);

    const loadHouses = useCallback(() => {
        dispatch(fetcHouses({}));
    }, []);

    const handleAddHouse = useCallback(() => {
        dispatchAddHouse();
    }, []);

    useEffect(() => {
        loadHouses()
    }, []);

    return (
        <Box sx={{ }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="h1">Houses</Typography>
                <ReloadIconButton isLoading={fetchHouseLoading} reload={loadHouses} />
            </Box>

            <LoadingButton isLoading={addHouseLoading} error={!!addHouseError} done={addHouseDone}
                variant="contained" startIcon={<AddIcon />}
                sx={{ mt: 2, mb: 2, backgroundColor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}
                disabled={fetchHouseLoading || fetchHouseError}
                onClick={handleAddHouse}>
                Add House
            </LoadingButton>

            <HouseList isLoading={fetchHouseLoading}
                error={fetchHouseError ? "An error occurred while loading the house list" : undefined}
                retryAction={loadHouses}
            />
        </Box>
    );
};

export default HouseInfoPage;
