import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateField from '../components/DateField';

describe('DateField', () => {
    const original = HTMLInputElement.prototype.showPicker;
    afterEach(() => {
        HTMLInputElement.prototype.showPicker = original;
    });

    it('opens the calendar on a click anywhere in the field and keeps its own input settings', async () => {
        const showPicker = vi.fn();
        HTMLInputElement.prototype.showPicker = showPicker;
        render(<DateField label="Next charge" value="" onChange={() => undefined} inputProps={{ min: '2026-11-19' }} />);

        await userEvent.click(screen.getByLabelText('Next charge'));

        expect(showPicker).toHaveBeenCalledTimes(1);
        expect(screen.getByLabelText('Next charge')).toHaveAttribute('type', 'date');
        expect(screen.getByLabelText('Next charge')).toHaveAttribute('min', '2026-11-19');
    });

    it('still works where the browser refuses to open it', async () => {
        HTMLInputElement.prototype.showPicker = () => {
            throw new DOMException('Not allowed', 'NotAllowedError');
        };
        render(<DateField label="Resumes on" value="" onChange={() => undefined} />);

        await userEvent.click(screen.getByLabelText('Resumes on'));

        expect(screen.getByLabelText('Resumes on')).toHaveFocus();
    });
});
