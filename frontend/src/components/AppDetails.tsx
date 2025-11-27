/**
 * AppDetails Component
 *
 * Displays detailed information about a container app with install/uninstall actions.
 */

import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    DescriptionList,
    DescriptionListDescription,
    DescriptionListGroup,
    DescriptionListTerm,
    Flex,
    FlexItem,
    Label,
    PageSection,
    Spinner,
    Title,
} from '@patternfly/react-core';
import { CubeIcon } from '@patternfly/react-icons';
import React, { useEffect, useState } from 'react';
import { formatErrorMessage, getConfig, getConfigSchema, setConfig } from '../api';
import type { ConfigSchema, ConfigValues, Package } from '../api/types';
import { BreadcrumbNav } from './BreadcrumbNav';
import { ConfigForm } from './ConfigForm';

export interface AppDetailsProps {
    /** Package to display */
    pkg: Package;
    /** Callback when user clicks install/update */
    onInstall: (pkg: Package) => void;
    /** Callback when user clicks uninstall */
    onUninstall: (pkg: Package) => void;
    /** Callback when user clicks back */
    onBack: () => void;
    /** Whether an action (install/uninstall) is in progress */
    isActionInProgress?: boolean;
    /** Category ID for breadcrumb navigation */
    categoryId?: string;
    /** Category label for breadcrumb display */
    categoryLabel?: string;
    /** Navigate to categories view */
    onNavigateToCategories?: () => void;
    /** Navigate to a specific category */
    onNavigateToCategory?: (categoryId: string) => void;
}

export const AppDetails: React.FC<AppDetailsProps> = ({
    pkg,
    onInstall,
    onUninstall,
    onBack,
    isActionInProgress = false,
    categoryId,
    categoryLabel,
    onNavigateToCategories,
    onNavigateToCategory,
}) => {
    // Configuration state
    const [configSchema, setConfigSchema] = useState<ConfigSchema | null>(null);
    const [config, setConfigState] = useState<ConfigValues>({});
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveWarning, setSaveWarning] = useState<string | null>(null);

    // Load configuration when app is installed
    useEffect(() => {
        if (pkg.installed) {
            loadConfiguration();
        } else {
            // Clear config state if app is not installed
            setConfigSchema(null);
            setConfigState({});
            setConfigError(null);
        }
    }, [pkg.installed, pkg.name]);

    async function loadConfiguration() {
        setIsLoadingConfig(true);
        setConfigError(null);
        try {
            const [schema, configValues] = await Promise.all([
                getConfigSchema(pkg.name),
                getConfig(pkg.name),
            ]);
            setConfigSchema(schema);
            setConfigState(configValues);
        } catch (error) {
            // Not all apps have configuration schema
            // Display error for visibility but treat as non-critical
            // (configuration section won't render if schema is null)
            setConfigError(formatErrorMessage(error));
            setConfigSchema(null);
        } finally {
            setIsLoadingConfig(false);
        }
    }

    async function handleConfigSave(newConfig: ConfigValues) {
        setIsSavingConfig(true);
        setSaveError(null);
        setSaveWarning(null);
        try {
            const result = await setConfig(pkg.name, newConfig);
            // Reload config after save
            const updatedConfig = await getConfig(pkg.name);
            setConfigState(updatedConfig);
            // Show warning if service restart failed
            if (result.warning) {
                setSaveWarning(result.warning);
            }
        } catch (error) {
            setSaveError(formatErrorMessage(error));
        } finally {
            setIsSavingConfig(false);
        }
    }

    function handleConfigCancel() {
        setSaveError(null);
        setSaveWarning(null);
    }

    return (
        <PageSection>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
                {/* Breadcrumb navigation */}
                {categoryId && categoryLabel && onNavigateToCategories && onNavigateToCategory ? (
                    <FlexItem>
                        <BreadcrumbNav
                            level="app"
                            categoryId={categoryId}
                            categoryLabel={categoryLabel}
                            appName={pkg.name}
                            onNavigateToCategories={onNavigateToCategories}
                            onNavigateToCategory={onNavigateToCategory}
                        />
                    </FlexItem>
                ) : (
                    <FlexItem>
                        <Button variant="link" onClick={onBack}>
                            Back
                        </Button>
                    </FlexItem>
                )}

                {/* Header with title and actions */}
                <FlexItem>
                    <Flex
                        justifyContent={{ default: 'justifyContentSpaceBetween' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                    >
                        <FlexItem>
                            <Flex
                                alignItems={{ default: 'alignItemsCenter' }}
                                spaceItems={{ default: 'spaceItemsMd' }}
                            >
                                <FlexItem>
                                    <CubeIcon
                                        style={{
                                            fontSize: '3rem',
                                            color: 'var(--pf-v6-global--primary-color--100)',
                                        }}
                                    />
                                </FlexItem>
                                <FlexItem>
                                    <Title headingLevel="h1">{pkg.name}</Title>
                                </FlexItem>
                                <FlexItem>
                                    <Badge isRead>{pkg.version}</Badge>
                                </FlexItem>
                                {pkg.installed && (
                                    <FlexItem>
                                        <Label color="green" isCompact>
                                            Installed
                                        </Label>
                                    </FlexItem>
                                )}
                                {pkg.upgradable && (
                                    <FlexItem>
                                        <Label color="blue" isCompact>
                                            Update available
                                        </Label>
                                    </FlexItem>
                                )}
                            </Flex>
                        </FlexItem>

                        {/* Action buttons */}
                        <FlexItem>
                            <Flex spaceItems={{ default: 'spaceItemsSm' }}>
                                {isActionInProgress && (
                                    <FlexItem>
                                        <Spinner size="md" aria-label="Action in progress" />
                                    </FlexItem>
                                )}
                                {!pkg.installed ? (
                                    <FlexItem>
                                        <Button
                                            variant="primary"
                                            onClick={() => onInstall(pkg)}
                                            isDisabled={isActionInProgress}
                                        >
                                            Install
                                        </Button>
                                    </FlexItem>
                                ) : (
                                    <>
                                        {pkg.upgradable && (
                                            <FlexItem>
                                                <Button
                                                    variant="primary"
                                                    onClick={() => onInstall(pkg)}
                                                    isDisabled={isActionInProgress}
                                                >
                                                    Update
                                                </Button>
                                            </FlexItem>
                                        )}
                                        <FlexItem>
                                            <Button
                                                variant="danger"
                                                onClick={() => onUninstall(pkg)}
                                                isDisabled={isActionInProgress}
                                            >
                                                Uninstall
                                            </Button>
                                        </FlexItem>
                                    </>
                                )}
                            </Flex>
                        </FlexItem>
                    </Flex>
                </FlexItem>

                {/* Description */}
                {pkg.summary && (
                    <FlexItem>
                        <div
                            style={{ fontSize: '1.1rem', color: 'var(--pf-v6-global--Color--200)' }}
                        >
                            {pkg.summary}
                        </div>
                    </FlexItem>
                )}

                {/* Details card */}
                <FlexItem>
                    <Card>
                        <CardBody>
                            <DescriptionList>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Version</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        {pkg.version}
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Section</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        {pkg.section}
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Status</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        {pkg.installed
                                            ? pkg.upgradable
                                                ? 'Installed (update available)'
                                                : 'Installed'
                                            : 'Not installed'}
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                        </CardBody>
                    </Card>
                </FlexItem>

                {/* Configuration section - only for installed apps */}
                {pkg.installed && (
                    <FlexItem>
                        <Title headingLevel="h2">Configuration</Title>

                        {isLoadingConfig && <Spinner aria-label="Loading configuration" />}

                        {configError && !isLoadingConfig && (
                            <Alert variant="danger" title="Configuration Error" isInline>
                                {configError}
                            </Alert>
                        )}

                        {configSchema && !isLoadingConfig && (
                            <Card>
                                <CardBody>
                                    <ConfigForm
                                        schema={configSchema}
                                        config={config}
                                        onSave={handleConfigSave}
                                        onCancel={handleConfigCancel}
                                        isSaving={isSavingConfig}
                                        saveError={saveError || undefined}
                                        saveWarning={saveWarning || undefined}
                                    />
                                </CardBody>
                            </Card>
                        )}
                    </FlexItem>
                )}
            </Flex>
        </PageSection>
    );
};
