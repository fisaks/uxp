import { useTheme } from '@mui/material/styles';
import { useCallback, useEffect, useRef, useState } from 'react';
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

export const useCollaborativeDoc = (initialDoc?: Y.Doc) => {
    const user = useSelector(selectCurrentUser);
    const theme = useTheme();
    const isDarkMode = theme.palette.mode === 'dark';
    const colorPool = isDarkMode ? darkThemeCursorColors : lightThemeCursorColors;
    const [docInstanceId, setDocInstanceId] = useState(0);


    const cursorColorRef = useRef(getRandomCursorColor(colorPool));

    const yDocRef = useRef<Y.Doc>(initialDoc ?? new Y.Doc());
    const awarenessRef = useRef<Awareness>(new Awareness(yDocRef.current));

    // Setup local awareness state
    useEffect(() => {
        console.log("Awareness instance replaced 2", user?.username);
        awarenessRef.current.setLocalStateField('user', {
            name: user?.username ?? 'Unknown user',
            color: cursorColorRef.current,
        });
    }, [user?.username, docInstanceId]);

    const replaceDocState = useCallback((newDoc: Y.Doc) => {

        yDocRef.current = newDoc;
        awarenessRef.current = new Awareness(newDoc);
        setDocInstanceId((v) => v + 1);

    }, []);

    return {
        yDoc: yDocRef.current,
        awareness: awarenessRef.current,
        replaceDocState,
        yDocRef,
        awarenessRef,
        docInstanceId
    };
};

