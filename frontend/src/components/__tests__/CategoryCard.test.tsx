/**
 * Tests for CategoryCard component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Category } from '../../api/types';
import { CategoryCard } from '../CategoryCard';

const mockCategory: Category = {
    id: 'navigation',
    label: 'Navigation',
    icon: null,
    description: 'Navigation and GPS applications',
    count: 5,
    count_all: 5,
    count_available: 3,
    count_installed: 2,
};

describe('CategoryCard', () => {
    it('renders category label', () => {
        render(<CategoryCard category={mockCategory} onNavigate={vi.fn()} />);
        expect(screen.getByText('Navigation')).toBeInTheDocument();
    });

    it('renders package count badge', () => {
        render(<CategoryCard category={mockCategory} onNavigate={vi.fn()} />);
        expect(screen.getByText('5 apps')).toBeInTheDocument();
    });

    it('renders singular "app" for count of 1', () => {
        const singleAppCategory = { ...mockCategory, count: 1 };
        render(<CategoryCard category={singleAppCategory} onNavigate={vi.fn()} />);
        expect(screen.getByText('1 app')).toBeInTheDocument();
    });

    it('renders description when provided', () => {
        render(<CategoryCard category={mockCategory} onNavigate={vi.fn()} />);
        expect(screen.getByText('Navigation and GPS applications')).toBeInTheDocument();
    });

    it('does not render description when null', () => {
        const noDescCategory = { ...mockCategory, description: null };
        render(<CategoryCard category={noDescCategory} onNavigate={vi.fn()} />);
        expect(screen.queryByText('Navigation and GPS applications')).not.toBeInTheDocument();
    });

    it('calls onNavigate with category id when clicked', async () => {
        const handleNavigate = vi.fn();
        render(<CategoryCard category={mockCategory} onNavigate={handleNavigate} />);

        await userEvent.click(screen.getByRole('button'));

        expect(handleNavigate).toHaveBeenCalledWith('navigation');
    });

    it('calls onNavigate when Enter key pressed', async () => {
        const handleNavigate = vi.fn();
        render(<CategoryCard category={mockCategory} onNavigate={handleNavigate} />);

        const card = screen.getByRole('button');
        card.focus();
        await userEvent.keyboard('{Enter}');

        expect(handleNavigate).toHaveBeenCalledWith('navigation');
    });

    it('has accessible label', () => {
        render(<CategoryCard category={mockCategory} onNavigate={vi.fn()} />);
        expect(screen.getByRole('button')).toHaveAccessibleName(/View 5 apps in Navigation/);
    });
});
