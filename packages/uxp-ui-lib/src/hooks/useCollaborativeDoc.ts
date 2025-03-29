import { useTheme } from '@mui/material/styles';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { selectCurrentUser } from '../features/remote-app/remoteAppSelectors';


const lightThemeCursorColors = [
    '#f44336', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#795548',
];

const darkThemeCursorColors = [
    '#ef9a9a', '#90caf9', '#a5d6a7', '#ffcc80', '#ce93d8', '#80deea', '#bcaaa4',
];

const getRandomCursorColor = (pool: string[]): string => {
    return pool[Math.floor(Math.random() * pool.length)];
}

export const useCollaborativeDoc = () => {
    const user = useSelector(selectCurrentUser);
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const colorPool = isDarkMode ? darkThemeCursorColors : lightThemeCursorColors;

    const [yDoc, awareness] = useMemo(() => {
        const y = new Y.Doc();
        const a = new Awareness(y);
        return [y, a] as const;
    }, []);

    useEffect(() => {

        const cursorColor = getRandomCursorColor(colorPool);
        awareness.setLocalStateField('user', {
            name: user?.username ?? "Unknown user",
            color: cursorColor,
        });
    }, [user?.username, colorPool]);

    return { yDoc, awareness };
}