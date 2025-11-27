/**
 * Configuration field components
 * Renders different field types based on config schema
 */

import {
    FormGroup,
    FormHelperText,
    HelperText,
    HelperTextItem,
    MenuToggle,
    Select,
    SelectList,
    SelectOption,
    Switch,
    TextInput,
} from '@patternfly/react-core';
import { useState } from 'react';
import type { ConfigField } from '../api/types';

interface FieldProps {
    field: ConfigField;
    value: string;
    onChange: (id: string, value: string) => void;
    error?: string;
}

/**
 * String field - text input
 */
export function StringField({ field, value, onChange, error }: FieldProps) {
    return (
        <FormGroup label={field.label} isRequired={field.required} fieldId={field.id}>
            {field.description && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem>{field.description}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
            <TextInput
                id={field.id}
                type="text"
                value={value}
                onChange={(_event, val) => onChange(field.id, val)}
                isRequired={field.required}
                validated={error ? 'error' : 'default'}
                aria-label={field.label}
            />
            {error && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
        </FormGroup>
    );
}

/**
 * Integer field - numeric input with min/max
 */
export function IntegerField({ field, value, onChange, error }: FieldProps) {
    return (
        <FormGroup label={field.label} isRequired={field.required} fieldId={field.id}>
            {field.description && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem>{field.description}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
            <TextInput
                id={field.id}
                type="number"
                value={value}
                onChange={(_event, val) => onChange(field.id, val)}
                isRequired={field.required}
                validated={error ? 'error' : 'default'}
                aria-label={field.label}
                min={field.min}
                max={field.max}
            />
            {error && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
        </FormGroup>
    );
}

/**
 * Boolean field - toggle switch
 */
export function BooleanField({ field, value, onChange, error }: FieldProps) {
    // Accept multiple boolean representations for flexibility when reading values
    // (e.g., from backend or defaults), but always output 'true'/'false' for consistency
    const isChecked = value === 'true' || value === '1' || value === 'yes';

    return (
        <FormGroup label={field.label} fieldId={field.id}>
            {field.description && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem>{field.description}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
            <Switch
                id={field.id}
                aria-label={field.label}
                isChecked={isChecked}
                onChange={(_event, checked) => onChange(field.id, checked ? 'true' : 'false')}
            />
            {error && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
        </FormGroup>
    );
}

/**
 * Enum field - dropdown selection
 */
export function EnumField({ field, value, onChange, error }: FieldProps) {
    const [isOpen, setIsOpen] = useState(false);

    const options = field.options || [];
    const selectedOption = options.find((opt) => opt.value === value);
    const selectedLabel = selectedOption?.label || value || 'Select...';

    return (
        <FormGroup label={field.label} isRequired={field.required} fieldId={field.id}>
            {field.description && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem>{field.description}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
            <Select
                id={field.id}
                isOpen={isOpen}
                selected={value}
                onSelect={(_event, selection) => {
                    onChange(field.id, selection as string);
                    setIsOpen(false);
                }}
                onOpenChange={(open) => setIsOpen(open)}
                toggle={(toggleRef) => (
                    <MenuToggle
                        ref={toggleRef}
                        onClick={() => setIsOpen(!isOpen)}
                        isExpanded={isOpen}
                        style={{ width: '100%' }}
                    >
                        {selectedLabel}
                    </MenuToggle>
                )}
            >
                <SelectList>
                    {options.map((option) => (
                        <SelectOption key={option.value} value={option.value}>
                            {option.label}
                        </SelectOption>
                    ))}
                </SelectList>
            </Select>
            {error && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
        </FormGroup>
    );
}

/**
 * Password field - masked input
 */
export function PasswordField({ field, value, onChange, error }: FieldProps) {
    return (
        <FormGroup label={field.label} isRequired={field.required} fieldId={field.id}>
            {field.description && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem>{field.description}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
            <TextInput
                id={field.id}
                type="password"
                value={value}
                onChange={(_event, val) => onChange(field.id, val)}
                isRequired={field.required}
                validated={error ? 'error' : 'default'}
                aria-label={field.label}
            />
            {error && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
        </FormGroup>
    );
}

/**
 * Path field - file/directory path input
 */
export function PathField({ field, value, onChange, error }: FieldProps) {
    return (
        <FormGroup label={field.label} isRequired={field.required} fieldId={field.id}>
            {field.description && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem>{field.description}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
            <TextInput
                id={field.id}
                type="text"
                value={value}
                onChange={(_event, val) => onChange(field.id, val)}
                isRequired={field.required}
                validated={error ? 'error' : 'default'}
                aria-label={field.label}
            />
            {error && (
                <FormHelperText>
                    <HelperText>
                        <HelperTextItem variant="error">{error}</HelperTextItem>
                    </HelperText>
                </FormHelperText>
            )}
        </FormGroup>
    );
}
