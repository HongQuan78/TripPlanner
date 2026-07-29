import { Link } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Destination } from '@/shared/api/models/destination/destination';
import type { TripDay } from '@/shared/api/models/trip/tripDay';
import { formatDate } from '@/shared/lib/dates';
import styles from './TripPlannerPage.module.css';

export default function SavedPlaceCard({
  destination,
  days,
  onSchedule,
  onRemove,
}: {
  destination: Destination;
  days: TripDay[];
  onSchedule: (destinationId: number, date: string) => void;
  onRemove: (destination: Destination) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `place-${destination.id}`,
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  const name = (
    <span className={styles.savedName}>{destination.name}</span>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.savedCard} ${isDragging ? styles.savedCardDragging : ''}`}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Drag ${destination.name} onto a day`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      {destination.xid === null ? (
        name
      ) : (
        <Link to={`/attractions/${destination.xid}`} className={styles.savedLink}>
          {name}
        </Link>
      )}

      <select
        className={styles.assign}
        aria-label={`Add ${destination.name} to a day`}
        value=""
        onChange={(event) => {
          if (event.target.value !== '') {
            onSchedule(destination.id, event.target.value);
          }
        }}
      >
        <option value="">Add to day…</option>
        {days.map((day) => (
          <option key={day.day} value={day.day}>
            {formatDate(day.day)}
          </option>
        ))}
      </select>

      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${destination.name} from Saved Places`}
        onClick={() => onRemove(destination)}
      >
        Remove
      </button>
    </li>
  );
}
