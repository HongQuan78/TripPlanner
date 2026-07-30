import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

function Probe({ value }: { value: string }) {
  const debounced = useDebouncedValue(value, 300);
  return <output>{debounced}</output>;
}

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the initial value immediately', () => {
    render(<Probe value="paris" />);
    expect(screen.getByRole('status')).toHaveTextContent('paris');
  });

  it('does not update before the delay elapses', () => {
    const { rerender } = render(<Probe value="p" />);
    rerender(<Probe value="pa" />);
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(screen.getByRole('status')).toHaveTextContent('p');
  });

  it('updates after the delay elapses', () => {
    const { rerender } = render(<Probe value="p" />);
    rerender(<Probe value="pa" />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByRole('status')).toHaveTextContent('pa');
  });

  it('restarts the delay on every change', () => {
    const { rerender } = render(<Probe value="p" />);
    rerender(<Probe value="pa" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    rerender(<Probe value="par" />);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByRole('status')).toHaveTextContent('p');
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByRole('status')).toHaveTextContent('par');
  });
});
