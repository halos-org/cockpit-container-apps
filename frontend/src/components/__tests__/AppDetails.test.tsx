/**
 * Tests for AppDetails component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConfigSchema, Package } from '../../api/types';
import * as api from '../../api';
import { AppDetails } from '../AppDetails';

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

    it('renders displayName when provided', () => {
        const pkgWithDisplayName = { ...mockPackage, displayName: 'Signal K Server' };
        render(
            <AppDetails
                pkg={pkgWithDisplayName}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByText('Signal K Server')).toBeInTheDocument();
    });

    it('falls back to name when displayName is empty', () => {
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

    it('shows package name in details when displayName is set', () => {
        const pkgWithDisplayName = { ...mockPackage, displayName: 'Signal K Server' };
        render(
            <AppDetails
                pkg={pkgWithDisplayName}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByText('Package')).toBeInTheDocument();
        expect(screen.getByText('signalk-server')).toBeInTheDocument();
    });

    it('hides package name row when displayName is empty', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.queryByText('Package')).not.toBeInTheDocument();
    });

    it('uses displayName in breadcrumb when provided', () => {
        const pkgWithDisplayName = { ...mockPackage, displayName: 'Signal K Server' };
        render(
            <AppDetails
                pkg={pkgWithDisplayName}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
                categoryId="navigation"
                categoryLabel="Navigation"
                onNavigateToCategories={vi.fn()}
                onNavigateToCategory={vi.fn()}
            />
        );
        // displayName appears in both heading and breadcrumb
        const elements = screen.getAllByText('Signal K Server');
        expect(elements.length).toBeGreaterThanOrEqual(2);
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

    it('shows status badge when status is experimental', () => {
        const experimentalPkg = { ...mockPackage, status: 'experimental' };
        render(
            <AppDetails
                pkg={experimentalPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        // "Experimental" appears in both badge and warning alert title
        const experimentalElements = screen.getAllByText('Experimental');
        expect(experimentalElements.length).toBeGreaterThanOrEqual(1);
    });

    it('shows warning alert for uninstalled experimental app', () => {
        const experimentalPkg = { ...mockPackage, status: 'experimental' };
        render(
            <AppDetails
                pkg={experimentalPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.getByText(/marked as experimental/)).toBeInTheDocument();
    });

    it('hides warning alert for installed experimental app', () => {
        const experimentalInstalledPkg = { ...mockPackage, status: 'experimental', installed: true };
        render(
            <AppDetails
                pkg={experimentalInstalledPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.queryByText(/marked as experimental/)).not.toBeInTheDocument();
    });

    it('does not show status badge or warning when status is absent', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.queryByText('Experimental')).not.toBeInTheDocument();
        expect(screen.queryByText(/marked as experimental/)).not.toBeInTheDocument();
    });

    it('shows confirmation dialog when installing experimental app', async () => {
        const handleInstall = vi.fn();
        const experimentalPkg = { ...mockPackage, status: 'experimental' };
        render(
            <AppDetails
                pkg={experimentalPkg}
                onInstall={handleInstall}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /install/i }));

        // Dialog should appear, onInstall should NOT have been called
        expect(handleInstall).not.toHaveBeenCalled();
        expect(screen.getByText('Install anyway')).toBeInTheDocument();
    });

    it('proceeds with install after confirming in dialog', async () => {
        const handleInstall = vi.fn();
        const experimentalPkg = { ...mockPackage, status: 'experimental' };
        render(
            <AppDetails
                pkg={experimentalPkg}
                onInstall={handleInstall}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /install/i }));
        await userEvent.click(screen.getByText('Install anyway'));

        expect(handleInstall).toHaveBeenCalledWith(experimentalPkg);
    });

    it('does not install when cancelling confirmation dialog', async () => {
        const handleInstall = vi.fn();
        const experimentalPkg = { ...mockPackage, status: 'experimental' };
        render(
            <AppDetails
                pkg={experimentalPkg}
                onInstall={handleInstall}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /install/i }));
        // Click Cancel in the dialog
        const cancelButtons = screen.getAllByText('Cancel');
        await userEvent.click(cancelButtons[cancelButtons.length - 1]);

        expect(handleInstall).not.toHaveBeenCalled();
    });

    it('shows deprecated badge for deprecated status', () => {
        const deprecatedPkg = { ...mockPackage, status: 'deprecated' };
        render(
            <AppDetails
                pkg={deprecatedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        const deprecatedElements = screen.getAllByText('Deprecated');
        expect(deprecatedElements.length).toBeGreaterThanOrEqual(1);
    });

    it('does not show confirmation dialog for update of experimental app', async () => {
        const handleInstall = vi.fn();
        const experimentalInstalledPkg = {
            ...mockPackage,
            status: 'experimental',
            installed: true,
            upgradable: true,
        };
        render(
            <AppDetails
                pkg={experimentalInstalledPkg}
                onInstall={handleInstall}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await userEvent.click(screen.getByRole('button', { name: /update/i }));

        // Update should proceed directly without confirmation
        expect(handleInstall).toHaveBeenCalledWith(experimentalInstalledPkg);
        expect(screen.queryByText('Install anyway')).not.toBeInTheDocument();
    });
});

describe('AppDetails - Configuration Integration', () => {
    const mockConfigSchema: ConfigSchema = {
        version: '1.0',
        groups: [
            {
                id: 'general',
                label: 'General Settings',
                fields: [
                    {
                        id: 'PORT',
                        type: 'integer',
                        label: 'Port',
                        default: '3000',
                        min: 1,
                        max: 65535,
                    },
                ],
            },
        ],
    };

    const mockConfig = {
        PORT: '8080',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('does not show configuration section for uninstalled apps', () => {
        render(
            <AppDetails
                pkg={mockPackage}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );
        expect(screen.queryByText(/configuration/i)).not.toBeInTheDocument();
    });

    it('shows configuration section for installed apps', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockResolvedValue(mockConfigSchema);
        vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/configuration/i)).toBeInTheDocument();
        });
    });

    it('loads configuration schema when app is installed', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        const getConfigSchemaSpy = vi.spyOn(api, 'getConfigSchema').mockResolvedValue(mockConfigSchema);
        vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(getConfigSchemaSpy).toHaveBeenCalledWith('signalk-server');
        });
    });

    it('loads current configuration values when app is installed', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockResolvedValue(mockConfigSchema);
        const getConfigSpy = vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(getConfigSpy).toHaveBeenCalledWith('signalk-server');
        });
    });

    it('displays configuration form with loaded values', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockResolvedValue(mockConfigSchema);
        vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('General Settings')).toBeInTheDocument();
            expect(screen.getByText('Port')).toBeInTheDocument();
            expect(screen.getByDisplayValue('8080')).toBeInTheDocument();
        });
    });

    it('saves configuration when save button clicked', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockResolvedValue(mockConfigSchema);
        vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);
        const setConfigSpy = vi.spyOn(api, 'setConfig').mockResolvedValue({});

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Port')).toBeInTheDocument();
        });

        const portInput = screen.getByDisplayValue('8080');
        await userEvent.clear(portInput);
        await userEvent.type(portInput, '9000');

        const saveButton = screen.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        await waitFor(() => {
            expect(setConfigSpy).toHaveBeenCalledWith('signalk-server', expect.objectContaining({
                PORT: '9000',
            }));
        });
    });

    it('shows loading state while fetching configuration', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockImplementation(() => new Promise(() => {})); // Never resolves
        vi.spyOn(api, 'getConfig').mockImplementation(() => new Promise(() => {}));

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('shows error message when configuration fails to load', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockRejectedValue(new Error('Failed to load schema'));
        vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
        });
    });

    it('shows error message when save fails', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockResolvedValue(mockConfigSchema);
        vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);
        vi.spyOn(api, 'setConfig').mockRejectedValue(new Error('Failed to save configuration'));

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Port')).toBeInTheDocument();
        });

        const saveButton = screen.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/failed to save/i)).toBeInTheDocument();
        });
    });

    it('hides configuration section when app has no config schema', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockRejectedValue(new Error('Schema not found'));
        vi.spyOn(api, 'getConfig').mockResolvedValue({});

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        // Should gracefully handle missing schema
        await waitFor(() => {
            expect(screen.queryByText('General Settings')).not.toBeInTheDocument();
        });
    });

    it('reloads configuration after successful save', async () => {
        const installedPkg = { ...mockPackage, installed: true };
        vi.spyOn(api, 'getConfigSchema').mockResolvedValue(mockConfigSchema);
        const getConfigSpy = vi.spyOn(api, 'getConfig').mockResolvedValue(mockConfig);
        vi.spyOn(api, 'setConfig').mockResolvedValue({});

        render(
            <AppDetails
                pkg={installedPkg}
                onInstall={vi.fn()}
                onUninstall={vi.fn()}
                onBack={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Port')).toBeInTheDocument();
        });

        const saveButton = screen.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        await waitFor(() => {
            // getConfig should be called twice: once on mount, once after save
            expect(getConfigSpy).toHaveBeenCalledTimes(2);
        });
    });
});
