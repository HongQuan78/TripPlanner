import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PhotoCarousel from './PhotoCarousel';

describe('PhotoCarousel image states', () => {
  it('shows the loading shimmer until the photo loads', () => {
    render(<PhotoCarousel images={['https://example.com/1.jpg']} name="Louvre Museum" />);

    expect(screen.getByTestId('image-loading')).toBeInTheDocument();

    fireEvent.load(screen.getByAltText('Louvre Museum'));

    expect(screen.queryByTestId('image-loading')).not.toBeInTheDocument();
  });

  it('shows the placeholder when the only photo fails to load', () => {
    render(<PhotoCarousel images={['https://example.com/1.jpg']} name="Louvre Museum" />);

    fireEvent.error(screen.getByAltText('Louvre Museum'));

    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('drops a failed photo from the rotation and keeps the rest', () => {
    render(
      <PhotoCarousel
        images={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
        name="Louvre Museum"
      />,
    );

    fireEvent.error(screen.getByAltText('Louvre Museum photo 1 of 2'));

    expect(screen.getByAltText('Louvre Museum')).toHaveAttribute(
      'src',
      'https://example.com/2.jpg',
    );
    expect(screen.queryByRole('button', { name: 'Next photo' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('image-placeholder')).not.toBeInTheDocument();
  });

  it('shows the placeholder when every photo fails', () => {
    render(
      <PhotoCarousel
        images={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
        name="Louvre Museum"
      />,
    );

    fireEvent.error(screen.getByAltText('Louvre Museum photo 1 of 2'));
    fireEvent.error(screen.getByAltText('Louvre Museum'));

    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
  });

  it('shows the loading shimmer again when navigating to a not-yet-loaded photo', () => {
    render(
      <PhotoCarousel
        images={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
        name="Louvre Museum"
      />,
    );

    fireEvent.load(screen.getByAltText('Louvre Museum photo 1 of 2'));
    expect(screen.queryByTestId('image-loading')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }));

    expect(screen.getByTestId('image-loading')).toBeInTheDocument();
    expect(screen.getByAltText('Louvre Museum photo 2 of 2')).toBeInTheDocument();
  });
});
