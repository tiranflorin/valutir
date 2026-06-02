import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const ValuTirLogo: React.FC = () => {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <TrendingUpIcon
                sx={{
                    fontSize: 36,
                    color: theme.palette.secondary.main,
                }}
            />
            <Typography
                variant="h4"
                sx={{
                    fontWeight: 800,
                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.5px',
                }}
            >
                ValuTir
            </Typography>
        </Box>
    );
};

export default ValuTirLogo;
