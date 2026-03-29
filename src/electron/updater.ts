import { net } from 'electron';
import { app } from 'electron';

const GITHUB_OWNER = 'JAWS-Developers-Opensource';
const GITHUB_REPO = 'MailcowClient';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

export type UpdateInfo = {
    updateAvailable: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseUrl: string;
    releaseName: string;
    releaseNotes: string;
};

/**
 * Fetches the latest release from GitHub and compares it with the running
 * app version. Returns an UpdateInfo object.
 */
export async function checkForUpdates(): Promise<UpdateInfo> {
    const currentVersion = app.getVersion();

    const response = await net.fetch(RELEASES_API, {
        headers: {
            'User-Agent': `MailcowClient/${currentVersion}`,
            'Accept': 'application/vnd.github+json',
        },
    });

    if (!response.ok) {
        // 404 means no releases have been published yet — treat as "up to date"
        if (response.status === 404) {
            return {
                updateAvailable: false,
                currentVersion,
                latestVersion: currentVersion,
                releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
                releaseName: '',
                releaseNotes: '',
            };
        }
        throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json() as {
        tag_name: string;
        name: string;
        body: string;
        html_url: string;
    };

    const latestVersion = data.tag_name.replace(/^v/, '');
    const updateAvailable = isNewerVersion(latestVersion, currentVersion);

    return {
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseUrl: data.html_url,
        releaseName: data.name ?? data.tag_name,
        releaseNotes: data.body ?? '',
    };
}

export function getAppVersion(): string {
    return app.getVersion();
}

/**
 * Returns true if `candidate` is strictly newer than `current`.
 * Both must be semver strings (major.minor.patch).
 */
function isNewerVersion(candidate: string, current: string): boolean {
    const parse = (v: string) => v.split('.').map((n) => parseInt(n, 10) || 0);
    const [caMaj, caMin, caPat] = parse(candidate);
    const [cuMaj, cuMin, cuPat] = parse(current);

    if (caMaj !== cuMaj) return caMaj > cuMaj;
    if (caMin !== cuMin) return caMin > cuMin;
    return caPat > cuPat;
}
