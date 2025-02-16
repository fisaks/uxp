import { Visibility, VisibilityOff } from "@mui/icons-material";
import { CircularProgress, IconButton, InputAdornment, TextField, useTheme } from "@mui/material";
import React, { useState } from "react";

interface ValidatedTextFieldProps<TFormData> {
    name: keyof TFormData;
    label: string;
    value: string;
    error?: string;
    helperText?: string;
    inputRef?: React.RefObject<HTMLInputElement>;
    onChange?: (value: string) => void;
    onBlur?: () => void;
    type?: "text" | "password" | "email" | "number" | "tel" | "url" | "username";
    disabled?: boolean;
    loading?: boolean;
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
    loading,
}: ValidatedTextFieldProps<TFormData>) => {
    const [showPassword, setShowPassword] = useState(false);

    const isPasswordField = type === "password";
    const isUserNameField = type === "username";
    const theme = useTheme();

    const handlePressStart = () => {
        setShowPassword(true);
    };

    const handlePressEnd = () => {
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
            type={(isPasswordField && showPassword) || isUserNameField ? "text" : type}
            fullWidth
            margin="normal"
            error={!!error}
            helperText={error ?? helperText}
            inputRef={inputRef}
            onChange={(e) => onChange && onChange(e.target.value)}
            onBlur={onBlur}
            slotProps={{
                htmlInput: isUserNameField ? {
                    autoCapitalize: "none",
                    spellCheck: "false",
                    autoCorrect: "off",
                    inputMode: "text"
                } : undefined,

                input: {


                    endAdornment: (
                        <>
                            {isPasswordField && (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label={showPassword ? "Hide password" : "Show password"}
                                        onMouseDown={handlePressStart}
                                        onMouseUp={handlePressEnd}
                                        onMouseLeave={handlePressEnd} // Ensures the password hides if the user drags the mouse out
                                        onKeyDown={handleKeyDown}
                                        onKeyUp={handleKeyUp}
                                        onTouchStart={handlePressStart}
                                        onTouchEnd={handlePressEnd}
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
                            )}
                            {loading && (
                                <InputAdornment position="end">
                                    <CircularProgress size={20} />
                                </InputAdornment>
                            )}
                        </>
                    ),
                },
            }}
        />
    );
};

export default ValidatedTextField;
