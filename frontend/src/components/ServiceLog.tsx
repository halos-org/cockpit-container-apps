/**
 * ServiceLog Component
 *
 * Displays live systemd journal output for a container app's service.
 * Streams journal entries via the backend service-journal command and
 * renders them with ANSI color support in a scrollable log viewer.
 */

import {
    Button,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
} from '@patternfly/react-core';
import { AngleDownIcon, AngleRightIcon } from '@patternfly/react-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { streamServiceJournal } from '../api';
import type { JournalStreamHandle } from '../api';

const MAX_LOG_LINES = 200;

/** ANSI SGR color code to CSS color mapping */
const ANSI_COLORS: Record<number, string> = {
    30: '#555',
    31: '#c00',
    32: '#0a0',
    33: '#a50',
    34: '#00c',
    35: '#c0c',
    36: '#0cc',
    37: '#ccc',
    90: '#888',
    91: '#f55',
    92: '#5f5',
    93: '#ff5',
    94: '#55f',
    95: '#f5f',
    96: '#5ff',
    97: '#fff',
};

interface AnsiSpan {
    text: string;
    color?: string;
    bold?: boolean;
}

/**
 * Parse ANSI SGR escape sequences into styled spans.
 * Handles colors (30-37, 90-97), bold (1), and reset (0, 39).
 */
export function parseAnsi(text: string): AnsiSpan[] {
    const spans: AnsiSpan[] = [];
    const re = /\x1b\[([0-9;]*)m/g;
    let lastIndex = 0;
    let color: string | undefined;
    let bold = false;

    let match;
    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
            spans.push({ text: text.slice(lastIndex, match.index), color, bold });
        }
        lastIndex = re.lastIndex;

        const params = match[1] ? match[1].split(';').map(Number) : [0];
        for (const code of params) {
            if (code === 0) {
                color = undefined;
                bold = false;
            } else if (code === 1) {
                bold = true;
            } else if (code === 39) {
                color = undefined;
            } else if (ANSI_COLORS[code]) {
                color = ANSI_COLORS[code];
            }
        }
    }

    if (lastIndex < text.length) {
        spans.push({ text: text.slice(lastIndex), color, bold });
    }

    return spans;
}

function AnsiLine({ text }: { text: string }): React.ReactElement {
    const spans = parseAnsi(text);

    return (
        <div>
            {spans.map((span, i) => {
                if (!span.color && !span.bold) {
                    return <React.Fragment key={i}>{span.text}</React.Fragment>;
                }
                const style: React.CSSProperties = {};
                if (span.color) style.color = span.color;
                if (span.bold) style.fontWeight = 'bold';
                return (
                    <span key={i} style={style}>
                        {span.text}
                    </span>
                );
            })}
        </div>
    );
}

interface LogEntry {
    id: number;
    text: string;
}

interface ServiceLogProps {
    packageName: string;
    isExpanded?: boolean;
}

export const ServiceLog: React.FC<ServiceLogProps> = ({
    packageName,
    isExpanded: initialExpanded = false,
}) => {
    const [entries, setEntries] = useState<LogEntry[]>([]);
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [error, setError] = useState<string | null>(null);
    const logEndRef = useRef<HTMLDivElement>(null);
    const streamRef = useRef<JournalStreamHandle | null>(null);
    const shouldAutoScroll = useRef(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const nextId = useRef(0);

    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
        shouldAutoScroll.current = atBottom;
    }, []);

    useEffect(() => {
        if (shouldAutoScroll.current && logEndRef.current) {
            logEndRef.current.scrollIntoView({ block: 'end' });
        }
    }, [entries]);

    useEffect(() => {
        if (!isExpanded) {
            if (streamRef.current) {
                streamRef.current.close();
                streamRef.current = null;
            }
            return;
        }

        setEntries([]);
        setError(null);

        const handle = streamServiceJournal(
            packageName,
            (line) => {
                setEntries((prev) => {
                    const entry: LogEntry = { id: nextId.current++, text: line };
                    const next = [...prev, entry];
                    if (next.length > MAX_LOG_LINES) {
                        return next.slice(next.length - MAX_LOG_LINES);
                    }
                    return next;
                });
            },
            {
                onError: (message) => setError(message),
            },
        );
        streamRef.current = handle;

        return () => {
            handle.close();
            streamRef.current = null;
        };
    }, [isExpanded, packageName]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    <Button
                        variant="link"
                        onClick={() => setIsExpanded(!isExpanded)}
                        icon={isExpanded ? <AngleDownIcon /> : <AngleRightIcon />}
                        style={{ paddingLeft: 0, fontWeight: 'bold', fontSize: '1rem' }}
                    >
                        Service Log
                    </Button>
                </CardTitle>
            </CardHeader>
            {isExpanded && (
                <CardBody>
                    <div
                        ref={containerRef}
                        onScroll={handleScroll}
                        style={{
                            fontFamily: 'var(--pf-v6-global--FontFamily--monospace, monospace)',
                            fontSize: '0.85rem',
                            lineHeight: '1.4',
                            backgroundColor: 'var(--pf-v6-global--BackgroundColor--dark-300, #1b1d21)',
                            color: 'var(--pf-v6-global--Color--light-100, #e0e0e0)',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            maxHeight: '400px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word',
                        }}
                    >
                        {error ? (
                            <div style={{ color: '#f55' }}>
                                Failed to load service log: {error}
                            </div>
                        ) : entries.length === 0 ? (
                            <div style={{ color: '#888', fontStyle: 'italic' }}>
                                No log entries yet
                            </div>
                        ) : (
                            entries.map((entry) => <AnsiLine key={entry.id} text={entry.text} />)
                        )}
                        <div ref={logEndRef} />
                    </div>
                </CardBody>
            )}
        </Card>
    );
};
