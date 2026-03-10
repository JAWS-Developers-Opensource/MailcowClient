import React, { useState } from 'react';
import './SelectedEmailComponent.css';
import { ImapEmailBody } from '../../types/mail.types';
import ComposeEmailComponent from './ComposeEmailComponent';

const SelectedEmailComponent = ({ email, onDelete }: { email: ImapEmailBody; onDelete?: () => void }) => {
    const [showReply, setShowReply] = useState(false);
    const [showForward, setShowForward] = useState(false);

    const replySubject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject ?? ''}`;
    const fwdSubject = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject ?? ''}`;
    const fwdBody = `\n\n--- Forwarded message ---\nFrom: ${email.from}\nDate: ${email.date}\n\n${email.bodyText ?? ''}`;

    return (
        <div className="selected-email">
            {showReply && (
                <ComposeEmailComponent
                    onClose={() => setShowReply(false)}
                    initialTo={email.from ?? ''}
                    initialSubject={replySubject}
                />
            )}
            {showForward && (
                <ComposeEmailComponent
                    onClose={() => setShowForward(false)}
                    initialSubject={fwdSubject}
                    initialBody={fwdBody}
                />
            )}

            <div className="selected-email-toolbar">
                <button className="email-action-btn" onClick={() => setShowReply(true)} title="Reply">↩ Reply</button>
                <button className="email-action-btn" onClick={() => setShowForward(true)} title="Forward">↪ Forward</button>
                {onDelete && (
                    <button className="email-action-btn email-action-btn--danger" onClick={onDelete} title="Delete">🗑 Delete</button>
                )}
            </div>

            <div className="selected-email-header">
                <h2 className="selected-email-subject">{email.subject}</h2>
                <div className="selected-email-meta">
                    <span><strong>From:</strong> {email.from}</span>
                    <span><strong>To:</strong> {email.to}</span>
                    <span><strong>Date:</strong> {email.date}</span>
                </div>
            </div>

            <div className="selected-email-body">
                {email.bodyHtml ? (
                    <iframe
                        className="email-iframe"
                        srcDoc={email.bodyHtml}
                        sandbox="allow-same-origin"
                        title="Email body"
                    />
                ) : (
                    <pre className="email-text">{email.bodyText}</pre>
                )}
            </div>
        </div>
    );
};

export default SelectedEmailComponent;
