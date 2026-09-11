import React from 'react';
import {
    FormControl,
    FormControlLabel,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
} from '@mui/material';
import type {
    BackendSubscriptionStatus,
    SubscriptionBillingFrequency,
} from '../../types/subscription';

export interface CalendarFilters {
    status: BackendSubscriptionStatus | 'all';
    category: string | 'all';
    billingCadence: SubscriptionBillingFrequency | 'all';
    activeOnly: boolean;
}

interface CalendarFiltersBarProps {
    filters: CalendarFilters;
    categories: string[];
    onChange: (filters: CalendarFilters) => void;
}

const statuses: BackendSubscriptionStatus[] = ['active', 'trial', 'cancelled', 'other'];
const billingCadences: SubscriptionBillingFrequency[] = [
    'daily',
    'weekly',
    'monthly',
    'quarterly',
    'yearly',
];

const toLabel = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const CalendarFiltersBar: React.FC<CalendarFiltersBarProps> = ({
    filters,
    categories,
    onChange,
}) => (
    <Stack
        className="calendar-filters-bar"
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ sm: 'center' }}
    >
        <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="calendar-status-filter-label">Status</InputLabel>
            <Select
                labelId="calendar-status-filter-label"
                id="calendar-status-filter"
                label="Status"
                value={filters.status}
                onChange={(event) => onChange({
                    ...filters,
                    status: event.target.value as CalendarFilters['status'],
                })}
            >
                <MenuItem value="all">All statuses</MenuItem>
                {statuses.map((status) => (
                    <MenuItem key={status} value={status}>{toLabel(status)}</MenuItem>
                ))}
            </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="calendar-category-filter-label">Category</InputLabel>
            <Select
                labelId="calendar-category-filter-label"
                id="calendar-category-filter"
                label="Category"
                value={filters.category}
                onChange={(event) => onChange({
                    ...filters,
                    category: event.target.value,
                })}
            >
                <MenuItem value="all">All categories</MenuItem>
                {categories.map((category) => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                ))}
            </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="calendar-cadence-filter-label">Billing cadence</InputLabel>
            <Select
                labelId="calendar-cadence-filter-label"
                id="calendar-cadence-filter"
                label="Billing cadence"
                value={filters.billingCadence}
                onChange={(event) => onChange({
                    ...filters,
                    billingCadence: event.target.value as CalendarFilters['billingCadence'],
                })}
            >
                <MenuItem value="all">All cadences</MenuItem>
                {billingCadences.map((cadence) => (
                    <MenuItem key={cadence} value={cadence}>{toLabel(cadence)}</MenuItem>
                ))}
            </Select>
        </FormControl>

        <FormControlLabel
            control={(
                <Switch
                    checked={filters.activeOnly}
                    onChange={(event) => onChange({ ...filters, activeOnly: event.target.checked })}
                    inputProps={{ 'aria-label': 'Active only' }}
                />
            )}
            label="Active only"
        />
    </Stack>
);

export default CalendarFiltersBar;
