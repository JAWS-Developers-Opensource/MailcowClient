import keytar from 'keytar';

const SERVICE = 'MailCowClient';

// ─── IMAP credentials ────────────────────────────────────────────────────────

export const saveCredentials = async (params: { email: string, password: string, host: string }) => {
    await keytar.setPassword(SERVICE, "email", params.email);
    await keytar.setPassword(SERVICE, "password", params.password);
    await keytar.setPassword(SERVICE, "host", params.host);
};

export const getCredentials = async (): Promise<UserCredentials> => {
    return {
        email: await keytar.getPassword(SERVICE, "email") ?? '',
        password: await keytar.getPassword(SERVICE, "password") ?? '',
        host: await keytar.getPassword(SERVICE, "host") ?? '',
    };
};

export const removeCredentials = async (): Promise<void> => {
    await keytar.deletePassword(SERVICE, "email");
    await keytar.deletePassword(SERVICE, "password");
    await keytar.deletePassword(SERVICE, "host");
};

// ─── OAuth2 credentials ───────────────────────────────────────────────────────

export const saveOAuth2Credentials = async (params: {
    host: string;
    clientId: string;
    email: string;
    accessToken: string;
    refreshToken?: string;
}): Promise<void> => {
    await keytar.setPassword(SERVICE, "oauth2_host", params.host);
    await keytar.setPassword(SERVICE, "oauth2_clientId", params.clientId);
    await keytar.setPassword(SERVICE, "oauth2_email", params.email);
    await keytar.setPassword(SERVICE, "oauth2_accessToken", params.accessToken);
    await keytar.setPassword(SERVICE, "oauth2_refreshToken", params.refreshToken ?? "");
};

export const getOAuth2Credentials = async (): Promise<OAuth2Credentials | null> => {
    const accessToken = await keytar.getPassword(SERVICE, "oauth2_accessToken");
    if (!accessToken) return null;
    return {
        host: await keytar.getPassword(SERVICE, "oauth2_host") + "",
        clientId: await keytar.getPassword(SERVICE, "oauth2_clientId") + "",
        email: await keytar.getPassword(SERVICE, "oauth2_email") + "",
        accessToken,
        refreshToken: await keytar.getPassword(SERVICE, "oauth2_refreshToken") ?? undefined,
    };
};

export const removeOAuth2Credentials = async (): Promise<void> => {
    await keytar.deletePassword(SERVICE, "oauth2_host");
    await keytar.deletePassword(SERVICE, "oauth2_clientId");
    await keytar.deletePassword(SERVICE, "oauth2_email");
    await keytar.deletePassword(SERVICE, "oauth2_accessToken");
    await keytar.deletePassword(SERVICE, "oauth2_refreshToken");
};

// ─── Mailcow API key ──────────────────────────────────────────────────────────

export const saveApiKey = async (apiKey: string): Promise<void> => {
    await keytar.setPassword(SERVICE, 'mailcow_api_key', apiKey);
};

export const getApiKey = async (): Promise<string | null> => {
    return await keytar.getPassword(SERVICE, 'mailcow_api_key');
};

export const removeApiKey = async (): Promise<void> => {
    await keytar.deletePassword(SERVICE, 'mailcow_api_key');
};
