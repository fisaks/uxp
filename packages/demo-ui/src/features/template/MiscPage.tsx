import React, { Suspense, useState } from 'react';
import ImageDisplay from './components/ImageDisplay';
import { Button } from '@mui/material';
import { useAppDispatch } from '../../hooks';
import { useSelector } from 'react-redux';
import { selectTemplateValue } from './templateSelector';
import { selectCurrentUser } from '@uxp/ui-lib';
import { fetchTemplate } from './templateThunk';
import LazyTextComponent from './components/LazyTextComponent';


const MiscPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const value = useSelector(selectTemplateValue);
    const user = useSelector(selectCurrentUser);
    const [showLazyComponent, setShowLazyComponent] = useState(false);

    const handleButtonClick = () => {
        dispatch(fetchTemplate());
    };

    const handleLazyLoadClick = () => {
        setShowLazyComponent(true);
    };
    return (
        <div>
            <h1>Welcome to U2C App {user?.username}</h1>

            <ImageDisplay />
            <Button variant="contained" color="primary" onClick={handleButtonClick}>
                Call Template Thunk
            </Button>
            <div>{value}</div>

            <Button sx={{ mt: "20px" }} variant="contained" color="secondary" onClick={handleLazyLoadClick}>
                Load Lazy Component
            </Button>

            {showLazyComponent && (
                <Suspense fallback={<div>Loading...</div>}>
                    <LazyTextComponent />
                </Suspense>
            )}
        </div>
    );
};

export default MiscPage;