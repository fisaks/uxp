import { Box, Typography } from '@mui/material';
import { RichTextEditor } from '@uxp/ui-lib';
import axios from "axios";
import React, { useMemo } from 'react';
import * as Y from "yjs";
import { getBaseUrl } from '../../config';
type FileUploadResponse = { publicId: string, fileName: string }
const uploadFile = async (file: File) => {
    const formData = new FormData();

    formData.append("type", "attachment");
    formData.append("file", file);

    const response = await axios.post<FileUploadResponse>(`${getBaseUrl()}/api/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
}
const RichEditPage: React.FC = () => {
    const yDoc = useMemo(() => new Y.Doc(), []);
    const handleUploadFile = async (file: File) => {
        return await uploadFile(file).then((r) => r.publicId);
    };
    return (
        <Box sx={{}}>
            <Typography variant="h1">Rich Text Editor</Typography>


            <RichTextEditor
                label="Rich Text Editor"
                yDoc={yDoc}
                editable={true}
                onImageUpload={(file) => handleUploadFile(file)}
                imageBasePath={`${getBaseUrl()}/api/file`}
            />
        </Box>
    );
};

export default RichEditPage;