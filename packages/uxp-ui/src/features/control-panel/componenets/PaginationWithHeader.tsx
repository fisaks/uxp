import { Pagination, Typography } from "@mui/material";
import React from "react";

interface PaginationWithHeaderProps {
    pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        pageSize: number;
    };
    onPageChange: (event: React.ChangeEvent<unknown>, page: number) => void;
}

const PaginationWithHeader: React.FC<PaginationWithHeaderProps> = ({ pagination, onPageChange }) => {
    return (
        <>
            <Typography variant="body2" sx={{ textAlign: "center", mb: 2 }}>
                Page {pagination.currentPage} of {pagination.totalPages}
            </Typography>
            <Pagination
                count={pagination.totalPages}
                page={pagination.currentPage}
                onChange={onPageChange}
                sx={{ mt: 2, display: "flex", justifyContent: "center" }}
            />
        </>
    );
};

export default PaginationWithHeader;
