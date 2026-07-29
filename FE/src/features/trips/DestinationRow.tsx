import { Link } from 'react-router-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Destination } from '@/shared/api/models/destination/destination';
import type { TripDay } from '@/shared/api/models/trip/tripDay';
import StarRating from '@/shared/ui/StarRating';
import { formatDate } from '@/shared/lib/dates';
import { formatCategory } from '@/shared/lib/formatCategory';
import styles from './TripPlannerPage.module.css';

export default function DestinationRow({
  destination,
  sortableId,
  isFirst,
  isLast,
  otherDays,
  onRemove,
  onMoveUp,
  onMoveDown,
  onMoveToDay,
}: {
  destination: Destination;
  sortableId: string;
  isFirst: boolean;
  isLast: boolean;
  otherDays: TripDay[];
  onRemove: (destination: Destination) => void;
  onMoveUp: (destination: Destination) => void;
  onMoveDown: (destination: Destination) => void;
  onMoveToDay: (destination: Destination, toDate: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const content = (
    <>
      <span className={styles.rowName}>{destination.name}</span>
      <span className={styles.rowCategory}>{formatCategory(destination.category)}</span>
      <StarRating rating={destination.rating} />
    </>
  );

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${isDragging ? styles.rowDragging : ''}`}
    >
      <button
        type="button"
        className={styles.dragHandle}
        aria-label={`Reorder or move ${destination.name}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>

      {destination.xid === null ? (
        <span className={styles.rowContent}>{content}</span>
      ) : (
        <Link to={`/attractions/${destination.xid}`} className={styles.rowLink}>
          {content}
        </Link>
      )}

      <div className={styles.rowMove}>
        <button
          type="button"
          className={styles.move}
          aria-label={`Move ${destination.name} up`}
          disabled={isFirst}
          onClick={() => onMoveUp(destination)}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          className={styles.move}
          aria-label={`Move ${destination.name} down`}
          disabled={isLast}
          onClick={() => onMoveDown(destination)}
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>

      {otherDays.length > 0 && (
        <select
          className={styles.assign}
          aria-label={`Move ${destination.name} to another day`}
          value=""
          onChange={(event) => {
            if (event.target.value !== '') {
              onMoveToDay(destination, event.target.value);
            }
          }}
        >
          <option value="">Move to day…</option>
          {otherDays.map((day) => (
            <option key={day.day} value={day.day}>
              {formatDate(day.day)}
            </option>
          ))}
        </select>
      )}

      <button
        type="button"
        className={styles.remove}
        aria-label={`Remove ${destination.name}`}
        onClick={() => onRemove(destination)}
      >
        Remove
      </button>
    </li>
  );
}
