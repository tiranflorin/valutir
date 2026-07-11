import React from 'react';
import { MenuItem, TextField, TextFieldProps, useTheme } from '@mui/material';

type Currency = 'EUR' | 'USD' | 'RON';

type CurrencySelectProps = Omit<TextFieldProps, 'select' | 'children'> & {
    value: Currency;
    onChange: (value: Currency) => void;
};

const currencyOptions: Currency[] = ['EUR', 'USD', 'RON'];

const requiredAsteriskSx = {
    '& .MuiFormLabel-asterisk': {
        color: 'error.main',
    },
};

const CurrencySelect: React.FC<CurrencySelectProps> = ({
                                                           value,
                                                           onChange,
                                                           sx,
                                                           ...props
                                                       }) => {
    const theme = useTheme();

    return (
        <TextField
            {...props}
            select
            fullWidth
            required
            label="Currency"
            value={value}
            onChange={(e) => onChange(e.target.value as Currency)}
            sx={{
                ...requiredAsteriskSx,
                ...sx,
            }}
        >
            {currencyOptions.map((currency) => (
                <MenuItem key={currency} value={currency}>
                    {currency}
                </MenuItem>
            ))}
        </TextField>
    );
};

export default CurrencySelect;
export type { Currency };
