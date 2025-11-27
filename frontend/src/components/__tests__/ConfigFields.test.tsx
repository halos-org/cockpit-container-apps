/**
 * Tests for configuration field components
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ConfigField } from '../../api/types';
import { BooleanField, EnumField, IntegerField, PasswordField, PathField, StringField } from '../ConfigFields';

describe('StringField', () => {
    const baseField: ConfigField = {
        id: 'SERVER_NAME',
        type: 'string',
        label: 'Server Name',
        description: 'Name of the server',
    };

    it('renders label', () => {
        render(<StringField field={baseField} value="" onChange={vi.fn()} />);
        expect(screen.getByText('Server Name')).toBeInTheDocument();
    });

    it('renders description as helper text', () => {
        render(<StringField field={baseField} value="" onChange={vi.fn()} />);
        expect(screen.getByText('Name of the server')).toBeInTheDocument();
    });

    it('renders input with current value', () => {
        render(<StringField field={baseField} value="My Server" onChange={vi.fn()} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('My Server');
    });

    it('calls onChange when value changes', async () => {
        const handleChange = vi.fn();
        render(<StringField field={baseField} value="" onChange={handleChange} />);
        const input = screen.getByRole('textbox');
        await userEvent.type(input, 'New Value');
        expect(handleChange).toHaveBeenCalled();
    });

    it('marks required fields', () => {
        const requiredField = { ...baseField, required: true };
        render(<StringField field={requiredField} value="" onChange={vi.fn()} />);
        const input = screen.getByRole('textbox');
        expect(input).toBeRequired();
    });

    it('shows validation error for empty required field', () => {
        const requiredField = { ...baseField, required: true };
        render(<StringField field={requiredField} value="" onChange={vi.fn()} error="This field is required" />);
        expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
});

describe('IntegerField', () => {
    const baseField: ConfigField = {
        id: 'PORT',
        type: 'integer',
        label: 'Port',
        description: 'Server port number',
        min: 1,
        max: 65535,
    };

    it('renders label', () => {
        render(<IntegerField field={baseField} value="3000" onChange={vi.fn()} />);
        expect(screen.getByText('Port')).toBeInTheDocument();
    });

    it('renders numeric input', () => {
        render(<IntegerField field={baseField} value="3000" onChange={vi.fn()} />);
        const input = screen.getByRole('spinbutton') as HTMLInputElement;
        expect(input.value).toBe('3000');
        expect(input.type).toBe('number');
    });

    it('applies min and max attributes', () => {
        render(<IntegerField field={baseField} value="3000" onChange={vi.fn()} />);
        const input = screen.getByRole('spinbutton') as HTMLInputElement;
        expect(input.min).toBe('1');
        expect(input.max).toBe('65535');
    });

    it('calls onChange with numeric value', async () => {
        const handleChange = vi.fn();
        render(<IntegerField field={baseField} value="" onChange={handleChange} />);
        const input = screen.getByRole('spinbutton');
        await userEvent.type(input, '8080');
        expect(handleChange).toHaveBeenCalled();
    });

    it('shows validation error for out-of-range value', () => {
        render(<IntegerField field={baseField} value="70000" onChange={vi.fn()} error="Value must be between 1 and 65535" />);
        expect(screen.getByText('Value must be between 1 and 65535')).toBeInTheDocument();
    });
});

describe('BooleanField', () => {
    const baseField: ConfigField = {
        id: 'ENABLE_SSL',
        type: 'boolean',
        label: 'Enable SSL',
        description: 'Enable SSL/TLS encryption',
    };

    it('renders label', () => {
        render(<BooleanField field={baseField} value="false" onChange={vi.fn()} />);
        expect(screen.getByText('Enable SSL')).toBeInTheDocument();
    });

    it('renders description', () => {
        render(<BooleanField field={baseField} value="false" onChange={vi.fn()} />);
        expect(screen.getByText('Enable SSL/TLS encryption')).toBeInTheDocument();
    });

    it('renders switch in off state when value is false', () => {
        render(<BooleanField field={baseField} value="false" onChange={vi.fn()} />);
        const toggle = screen.getByRole('checkbox') as HTMLInputElement;
        expect(toggle.checked).toBe(false);
    });

    it('renders switch in on state when value is true', () => {
        render(<BooleanField field={baseField} value="true" onChange={vi.fn()} />);
        const toggle = screen.getByRole('checkbox') as HTMLInputElement;
        expect(toggle.checked).toBe(true);
    });

    it('calls onChange when toggled', async () => {
        const handleChange = vi.fn();
        render(<BooleanField field={baseField} value="false" onChange={handleChange} />);
        const toggle = screen.getByRole('checkbox');
        await userEvent.click(toggle);
        expect(handleChange).toHaveBeenCalledWith('ENABLE_SSL', 'true');
    });
});

describe('EnumField', () => {
    const baseField: ConfigField = {
        id: 'LOG_LEVEL',
        type: 'enum',
        label: 'Log Level',
        description: 'Logging verbosity',
        options: [
            { value: 'debug', label: 'Debug' },
            { value: 'info', label: 'Info' },
            { value: 'warn', label: 'Warning' },
            { value: 'error', label: 'Error' },
        ],
    };

    it('renders label', () => {
        render(<EnumField field={baseField} value="info" onChange={vi.fn()} />);
        expect(screen.getByText('Log Level')).toBeInTheDocument();
    });

    it('renders select with all options', async () => {
        render(<EnumField field={baseField} value="info" onChange={vi.fn()} />);
        const select = screen.getByRole('button'); // PatternFly Select uses button
        await userEvent.click(select);

        expect(screen.getByText('Debug')).toBeInTheDocument();
        expect(screen.getByText('Info')).toBeInTheDocument();
        expect(screen.getByText('Warning')).toBeInTheDocument();
        expect(screen.getByText('Error')).toBeInTheDocument();
    });

    it('shows current selection', () => {
        render(<EnumField field={baseField} value="warn" onChange={vi.fn()} />);
        expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('calls onChange when selection changes', async () => {
        const handleChange = vi.fn();
        render(<EnumField field={baseField} value="info" onChange={handleChange} />);
        const select = screen.getByRole('button');
        await userEvent.click(select);
        await userEvent.click(screen.getByText('Error'));
        expect(handleChange).toHaveBeenCalledWith('LOG_LEVEL', 'error');
    });
});

describe('PasswordField', () => {
    const baseField: ConfigField = {
        id: 'ADMIN_PASSWORD',
        type: 'password',
        label: 'Admin Password',
        description: 'Administrator password',
        required: true,
    };

    it('renders label', () => {
        render(<PasswordField field={baseField} value="" onChange={vi.fn()} />);
        expect(screen.getByText('Admin Password')).toBeInTheDocument();
    });

    it('renders password input that masks value', () => {
        render(<PasswordField field={baseField} value="secret123" onChange={vi.fn()} />);
        const input = screen.getByLabelText('Admin Password') as HTMLInputElement;
        expect(input.type).toBe('password');
    });

    it('calls onChange when value changes', async () => {
        const handleChange = vi.fn();
        render(<PasswordField field={baseField} value="" onChange={handleChange} />);
        const input = screen.getByLabelText('Admin Password');
        await userEvent.type(input, 'newpass');
        expect(handleChange).toHaveBeenCalled();
    });

    it('marks required fields', () => {
        render(<PasswordField field={baseField} value="" onChange={vi.fn()} />);
        const input = screen.getByLabelText('Admin Password');
        expect(input).toBeRequired();
    });

    it('shows validation error', () => {
        render(<PasswordField field={baseField} value="" onChange={vi.fn()} error="Password is required" />);
        expect(screen.getByText('Password is required')).toBeInTheDocument();
    });
});

describe('PathField', () => {
    const baseField: ConfigField = {
        id: 'DATA_DIR',
        type: 'path',
        label: 'Data Directory',
        description: 'Path to data storage',
    };

    it('renders label', () => {
        render(<PathField field={baseField} value="/var/lib/app" onChange={vi.fn()} />);
        expect(screen.getByText('Data Directory')).toBeInTheDocument();
    });

    it('renders input with current value', () => {
        render(<PathField field={baseField} value="/var/lib/app" onChange={vi.fn()} />);
        const input = screen.getByRole('textbox') as HTMLInputElement;
        expect(input.value).toBe('/var/lib/app');
    });

    it('calls onChange when value changes', async () => {
        const handleChange = vi.fn();
        render(<PathField field={baseField} value="" onChange={handleChange} />);
        const input = screen.getByRole('textbox');
        await userEvent.type(input, '/new/path');
        expect(handleChange).toHaveBeenCalled();
    });

    it('shows validation error for invalid path', () => {
        render(<PathField field={baseField} value="../etc/passwd" onChange={vi.fn()} error="Invalid path: directory traversal detected" />);
        expect(screen.getByText('Invalid path: directory traversal detected')).toBeInTheDocument();
    });
});
