import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '../api/client';
import type { Trip } from '../api/types';
import { useUpdateTrip } from '../hooks/trips';
import ConfirmDialog from './ConfirmDialog';
import { validateTripForm } from './tripFormValidation';
import styles from './TripForm.module.css';

export default function EditTripForm({
  trip,
  onSaved,
  onCancel,
}: {
  trip: Trip;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const updateTrip = useUpdateTrip(trip.id);

  function submit(confirmed: boolean) {
    updateTrip.mutate(
      { name: name.trim(), startDate, endDate, confirmed },
      {
        onSuccess: () => {
          setConflictMessage(null);
          onSaved();
        },
        onError: (error) => {
          if (error instanceof ApiError && error.status === 409) {
            setConflictMessage(error.message);
          } else {
            setConflictMessage(null);
          }
        },
      },
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateTripForm(name, startDate, endDate);
    setValidationError(error);
    if (error) {
      return;
    }
    submit(false);
  }

  const serverError =
    updateTrip.error instanceof ApiError
      ? updateTrip.error.status === 409
        ? null
        : updateTrip.error.message
      : updateTrip.isError
        ? 'Something went wrong. Please try again.'
        : null;
  const errorMessage = validationError ?? serverError;

  return (
    <>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.title}>Edit trip</h2>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="edit-trip-name">
            Trip name
          </label>
          <input
            id="edit-trip-name"
            className={styles.input}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className={styles.dates}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-trip-start">
              Start date
            </label>
            <input
              id="edit-trip-start"
              className={styles.input}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="edit-trip-end">
              End date
            </label>
            <input
              id="edit-trip-end"
              className={styles.input}
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
        {errorMessage && <p className={styles.error}>{errorMessage}</p>}
        <div className={styles.actions}>
          <button className={styles.submit} type="submit" disabled={updateTrip.isPending}>
            Save changes
          </button>
          <button className={styles.cancel} type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
      {conflictMessage && (
        <ConfirmDialog
          title="Confirm date change"
          message={conflictMessage}
          confirmLabel="Confirm"
          pending={updateTrip.isPending}
          onConfirm={() => submit(true)}
          onCancel={() => setConflictMessage(null)}
        />
      )}
    </>
  );
}
