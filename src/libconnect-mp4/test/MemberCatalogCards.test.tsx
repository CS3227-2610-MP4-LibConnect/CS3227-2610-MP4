import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemberCatalogCards } from '../src/MemberCatalog';

describe('member catalog cards', () => {
  test('renders the full synopsis as text without an expansion control', () => {
    const synopsis = '<script>synthetic literal text</script> '.repeat(12).trim();
    render(<MemberCatalogCards books={[{
      isbn: 'synthetic-isbn', title: 'Synthetic book', author: 'Synthetic author', synopsis,
    }]} />);

    expect(screen.getByRole('heading', { name: 'Synthetic book' })).toBeVisible();
    expect(screen.getByText('Synthetic author')).toBeVisible();
    expect(screen.getByText(synopsis, { selector: '.catalog-card__synopsis-visible' })).toBeVisible();

    expect(screen.queryByRole('button', { name: 'Read full synopsis' })).not.toBeInTheDocument();
    expect(screen.getByText(synopsis).closest('p')).not.toHaveClass('is-expanded');
  });

  test('uses a neutral presentation when the optional synopsis is missing', () => {
    render(<MemberCatalogCards books={[{
      isbn: 'synthetic-empty', title: 'Untitled record', author: 'Synthetic author', synopsis: '',
    }]} />);
    expect(screen.getByText('No synopsis provided', { selector: '.catalog-card__synopsis-visible' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Read full synopsis' })).not.toBeInTheDocument();
  });
});
