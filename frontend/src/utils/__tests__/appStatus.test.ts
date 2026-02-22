import { describe, expect, it } from 'vitest';
import { getStatusConfig } from '../appStatus';

describe('getStatusConfig', () => {
    it('returns config for known status "experimental"', () => {
        const config = getStatusConfig('experimental');
        expect(config).toBeDefined();
        expect(config!.label).toBe('Experimental');
        expect(config!.color).toBe('orange');
        expect(config!.installWarning).toBeTruthy();
    });

    it('returns config for known status "beta"', () => {
        const config = getStatusConfig('beta');
        expect(config).toBeDefined();
        expect(config!.label).toBe('Beta');
        expect(config!.color).toBe('gold');
        expect(config!.installWarning).toBeTruthy();
    });

    it('returns config for known status "deprecated"', () => {
        const config = getStatusConfig('deprecated');
        expect(config).toBeDefined();
        expect(config!.label).toBe('Deprecated');
        expect(config!.color).toBe('grey');
        expect(config!.installWarning).toBeTruthy();
    });

    it('returns undefined for unknown status', () => {
        expect(getStatusConfig('unknown-status')).toBeUndefined();
    });

    it('returns undefined for null', () => {
        expect(getStatusConfig(null)).toBeUndefined();
    });

    it('returns undefined for undefined', () => {
        expect(getStatusConfig(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
        expect(getStatusConfig('')).toBeUndefined();
    });
});
