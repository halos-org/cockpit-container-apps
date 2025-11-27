/**
 * Configuration form component
 * Dynamically generates form from config schema with validation
 */

import {
    ActionGroup,
    Alert,
    Button,
    Form,
    FormSection,
    Title,
} from '@patternfly/react-core';
import { useEffect, useState } from 'react';
import type { ConfigField, ConfigSchema, ConfigValues } from '../api/types';
import {
    BooleanField,
    EnumField,
    IntegerField,
    PasswordField,
    PathField,
    StringField,
} from './ConfigFields';

export interface ConfigFormProps {
    schema: ConfigSchema;
    config: ConfigValues;
    onSave: (config: ConfigValues) => void;
    onCancel: () => void;
    isSaving?: boolean;
    saveError?: string;
}

export function ConfigForm({
    schema,
    config,
    onSave,
    onCancel,
    isSaving = false,
    saveError,
}: ConfigFormProps) {
    // Initialize form values with config + defaults from schema
    const [formValues, setFormValues] = useState<ConfigValues>(() => {
        const values: ConfigValues = { ...config };
        schema.groups.forEach((group) => {
            group.fields.forEach((field) => {
                if (values[field.id] === undefined && field.default !== undefined) {
                    values[field.id] = field.default;
                }
            });
        });
        return values;
    });

    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    // Update form values when config prop changes
    useEffect(() => {
        const values: ConfigValues = { ...config };
        schema.groups.forEach((group) => {
            group.fields.forEach((field) => {
                if (values[field.id] === undefined && field.default !== undefined) {
                    values[field.id] = field.default;
                }
            });
        });
        setFormValues(values);
    }, [config, schema]);

    /**
     * Validate a single field value
     */
    function validateField(field: ConfigField, value: string): string | null {
        // Required field check
        if (field.required && (!value || value.trim() === '')) {
            return 'This field is required';
        }

        // Type-specific validation
        if (field.type === 'integer') {
            if (value) {
                // Use strict regex validation instead of parseInt to prevent partial parsing
                // e.g., "123abc" should fail, not parse as 123
                if (!/^-?\d+$/.test(value)) {
                    return 'Must be a valid integer';
                }
                const num = parseInt(value, 10);
                if (field.min !== undefined && num < field.min) {
                    return `Value must be at least ${field.min}`;
                }
                if (field.max !== undefined && num > field.max) {
                    return `Value must be at most ${field.max}`;
                }
            }
        }

        if (field.type === 'path') {
            // Basic client-side check for directory traversal
            // NOTE: This only catches common cases (../) for UX feedback.
            // Backend MUST perform comprehensive path validation including:
            // - Variants like ..\\, ....//
            // - URL encoding
            // - Symlink resolution
            // - Path canonicalization
            if (value && value.includes('../')) {
                return 'Invalid path: directory traversal detected';
            }
        }

        if (field.type === 'enum') {
            // Check if value is one of the allowed options
            if (value && field.options) {
                const validValues = field.options.map((opt) => opt.value);
                if (!validValues.includes(value)) {
                    return `Value must be one of: ${validValues.join(', ')}`;
                }
            }
        }

        return null;
    }

    /**
     * Validate all fields in the form
     */
    function validateForm(): Record<string, string> {
        const errors: Record<string, string> = {};

        schema.groups.forEach((group) => {
            group.fields.forEach((field) => {
                const value = formValues[field.id] || '';
                const error = validateField(field, value);
                if (error) {
                    errors[field.id] = error;
                }
            });
        });

        return errors;
    }

    /**
     * Handle field value change
     */
    function handleFieldChange(id: string, value: string) {
        setFormValues((prev) => ({ ...prev, [id]: value }));
        // Clear validation error for this field
        if (validationErrors[id]) {
            setValidationErrors((prev) => {
                const { [id]: _, ...rest } = prev;
                return rest;
            });
        }
    }

    /**
     * Handle save button click
     */
    function handleSave() {
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        onSave(formValues);
    }

    /**
     * Handle cancel button click - reset form to original config
     */
    function handleCancel() {
        // Reset form values to original config
        const values: ConfigValues = { ...config };
        schema.groups.forEach((group) => {
            group.fields.forEach((field) => {
                if (values[field.id] === undefined && field.default !== undefined) {
                    values[field.id] = field.default;
                }
            });
        });
        setFormValues(values);
        setValidationErrors({});
        onCancel();
    }

    /**
     * Render appropriate field component based on type
     */
    function renderField(field: ConfigField) {
        const value = formValues[field.id] || '';
        const error = validationErrors[field.id];

        const props = {
            field,
            value,
            onChange: handleFieldChange,
            error,
        };

        switch (field.type) {
            case 'string':
                return <StringField key={field.id} {...props} />;
            case 'integer':
                return <IntegerField key={field.id} {...props} />;
            case 'boolean':
                return <BooleanField key={field.id} {...props} />;
            case 'enum':
                return <EnumField key={field.id} {...props} />;
            case 'password':
                return <PasswordField key={field.id} {...props} />;
            case 'path':
                return <PathField key={field.id} {...props} />;
            default:
                return null;
        }
    }

    return (
        <Form>
            {schema.groups.map((group) => (
                <FormSection key={group.id}>
                    <Title headingLevel="h3">{group.label}</Title>
                    {group.description && <p>{group.description}</p>}
                    {group.fields.map((field) => renderField(field))}
                </FormSection>
            ))}

            {saveError && (
                <Alert variant="danger" title="Save Failed" isInline>
                    {saveError}
                </Alert>
            )}

            <ActionGroup>
                <Button variant="primary" onClick={handleSave} isDisabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="link" onClick={handleCancel}>
                    Cancel
                </Button>
            </ActionGroup>
        </Form>
    );
}
