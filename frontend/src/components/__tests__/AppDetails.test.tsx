/**
 * Tests for AppDetails component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Package } from '../../api/types';
import { AppDetails } from '../AppDetails';

const mockPackage: Package = {
    name: 'signalk-server',
    version: '2.8.0',
    summary: 'Signal K marine data server for boats',
    section: 'navigation',
    installed: false,
    upgradable: false,
};

describe('AppDetails', () => {
    it('renders package name', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByText('signalk-server')).toBeInTheDocument();
    });

    it('renders package summary', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByText('Signal K marine data server for boats')).toBeInTheDocument();
    });

    it('renders version', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        // Version appears in header badge and description list
        const versions = screen.getAllByText('2.8.0');
        expect(versions.length).toBeGreaterThan(0);
    });

    it('renders section', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByText('navigation')).toBeInTheDocument();
    });

    it('shows install button when not installed', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
    });

    it('shows uninstall button when installed', () => {
        const installedPkg = { ...mockPackage, installed: true };
        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByRole('button', { name: /uninstall/i })).toBeInTheDocument();
    });

    it('shows update button when upgradable', () => {
        const upgradablePkg = { ...mockPackage, installed: true, upgradable: true };
        render(
            <AppDetails
                pkg={upgradablePkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByRole('button', { name: /update/i })).toBeInTheDocument();
    });

    it('calls onInstall when install button clicked', async () => {
        const handleInstall = vi.fn();
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={handleInstall}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /install/i }));
        expect(handleInstall).toHaveBeenCalledWith(mockPackage);
    });

    it('calls onUninstall when uninstall button clicked', async () => {
        const handleUninstall = vi.fn();
        const installedPkg = { ...mockPackage, installed: true };
        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={handleUninstall}
                onBack={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /uninstall/i }));
        expect(handleUninstall).toHaveBeenCalledWith(installedPkg);
    });

    it('calls onBack when back button clicked', async () => {
        const handleBack = vi.fn();
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={handleBack}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /back/i }));
        expect(handleBack).toHaveBeenCalled();
    });

    it('disables buttons when action is in progress', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
                isActionInProgress
            />
        );
        expect(screen.getByRole('button', { name: /install/i })).toBeDisabled();
    });

    it('shows loading spinner when action is in progress', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
                isActionInProgress
            />
        );
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
});
