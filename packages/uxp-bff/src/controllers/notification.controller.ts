import { AppErrorV2, Route } from "@uxp/bff-common";
import { SendEmailBody, SendEmailSchema } from "@uxp/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { EmailChannel } from "../services/notification/email.channel";
import { notificationChannelService } from "../services/notification/notification.service";
import { requireApiKey } from "../utils/requireApiKey";

/**
 * REST API for notification / email sending.
 *
 * - POST /notifications/test-email         — Admin: sends a test email to verify SMTP configuration
 * - POST /cli/notifications/send-email     — API key: send an email (for remote apps like uhn-master)
 *
 * Usage example (remote app):
 *   curl -X POST -H "Authorization: Bearer $UXP_HEALTH_API_KEY" \
 *        -H "Content-Type: application/json" \
 *        -d '{"subject":"Alert","text":"Something happened","to":["admin@example.com"]}' \
 *        http://localhost:3001/cli/notifications/send-email
 */

function getEmailChannel(): EmailChannel {
    const channel = notificationChannelService.getChannel("email") as EmailChannel | undefined;
    if (!channel?.isConfigured()) {
        throw new AppErrorV2({ statusCode: 400, code: "SERVICE_NOT_CONFIGURED", message: "Email notifications are not configured" });
    }
    return channel;
}

export class NotificationController {
    /** Admin — sends a test email to verify SMTP configuration */
    @Route("post", "/notifications/test-email", { authenticate: true, roles: ["admin"] })
    async sendTestEmail(req: FastifyRequest, reply: FastifyReply) {
        const channel = getEmailChannel();
        await channel.sendTestEmail();
        reply.status(204).send();
    }

    /** API key — send an email. If `to` is omitted, sends to configured recipients. */
    @Route("post", "/cli/notifications/send-email", { authenticate: false, schema: SendEmailSchema })
    async sendEmail(req: FastifyRequest<{ Body: SendEmailBody }>, reply: FastifyReply) {
        requireApiKey(req, "UXP_NOTIFICATION_API_KEY");

        const channel = getEmailChannel();
        await channel.sendEmail(req.body);
        reply.status(204).send();
    }
}
