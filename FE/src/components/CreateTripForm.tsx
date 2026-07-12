import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import type { Trip } from '../api/types';
import { useCreateTrip } from '../hooks/trips';
import styles from './TripForm.module.css';

export function validateTripForm(name: string, startDate: string, endDate: string): string | null {
  if (name.trim().length === 0) {
    return 'Trip name is required.';
  }
  if (!startDate || !endDate) {
    return 'Start and end dates are required.';
  }
  if (startDate > endDate) {
    return 'Start date must be on or before the end date.';
  }
  return null;
}

export default function CreateTripForm({
  onCreated,
  onCancel,
}: {
  onCreated: (trip: Trip) => void;
  onCancel?: () => void;
}) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const createTrip = useCreateTrip();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateTripForm(name, startDate, endDate);
    setValidationError(error);
    if (error) {
      return;
    }
    createTrip.mutate(
      { name: name.trim(), startDate, endDate },
      { onSuccess: onCreated },
    );
  }

  const serverError =
    createTrip.error instanceof ApiError
      ? createTrip.error.message
      : createTrip.isError
        ? 'Something went wrong. Please try again.'
        : null;
  const errorMessage = validationError ?? serverError;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>Create a trip</h2>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="create-trip-name">
          Trip name
        </label>
        <input
          id="create-trip-name"
          className={styles.input}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className={styles.dates}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="create-trip-start">
            Start date
          </label>
          <input
            id="create-trip-start"
            className={styles.input}
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="create-trip-end">
            End date
          </label>
          <input
            id="create-trip-end"
            className={styles.input}
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>
      </div>
      {errorMessage && <p className={styles.error}>{errorMessage}</p>}
      <div className={styles.actions}>
        <button className={styles.submit} type="submit" disabled={createTrip.isPending}>
          Create trip
        </button>
        {onCancel && (
          <button className={styles.cancel} type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
