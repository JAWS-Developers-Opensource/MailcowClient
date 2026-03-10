import { DAVClient, DAVAddressBook, DAVVCard } from 'tsdav';
import { getCredentials } from './storage.js';

let cardClient: DAVClient;

// ─── Connection ───────────────────────────────────────────────────────────────

export const createCardDavConn = async () => {
    const credentials = await getCredentials();
    cardClient = new DAVClient({
        serverUrl: `https://${credentials.host}/`,
        credentials: {
            username: credentials.email,
            password: credentials.password,
        },
        authMethod: 'Basic',
        defaultAccountType: 'carddav',
    });
};

// ─── Address books ────────────────────────────────────────────────────────────

export const fetchAddressBooks = async (): Promise<DAVAddressBook[]> => {
    await cardClient.login();
    return await cardClient.fetchAddressBooks();
};

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const fetchContacts = async (params: { addressBook: DAVAddressBook }): Promise<DAVVCard[]> => {
    await cardClient.login();
    return await cardClient.fetchVCards({ addressBook: params.addressBook });
};

export const createContact = async (params: {
    addressBook: DAVAddressBook;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    notes?: string;
}): Promise<void> => {
    await cardClient.login();
    const uid = generateUUID();
    const vcard = buildVCard({
        uid,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone ?? '',
        company: params.company ?? '',
        notes: params.notes ?? '',
    });

    await cardClient.createVCard({
        addressBook: params.addressBook,
        filename: `${uid}.vcf`,
        vCardString: vcard,
    });
};

export const updateContact = async (params: {
    vCard: DAVVCard;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    notes?: string;
}): Promise<void> => {
    await cardClient.login();

    const uid = extractUID(params.vCard.data ?? '') || generateUUID();
    const vcard = buildVCard({
        uid,
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone ?? '',
        company: params.company ?? '',
        notes: params.notes ?? '',
    });

    await cardClient.updateVCard({
        vCard: { ...params.vCard, data: vcard },
    });
};

export const deleteContact = async (params: { vCard: DAVVCard }): Promise<void> => {
    await cardClient.login();
    await cardClient.deleteVCard({ vCard: params.vCard });
};

// ─── vCard helpers ────────────────────────────────────────────────────────────

function buildVCard(params: {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    notes: string;
}): string {
    const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `UID:${params.uid}`,
        `FN:${params.firstName} ${params.lastName}`.trim(),
        `N:${params.lastName};${params.firstName};;;`,
    ];
    if (params.email) lines.push(`EMAIL;TYPE=INTERNET:${params.email}`);
    if (params.phone) lines.push(`TEL;TYPE=CELL:${params.phone}`);
    if (params.company) lines.push(`ORG:${params.company}`);
    if (params.notes) lines.push(`NOTE:${params.notes}`);
    lines.push('END:VCARD');
    return lines.join('\r\n');
}

function extractUID(vcard: string): string {
    const match = vcard.match(/^UID:(.+)$/m);
    return match ? match[1].trim() : '';
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
