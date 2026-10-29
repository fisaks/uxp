import os from "os";
import { Writable } from "stream";

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_LINES = 200;
// While Loki cannot be reached the newest lines are kept up to this many, the oldest are dropped.
const MAX_BUFFERED_LINES = 2000;
const REQUEST_TIMEOUT_MS = 5000;
const SHUTDOWN_FLUSH_MS = 2000;
const WARN_EVERY_MS = 60_000;
type LogEntry = [timestampNs: string, line: string];

/** The time of a log line in nanoseconds, as Loki wants it: the "time" of the JSON line (in ms) or now. */
const timestampOf = (line: string): string => {
    const time = Number(/"time":(\d{13})/.exec(line)?.[1] ?? Date.now());
    return `${time}000000`;
};

/**
 * Sends log lines to Loki (https://grafana.com/docs/loki/latest/reference/loki-http-api/#ingest-logs) in batches, with the
 * labels `container`, `stream` and `host`, the same labels the container logs of the server have. It never gets in the
 * way of the service: a failed send is retried with the next batch, and when Loki stays away the oldest lines are dropped.
 */
export class LokiShipper {
    private buffer: LogEntry[] = [];
    private timer?: NodeJS.Timeout;
    private sending = false;
    private lastWarningAt = 0;

    constructor(
        private readonly url: string,
        private readonly labels: Record<string, string>
    ) {}

    add(line: string) {
        this.buffer.push([timestampOf(line), line]);
        if (this.buffer.length > MAX_BUFFERED_LINES) {
            this.buffer.splice(0, this.buffer.length - MAX_BUFFERED_LINES);
        }
        if (this.buffer.length >= MAX_BATCH_LINES) {
            void this.flush();
        } else {
            this.timer ??= setTimeout(() => void this.flush(), FLUSH_INTERVAL_MS).unref();
        }
    }

    async flush(): Promise<void> {
        clearTimeout(this.timer);
        this.timer = undefined;
        if (this.sending || this.buffer.length === 0) {
            return;
        }
        this.sending = true;
        const batch = this.buffer.splice(0, MAX_BATCH_LINES);
        let delivered = false;
        try {
            const response = await fetch(`${this.url.replace(/\/$/, "")}/loki/api/v1/push`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ streams: [{ stream: this.labels, values: batch }] }),
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (!response.ok) {
                throw new Error(`Loki answered ${response.status}`);
            }
            delivered = true;
        } catch (error) {
            this.buffer.unshift(...batch);
            this.buffer.splice(0, Math.max(0, this.buffer.length - MAX_BUFFERED_LINES));
            this.warn(error);
        } finally {
            this.sending = false;
        }
        if (delivered && this.buffer.length >= MAX_BATCH_LINES) {
            // More lines came while this batch was on its way: they do not wait for the next interval.
            await this.flush();
        } else if (this.buffer.length > 0) {
            this.timer ??= setTimeout(() => void this.flush(), FLUSH_INTERVAL_MS).unref();
        }
    }

    /** Written to stderr, not logged, so that a failing log shipping does not make more log lines to ship. */
    private warn(error: unknown) {
        const now = Date.now();
        if (now - this.lastWarningAt >= WARN_EVERY_MS) {
            this.lastWarningAt = now;
            process.stderr.write(
                `Could not send the logs to Loki, ${this.buffer.length} lines wait: ${error instanceof Error ? error.message : String(error)}\n`
            );
        }
    }
}

/**
 * The stream the server writes its log lines (JSON, one per line) to: the standard output, where systemd takes them
 * to the log file, and Loki when `lokiUrl` is set.
 */
export const createLogStream = (lokiUrl?: string): Writable => {
    const shipper = lokiUrl ? new LokiShipper(lokiUrl, { container: "aud-bff", stream: "stdout", host: os.hostname() }) : undefined;
    if (shipper) {
        // A stop of the service should not lose the last lines, which are the ones that tell why it stopped.
        for (const signal of ["SIGTERM", "SIGINT"] as const) {
            process.once(signal, () => {
                const exit = () => process.exit(0);
                void Promise.race([shipper.flush(), new Promise((resolve) => setTimeout(resolve, SHUTDOWN_FLUSH_MS))]).then(exit, exit);
            });
        }
    }
    return new Writable({
        write(chunk, _encoding, callback) {
            for (const line of chunk.toString().split("\n")) {
                if (line.trim() !== "") {
                    process.stdout.write(`${line}\n`);
                    shipper?.add(line);
                }
            }
            callback();
        },
    });
};
