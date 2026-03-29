import { BrowserWindow } from 'electron';
import * as crypto from 'crypto';
import * as http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';
import * as url from 'url';

export type OAuth2Result =
    | { success: true; accessToken: string; refreshToken?: string; email: string; expiresIn?: number }
    | { success: false; error: string };

function generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function generateState(): string {
    return crypto.randomBytes(16).toString('hex');
}

function getFreePort(): Promise<number> {
    return new Promise((resolve) => {
        const srv = http.createServer();
        srv.listen(0, '127.0.0.1', () => {
            const { port } = srv.address() as { port: number };
            srv.close(() => resolve(port));
        });
    });
}

/**
 * Checks whether the given Mailcow host exposes an OAuth2 authorization endpoint.
 */
export async function checkOAuth2Available(params: { host: string }): Promise<{ available: boolean }> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`https://${params.host}/oauth/authorize`, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'manual',
        });
        clearTimeout(timer);
        // 302 = redirect to Mailcow login (endpoint exists)
        // 200 = endpoint exists and served directly
        // 404 / 5xx = not found or broken
        return { available: response.status !== 404 && response.status < 500 };
    } catch {
        return { available: false };
    }
}

/**
 * Starts the OAuth2 PKCE authorization code flow against a Mailcow instance.
 * Opens a dedicated BrowserWindow so MFA (TOTP / WebAuthn) is handled by
 * the Mailcow web UI naturally.
 */
export async function startOAuth2Login(params: {
    host: string;
    clientId: string;
    clientSecret?: string;
}): Promise<OAuth2Result> {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = generateState();

    const port = await getFreePort();
    const redirectUri = `http://127.0.0.1:${port}/callback`;

    const authUrl = new URL(`https://${params.host}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', params.clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'profile');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return new Promise<OAuth2Result>((resolve) => {
        let settled = false;

        const settle = (result: OAuth2Result) => {
            if (!settled) {
                settled = true;
                resolve(result);
            }
        };

        // ── Local HTTP callback server ──────────────────────────────────────
        const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
            const parsed = url.parse(req.url ?? '/', true);

            if (parsed.pathname !== '/callback') {
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            const { code, state: returnedState, error } = parsed.query;

            const htmlClose = (msg: string) =>
                `<html><body style="font-family:sans-serif;text-align:center;padding-top:60px"><h2>${msg}</h2><p>You may close this window.</p><script>setTimeout(()=>window.close(),2000)</script></body></html>`;

            if (error) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(htmlClose('⚠ Authorization denied'));
                server.close();
                authWindow?.close();
                settle({ success: false, error: String(error) });
                return;
            }

            if (returnedState !== state) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(htmlClose('⚠ Invalid state parameter (possible CSRF)'));
                server.close();
                authWindow?.close();
                settle({ success: false, error: 'state_mismatch' });
                return;
            }

            // ── Exchange authorization code for tokens ──────────────────────
            try {
                const body = new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: String(code),
                    redirect_uri: redirectUri,
                    client_id: params.clientId,
                    code_verifier: codeVerifier,
                });
                if (params.clientSecret) {
                    body.set('client_secret', params.clientSecret);
                }

                const tokenRes = await fetch(`https://${params.host}/oauth/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: body.toString(),
                });

                const tokenData = await tokenRes.json() as Record<string, any>;

                if (tokenData.error) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(htmlClose('⚠ Token exchange failed'));
                    server.close();
                    authWindow?.close();
                    settle({ success: false, error: String(tokenData.error_description ?? tokenData.error) });
                    return;
                }

                // ── Fetch user profile ──────────────────────────────────────
                let email = '';
                try {
                    const profileRes = await fetch(`https://${params.host}/oauth/profile`, {
                        headers: { Authorization: `Bearer ${tokenData.access_token}` },
                    });
                    const profile = await profileRes.json() as Record<string, any>;
                    email = String(profile.email ?? profile.username ?? profile.identifier ?? '');
                } catch {
                    // Fall back to JWT payload (works in Node.js runtime via Buffer global)
                    try {
                        const parts = String(tokenData.access_token).split('.');
                        // atob is available in modern Node.js (v16+) and Electron
                        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                        email = String(payload.email ?? payload.sub ?? '');
                    } catch {
                        email = '';
                    }
                }

                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(htmlClose('✓ Login successful!'));
                server.close();
                authWindow?.close();

                settle({
                    success: true,
                    accessToken: String(tokenData.access_token),
                    refreshToken: tokenData.refresh_token ? String(tokenData.refresh_token) : undefined,
                    email,
                    expiresIn: typeof tokenData.expires_in === 'number' ? tokenData.expires_in : undefined,
                });
            } catch (err: any) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(htmlClose('⚠ An error occurred'));
                server.close();
                authWindow?.close();
                settle({ success: false, error: String(err?.message ?? 'unknown') });
            }
        });

        server.listen(port, '127.0.0.1');

        // ── Authorization browser window ────────────────────────────────────
        let authWindow: BrowserWindow | null = new BrowserWindow({
            width: 900,
            height: 700,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true,
                allowRunningInsecureContent: false,
                sandbox: true,
            },
            title: 'Mailcow – Login',
            autoHideMenuBar: true,
        });

        authWindow.loadURL(authUrl.toString());

        authWindow.on('closed', () => {
            authWindow = null;
            server.close();
            settle({ success: false, error: 'window_closed' });
        });

        // 5-minute hard timeout
        setTimeout(() => {
            if (authWindow && !authWindow.isDestroyed()) {
                authWindow.close();
            }
            server.close();
            settle({ success: false, error: 'timeout' });
        }, 5 * 60 * 1000);
    });
}
