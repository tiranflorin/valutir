import React from 'react';
import { Typography, TypographyProps, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type BrandLogoProps = {
    to?: string;
    size?: 'auth' | 'header';
} & Omit<TypographyProps, 'children'>;

const BrandLogo: React.FC<BrandLogoProps> = ({
                                                 to = '/',
                                                 size = 'auth',
                                                 sx,
                                                 ...props
                                             }) => {
    const theme = useTheme();

    const sizeStyles =
        size === 'header'
            ? {
                fontSize: { xs: '1.6rem', md: '1.8rem' },
                lineHeight: 1,
            }
            : {
                fontSize: { xs: '2rem', md: '2.25rem' },
                lineHeight: 1,
            };

    return (
        <Typography
            component={RouterLink}
            to={to}
            {...props}
            sx={{
                textDecoration: 'none',
                display: 'inline-block',
                fontWeight: 800,
                letterSpacing: 0.3,
                ...sizeStyles,
                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                ...sx,
            }}
        >
            ValuTir
        </Typography>
    );
};

export default BrandLogo;