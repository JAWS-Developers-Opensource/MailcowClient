import React, { useState } from 'react';
import './SelectedEmailComponent.css';
import { ImapEmailBody } from '../../types/mail.types';
import ComposeEmailComponent from './ComposeEmailComponent';
import { FiCornerUpLeft, FiCornerUpRight, FiTrash2 } from 'react-icons/fi';

const SelectedEmailComponent = ({ email, onDelete }: { email: ImapEmailBody; onDelete?: () => void }) => {
    const [showReply, setShowReply] = useState(false);
    const [showForward, setShowForward] = useState(false);

    const replySubject = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject ?? ''}`;
    const fwdSubject = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject ?? ''}`;
    const fwdBody = `<br><br><hr style="border:none;border-top:1px solid #e0e0e0"/>`
        + `<p style="color:#777;font-size:0.88em">`
        + `<strong>From:</strong> ${email.from ?? ''}<br>`
        + `<strong>Date:</strong> ${email.date ?? ''}<br>`
        + `<strong>Subject:</strong> ${email.subject ?? ''}</p>`
        + (email.bodyHtml ?? `<pre>${email.bodyText ?? ''}</pre>`);

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
                <button className="email-action-btn" onClick={() => setShowReply(true)}>
                    <FiCornerUpLeft size={13} /> Reply
                </button>
                <button className="email-action-btn" onClick={() => setShowForward(true)}>
                    <FiCornerUpRight size={13} /> Forward
                </button>
                {onDelete && (
                    <button className="email-action-btn email-action-btn--danger" onClick={onDelete}>
                        <FiTrash2 size={13} /> Delete
                    </button>
                )}
            </div>

            <div className="selected-email-header">
                <h2 className="selected-email-subject">{email.subject}</h2>
                <div className="selected-email-meta">
                    <span className="meta-row"><span className="meta-key">From</span>{email.from}</span>
                    <span className="meta-row"><span className="meta-key">To</span>{email.to}</span>
                    <span className="meta-row"><span className="meta-key">Date</span>{email.date}</span>
                </div>
            </div>

            <div className="selected-email-body">
                {email.bodyHtml ? (
                    <iframe
                        className="email-iframe"
                        srcDoc={email.bodyHtml}
                        sandbox=""
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
