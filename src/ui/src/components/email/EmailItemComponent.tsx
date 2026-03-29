import './EmailItemComponent.css';
import { FaRegTrashAlt } from 'react-icons/fa';
import { ImapEmail } from '../../types/mail.types';

const AVATAR_COLORS = ['#7c3aed','#db2777','#d97706','#059669','#2563eb','#dc2626','#0891b2','#65a30d'];

export function getAvatarColor(str: string): string {
    const sample = str.slice(0, 50);
    let hash = 0;
    for (let i = 0; i < sample.length; i++) {
        hash = sample.charCodeAt(i) + ((hash << 5) - hash);
    }
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function parseSenderName(from: string): string {
    const trimmed = from.trim();
    if (!trimmed) return 'Unknown Sender';
    const nameMatch = trimmed.match(/^(.+?)\s*<[^>]+>/);
    if (nameMatch) return nameMatch[1].trim().replace(/^["']|["']$/g, '') || 'Unknown Sender';
    const localMatch = trimmed.match(/([^@<\s]+)@/);
    if (localMatch) return localMatch[1];
    return trimmed;
}

const EmailItemComponent = ({
    email,
    onSelect,
    onDelete,
    selected,
}: {
    email: ImapEmail;
    onSelect: () => void;
    onDelete: () => void;
    selected?: boolean;
}) => {
    const formatDate = (date: string) => {
        const emailDate = new Date(date);
        const now = new Date();
        if (emailDate.toDateString() === now.toDateString()) {
            return `${emailDate.getHours()}:${emailDate.getMinutes() < 10 ? '0' + emailDate.getMinutes() : emailDate.getMinutes()}`;
        } else {
            return `${emailDate.getDate()}/${emailDate.getMonth() + 1}/${emailDate.getFullYear()}`;
        }
    };

    const isUnread = !email.flags.includes('\\Seen');
    const senderName = parseSenderName(email.from);
    const avatarLetter = senderName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(email.from);

    return (
        <div
            className={`email-item${selected ? ' email-item--selected' : ''}${isUnread ? ' email-item--unread' : ''}`}
            onClick={onSelect}
        >
            <div className="email-item-avatar" style={{ background: avatarColor }}>
                {avatarLetter}
            </div>
            <div className="email-item-body">
                <div className="email-item-row1">
                    <span className="email-item-sender">{senderName}</span>
                    <div className="email-item-row1-right">
                        {isUnread && <span className="unread-dot" />}
                        <span className="email-item-date">{formatDate(email.date)}</span>
                    </div>
                </div>
                <div className="email-item-row2">
                    <span className="email-item-subject">{email.subject}</span>
                </div>
            </div>
            <button
                className="email-item-delete"
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                tabIndex={-1}
                aria-label="Delete"
            >
                <FaRegTrashAlt />
            </button>
        </div>
    );
};

export default EmailItemComponent;
