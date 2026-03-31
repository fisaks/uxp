import tls from "tls";
import { HealthSeverity, TlsCertCheckConfig } from "@uxp/common";
import { AppLogger } from "@uxp/bff-common";
import env from "../../config/env";

export type HealthCheckResult = {
    severity: HealthSeverity;
    message: string;
    details?: Record<string, unknown>;
    source: string;
};

const SOURCE = "builtin:tls-cert";

export async function runTlsCertCheck(config: TlsCertCheckConfig): Promise<HealthCheckResult> {
    const domain = config.domain || env.DOMAIN_NAME;
    if (!domain) {
        return { severity: "error", message: "TLS cert check: no domain configured", source: SOURCE };
    }

    try {
        const daysLeft = await getCertDaysLeft(domain);
        const warnDays = config.warnDays ?? 14;
        const errorDays = config.errorDays ?? 7;

        let severity: HealthSeverity;
        let message: string;

        if (daysLeft > warnDays) {
            severity = "ok";
            message = `TLS cert valid (${daysLeft} days)`;
        } else if (daysLeft > errorDays) {
            severity = "warn";
            message = `TLS cert expires in ${daysLeft} days`;
        } else {
            severity = "error";
            message = `TLS cert expires in ${daysLeft} days!`;
        }

        AppLogger.info({ message: `TLS cert check: ${domain} — ${severity} (${daysLeft} days left)` });
        return { severity, message, details: { domain, daysLeft }, source: SOURCE };
    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        AppLogger.error({ message: `TLS cert check failed for ${domain}`, object: { error: errorMsg } });
        return { severity: "error", message: `TLS cert check failed: ${errorMsg}`, details: { domain, error: errorMsg }, source: SOURCE };
    }
}

function getCertDaysLeft(domain: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(
            { host: domain, port: 443, servername: domain, timeout: 10_000 },
            () => {
                const cert = socket.getPeerCertificate();
                socket.destroy();

                if (!cert || !cert.valid_to) {
                    return reject(new Error("No certificate returned"));
                }

                const expiry = new Date(cert.valid_to);
                const now = new Date();
                const msLeft = expiry.getTime() - now.getTime();
                const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));

                resolve(daysLeft);
            },
        );

        socket.on("error", (err) => {
            socket.destroy();
            reject(err);
        });

        socket.on("timeout", () => {
            socket.destroy();
            reject(new Error("Connection timed out"));
        });
    });
}
