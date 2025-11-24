/**
 * AppCard Component
 *
 * Displays a single application as a clickable card with name, summary, version, and status badges.
 * Used in the app list view.
 */

import { Badge, Card, CardBody, CardHeader, CardTitle, Label } from '@patternfly/react-core';
import { CubeIcon } from '@patternfly/react-icons';
import React from 'react';
import type { Package } from '../api/types';

export interface AppCardProps {
    /** Package data to display */
    pkg: Package;
    /** Callback when user clicks on the card */
    onSelect: (pkg: Package) => void;
}

export const AppCard: React.FC<AppCardProps> = ({ pkg, onSelect }) => {
    const handleClick = () => {
        onSelect(pkg);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
        }
    };

    return (
        <Card
            isClickable
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            style={{ height: '100%' }}
            tabIndex={0}
            role="button"
            aria-label={`View details for ${pkg.name}`}
        >
            <CardHeader>
                <CubeIcon
                    style={{
                        fontSize: '2rem',
                        color: 'var(--pf-v6-global--primary-color--100)',
                    }}
                />
            </CardHeader>

            <CardTitle>
                {pkg.name}
                <Badge isRead style={{ marginLeft: '0.5rem' }}>
                    {pkg.version}
                </Badge>
            </CardTitle>

            <CardBody>
                <div style={{ marginBottom: '0.5rem' }}>
                    {pkg.installed && (
                        <Label color="green" isCompact style={{ marginRight: '0.5rem' }}>
                            Installed
                        </Label>
                    )}
                    {pkg.upgradable && (
                        <Label color="blue" isCompact>
                            Update available
                        </Label>
                    )}
                </div>
                {pkg.summary && (
                    <div
                        style={{
                            fontSize: '0.875rem',
                            color: 'var(--pf-v6-global--Color--200)',
                        }}
                    >
                        {pkg.summary}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
