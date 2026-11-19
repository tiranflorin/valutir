import React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';

/**
 * A date field that opens the browser's calendar on a click anywhere in it, not only on the small
 * calendar icon. Typing the date still works. Use it for every date input.
 */
const DateField: React.FC<Omit<TextFieldProps, 'type'>> = ({ inputProps, InputLabelProps, ...props }) => (
    <TextField
        {...props}
        type="date"
        InputLabelProps={{ shrink: true, ...InputLabelProps }}
        inputProps={{
            ...inputProps,
            onClick: (event: React.MouseEvent<HTMLInputElement>) => {
                try {
                    event.currentTarget.showPicker();
                } catch {
                    // Not supported, or not allowed right now (for example a disabled field): the icon still opens it.
                }
            },
        }}
    />
);

export default DateField;
