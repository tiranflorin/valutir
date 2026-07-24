import React from 'react';
import { Button, Stack, Typography } from '@mui/material';

interface CalendarToolbarProps {
    title: string;
    onPrev: () => void;
    onToday: () => void;
    onNext: () => void;
}

const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
                                                             title,
                                                             onPrev,
                                                             onToday,
                                                             onNext,
                                                         }) => {
    return (
        <div className="calendar-toolbar">
            <Stack direction="row" spacing={1}>
                <Button variant="outlined" size="small" onClick={onPrev}>
                    Prev
                </Button>
                <Button variant="outlined" size="small" onClick={onToday}>
                    Today
                </Button>
                <Button variant="outlined" size="small" onClick={onNext}>
                    Next
                </Button>
            </Stack>

            <Typography variant="h6" fontWeight={800}>
                {title}
            </Typography>
        </div>
    );
};

export default CalendarToolbar;
