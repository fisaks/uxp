export type SendEmailBody = {
    subject: string;
    text: string;
    to?: string[];
    html?: string;
};
