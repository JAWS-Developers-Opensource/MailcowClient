# Configuring OAuth2 on Mailcow for use with Mailcow Client

This guide explains how to set up an OAuth2 application on your Mailcow server so that you can use the **OAuth2 / SSO login** feature in Mailcow Client. Using OAuth2 is the recommended way to log in when your account has Multi-Factor Authentication (MFA/2FA) enabled.

---

## Prerequisites

- A running Mailcow installation (version **2022-05** or later).
- Administrator access to the Mailcow Admin panel (`https://<your-host>/admin`).
- Mailcow Client installed on your desktop.

---

## Step 1 – Enable OAuth2 in Mailcow

Mailcow ships with an optional OAuth2 server that must be activated before creating client applications.

1. Log in to your Mailcow Admin panel.
2. Navigate to **Configuration → OAuth2**.
3. Make sure the **OAuth2 server** toggle is set to **enabled**.

> If you do not see the OAuth2 section, update Mailcow to a recent nightly or stable release.

---

## Step 2 – Create an OAuth2 Application

1. In the Mailcow Admin panel, go to **Configuration → OAuth2 → Apps**.
2. Click **Add App**.
3. Fill in the following fields:

   | Field | Value |
   |-------|-------|
   | **App name** | `Mailcow Client` (or any name you prefer) |
   | **Redirect URI** | `http://127.0.0.1` _(see note below)_ |
   | **Confidential client** | ✗ **No** (leave unchecked to use PKCE) |

   > **Why `http://127.0.0.1`?**  
   > Mailcow Client starts a temporary local HTTP server on a random port during the OAuth2 flow to receive the authorization callback. The redirect URI registered in Mailcow only needs to match the *host* part; the dynamic port is handled automatically by the client.  
   > If Mailcow validates the full URI including port, register `http://127.0.0.1` and the client will still work because the loopback address is treated specially by most OAuth2 servers (RFC 8252).

4. Click **Save**. Mailcow will show you the **Client ID** (and a **Client Secret** if you enabled a confidential client). Copy the **Client ID**.

---

## Step 3 – Configure Mailcow Client

1. Open **Mailcow Client**.
2. On the login page, click the **OAuth2 (SSO)** tab.
3. Fill in the fields:

   | Field | Value |
   |-------|-------|
   | **Mailcow Server Host** | `mail.example.com` (your Mailcow hostname, without `https://`) |
   | **Client ID** | Paste the Client ID copied from Step 2 |
   | **Client Secret** | Leave empty if you chose *Confidential client: No* |

4. Click **Check** next to the host field. A green badge `✓ OAuth2 available` confirms that the server endpoint is reachable.
5. Click **Login with Mailcow OAuth2**.
6. A browser window opens with your Mailcow login page. Log in with your email and password. If you have **TOTP** or **WebAuthn** (passkey) enabled, you will be prompted for it here — no extra configuration required.
7. After successful authorisation, the window closes and Mailcow Client logs you in automatically.

---

## Step 4 – MFA / 2FA Considerations

When OAuth2 is used:

- **TOTP (Google Authenticator, Aegis, etc.):** Mailcow will display the TOTP input during the web login flow. Enter your 6-digit code there.
- **WebAuthn / Passkeys:** Supported by Mailcow's web UI and will appear automatically.
- **App-specific passwords:** Not needed when using OAuth2.

When **IMAP / Password** login is used and MFA is enabled:

- Go to **Mailcow Webmail → Settings → Account → App Passwords** and generate an app-specific password.
- Use this app password instead of your regular account password in the *Password / IMAP* tab.
- Alternatively, Mailcow Client's IMAP login includes an optional **TOTP / 2FA Code** step. If your Mailcow/Dovecot is configured to accept `password+TOTP` as the IMAP password (non-default), enter your 6-digit code there and click *Verify*.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `OAuth2 unavailable` badge | Verify OAuth2 is enabled in the Mailcow Admin panel (Step 1) and that the hostname is correct. |
| `Token exchange failed` | Make sure the Redirect URI registered in Mailcow is exactly `http://127.0.0.1`. |
| `window_closed` error | The OAuth2 login window was closed before completing. Try again. |
| `timeout` error | The login window was open for more than 5 minutes without completing. Try again. |
| IMAP auth still fails after entering TOTP | Your Mailcow/Dovecot is likely not configured for `password+TOTP` auth. Use an app-specific password or switch to OAuth2 login. |

---

## Further Reading

- [Mailcow Documentation – OAuth2](https://docs.mailcow.email/manual-guides/optional-fixes/OAuth2/)
- [RFC 8252 – OAuth 2.0 for Native Apps](https://www.rfc-editor.org/rfc/rfc8252)
- [RFC 7636 – PKCE for OAuth Public Clients](https://www.rfc-editor.org/rfc/rfc7636)
