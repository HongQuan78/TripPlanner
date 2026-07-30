import { divIcon } from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './AttractionMap.module.css';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function AttractionMap({
  latitude,
  longitude,
  name,
}: {
  latitude: number;
  longitude: number;
  name: string;
}) {
  const marker = divIcon({
    className: styles.markerIcon,
    html: `<span class="${styles.pin}" role="img" aria-label="${escapeHtml(name)}"><span class="${styles.pinDot}"></span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={13}
      scrollWheelZoom={false}
      className={styles.map}
      aria-label={`Map showing the location of ${name}`}
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <Marker position={[latitude, longitude]} icon={marker} title={name} keyboard />
    </MapContainer>
  );
}
