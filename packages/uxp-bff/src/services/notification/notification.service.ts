import { NotificationConfig } from "@uxp/common";
import { AppLogger } from "@uxp/bff-common";
import { EmailChannel } from "./email.channel";
import { NotificationAlert, NotificationChannel } from "./notification.types";

class NotificationChannelService {
    private channels = new Map<string, NotificationChannel>();

    init() {
        const email = new EmailChannel();
        this.channels.set(email.type, email);
    }

    reloadConfig(config: NotificationConfig) {
        const email = this.channels.get("email") as EmailChannel | undefined;
        email?.reloadConfig(config.email);
        // future: this.channels.get("push")?.reloadConfig(config.push);
    }

    async notify(alert: NotificationAlert): Promise<void> {
        const sends = Array.from(this.channels.values())
            .filter((ch) => ch.isConfigured())
            .map((ch) =>
                ch.send(alert).catch((err) => {
                    AppLogger.error({ message: `Notification channel ${ch.type} failed`, object: { error: String(err) } });
                })
            );
        await Promise.allSettled(sends);
    }

    getChannel(type: string): NotificationChannel | undefined {
        return this.channels.get(type);
    }
}

export const notificationChannelService = new NotificationChannelService();
