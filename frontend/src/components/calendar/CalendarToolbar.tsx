import React from 'react';
import { Button, Stack, Typography } from '@mui/material';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';

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
            <Stack className="calendar-toolbar__content" direction="row" spacing={1.25} alignItems="center" useFlexGap flexWrap="wrap">
                <Button
                    className="calendar-toolbar__button"
                    variant="outlined"
                    startIcon={<ChevronLeftRoundedIcon />}
                    onClick={onPrev}
                    aria-label="Show previous month"
                >
                    Previous
                </Button>
                <Button
                    className="calendar-toolbar__button calendar-toolbar__button--today"
                    variant="contained"
                    onClick={onToday}
                    aria-label="Show current month"
                >
                    Today
                </Button>
                <Button
                    className="calendar-toolbar__button"
                    variant="outlined"
                    endIcon={<ChevronRightRoundedIcon />}
                    onClick={onNext}
                    aria-label="Show next month"
                >
                    Next
                </Button>
                <Typography className="calendar-toolbar__title" component="h2" variant="h6">
                    {title}
                </Typography>
            </Stack>
        </div>
    );
};

export default CalendarToolbar;
