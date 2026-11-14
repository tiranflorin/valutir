import React from 'react';
import { Box, Container } from '@mui/material';
import { Link as RouterLink, useLocation } from 'react-router';
import AppFooter from '../components/AppFooter';
import AppHeader from '../components/AppHeader';
import CostCalculator from '../components/calculator/CostCalculator';
import type { Currency } from '../components/CurrencySelect';
import { CALCULATOR_PRESETS } from '../data/calculatorPresets';
import { type CalculatorRow, readSharedResult } from '../utils/calculator';
import { formatCurrency } from '../utils/money';
import './RecurringScreens.css';

type PresetKey = keyof typeof CALCULATOR_PRESETS;

/** Rows handed over from the home page's quick calculator, through router state. */
type HeroHandOff = { calculatorRows?: CalculatorRow[]; calculatorCurrency?: Currency };

const OTHER_CALCULATORS: PresetKey[] = ['all', 'streaming', 'ai-tools', 'software'];

const CalculatorPage: React.FC<{ preset?: PresetKey }> = ({ preset = 'all' }) => {
    const { hash, state } = useLocation();
    const config = CALCULATOR_PRESETS[preset];
    const shared = readSharedResult(hash);
    const handOff = (state ?? {}) as HeroHandOff;

    return (
        <Box className="dashboard-page calculator-page">
            <AppHeader />
            <Container component="main" className="dashboard-container calculator-container">
                <Box className="calculator-heading">
                    <div className="eyebrow">{config.eyebrow}</div>
                    <h1>{config.heading}</h1>
                    <p>{config.intro}</p>
                </Box>

                {shared && (
                    <p className="calculator-shared" role="status">
                        Someone shared their result: <strong>{formatCurrency(shared.yearly, shared.currency)} a year</strong> on {shared.count} subscription{shared.count === 1 ? '' : 's'}. What do yours cost?
                    </p>
                )}

                <CostCalculator
                    key={preset}
                    preset={config}
                    initialRows={Array.isArray(handOff.calculatorRows) ? handOff.calculatorRows : []}
                    initialCurrency={handOff.calculatorCurrency}
                />

                <Box component="section" className="calculator-notes" aria-labelledby="calculator-notes-title">
                    <h2 id="calculator-notes-title">How it works out the totals</h2>
                    <ul>
                        <li>Weekly prices count 52 times a year, monthly 12, quarterly 4 and yearly once. The monthly figure is the yearly total divided by 12.</li>
                        <li>Five years is the yearly total times five at today’s prices; price rises would make it more.</li>
                        <li>Amounts in one currency only: nothing is converted.</li>
                        <li>Everything is worked out in your browser. What you type isn’t sent to ValuTir or stored, unless you save it to an account.</li>
                    </ul>
                    <p className="calculator-more">
                        More calculators:{' '}
                        {OTHER_CALCULATORS.filter((key) => key !== preset).map((key, index) => (
                            <React.Fragment key={key}>
                                {index > 0 && ' · '}
                                <RouterLink to={CALCULATOR_PRESETS[key].path}>{CALCULATOR_PRESETS[key].label}</RouterLink>
                            </React.Fragment>
                        ))}
                    </p>
                </Box>
            </Container>
            <AppFooter />
        </Box>
    );
};

export default CalculatorPage;
