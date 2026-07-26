import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@/shared/api/client';
import type { Trip } from '@/shared/api/types';
import { todayISO } from '@/shared/lib/dates';
import Modal from '@/shared/ui/Modal';
import dialogStyles from '@/shared/ui/Dialog.module.css';
import { useCreateTrip } from './hooks';
import DateField from './DateField';
import { validateTripForm } from './tripFormValidation';
import styles from './TripForm.module.css';

export default function CreateTripDialog({
  onCreated,
  onClose,
}: {
  onCreated: (trip: Trip) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const createTrip = useCreateTrip();
  const today = todayISO();

  function handleClose() {
    if (createTrip.isPending) {
      return;
    }
    onClose();
  }

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
    <Modal label="Create a trip" onClose={handleClose}>
      <h2 className={dialogStyles.title}>Create a trip</h2>
      <form className={styles.fields} onSubmit={handleSubmit} noValidate>
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
        {errorMessage && <p className={dialogStyles.error}>{errorMessage}</p>}
        <div className={dialogStyles.actions}>
          <button
            type="button"
            className={dialogStyles.cancel}
            disabled={createTrip.isPending}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={dialogStyles.confirm}
            disabled={createTrip.isPending}
          >
            Create trip
          </button>
        </div>
      </form>
    </Modal>
  );
}
