import nodemailer from 'nodemailer';

export async function sendEmail(params: {
    fromEmail: string;
    password: string;
    host: string;
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    isHtml?: boolean;
    replyTo?: string;
}): Promise<SmtpSendResult> {
    try {
        const transporter = nodemailer.createTransport({
            host: params.host,
            port: 587,
            secure: false, // STARTTLS
            auth: {
                user: params.fromEmail,
                pass: params.password,
            },
            // NOTE: self-hosted Mailcow instances often use self-signed certificates.
            // Set MAILCOW_TLS_STRICT=1 in the environment to enforce full validation.
            tls: {
                rejectUnauthorized: process.env.MAILCOW_TLS_STRICT === "1",
            },
        });

        const mailOptions: nodemailer.SendMailOptions = {
            from: params.fromEmail,
            to: params.to,
            subject: params.subject,
            replyTo: params.replyTo,
        };

        if (params.cc) mailOptions.cc = params.cc;
        if (params.bcc) mailOptions.bcc = params.bcc;

        if (params.isHtml) {
            mailOptions.html = params.body;
        } else {
            mailOptions.text = params.body;
        }

        const info = await transporter.sendMail(mailOptions);
        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        return { success: false, error: error.message ?? 'Unknown SMTP error' };
    }
}
