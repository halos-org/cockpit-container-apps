/**
 * App status configuration for status::* debtags.
 *
 * Maps status values to UI presentation: badge labels/colors and
 * optional install confirmation dialogs. Confirmation is triggered
 * when installWarning is present.
 */

import type { LabelProps } from '@patternfly/react-core';

export interface StatusConfig {
    label: string;
    color: LabelProps['color'];
    /** Warning shown in an alert and confirmation dialog. If present, install requires confirmation. */
    installWarning?: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
    experimental: {
        label: 'Experimental',
        color: 'orange',
        installWarning:
            'This app is marked as experimental and may have bugs, performance limitations, or other problems. Use at your own risk.',
    },
    beta: {
        label: 'Beta',
        color: 'gold',
        installWarning:
            'This app is in beta. It may contain bugs or incomplete features. Use at your own risk.',
    },
    deprecated: {
        label: 'Deprecated',
        color: 'grey',
        installWarning:
            'This app is deprecated and may be removed in a future release. Consider using an alternative.',
    },
};

export function getStatusConfig(status: string | null | undefined): StatusConfig | undefined {
    if (!status) return undefined;
    return STATUS_CONFIG[status];
}
