/**
 * Tests for AppCard component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Package } from '../../api/types';
import { AppCard } from '../AppCard';

const mockPackage: Package = {
    name: 'signalk-server',
    displayName: '',
    version: '2.8.0',
    summary: 'Signal K marine data server for boats',
    section: 'navigation',
    installed: false,
    upgradable: false,
    categories: ['navigation'],
};

describe('AppCard', () => {
    it('renders package name', () => {
        render(<AppCard pkg={mockPackage} onSelect={vi.fn()} />);
        expect(screen.getByText('signalk-server')).toBeInTheDocument();
    });

    it('renders package summary', () => {
        render(<AppCard pkg={mockPackage} onSelect={vi.fn()} />);
        expect(screen.getByText('Signal K marine data server for boats')).toBeInTheDocument();
    });

    it('renders version', () => {
        render(<AppCard pkg={mockPackage} onSelect={vi.fn()} />);
        expect(screen.getByText('2.8.0')).toBeInTheDocument();
    });

    it('shows installed badge when installed', () => {
        const installedPkg = { ...mockPackage, installed: true };
        render(<AppCard pkg={installedPkg} onSelect={vi.fn()} />);
        expect(screen.getByText(/installed/i)).toBeInTheDocument();
    });

    it('shows upgradable badge when upgradable', () => {
        const upgradablePkg = { ...mockPackage, installed: true, upgradable: true };
        render(<AppCard pkg={upgradablePkg} onSelect={vi.fn()} />);
        expect(screen.getByText(/update/i)).toBeInTheDocument();
    });

    it('does not show installed badge when not installed', () => {
        render(<AppCard pkg={mockPackage} onSelect={vi.fn()} />);
        expect(screen.queryByText(/installed/i)).not.toBeInTheDocument();
    });

    it('calls onSelect with package when clicked', async () => {
        const handleSelect = vi.fn();
        render(<AppCard pkg={mockPackage} onSelect={handleSelect} />);

        await userEvent.click(screen.getByRole('button'));

        expect(handleSelect).toHaveBeenCalledWith(mockPackage);
    });

    it('calls onSelect when Enter key pressed', async () => {
        const handleSelect = vi.fn();
        render(<AppCard pkg={mockPackage} onSelect={handleSelect} />);

        const card = screen.getByRole('button');
        card.focus();
        await userEvent.keyboard('{Enter}');

        expect(handleSelect).toHaveBeenCalledWith(mockPackage);
    });

    it('has accessible label', () => {
        render(<AppCard pkg={mockPackage} onSelect={vi.fn()} />);
        expect(screen.getByRole('button')).toHaveAccessibleName(/signalk-server/i);
    });

    it('renders displayName when provided', () => {
        const pkgWithDisplayName = { ...mockPackage, displayName: 'Signal K Server' };
        render(<AppCard pkg={pkgWithDisplayName} onSelect={vi.fn()} />);
        expect(screen.getByText('Signal K Server')).toBeInTheDocument();
        expect(screen.queryByText('signalk-server')).not.toBeInTheDocument();
    });

    it('falls back to name when displayName is empty', () => {
        render(<AppCard pkg={mockPackage} onSelect={vi.fn()} />);
        expect(screen.getByText('signalk-server')).toBeInTheDocument();
    });

    it('uses displayName in accessible label when provided', () => {
        const pkgWithDisplayName = { ...mockPackage, displayName: 'Signal K Server' };
        render(<AppCard pkg={pkgWithDisplayName} onSelect={vi.fn()} />);
        expect(screen.getByRole('button')).toHaveAccessibleName(/Signal K Server/);
    });
});
