import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CoverImage from './CoverImage';

const fallback = <span>placeholder</span>;

describe('CoverImage', () => {
  it('renders Open Library S/M variants for thumbnails', () => {
    render(<CoverImage src="https://covers.openlibrary.org/b/id/1-L.jpg" thumbnail alt="Dune" fallback={fallback} />);

    const img = screen.getByRole('img', { name: 'Dune' });
    expect(img).toHaveAttribute('src', 'https://covers.openlibrary.org/b/id/1-S.jpg?default=false');
    expect(img).toHaveAttribute('srcset', expect.stringContaining('1-M.jpg?default=false 2x'));
  });

  it('shows the fallback for a missing URL', () => {
    render(<CoverImage src="" alt="Dune" fallback={fallback} />);
    expect(screen.getByText('placeholder')).toBeInTheDocument();
  });

  it('tries a new URL again after the previous one failed', () => {
    const { rerender } = render(<CoverImage src="https://example.com/a.jpg" alt="Dune" fallback={fallback} />);
    fireEvent.error(screen.getByRole('img', { name: 'Dune' }));
    expect(screen.getByText('placeholder')).toBeInTheDocument();

    rerender(<CoverImage src="https://example.com/b.jpg" alt="Dune" fallback={fallback} />);
    expect(screen.getByRole('img', { name: 'Dune' })).toHaveAttribute('src', 'https://example.com/b.jpg');
  });
});
