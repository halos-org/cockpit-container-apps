/**
 * AppDetails Component
 *
 * Displays detailed information about a container app with install/uninstall actions.
 */

import {
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
import { ArrowLeftIcon, CubeIcon } from '@patternfly/react-icons';
import React from 'react';
import type { Package } from '../api/types';

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
}

export const AppDetails: React.FC<AppDetailsProps> = ({
    pkg,
    onInstall,
    onUninstall,
    onBack,
    isActionInProgress = false,
}) => {
    return (
        <PageSection>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsMd' }}>
                {/* Back button */}
                <FlexItem>
                    <Button variant="link" icon={<ArrowLeftIcon />} onClick={onBack}>
                        Back
                    </Button>
                </FlexItem>

                {/* Header with title and actions */}
                <FlexItem>
                    <Flex
                        justifyContent={{ default: 'justifyContentSpaceBetween' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                    >
                        <FlexItem>
                            <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsMd' }}>
                                <FlexItem>
                                    <CubeIcon style={{ fontSize: '3rem', color: 'var(--pf-v6-global--primary-color--100)' }} />
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
                        <div style={{ fontSize: '1.1rem', color: 'var(--pf-v6-global--Color--200)' }}>
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
                                    <DescriptionListDescription>{pkg.version}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Section</DescriptionListTerm>
                                    <DescriptionListDescription>{pkg.section}</DescriptionListDescription>
                                </DescriptionListGroup>
                                <DescriptionListGroup>
                                    <DescriptionListTerm>Status</DescriptionListTerm>
                                    <DescriptionListDescription>
                                        {pkg.installed ? (
                                            pkg.upgradable ? 'Installed (update available)' : 'Installed'
                                        ) : (
                                            'Not installed'
                                        )}
                                    </DescriptionListDescription>
                                </DescriptionListGroup>
                            </DescriptionList>
                        </CardBody>
                    </Card>
                </FlexItem>
            </Flex>
        </PageSection>
    );
};
