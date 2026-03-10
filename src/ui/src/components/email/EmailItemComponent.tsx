import './EmailItemComponent.css';
import { FaRegTrashAlt } from 'react-icons/fa';
import { ImapEmail } from '../../types/mail.types';

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

    return (
        <div className={`email-item${selected ? ' email-item--selected' : ''}${isUnread ? ' email-item--unread' : ''}`} onClick={onSelect}>
            <div className="email-content">
                <div className="email-header">
                    <div className="email-header-left">
                        <h4 className={isUnread ? 'email-subject-unread' : ''}>{email.subject}</h4>
                        <p className="email-from">{email.from}</p>
                    </div>
                    <div className="email-header-right">
                        <small>{formatDate(email.date)}</small>
                        {isUnread && <span className="unread-dot" />}
                    </div>
                </div>
            </div>
            <div className="email-actions">
                <div className="action-delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                    <FaRegTrashAlt />
                </div>
            </div>
        </div>
    );
};

export default EmailItemComponent;
