/**
 * Main application component for Cockpit Container Apps.
 */
import React from 'react';
import {
    Page,
    PageSection,
    Title,
    EmptyState,
    EmptyStateBody,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

export function App(): React.ReactElement {
    return (
        <Page>
            <PageSection>
                <Title headingLevel="h1" size="lg">Container Apps</Title>
            </PageSection>
            <PageSection>
                <EmptyState
                    icon={CubesIcon}
                    titleText="No Container Stores Installed"
                    headingLevel="h4"
                >
                    <EmptyStateBody>
                        Install a container app store package to browse and install container applications.
                    </EmptyStateBody>
                </EmptyState>
            </PageSection>
        </Page>
    );
}
