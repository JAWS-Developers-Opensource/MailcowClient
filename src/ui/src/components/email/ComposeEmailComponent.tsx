import React, { useState } from 'react';
import './ComposeEmailComponent.css';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';

interface ComposeEmailProps {
    onClose: () => void;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
}

const ComposeEmailComponent: React.FC<ComposeEmailProps> = ({
    onClose,
    initialTo = '',
    initialSubject = '',
    initialBody = '',
}) => {
    const { addNotification } = useNotification();
    const [to, setTo] = useState(initialTo);
    const [cc, setCc] = useState('');
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [sending, setSending] = useState(false);
    const [showCc, setShowCc] = useState(false);

    const handleSend = async () => {
        if (!to.trim()) {
            addNotification('Compose', 'Please enter a recipient.', 'error');
            return;
        }
        if (!subject.trim()) {
            addNotification('Compose', 'Please enter a subject.', 'error');
            return;
        }
        setSending(true);
        try {
            const result = await window.electron.smtpSendEmail({
                to,
                cc: cc || undefined,
                subject,
                body,
            });
            if (result.success) {
                addNotification("Mail", 'Email sent!', 'success');
                onClose();
            } else {
                addNotification("Mail", `Send failed: ${result.error}`, "error");
            }
        } catch (e: any) {
            addNotification("Mail", `Error: ${e.message}`, "error");
        }
        setSending(false);
    };

    return (
        <div className="compose-overlay">
            <div className="compose-modal">
                <div className="compose-header">
                    <h3>New Message</h3>
                    <button className="compose-close-btn" onClick={onClose} title="Close">✕</button>
                </div>

                <div className="compose-field">
                    <label>To</label>
                    <div className="compose-to-row">
                        <input
                            type="email"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="recipient@example.com"
                            multiple
                        />
                        <button
                            type="button"
                            className="compose-cc-toggle"
                            onClick={() => setShowCc(!showCc)}
                        >
                            {showCc ? 'Hide CC' : 'CC'}
                        </button>
                    </div>
                </div>

                {showCc && (
                    <div className="compose-field">
                        <label>CC</label>
                        <input
                            type="text"
                            value={cc}
                            onChange={(e) => setCc(e.target.value)}
                            placeholder="cc@example.com"
                        />
                    </div>
                )}

                <div className="compose-field">
                    <label>Subject</label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Subject"
                    />
                </div>

                <div className="compose-body">
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Write your message here..."
                    />
                </div>

                <div className="compose-footer">
                    <button
                        className="compose-send-btn"
                        onClick={handleSend}
                        disabled={sending}
                    >
                        {sending ? 'Sending…' : '✈ Send'}
                    </button>
                    <button className="compose-discard-btn" onClick={onClose} disabled={sending}>
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComposeEmailComponent;
