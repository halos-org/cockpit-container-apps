import { describe, expect, it } from 'vitest';
import { parseAnsi } from './ServiceLog';

describe('parseAnsi', () => {
    it('returns plain text as a single span with no styling', () => {
        expect(parseAnsi('hello world')).toEqual([
            { text: 'hello world', color: undefined, bold: false },
        ]);
    });

    it('returns an empty array for an empty string', () => {
        expect(parseAnsi('')).toEqual([]);
    });

    it('parses a single color code with reset', () => {
        const input = '\x1b[32mgreen text\x1b[0m';
        expect(parseAnsi(input)).toEqual([
            { text: 'green text', color: '#0a0', bold: false },
        ]);
    });

    it('parses bold text with reset', () => {
        const input = '\x1b[1mbold text\x1b[0m';
        expect(parseAnsi(input)).toEqual([
            { text: 'bold text', color: undefined, bold: true },
        ]);
    });

    it('resets color via \\x1b[39m (default foreground)', () => {
        const input = '\x1b[31mred\x1b[39m normal';
        expect(parseAnsi(input)).toEqual([
            { text: 'red', color: '#c00', bold: false },
            { text: ' normal', color: undefined, bold: false },
        ]);
    });

    it('handles multiple colors in one string', () => {
        const input = '\x1b[31mred\x1b[32mgreen\x1b[0m';
        expect(parseAnsi(input)).toEqual([
            { text: 'red', color: '#c00', bold: false },
            { text: 'green', color: '#0a0', bold: false },
        ]);
    });

    it('handles nested bold + color', () => {
        const input = '\x1b[1m\x1b[33mbold yellow\x1b[0m';
        expect(parseAnsi(input)).toEqual([
            { text: 'bold yellow', color: '#a50', bold: true },
        ]);
    });

    it('persists color to end when there is no closing reset', () => {
        const input = '\x1b[34mblue to the end';
        expect(parseAnsi(input)).toEqual([
            { text: 'blue to the end', color: '#00c', bold: false },
        ]);
    });

    it('parses compound parameters like \\x1b[1;32m (bold + green)', () => {
        const input = '\x1b[1;32mbold green\x1b[0m';
        expect(parseAnsi(input)).toEqual([
            { text: 'bold green', color: '#0a0', bold: true },
        ]);
    });

    it('handles text before, between, and after escape sequences', () => {
        const input = 'before \x1b[31mred\x1b[0m after';
        expect(parseAnsi(input)).toEqual([
            { text: 'before ', color: undefined, bold: false },
            { text: 'red', color: '#c00', bold: false },
            { text: ' after', color: undefined, bold: false },
        ]);
    });

    it('handles bright/high-intensity colors (90-97)', () => {
        const input = '\x1b[91mbright red\x1b[0m';
        expect(parseAnsi(input)).toEqual([
            { text: 'bright red', color: '#f55', bold: false },
        ]);
    });
});
