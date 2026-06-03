import React from 'react';
import { Card, CardProps, useTheme } from '@mui/material';

type AppSurfaceCardProps = CardProps & {
    compact?: boolean;
};

const AppSurfaceCard: React.FC<AppSurfaceCardProps> = ({
                                                           compact = false,
                                                           sx,
                                                           children,
                                                           ...props
                                                       }) => {
    const theme = useTheme();

    return (
        <Card
            {...props}
            sx={{
                borderRadius: compact ? 3 : 4,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor:
                    theme.palette.mode === 'dark'
                        ? 'rgba(18, 24, 38, 0.72)'
                        : 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(12px)',
                boxShadow:
                    theme.palette.mode === 'dark'
                        ? '0 16px 40px rgba(0,0,0,0.24)'
                        : '0 18px 45px rgba(46, 204, 113, 0.10)',
                overflow: 'hidden',
                ...sx,
            }}
        >
            {children}
        </Card>
    );
};

export default AppSurfaceCard;
