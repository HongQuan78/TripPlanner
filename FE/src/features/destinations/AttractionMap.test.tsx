import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AttractionMap from './AttractionMap';

const divIconMock = vi.fn((options: { html: string }) => options);

vi.mock('leaflet', () => ({
  divIcon: (options: { html: string }) => divIconMock(options),
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    'aria-label'?: string;
  }) => (
    <div data-testid="map-container" aria-label={props['aria-label']}>
      {children}
    </div>
  ),
  TileLayer: ({ attribution, url }: { attribution: string; url: string }) => (
    <div data-testid="tile-layer" data-attribution={attribution} data-url={url} />
  ),
  Marker: ({ title }: { title: string }) => <div data-testid="marker" data-title={title} />,
}));

describe('AttractionMap', () => {
  it('renders the map with an accessible name and OSM attribution', () => {
    render(<AttractionMap latitude={10} longitude={20} name="Louvre Museum" />);

    expect(screen.getByTestId('map-container')).toHaveAttribute(
      'aria-label',
      'Map showing the location of Louvre Museum',
    );
    const tile = screen.getByTestId('tile-layer');
    expect(tile.getAttribute('data-attribution')).toContain('OpenStreetMap');
    expect(tile).toHaveAttribute('data-url', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
    expect(screen.getByTestId('marker')).toHaveAttribute('data-title', 'Louvre Museum');
  });

  it('escapes HTML in the marker accessible label', () => {
    divIconMock.mockClear();
    render(
      <AttractionMap
        latitude={10}
        longitude={20}
        name={'"><img src=x onerror=alert(1)>'}
      />,
    );

    const { html } = divIconMock.mock.calls[0][0];
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
    expect(html).toContain('&quot;&gt;');
  });
});
