import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useImageLoaded } from './useImageLoaded';

function Probe({ imageUrl, complete }: { imageUrl: string | null; complete?: boolean }) {
  const { imgRef, loaded, markLoaded } = useImageLoaded(imageUrl);

  return (
    <div>
      <span data-testid="state">{loaded ? 'loaded' : 'pending'}</span>
      {imageUrl !== null && (
      <img
        ref={(element) => {
          if (element && complete) {
            Object.defineProperty(element, 'complete', { value: true, configurable: true });
          }
          imgRef.current = element;
        }}
        data-testid="probe-image"
        src={imageUrl ?? undefined}
        alt=""
        onLoad={markLoaded}
      />
      )}
    </div>
  );
}

describe('useImageLoaded', () => {
  it('starts pending for an image that has not loaded yet', () => {
    render(<Probe imageUrl="https://example.test/a.jpg" />);

    expect(screen.getByTestId('state')).toHaveTextContent('pending');
  });

  it('reports loaded on mount when the image is already complete from cache', () => {
    render(<Probe imageUrl="https://example.test/a.jpg" complete />);

    expect(screen.getByTestId('state')).toHaveTextContent('loaded');
  });

  it('reports loaded when the load event fires', () => {
    render(<Probe imageUrl="https://example.test/a.jpg" />);
    expect(screen.getByTestId('state')).toHaveTextContent('pending');

    fireEvent.load(screen.getByTestId('probe-image'));

    expect(screen.getByTestId('state')).toHaveTextContent('loaded');
  });

  it('stays pending when no image element is rendered', () => {
    render(<Probe imageUrl={null} />);

    expect(screen.getByTestId('state')).toHaveTextContent('pending');
  });
});
