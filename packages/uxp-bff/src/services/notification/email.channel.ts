import { EmailChannelConfig, SendEmailBody, SmtpConfig } from "@uxp/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import nodemailer, { Transporter } from "nodemailer";
import { ConfigCryptoService } from "../config-crypto.service";
import { NotificationAlert, NotificationChannel } from "./notification.types";

export class EmailChannel implements NotificationChannel<EmailChannelConfig> {
    readonly type = "email";

    private transport: Transporter | null = null;
    private recipients: string[] = [];
    private fromAddress = "";
    private enabled = false;
    private configured = false;

    reloadConfig(config: EmailChannelConfig | undefined): void {
        this.enabled = config?.enabled ?? false;
        this.recipients = config?.recipients ?? [];

        if (this.enabled && config?.smtp?.host) {
            this.createTransport(config.smtp).catch((err) => {
                AppLogger.error({ message: "Failed to create SMTP transport", object: { error: String(err) } });
                this.configured = false;
            });
        } else {
            this.transport = null;
            this.configured = false;
        }
    }

    private async createTransport(smtp: SmtpConfig): Promise<void> {
        const password = smtp.password
            ? await ConfigCryptoService.decrypt(smtp.password)
            : "";

        this.transport = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.secure,
            auth: smtp.user ? { user: smtp.user, pass: password } : undefined,
        });
        this.fromAddress = smtp.from || `UXP Platform <noreply@${smtp.host}>`;
        this.configured = true;
    }

    isConfigured(): boolean {
        return this.enabled && this.configured && this.recipients.length > 0;
    }

    async send(alert: NotificationAlert): Promise<void> {
        if (!this.transport || this.recipients.length === 0) return;

        await this.transport.sendMail({
            from: this.fromAddress,
            to: this.recipients.join(", "),
            subject: alert.subject,
            text: alert.message,
            html: alert.htmlMessage,
        });

        AppLogger.info({ message: `Alert email sent: ${alert.subject}`, object: { recipients: this.recipients } });
    }

    async sendEmail(body: SendEmailBody): Promise<void> {
        const recipients = body.to ?? this.recipients;
        if (recipients.length === 0) {
            throw new AppErrorV2({ statusCode: 400, code: "VALIDATION", message: "No recipients configured" });
        }

        await this.transport!.sendMail({
            from: this.fromAddress,
            to: recipients.join(", "),
            subject: body.subject,
            text: body.text,
            html: body.html,
        });

        AppLogger.info({ message: `Email sent: ${body.subject}`, object: { recipients } });
    }

    async sendTestEmail(): Promise<void> {
        if (!this.transport) {
            throw new AppErrorV2({ statusCode: 400, code: "SERVICE_NOT_CONFIGURED", message: "SMTP not configured" });
        }

        await this.transport.sendMail({
            from: this.fromAddress,
            to: this.recipients.join(", "),
            subject: "UXP Test Email",
            text: "This is a test email from UXP Platform Health Monitoring.",
            html: "<p>This is a test email from <strong>UXP Platform Health Monitoring</strong>.</p>",
        });
    }
}
