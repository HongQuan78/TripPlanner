import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DateField from './DateField';

describe('DateField', () => {
  it('shows the current value and is reachable by its label', () => {
    render(<DateField id="start" label="Start date" value="2026-08-01" onChange={() => {}} />);

    expect(screen.getByLabelText(/start date/i)).toHaveValue('2026-08-01');
  });

  it('reports ISO changes from the native date input', () => {
    const onChange = vi.fn();
    render(<DateField id="start" label="Start date" value="" onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: '2026-09-01' } });

    expect(onChange).toHaveBeenCalledWith('2026-09-01');
  });

  it('opens the calendar popover and closes it on Escape', () => {
    render(<DateField id="start" label="Start date" value="" onChange={() => {}} />);

    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /open calendar/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('consumes Escape while the calendar is open so an enclosing dialog is not closed too', () => {
    const outerKeyDown = vi.fn();
    render(
      <div onKeyDown={outerKeyDown}>
        <DateField id="start" label="Start date" value="" onChange={() => {}} />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: /open calendar/i }));
    const popover = screen.getByRole('dialog', { name: /calendar/i });
    fireEvent.keyDown(popover, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: /calendar/i })).toBeNull();
    expect(outerKeyDown).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /open calendar/i })).toHaveFocus();
  });

  it('returns focus to the calendar trigger after a day is picked', () => {
    render(<DateField id="start" label="Start date" value="2026-08-15" onChange={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /open calendar/i }));
    fireEvent.click(within(screen.getByRole('dialog', { name: /calendar/i })).getByText('20'));

    expect(screen.getByRole('button', { name: /open calendar/i })).toHaveFocus();
  });

  it('lets Escape reach an enclosing dialog when the calendar is closed', () => {
    const outerKeyDown = vi.fn();
    render(
      <div onKeyDown={outerKeyDown}>
        <DateField id="start" label="Start date" value="" onChange={() => {}} />
      </div>,
    );

    fireEvent.keyDown(screen.getByLabelText(/start date/i), { key: 'Escape' });

    expect(outerKeyDown).toHaveBeenCalled();
  });

  it('reports the ISO date when a day is picked from the calendar', () => {
    const onChange = vi.fn();
    render(<DateField id="start" label="Start date" value="2026-08-15" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /open calendar/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('20'));

    expect(onChange).toHaveBeenCalledWith('2026-08-20');
  });

  it('disables days before the min date and mirrors it on the native input', () => {
    render(
      <DateField id="start" label="Start date" value="2026-08-15" min="2026-08-10" onChange={() => {}} />,
    );

    expect(screen.getByLabelText(/start date/i)).toHaveAttribute('min', '2026-08-10');
    fireEvent.click(screen.getByRole('button', { name: /open calendar/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('8').closest('button')).toBeDisabled();
  });
});
