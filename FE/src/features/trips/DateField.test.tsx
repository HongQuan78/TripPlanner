import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DateField from './DateField';

const GUTTER = 8;

type Box = { left: number; top: number; width: number; height: number };

function toRect(box: Box): DOMRect {
  return {
    x: box.left,
    y: box.top,
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    right: box.left + box.width,
    bottom: box.top + box.height,
    toJSON: () => box,
  } as DOMRect;
}

function isControl(element: Element) {
  return (
    element.firstElementChild?.tagName === 'INPUT' &&
    element.lastElementChild?.getAttribute('aria-label') === 'Open calendar'
  );
}

function stubLayout(viewport: { width: number; height: number }, control: Box, popover: Box) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewport.width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewport.height });
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: Element,
  ) {
    if (this.getAttribute('role') === 'dialog') {
      return toRect(popover);
    }
    if (isControl(this)) {
      return toRect(control);
    }
    return toRect({ left: 0, top: 0, width: 0, height: 0 });
  });
}

function openCalendar() {
  fireEvent.click(screen.getByRole('button', { name: /open calendar/i }));
  return screen.getByRole('dialog', { name: /calendar/i });
}

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

describe('DateField calendar positioning', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
  });

  it('keeps the calendar inside a narrow viewport instead of overflowing to the right', () => {
    stubLayout(
      { width: 390, height: 844 },
      { left: 200, top: 300, width: 150, height: 48 },
      { left: 0, top: 0, width: 320, height: 340 },
    );
    render(<DateField id="end" label="End date" value="" onChange={() => {}} />);

    const popover = openCalendar();
    const left = Number.parseFloat(popover.style.left);

    expect(left).toBeGreaterThanOrEqual(GUTTER);
    expect(left + 320).toBeLessThanOrEqual(390 - GUTTER);
    expect(Number.parseFloat(popover.style.top)).toBe(348 + GUTTER);
  });

  it('flips the calendar above the control when there is no room below', () => {
    stubLayout(
      { width: 390, height: 420 },
      { left: 40, top: 300, width: 150, height: 48 },
      { left: 0, top: 0, width: 320, height: 200 },
    );
    render(<DateField id="start" label="Start date" value="" onChange={() => {}} />);

    const popover = openCalendar();
    const top = Number.parseFloat(popover.style.top);

    expect(top).toBe(300 - 200 - GUTTER);
    expect(top).toBeGreaterThanOrEqual(GUTTER);
    expect(top + 200).toBeLessThanOrEqual(420 - GUTTER);
  });

  it('measures the untransformed box, so the open animation cannot shrink the gutter', () => {
    stubLayout(
      { width: 390, height: 844 },
      { left: 200, top: 300, width: 150, height: 48 },
      { left: 0, top: 0, width: 327, height: 333 },
    );
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.getAttribute('role') === 'dialog' ? 334 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.getAttribute('role') === 'dialog' ? 340 : 0;
    });
    render(<DateField id="end" label="End date" value="" onChange={() => {}} />);

    const popover = openCalendar();

    expect(Number.parseFloat(popover.style.left) + 334).toBeLessThanOrEqual(390 - GUTTER);
  });

  it('repositions the open calendar when the viewport is resized', () => {
    stubLayout(
      { width: 1024, height: 844 },
      { left: 300, top: 300, width: 150, height: 48 },
      { left: 0, top: 0, width: 320, height: 340 },
    );
    render(<DateField id="end" label="End date" value="" onChange={() => {}} />);

    const popover = openCalendar();
    expect(Number.parseFloat(popover.style.left)).toBe(300);

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(Number.parseFloat(popover.style.left)).toBe(390 - 320 - GUTTER);
  });
});
