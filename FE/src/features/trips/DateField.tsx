import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { DayPicker } from 'react-day-picker';
import type { Matcher } from 'react-day-picker';
import 'react-day-picker/style.css';
import styles from './DateField.module.css';

const VIEWPORT_GUTTER = 8;
const CONTROL_GAP = 8;

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}

function isoToDate(iso: string): Date | undefined {
  if (!iso) {
    return undefined;
  }
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function dateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.7" />
      <path d="M8 2.5v4M16 2.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function DateField({
  id,
  label,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPopoverPosition(null);
      return;
    }
    function reposition() {
      const control = controlRef.current;
      const popover = popoverRef.current;
      if (!control || !popover) {
        return;
      }
      const controlRect = control.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const popoverWidth = popover.offsetWidth || popoverRect.width;
      const popoverHeight = popover.offsetHeight || popoverRect.height;
      const left = clamp(
        controlRect.left,
        VIEWPORT_GUTTER,
        window.innerWidth - popoverWidth - VIEWPORT_GUTTER,
      );
      const maxTop = window.innerHeight - popoverHeight - VIEWPORT_GUTTER;
      const below = controlRect.bottom + CONTROL_GAP;
      const above = controlRect.top - popoverHeight - CONTROL_GAP;
      const preferred = below > maxTop && above >= VIEWPORT_GUTTER ? above : below;
      setPopoverPosition({ top: clamp(preferred, VIEWPORT_GUTTER, maxTop), left });
    }
    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handlePointer(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const selectedDate = isoToDate(value);
  const minDate = min ? isoToDate(min) : undefined;
  const maxDate = max ? isoToDate(max) : undefined;
  const disabled: Matcher[] = [];
  if (minDate) {
    disabled.push({ before: minDate });
  }
  if (maxDate) {
    disabled.push({ after: maxDate });
  }

  function closePopover() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (open && event.key === 'Escape') {
      event.stopPropagation();
      closePopover();
    }
  }

  return (
    <div className={styles.field} ref={containerRef} onKeyDown={handleKeyDown}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div
        ref={controlRef}
        className={open ? `${styles.control} ${styles.controlOpen}` : styles.control}
      >
        <input
          id={id}
          className={styles.input}
          type="date"
          value={value}
          min={min}
          max={max}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          ref={triggerRef}
          type="button"
          className={styles.trigger}
          aria-label="Open calendar"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          <CalendarIcon />
        </button>
      </div>
      {open && (
        <div
          ref={popoverRef}
          className={styles.popover}
          style={popoverPosition ?? undefined}
          role="dialog"
          aria-label="Calendar"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate ?? minDate}
            startMonth={minDate}
            disabled={disabled}
            showOutsideDays
            autoFocus
            onSelect={(date) => {
              if (date) {
                onChange(dateToISO(date));
                closePopover();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
