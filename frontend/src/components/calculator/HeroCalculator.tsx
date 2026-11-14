import React, { useMemo, useState } from 'react';
import { Button, TextField } from '@mui/material';
import { useNavigate } from 'react-router';
import CatalogTile from '../CatalogTile';
import { SERVICE_CATALOG, type CatalogService } from '../../data/services';
import { type CalculatorRow, calculatorTotals } from '../../utils/calculator';
import { formatCurrency } from '../../utils/money';

const QUICK_SERVICES = ['Netflix', 'Spotify', 'YouTube Premium', 'Amazon Prime', 'Disney+', 'iCloud+', 'ChatGPT Plus', 'Microsoft 365'];

const CADENCE_SUFFIX: Record<string, string> = { weekly: '/ week', monthly: '/ month', quarterly: '/ quarter', yearly: '/ year' };

/**
 * The home page's first step of the calculator: tap a few services, type their prices, see the
 * yearly total. "Open the full calculator" takes the list along in router state.
 */
const HeroCalculator: React.FC = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState<CalculatorRow[]>([]);
    const services = useMemo(
        () => QUICK_SERVICES.map((name) => SERVICE_CATALOG.find((service) => service.name === name)).filter((service): service is CatalogService => !!service),
        [],
    );
    const totals = calculatorTotals(rows);
    const picked = (name: string) => rows.some((row) => row.name === name);

    const toggle = (service: CatalogService) => setRows((previous) => picked(service.name)
        ? previous.filter((row) => row.name !== service.name)
        : [...previous, { name: service.name, category: service.category, amount: '', cadence: service.cadence, included: true }]);

    return (
        <section className="hero-calculator" aria-labelledby="hero-calculator-title">
            <h2 id="hero-calculator-title">What do yours cost a year?</h2>
            <p className="hero-calculator-lead">Tap what you pay for, then type the price.</p>
            <div className="hero-calculator-chips" role="group" aria-label="Popular services">
                {services.map((service) => (
                    <button
                        key={service.name}
                        type="button"
                        className={picked(service.name) ? 'selected' : ''}
                        aria-pressed={picked(service.name)}
                        onClick={() => toggle(service)}
                    >
                        <CatalogTile service={service} />
                        {service.name}
                    </button>
                ))}
            </div>
            {rows.length > 0 && (
                <ul className="hero-calculator-rows">
                    {rows.map((row) => (
                        <li key={row.name}>
                            <span>{row.name}</span>
                            <TextField
                                size="small"
                                type="number"
                                placeholder="0.00"
                                value={row.amount}
                                onChange={(event) => setRows((previous) => previous.map((item) => (item.name === row.name ? { ...item, amount: event.target.value } : item)))}
                                inputProps={{ min: 0, step: '0.01', 'aria-label': `${row.name} price in euros` }}
                            />
                            <small>{CADENCE_SUFFIX[row.cadence]}</small>
                        </li>
                    ))}
                </ul>
            )}
            <div className="hero-calculator-total" aria-live="polite">
                <span>A year</span>
                <strong data-testid="hero-yearly">{formatCurrency(totals.yearly, 'EUR')}</strong>
                <small>{formatCurrency(totals.monthly, 'EUR')} a month · {formatCurrency(totals.fiveYears, 'EUR')} over 5 years</small>
            </div>
            <Button
                variant="outlined"
                fullWidth
                onClick={() => navigate('/calculator', { state: { calculatorRows: rows, calculatorCurrency: 'EUR' } })}
            >
                {rows.length > 0 ? 'Add the rest in the full calculator' : 'Open the full calculator'} →
            </Button>
        </section>
    );
};

export default HeroCalculator;
