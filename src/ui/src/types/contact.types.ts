export type Contact = {
    uid: string;
    displayName: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    notes: string;
    title?: string;
    birthday?: string;
    address?: string;
    city?: string;
    country?: string;
    website?: string;
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
    const titleVal = get('TITLE');
    const bday = get('BDAY');
    const urlVal = get('URL(?:;[^:]*)?');

    // Parse ADR field: ;;street;city;state;zip;country
    let address = '';
    let city = '';
    let country = '';
    const adrMatch = vcard.match(/^ADR[^:]*:(.*)$/mi);
    if (adrMatch) {
        const parts = adrMatch[1].split(';');
        address = (parts[2] ?? '').trim();
        city    = (parts[3] ?? '').trim();
        country = (parts[6] ?? '').trim();
    }

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

    // Normalise birthday to YYYY-MM-DD when stored as YYYYMMDD
    let birthday = bday;
    if (birthday && /^\d{8}$/.test(birthday)) {
        birthday = `${birthday.slice(0, 4)}-${birthday.slice(4, 6)}-${birthday.slice(6, 8)}`;
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
        title: titleVal || undefined,
        birthday: birthday || undefined,
        address: address || undefined,
        city: city || undefined,
        country: country || undefined,
        website: urlVal || undefined,
    };
}
