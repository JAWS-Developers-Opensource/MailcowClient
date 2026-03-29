export type ImapEmail = {
    uid: number;
    subject: string;
    from: string;
    to: string;
    date: string;
    flags: string[];
    folder: string;
};

export type ImapEmailBody = {
    success: boolean;
    uid?: number;
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
    bodyText?: string;
    bodyHtml?: string;
    rawHeaders?: string;
    error?: string;
};
