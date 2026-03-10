import React from 'react';
import EmailItem from './EmailItemComponent';
import './EmailListComponent.css';
import { ImapEmail } from '../../types/mail.types';

const EmailListComponent = ({
    emails,
    onSelectEmail,
    onDeleteEmail,
    selectedUid,
}: {
    emails: ImapEmail[];
    onSelectEmail: (email: ImapEmail) => void;
    onDeleteEmail: (email: ImapEmail) => void;
    selectedUid?: number;
}) => {
    if (!emails.length) {
        return <div className="email-list-empty">No messages in this folder.</div>;
    }

    return (
        <div className="email-list">
            {emails.map((email) => (
                <EmailItem
                    key={email.uid}
                    email={email}
                    onSelect={() => onSelectEmail(email)}
                    onDelete={() => onDeleteEmail(email)}
                    selected={email.uid === selectedUid}
                />
            ))}
        </div>
    );
};

export default EmailListComponent;
