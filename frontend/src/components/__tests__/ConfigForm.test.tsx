/**
 * Tests for ConfigForm component
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigSchema } from '../../api/types';
import { ConfigForm } from '../ConfigForm';

const mockSchema: ConfigSchema = {
    version: '1.0',
    groups: [
        {
            id: 'general',
            label: 'General Settings',
            description: 'Basic configuration',
            fields: [
                {
                    id: 'SERVER_NAME',
                    type: 'string',
                    label: 'Server Name',
                    description: 'Name of the server',
                    default: 'My Server',
                    required: true,
                },
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
        {
            id: 'advanced',
            label: 'Advanced Settings',
            fields: [
                {
                    id: 'ENABLE_DEBUG',
                    type: 'boolean',
                    label: 'Enable Debug Mode',
                    default: 'false',
                },
                {
                    id: 'LOG_LEVEL',
                    type: 'enum',
                    label: 'Log Level',
                    default: 'info',
                    options: [
                        { value: 'debug', label: 'Debug' },
                        { value: 'info', label: 'Info' },
                        { value: 'warn', label: 'Warning' },
                    ],
                },
            ],
        },
    ],
};

const mockConfig = {
    SERVER_NAME: 'Test Server',
    PORT: '8080',
    ENABLE_DEBUG: 'true',
    LOG_LEVEL: 'debug',
};

describe('ConfigForm', () => {
    it('renders all field groups', () => {
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText('General Settings')).toBeInTheDocument();
        expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    it('renders group descriptions', () => {
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText('Basic configuration')).toBeInTheDocument();
    });

    it('renders all fields from schema', () => {
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByText('Server Name')).toBeInTheDocument();
        expect(screen.getByText('Port')).toBeInTheDocument();
        expect(screen.getByText('Enable Debug Mode')).toBeInTheDocument();
        expect(screen.getByText('Log Level')).toBeInTheDocument();
    });

    it('displays current configuration values', () => {
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} />);
        const serverInput = screen.getByDisplayValue('Test Server');
        expect(serverInput).toBeInTheDocument();
        const portInput = screen.getByDisplayValue('8080');
        expect(portInput).toBeInTheDocument();
    });

    it('uses default values when config is empty', () => {
        render(<ConfigForm schema={mockSchema} config={{}} onSave={vi.fn()} onCancel={vi.fn()} />);
        const serverInput = screen.getByDisplayValue('My Server');
        expect(serverInput).toBeInTheDocument();
        const portInput = screen.getByDisplayValue('3000');
        expect(portInput).toBeInTheDocument();
    });

    it('renders save and cancel buttons', () => {
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('calls onSave with updated config when save clicked', async () => {
        const handleSave = vi.fn();
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={handleSave} onCancel={vi.fn()} />);

        const serverInput = screen.getByDisplayValue('Test Server');
        await userEvent.clear(serverInput);
        await userEvent.type(serverInput, 'Updated Server');

        const saveButton = screen.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        await waitFor(() => {
            expect(handleSave).toHaveBeenCalledWith(
                expect.objectContaining({
                    SERVER_NAME: 'Updated Server',
                })
            );
        });
    });

    it('calls onCancel when cancel clicked', async () => {
        const handleCancel = vi.fn();
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={handleCancel} />);

        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        await userEvent.click(cancelButton);

        expect(handleCancel).toHaveBeenCalled();
    });

    it('validates required fields before save', async () => {
        const handleSave = vi.fn();
        render(<ConfigForm schema={mockSchema} config={{ ...mockConfig, SERVER_NAME: '' }} onSave={handleSave} onCancel={vi.fn()} />);

        const saveButton = screen.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        // Should show validation error
        expect(screen.getByText(/required/i)).toBeInTheDocument();
        // Should not call onSave
        expect(handleSave).not.toHaveBeenCalled();
    });

    it('validates integer field constraints', async () => {
        const handleSave = vi.fn();
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={handleSave} onCancel={vi.fn()} />);

        const portInput = screen.getByDisplayValue('8080');
        await userEvent.clear(portInput);
        await userEvent.type(portInput, '70000'); // Above max

        const saveButton = screen.getByRole('button', { name: /save/i });
        await userEvent.click(saveButton);

        // Should show validation error
        expect(screen.getByText(/65535/i)).toBeInTheDocument();
        expect(handleSave).not.toHaveBeenCalled();
    });

    it('disables save button while saving', async () => {
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} isSaving={true} />);

        const saveButton = screen.getByRole('button', { name: /saving/i });
        expect(saveButton).toBeDisabled();
    });

    it('shows save error message', () => {
        const errorMessage = 'Failed to save configuration';
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} saveError={errorMessage} />);

        expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('clears error when user makes changes', async () => {
        const { rerender } = render(
            <ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} saveError="Previous error" />
        );

        expect(screen.getByText('Previous error')).toBeInTheDocument();

        const serverInput = screen.getByDisplayValue('Test Server');
        await userEvent.type(serverInput, 'x');

        // Re-render without error after onChange
        rerender(<ConfigForm schema={mockSchema} config={mockConfig} onSave={vi.fn()} onCancel={vi.fn()} />);

        expect(screen.queryByText('Previous error')).not.toBeInTheDocument();
    });

    it('tracks dirty state when values change', async () => {
        const handleSave = vi.fn();
        render(<ConfigForm schema={mockSchema} config={mockConfig} onSave={handleSave} onCancel={vi.fn()} />);

        const serverInput = screen.getByDisplayValue('Test Server');
        await userEvent.type(serverInput, ' Modified');

        // Save button should be enabled (form is dirty)
        const saveButton = screen.getByRole('button', { name: /save/i });
        expect(saveButton).not.toBeDisabled();
    });

    it('handles all field types correctly', () => {
        const complexSchema: ConfigSchema = {
            version: '1.0',
            groups: [
                {
                    id: 'all-types',
                    label: 'All Field Types',
                    fields: [
                        { id: 'STRING_FIELD', type: 'string', label: 'String' },
                        { id: 'INT_FIELD', type: 'integer', label: 'Integer', min: 0, max: 100 },
                        { id: 'BOOL_FIELD', type: 'boolean', label: 'Boolean' },
                        { id: 'ENUM_FIELD', type: 'enum', label: 'Enum', options: [{ value: 'a', label: 'A' }] },
                        { id: 'PASSWORD_FIELD', type: 'password', label: 'Password' },
                        { id: 'PATH_FIELD', type: 'path', label: 'Path' },
                    ],
                },
            ],
        };

        render(<ConfigForm schema={complexSchema} config={{}} onSave={vi.fn()} onCancel={vi.fn()} />);

        expect(screen.getByText('String')).toBeInTheDocument();
        expect(screen.getByText('Integer')).toBeInTheDocument();
        expect(screen.getByText('Boolean')).toBeInTheDocument();
        expect(screen.getByText('Enum')).toBeInTheDocument();
        expect(screen.getByText('Password')).toBeInTheDocument();
        expect(screen.getByText('Path')).toBeInTheDocument();
    });
});
