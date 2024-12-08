import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, InputAdornment, TextField, useTheme } from "@mui/material";
import { useState } from "react";
import React from "react";

interface ValidatedTextFieldProps<TFormData> {
    name: keyof TFormData;
    label: string;
    value: string;
    error?: string;
    helperText?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    type?: "text" | "password" | "email" | "number" | "tel" | "url";
    disabled?: boolean;
}

const ValidatedTextField = <TFormData extends Record<string, string>>({
    name,
    label,
    value,
    error,
    inputRef,
    onChange,
    onBlur,
    type = "text",
    helperText,
    disabled,
}: ValidatedTextFieldProps<TFormData>) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordField = type === "password";
    const theme = useTheme();

    const handleMouseDown = () => {
        setShowPassword(true);
    };

    const handleMouseUp = () => {
        setShowPassword(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            setShowPassword(true);
        }
    };

    const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === "Enter" || event.key === " ") {
            setShowPassword(false);
        }
    };
    return (
        <TextField
            id={String(name)}
            disabled={disabled}
            label={label}
            value={value}
            type={isPasswordField && showPassword ? "text" : type}
            fullWidth
            margin="normal"
            error={!!error}
            helperText={error ?? helperText}
            inputRef={inputRef}
            onChange={(e) => onChange && onChange(e.target.value)}
            onBlur={onBlur}
            slotProps={{
                input: {
                    endAdornment: isPasswordField && (
                        <InputAdornment position="end">
                            <IconButton
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onMouseDown={handleMouseDown}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp} // Ensures the password hides if the user drags the mouse out
                                onKeyDown={handleKeyDown}
                                onKeyUp={handleKeyUp}
                                edge="end"
                                sx={{
                                    color: theme.palette.primary.main,
                                    "&:hover": {
                                        color: theme.palette.secondary.main,
                                    },
                                }}
                            >
                                {showPassword ? <Visibility /> : <VisibilityOff />}
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
    );
};

export default ValidatedTextField;
