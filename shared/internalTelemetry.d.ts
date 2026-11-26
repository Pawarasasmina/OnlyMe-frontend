export type TelemetryEvent = { kind: 'error' | 'request' | 'screen'; route?: string; errorType?: string; frames?: string[]; status?: number; durationMs?: number; timedOut?: boolean };
export function redactedFrames(error: unknown): string[];
export function createTelemetryClient(options: { surface: string; endpoint: string; release?: string; fetcher?: typeof fetch }): { emit(event: TelemetryEvent): TelemetryEvent; reportError(error: unknown, route?: string): TelemetryEvent; flush(): Promise<void>; pending(): number };
