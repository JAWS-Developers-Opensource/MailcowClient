import React, { useState, useMemo } from 'react';
import './SelectedEmailComponent.css';
import { ImapEmailBody } from '../../types/mail.types';
import ComposeEmailComponent from './ComposeEmailComponent';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
    FiCornerUpLeft, FiCornerUpRight, FiTrash2,
    FiMoreHorizontal, FiEyeOff, FiFolderPlus, FiDownload, FiInfo,
} from 'react-icons/fi';
import UILogger from '../../helpers/UILogger';

interface Props {
    email: ImapEmailBody;
    onDelete?: () => void;
    onMove?: (toFolder: string) => void;
    onMarkUnread?: () => void;
    folders?: string[];
    folder?: string;
    mailbox?: string;
    host?: string;
}

// Block common remote image patterns in email HTML for privacy/security.
// Limitations: does not cover all CSS background-image variations (e.g. multiple
// backgrounds or mixed data+http URIs). Email content is displayed in a sandboxed
// iframe so actual network requests are already blocked; this neutralises the
// srcDoc value before it reaches the iframe, guarding against future policy changes.
function blockRemoteImages(html: string): string {
    return html
        .replace(/(src=")https?:\/\//gi, '$1data:blocked,')
        .replace(/(background(?:-image)?:\s*url\(['"]?)https?:\/\//gi, '$1data:blocked,');
}

const SelectedEmailComponent: React.FC<Props> = ({
    email, onDelete, onMove, onMarkUnread, folders = [], folder, mailbox, host,
}) => {
    const { t } = useLanguage();
    const { addNotification } = useNotification();

    const [showReply, setShowReply]       = useState(false);
    const [showForward, setShowForward]   = useState(false);
    const [showMore, setShowMore]         = useState(false);
    const [showMoveMenu, setShowMoveMenu] = useState(false);
    const [imagesAllowed, setImagesAllowed] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    const replySubject = email.subject?.startsWith('Re:')  ? email.subject : `Re: ${email.subject ?? ''}`;
    const fwdSubject   = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject ?? ''}`;
    const fwdBody = `<br><br><hr style="border:none;border-top:1px solid #e0e0e0"/>`
        + `<p style="color:#777;font-size:0.88em">`
        + `<strong>From:</strong> ${email.from ?? ''}<br>`
        + `<strong>Date:</strong> ${email.date ?? ''}<br>`
        + `<strong>Subject:</strong> ${email.subject ?? ''}</p>`
        + (email.bodyHtml ?? `<pre>${email.bodyText ?? ''}</pre>`);

    // Detect if email HTML contains remote images
    const hasRemoteImages = useMemo(() =>
        !!(email.bodyHtml && /src=["']https?:\/\//i.test(email.bodyHtml)),
        [email.bodyHtml],
    );

    const processedHtml = useMemo(() => {
        if (!email.bodyHtml) return '';
        return imagesAllowed ? email.bodyHtml : blockRemoteImages(email.bodyHtml);
    }, [email.bodyHtml, imagesAllowed]);

    const handleMove = (toFolder: string) => {
        setShowMoveMenu(false);
        setShowMore(false);
        onMove?.(toFolder);
        UILogger.info('SelectedEmail', `Moving email to ${toFolder}`);
    };

    const handleMarkUnread = () => {
        setShowMore(false);
        onMarkUnread?.();
    };

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

            {/* ── Toolbar ────────────────────────────────────────── */}
            <div className="selected-email-toolbar">
                <button className="email-action-btn" onClick={() => setShowReply(true)}>
                    <FiCornerUpLeft size={13} /> {t('mail.reply')}
                </button>
                <button className="email-action-btn" onClick={() => setShowForward(true)}>
                    <FiCornerUpRight size={13} /> {t('mail.forward')}
                </button>
                {onDelete && (
                    <button className="email-action-btn email-action-btn--danger" onClick={onDelete}>
                        <FiTrash2 size={13} /> {t('mail.delete')}
                    </button>
                )}
                <button className="email-action-btn" onClick={() => setShowInfo(true)}>
                    <FiInfo size={13} /> Info
                </button>

                {/* More actions */}
                <div className="email-more-wrapper">
                    <button
                        className="email-action-btn email-action-btn--icon"
                        onClick={() => { setShowMore(!showMore); setShowMoveMenu(false); }}
                        title="More actions"
                    >
                        <FiMoreHorizontal size={14} />
                    </button>
                    {showMore && (
                        <div className="email-more-menu">
                            {onMarkUnread && (
                                <button className="email-more-item" onClick={handleMarkUnread}>
                                    <FiEyeOff size={13} /> {t('mail.markUnread')}
                                </button>
                            )}
                            {onMove && folders.length > 0 && (
                                <div className="email-more-item email-more-item--submenu"
                                    onMouseEnter={() => setShowMoveMenu(true)}
                                    onMouseLeave={() => setShowMoveMenu(false)}
                                >
                                    <FiFolderPlus size={13} /> {t('mail.moveTo')}
                                    {showMoveMenu && (
                                        <div className="email-move-submenu">
                                            {folders.filter((f) => f !== folder).slice(0, 20).map((f) => (
                                                <button
                                                    key={f}
                                                    className="email-more-item"
                                                    onClick={() => handleMove(f)}
                                                >
                                                    {f.split(/[./]/).pop()}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Remote images notice ───────────────────────────── */}
            {hasRemoteImages && !imagesAllowed && (
                <div className="remote-images-bar">
                    <span>{t('mail.imagesBlocked')}</span>
                    <button
                        className="remote-images-btn"
                        onClick={() => setImagesAllowed(true)}
                    >
                        <FiDownload size={12} /> {t('mail.loadImages')}
                    </button>
                </div>
            )}

            {/* ── Header ─────────────────────────────────────────── */}
            <div className="selected-email-header">
                <h2 className="selected-email-subject">{email.subject}</h2>
            </div>

            {/* ── Body ───────────────────────────────────────────── */}
            <div className="selected-email-body">
                {email.bodyHtml ? (
                    <iframe
                        className="email-iframe"
                        srcDoc={processedHtml}
                        sandbox=""
                        title="Email body"
                    />
                ) : (
                    <pre className="email-text">{email.bodyText}</pre>
                )}
            </div>

            {showInfo && (
                <div className="email-info-overlay" onClick={() => setShowInfo(false)}>
                    <div className="email-info-popup" onClick={(e) => e.stopPropagation()}>
                        <div className="email-info-header">
                            <h3>Email Info</h3>
                            <button className="email-info-close" onClick={() => setShowInfo(false)}>Close</button>
                        </div>
                        <div className="email-info-grid">
                            <div className="email-info-row"><span>UID</span><code>{email.uid ?? 'n/a'}</code></div>
                            <div className="email-info-row"><span>Server</span><code>{host ?? 'n/a'}</code></div>
                            <div className="email-info-row"><span>Mailbox</span><code>{mailbox ?? 'n/a'}</code></div>
                            <div className="email-info-row"><span>Folder</span><code>{folder ?? 'n/a'}</code></div>
                            <div className="email-info-row"><span>From</span><code>{email.from ?? 'n/a'}</code></div>
                            <div className="email-info-row"><span>To</span><code>{email.to ?? 'n/a'}</code></div>
                            <div className="email-info-row"><span>Date</span><code>{email.date ?? 'n/a'}</code></div>
                            <div className="email-info-row"><span>Subject</span><code>{email.subject ?? 'n/a'}</code></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SelectedEmailComponent;
