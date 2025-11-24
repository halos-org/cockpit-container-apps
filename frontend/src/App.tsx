/**
 * Main application component for Cockpit Container Apps.
 */
import React from 'react';
import {
    Page,
    PageSection,
    Title,
    EmptyState,
    EmptyStateVariant,
    EmptyStateBody,
    EmptyStateHeader,
    EmptyStateIcon,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

export function App(): React.ReactElement {
    return (
        <Page>
            <PageSection>
                <Title headingLevel="h1" size="lg">Container Apps</Title>
            </PageSection>
            <PageSection>
                <EmptyState variant={EmptyStateVariant.lg}>
                    <EmptyStateHeader
                        titleText="No Container Stores Installed"
                        headingLevel="h4"
                        icon={<EmptyStateIcon icon={CubesIcon} />}
                    />
                    <EmptyStateBody>
                        Install a container app store package to browse and install container applications.
                    </EmptyStateBody>
                </EmptyState>
            </PageSection>
        </Page>
    );
}
