import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@/shared/api/client';
import type { Trip } from '@/shared/api/types';
import { todayISO } from '@/shared/lib/dates';
import { useCreateTrip } from './hooks';
import DateField from './DateField';
import { validateTripForm } from './tripFormValidation';
import styles from './TripForm.module.css';

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
  const today = todayISO();

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
        <DateField
          id="create-trip-start"
          label="Start date"
          value={startDate}
          onChange={setStartDate}
          min={today}
        />
        <DateField
          id="create-trip-end"
          label="End date"
          value={endDate}
          onChange={setEndDate}
          min={startDate || today}
        />
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
