import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AttractionHero from './AttractionHero';

describe('AttractionHero', () => {
  it('renders the name as an h1, the category eyebrow, and a working back control', () => {
    const onBack = vi.fn();
    render(
      <AttractionHero
        images={['https://example.com/1.jpg']}
        name="Louvre Museum"
        category="Museums"
        onBack={onBack}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Louvre Museum' })).toBeInTheDocument();
    expect(screen.getByText('Museums')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('omits the category eyebrow when category is null', () => {
    render(
      <AttractionHero
        images={['https://example.com/1.jpg']}
        name="Hidden Garden"
        category={null}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Hidden Garden' })).toBeInTheDocument();
    expect(screen.queryByText('Museums')).not.toBeInTheDocument();
  });

  it('shows the placeholder with the overlay still visible when there are no photos', () => {
    render(
      <AttractionHero images={[]} name="Hidden Garden" category="Parks" onBack={vi.fn()} />,
    );

    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.getByText(/no photo yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Hidden Garden' })).toBeInTheDocument();
  });

  it('shows the loading shimmer until the photo loads', () => {
    render(
      <AttractionHero
        images={['https://example.com/1.jpg']}
        name="Louvre Museum"
        category={null}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByTestId('image-loading')).toBeInTheDocument();
    fireEvent.load(screen.getByAltText('Louvre Museum'));
    expect(screen.queryByTestId('image-loading')).not.toBeInTheDocument();
  });

  it('shows the placeholder when the only photo fails to load', () => {
    render(
      <AttractionHero
        images={['https://example.com/1.jpg']}
        name="Louvre Museum"
        category={null}
        onBack={vi.fn()}
      />,
    );

    fireEvent.error(screen.getByAltText('Louvre Museum'));
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('cycles photos with wrapping next/previous controls', () => {
    render(
      <AttractionHero
        images={[
          'https://example.com/1.jpg',
          'https://example.com/2.jpg',
          'https://example.com/3.jpg',
        ]}
        name="Louvre Museum"
        category={null}
        onBack={vi.fn()}
      />,
    );

    const next = screen.getByRole('button', { name: /next photo/i });
    expect(screen.getByAltText('Louvre Museum photo 1 of 3')).toBeInTheDocument();

    fireEvent.click(next);
    expect(screen.getByAltText('Louvre Museum photo 2 of 3')).toHaveAttribute(
      'src',
      'https://example.com/2.jpg',
    );

    fireEvent.click(screen.getByRole('button', { name: /previous photo/i }));
    expect(screen.getByAltText('Louvre Museum photo 1 of 3')).toBeInTheDocument();
  });

  it('drops a failed photo from the rotation and keeps the rest', () => {
    render(
      <AttractionHero
        images={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
        name="Louvre Museum"
        category={null}
        onBack={vi.fn()}
      />,
    );

    fireEvent.error(screen.getByAltText('Louvre Museum photo 1 of 2'));
    expect(screen.getByAltText('Louvre Museum')).toHaveAttribute(
      'src',
      'https://example.com/2.jpg',
    );
    expect(screen.queryByRole('button', { name: /next photo/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId('image-placeholder')).not.toBeInTheDocument();
  });

  it('moves frames with left/right arrow keys when the carousel is focused', () => {
    render(
      <AttractionHero
        images={['https://example.com/1.jpg', 'https://example.com/2.jpg']}
        name="Louvre Museum"
        category={null}
        onBack={vi.fn()}
      />,
    );

    const region = screen.getByRole('group', { name: /photos/i });
    fireEvent.keyDown(region, { key: 'ArrowRight' });
    expect(screen.getByAltText('Louvre Museum photo 2 of 2')).toBeInTheDocument();
    fireEvent.keyDown(region, { key: 'ArrowLeft' });
    expect(screen.getByAltText('Louvre Museum photo 1 of 2')).toBeInTheDocument();
  });
});
