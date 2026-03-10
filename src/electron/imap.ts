import imaps from 'imap-simple';

// ─── Connection management ────────────────────────────────────────────────────

let _connection: imaps.ImapSimple | null = null;
let _currentCredentials: { email: string; password: string; host: string } | null = null;

async function getConnection(credentials: { email: string; password: string; host: string }): Promise<imaps.ImapSimple> {
    const changed =
        !_currentCredentials ||
        _currentCredentials.email !== credentials.email ||
        _currentCredentials.host !== credentials.host;

    if (!_connection || changed) {
        if (_connection) {
            try { _connection.end(); } catch {}
        }
        const config: imaps.ImapSimpleOptions = {
            imap: {
                user: credentials.email,
                password: credentials.password,
                host: credentials.host,
                port: 993,
                tls: true,
                // NOTE: self-hosted Mailcow instances often use self-signed certificates.
                // Set MAILCOW_TLS_STRICT=1 in the environment to enforce full validation.
                tlsOptions: { rejectUnauthorized: process.env.MAILCOW_TLS_STRICT === "1" },
            },
            connectTimeout: 20000,
        };
        _connection = await imaps.connect(config);
        _currentCredentials = credentials;
    }
    return _connection;
}

function closeConnection() {
    if (_connection) {
        try { _connection.end(); } catch {}
        _connection = null;
        _currentCredentials = null;
    }
}

// ─── Auth check ───────────────────────────────────────────────────────────────

export class ImapManager {
    private credentials: UserCredentials;

    constructor(credentials: UserCredentials) {
        this.credentials = credentials;
    }

    static async checkAuthCredentials(params: { email: string; password: string; host: string }): Promise<ImapLogin> {
        const config: imaps.ImapSimpleOptions = {
            imap: {
                user: params.email,
                password: params.password,
                host: params.host,
                port: 993,
                tls: true,
                // NOTE: self-hosted Mailcow instances often use self-signed certificates.
                tlsOptions: { rejectUnauthorized: process.env.MAILCOW_TLS_STRICT === "1" },
            },
            connectTimeout: 20000,
        };

        try {
            const connection = await imaps.connect(config);
            await connection.openBox('INBOX');
            connection.end();
            return { status: 'success' };
        } catch (error: any) {
            switch (error.code) {
                case 'ENOTFOUND':
                    return { status: 'host-not-found' };
                default:
                    return { status: 'unkonw', info: error.code ?? error.textCode };
            }
        }
    }
}

// ─── Folder operations ────────────────────────────────────────────────────────

export async function fetchFolders(params: { email: string; password: string; host: string }): Promise<ImapFolderList> {
    try {
        const conn = await getConnection(params);
        const boxes = await conn.getBoxes();
        const folders: string[] = [];
        flattenBoxes(boxes, '', folders);
        return { success: true, folders };
    } catch (error: any) {
        return { success: false, folders: [], error: error.message };
    }
}

function flattenBoxes(boxes: any, prefix: string, out: string[]) {
    for (const name of Object.keys(boxes)) {
        const fullName = prefix ? `${prefix}${boxes[name].delimiter ?? '/'}${name}` : name;
        out.push(fullName);
        if (boxes[name].children) {
            flattenBoxes(boxes[name].children, fullName, out);
        }
    }
}

// ─── Email list ───────────────────────────────────────────────────────────────

export async function fetchEmails(params: {
    email: string;
    password: string;
    host: string;
    folder: string;
    page: number;
    limit: number;
}): Promise<ImapEmailList> {
    const { folder, page, limit } = params;
    try {
        const conn = await getConnection(params);
        await conn.openBox(folder);

        const searchResults = await conn.search(['ALL'], {
            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
            struct: true,
        });

        // Sort by most recent first (largest seq nums)
        const sorted = searchResults.sort((a, b) => b.attributes.uid - a.attributes.uid);

        const start = page * limit;
        const slice = sorted.slice(start, start + limit);
        const hasMore = sorted.length > start + limit;

        const emails: ImapEmail[] = slice.map((msg) => {
            const header = msg.parts.find((p: any) => p.which === 'HEADER.FIELDS (FROM TO SUBJECT DATE)');
            const parsed = imaps.getParts(msg.attributes.struct ?? []);
            const headerValues = header?.body ?? {};
            return {
                uid: msg.attributes.uid,
                subject: headerValues.subject?.[0] ?? '(no subject)',
                from: headerValues.from?.[0] ?? '',
                to: headerValues.to?.[0] ?? '',
                date: headerValues.date?.[0] ?? '',
                flags: (msg.attributes.flags ?? []) as string[],
                folder,
            };
        });

        return { success: true, emails, hasMore, total: sorted.length };
    } catch (error: any) {
        return { success: false, error: error.message, emails: [], hasMore: false, total: 0 };
    }
}

// ─── Email body ───────────────────────────────────────────────────────────────

export async function fetchEmailBody(params: {
    email: string;
    password: string;
    host: string;
    folder: string;
    uid: number;
}): Promise<ImapEmailBody> {
    const { folder, uid } = params;
    try {
        const conn = await getConnection(params);
        await conn.openBox(folder);

        const results = await conn.search([['UID', String(uid)]], {
            bodies: ['HEADER', 'TEXT', ''],
            struct: true,
            markSeen: true,
        });

        if (!results.length) {
            return { success: false, error: 'Message not found' };
        }

        const msg = results[0];
        const textBody = msg.parts.find((p: any) => p.which === 'TEXT')?.body ?? '';
        const fullBody = msg.parts.find((p: any) => p.which === '')?.body ?? '';
        const header = msg.parts.find((p: any) => p.which === 'HEADER')?.body ?? {};

        // Prefer HTML body
        let bodyHtml = '';
        let bodyText = '';
        if (fullBody) {
            if (fullBody.toLowerCase().includes('<html')) {
                bodyHtml = fullBody;
            } else {
                bodyText = fullBody;
            }
        } else {
            bodyText = textBody;
        }

        return {
            success: true,
            uid,
            subject: header.subject?.[0] ?? '',
            from: header.from?.[0] ?? '',
            to: header.to?.[0] ?? '',
            date: header.date?.[0] ?? '',
            bodyText,
            bodyHtml,
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ─── Delete email ─────────────────────────────────────────────────────────────

export async function deleteEmail(params: {
    email: string;
    password: string;
    host: string;
    folder: string;
    uid: number;
}): Promise<void> {
    const conn = await getConnection(params);
    await conn.openBox(params.folder);
    await conn.deleteMessage(params.uid);
}

// ─── Move email ───────────────────────────────────────────────────────────────

export async function moveEmail(params: {
    email: string;
    password: string;
    host: string;
    folder: string;
    uid: number;
    toFolder: string;
}): Promise<void> {
    const conn = await getConnection(params);
    await conn.openBox(params.folder);
    await conn.moveMessage(String(params.uid), params.toFolder);
}

// ─── Mark read/unread ─────────────────────────────────────────────────────────

export async function markEmailSeen(params: {
    email: string;
    password: string;
    host: string;
    folder: string;
    uid: number;
    seen: boolean;
}): Promise<void> {
    const conn = await getConnection(params);
    await conn.openBox(params.folder);
    if (params.seen) {
        await conn.addFlags(params.uid, '\\Seen');
    } else {
        await conn.delFlags(params.uid, '\\Seen');
    }
}

export { closeConnection };
