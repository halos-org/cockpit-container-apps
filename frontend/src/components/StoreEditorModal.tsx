/**
 * Store Editor Modal
 *
 * Modal dialog for enabling/disabling container stores.
 * Stores are Debian packages - enabling means installing, disabling means uninstalling.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Button,
    Checkbox,
    Alert,
    Spinner,
    Stack,
    StackItem,
} from '@patternfly/react-core';
import {
    listStorePackages,
    installPackage,
    removePackage,
    formatErrorMessage,
    type StorePackage,
} from '../api';

interface StoreEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
}

interface StoreState {
    package: StorePackage;
    enabled: boolean; // Current UI state
    originallyInstalled: boolean; // Original state from backend
}

export const StoreEditorModal: React.FC<StoreEditorModalProps> = ({
    isOpen,
    onClose,
    onSave,
}) => {
    const [stores, setStores] = useState<StoreState[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveProgress, setSaveProgress] = useState<string | null>(null);

    // Load store packages when modal opens
    const loadStores = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const packages = await listStorePackages();
            setStores(
                packages.map((pkg) => ({
                    package: pkg,
                    enabled: pkg.installed,
                    originallyInstalled: pkg.installed,
                }))
            );
        } catch (err) {
            setError(formatErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadStores();
        }
    }, [isOpen, loadStores]);

    // Toggle store enabled state
    const handleToggle = (storeId: string) => {
        setStores((prev) =>
            prev.map((store) =>
                store.package.store_id === storeId
                    ? { ...store, enabled: !store.enabled }
                    : store
            )
        );
    };

    // Check if there are pending changes
    const hasChanges = stores.some((store) => store.enabled !== store.originallyInstalled);

    // Get lists of stores to install and remove
    const toInstall = stores.filter((s) => s.enabled && !s.originallyInstalled);
    const toRemove = stores.filter((s) => !s.enabled && s.originallyInstalled);

    // Save changes
    const handleSave = async () => {
        if (!hasChanges) {
            onClose();
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Install stores that were enabled
            for (const store of toInstall) {
                setSaveProgress(`Installing ${store.package.package_name}...`);
                await installPackage(store.package.package_name);
            }

            // Remove stores that were disabled
            for (const store of toRemove) {
                setSaveProgress(`Removing ${store.package.package_name}...`);
                await removePackage(store.package.package_name);
            }

            setSaveProgress(null);
            onSave();
            onClose();
        } catch (err) {
            setError(formatErrorMessage(err));
            setSaveProgress(null);
        } finally {
            setSaving(false);
        }
    };

    // Handle cancel
    const handleCancel = () => {
        if (!saving) {
            onClose();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleCancel}
            aria-label="Edit container stores"
            variant="small"
        >
            <ModalHeader title="Edit Container Stores" />
            <ModalBody>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <Spinner size="lg" aria-label="Loading stores" />
                    </div>
                ) : error && stores.length === 0 ? (
                    <Alert variant="danger" isInline title="Failed to load stores">
                        {error}
                    </Alert>
                ) : stores.length === 0 ? (
                    <p>No container stores available.</p>
                ) : (
                    <Stack hasGutter>
                        {error && (
                            <StackItem>
                                <Alert
                                    variant="danger"
                                    isInline
                                    title="Error"
                                    actionClose={
                                        <Button
                                            variant="plain"
                                            aria-label="Close"
                                            onClick={() => setError(null)}
                                        />
                                    }
                                >
                                    {error}
                                </Alert>
                            </StackItem>
                        )}
                        {saveProgress && (
                            <StackItem>
                                <Alert variant="info" isInline title={saveProgress}>
                                    <Spinner size="sm" />
                                </Alert>
                            </StackItem>
                        )}
                        {stores.map((store) => (
                            <StackItem key={store.package.store_id}>
                                <Checkbox
                                    id={`store-${store.package.store_id}`}
                                    label={store.package.store_id}
                                    description={store.package.description}
                                    isChecked={store.enabled}
                                    onChange={() => handleToggle(store.package.store_id)}
                                    isDisabled={saving}
                                />
                            </StackItem>
                        ))}
                    </Stack>
                )}
            </ModalBody>
            <ModalFooter>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    isDisabled={loading || saving || !hasChanges}
                    isLoading={saving}
                >
                    {saving ? 'Saving...' : 'Save'}
                </Button>
                <Button variant="link" onClick={handleCancel} isDisabled={saving}>
                    Cancel
                </Button>
            </ModalFooter>
        </Modal>
    );
};
