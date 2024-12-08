import { Alert, Link, Typography } from "@mui/material";
import React from "react";

interface ErrorTileProps<TFormData> {
    errors: Partial<Record<keyof TFormData, string>>;
    fieldLabels: Record<keyof TFormData, string>;
    fieldRefs: Record<keyof TFormData, React.RefObject<HTMLInputElement>>;
    errorTileRef: React.RefObject<HTMLHeadingElement>;
}

const ErrorTile = <TFormData extends Record<string, string>>({
    errors,
    fieldLabels,
    fieldRefs,
    errorTileRef,
}: ErrorTileProps<TFormData>) => (
    <Alert severity="error" sx={{ mb: 2 }}>
        <Typography variant="h6" component="h2" tabIndex={-1} ref={errorTileRef} sx={{ fontWeight: "bold", mb: 1 }}>
            {Object.keys(errors).length === 1 ? "Please fix the following error:" : "Please fix the following errors:"}
        </Typography>
        <ul style={{ margin: 0, paddingLeft: "1.5rem" }}>
            {Object.keys(fieldLabels).map((field) => {
                const error = errors[field as keyof TFormData];
                return (
                    error && (
                        <li key={field}>
                            <Link
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const fieldRef = fieldRefs[field as keyof TFormData]?.current;
                                    if (fieldRef) {
                                        fieldRef.scrollIntoView({ behavior: "smooth", block: "center" });
                                        fieldRef.focus();
                                    }
                                }}
                                sx={{ textDecoration: "none", color: "error.main", cursor: "pointer" }}
                            >
                                <strong>{fieldLabels[field as keyof TFormData]}:</strong> {error}
                            </Link>
                        </li>
                    )
                );
            })}
        </ul>
    </Alert>
);

export default ErrorTile;
