export type Contact = {
    uid: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    notes: string;
    url?: string;
    etag?: string;
    rawVCard?: string;
};

export function parseVCard(vcard: string): Contact {
    const get = (key: string) => {
        const match = vcard.match(new RegExp(`^${key}[;:](.+)$`, 'mi'));
        return match ? match[1].trim() : '';
    };

    const uid = get('UID');
    const fn = get('FN');
    const n = get('N');
    const email = get('EMAIL(?:;[^:]*)?');
    const phone = get('TEL(?:;[^:]*)?');
    const org = get('ORG');
    const note = get('NOTE');

    let firstName = '';
    let lastName = '';
    if (n) {
        const parts = n.split(';');
        lastName = parts[0] ?? '';
        firstName = parts[1] ?? '';
    } else if (fn) {
        const parts = fn.split(' ');
        firstName = parts[0] ?? '';
        lastName = parts.slice(1).join(' ');
    }

    return {
        uid,
        displayName: fn || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email,
        phone,
        company: org,
        notes: note,
    };
}
