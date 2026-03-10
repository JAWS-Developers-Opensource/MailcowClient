import { getApiKey, getCredentials } from './storage.js';

type MailcowMethod = 'GET' | 'POST';

type MailcowRequest = {
    path: string;
    method: MailcowMethod;
    payload?: unknown;
};

const ensureMailcowConfig = async () => {
    const creds = await getCredentials();
    const apiKey = await getApiKey();

    if (!creds.host) {
        throw new Error('Missing Mailcow host in saved credentials');
    }
    if (!apiKey) {
        throw new Error('Missing Mailcow API key');
    }

    return { host: creds.host, apiKey, mailbox: creds.email };
};

const callMailcowApi = async (params: MailcowRequest): Promise<any> => {
    const { host, apiKey } = await ensureMailcowConfig();
    const url = `https://${host}${params.path}`;

    const response = await fetch(url, {
        method: params.method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        },
        body: params.method === 'POST' ? JSON.stringify(params.payload ?? {}) : undefined,
    });

    const text = await response.text();
    let data: any = null;

    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = { raw: text };
    }

    if (!response.ok) {
        const detail = typeof data === 'object' && data ? JSON.stringify(data) : String(data ?? response.statusText);
        throw new Error(`Mailcow API ${response.status}: ${detail}`);
    }

    return data;
};

export const mailcowGetOverview = async () => {
    const { mailbox } = await ensureMailcowConfig();

    const [mailboxInfo, aliases, appPasswords] = await Promise.all([
        callMailcowApi({ path: `/api/v1/get/mailbox/${encodeURIComponent(mailbox)}`, method: 'GET' }),
        callMailcowApi({ path: `/api/v1/get/alias/${encodeURIComponent(mailbox)}`, method: 'GET' }),
        callMailcowApi({ path: `/api/v1/get/app-passwd/all/${encodeURIComponent(mailbox)}`, method: 'GET' }),
    ]);

    return {
        mailbox,
        mailboxInfo,
        aliases,
        appPasswords,
    };
};

export const mailcowCreateAlias = async (params: { address: string; goto?: string; active?: boolean }) => {
    const { mailbox } = await ensureMailcowConfig();

    return callMailcowApi({
        path: '/api/v1/add/alias',
        method: 'POST',
        payload: [{
            active: params.active === false ? '0' : '1',
            address: params.address,
            goto: params.goto?.trim() ? params.goto : mailbox,
            sogo_visible: '1',
        }],
    });
};

export const mailcowDeleteAlias = async (params: { address: string }) => {
    return callMailcowApi({
        path: '/api/v1/delete/alias',
        method: 'POST',
        payload: [params.address],
    });
};

export const mailcowCreateAppPassword = async (params: { description: string; appPassword: string }) => {
    const { mailbox } = await ensureMailcowConfig();

    return callMailcowApi({
        path: '/api/v1/add/app-passwd',
        method: 'POST',
        payload: [{
            username: mailbox,
            mailbox,
            app_name: params.description,
            description: params.description,
            app_passwd: params.appPassword,
            password: params.appPassword,
            active: '1',
        }],
    });
};

export const mailcowDeleteAppPassword = async (params: { id: string }) => {
    return callMailcowApi({
        path: '/api/v1/delete/app-passwd',
        method: 'POST',
        payload: [params.id],
    });
};

export const mailcowUpdateUserAcl = async (params: { aclJson: string }) => {
    const { mailbox } = await ensureMailcowConfig();
    const parsed = JSON.parse(params.aclJson);

    return callMailcowApi({
        path: '/api/v1/edit/user-acl',
        method: 'POST',
        payload: [{
            username: mailbox,
            ...parsed,
        }],
    });
};
