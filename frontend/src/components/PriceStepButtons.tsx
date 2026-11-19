import React from 'react';
import { IconButton, InputAdornment } from '@mui/material';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import KeyboardArrowUpRoundedIcon from '@mui/icons-material/KeyboardArrowUpRounded';
import { stepPrice } from '../utils/stepPrice';

/**
 * Up and down arrows for a price field that move by a whole unit and keep the cents (the browser's
 * own spinner would move by its 0.01 step). Pair with `priceStepKeyDown` and `hideNumberSpinners` from utils/stepPrice.
 */
const PriceStepButtons: React.FC<{ value: string; onChange: (value: string) => void }> = ({ value, onChange }) => (
    <InputAdornment position="end" sx={{ flexDirection: 'column', justifyContent: 'center', height: 'auto', maxHeight: 'none', ml: 0 }}>
        <IconButton size="small" tabIndex={-1} aria-label="Up by 1" sx={{ p: 0 }} onClick={() => onChange(stepPrice(value, 1))}>
            <KeyboardArrowUpRoundedIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" tabIndex={-1} aria-label="Down by 1" sx={{ p: 0 }} onClick={() => onChange(stepPrice(value, -1))}>
            <KeyboardArrowDownRoundedIcon fontSize="small" />
        </IconButton>
    </InputAdornment>
);

export default PriceStepButtons;
