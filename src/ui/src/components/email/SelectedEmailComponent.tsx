import React, { useState, useMemo } from 'react';
import './SelectedEmailComponent.css';
import { ImapEmailBody } from '../../types/mail.types';
import ComposeEmailComponent from './ComposeEmailComponent';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import {
    FiCornerUpLeft, FiCornerUpRight, FiTrash2,
    FiMoreHorizontal, FiEyeOff, FiFolderPlus, FiDownload,
} from 'react-icons/fi';
import UILogger from '../../helpers/UILogger';
import { getAvatarColor, parseSenderName } from './EmailItemComponent';

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
    const [showDetails, setShowDetails]   = useState(false);

    const replySubject = email.subject?.startsWith('Re:')  ? email.subject : `Re: ${email.subject ?? ''}`;
    const fwdSubject   = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject ?? ''}`;
    const fwdBody = `<br><br><hr style="border:none;border-top:1px solid #e0e0e0"/>`
        + `<p style="color:#777;font-size:0.88em">`
        + `<strong>From:</strong> ${email.from ?? ''}<br>`
        + `<strong>Date:</strong> ${email.date ?? ''}<br>`
        + `<strong>Subject:</strong> ${email.subject ?? ''}</p>`
        + (email.bodyHtml ?? `<pre>${email.bodyText ?? ''}</pre>`);

    // Detect if email content contains remote images
    const hasRemoteImages = useMemo(() => {
        const content = email.bodyHtml ?? email.bodyText ?? '';
        return /src=["']https?:\/\//i.test(content);
    }, [email.bodyHtml, email.bodyText]);

    // Wrap bare HTML fragments in a full document so that fonts, layout and
    // viewport styles are applied correctly inside the sandboxed iframe.
    const wrapHtml = (html: string): string => {
        const isFullDoc = /^\s*<!DOCTYPE|^\s*<html/i.test(html);
        if (isFullDoc) return html;
        return `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;color:#222;margin:0;padding:20px;word-wrap:break-word;overflow-x:auto}
  a{color:#2563eb}img{max-width:100%;height:auto}
  table{border-collapse:collapse;max-width:100%}
  pre,code{white-space:pre-wrap;word-break:break-all;font-size:0.88em}
  blockquote{border-left:3px solid #cbd5e1;margin:8px 0;padding:4px 12px;color:#64748b}
</style>
</head><body>${html}</body></html>`;
    };

    const processedHtml = useMemo(() => {
        if (email.bodyHtml) {
            const raw = imagesAllowed ? email.bodyHtml : blockRemoteImages(email.bodyHtml);
            return wrapHtml(raw);
        }
        // If only plain text is available, render it in the iframe too so the
        // user never sees raw HTML tags (some servers put HTML in the text part).
        if (email.bodyText) {
            const looksLikeHtml = /<[a-z][\s\S]*>/i.test(email.bodyText);
            if (looksLikeHtml) {
                const raw = imagesAllowed ? email.bodyText : blockRemoteImages(email.bodyText);
                return wrapHtml(raw);
            }
            // Pure plain text — wrap in pre so whitespace is preserved
            return wrapHtml(`<pre style="white-space:pre-wrap;word-break:break-word;font-size:0.9em">${
                email.bodyText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            }</pre>`);
        }
        return '';
    }, [email.bodyHtml, email.bodyText, imagesAllowed]);

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

    const senderName = parseSenderName(email.from ?? '');
    const avatarLetter = senderName.charAt(0).toUpperCase();
    const avatarColor = getAvatarColor(email.from ?? '');

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

            {/* ── Top section (header + subject + details) ─────────────── */}
            <div className="selected-email-top">

                {/* Header row: avatar + sender name | action buttons */}
                <div className="selected-email-header-row">
                    <div className="selected-email-sender-info">
                        <div className="selected-email-avatar" style={{ background: avatarColor }}>
                            {avatarLetter}
                        </div>
                        <span className="selected-email-sender-name">{senderName}</span>
                    </div>

                    <div className="selected-email-actions">
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
                                        <div
                                            className="email-more-item email-more-item--submenu"
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
                </div>

                {/* Subject */}
                <h2 className="selected-email-subject">{email.subject}</h2>

                {/* Collapsible details toggle */}
                <button
                    className="selected-email-details-toggle"
                    onClick={() => setShowDetails(!showDetails)}
                    aria-expanded={showDetails}
                    aria-label="Toggle email details"
                >
                    {showDetails ? '▾' : '▸'} Details
                </button>

                <div className={`selected-email-details${showDetails ? ' selected-email-details--open' : ''}`}>
                    <div className="selected-email-details-inner">
                        <div className="detail-row"><span className="detail-key">From</span><span>{email.from}</span></div>
                        {email.to   && <div className="detail-row"><span className="detail-key">To</span><span>{email.to}</span></div>}
                        {email.date && <div className="detail-row"><span className="detail-key">Date</span><span>{new Date(email.date).toLocaleString()}</span></div>}
                        {email.uid  !== undefined && <div className="detail-row"><span className="detail-key">UID</span><code>{email.uid}</code></div>}
                        {host    && <div className="detail-row"><span className="detail-key">Server</span><code>{host}</code></div>}
                        {mailbox && <div className="detail-row"><span className="detail-key">Mailbox</span><code>{mailbox}</code></div>}
                        {folder  && <div className="detail-row"><span className="detail-key">Folder</span><code>{folder}</code></div>}
                    </div>
                </div>

                <div className="selected-email-divider" />
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

            {/* ── Body ───────────────────────────────────────────── */}
            <div className="selected-email-body">
                <iframe
                    className="email-iframe"
                    srcDoc={processedHtml}
                    sandbox=""
                    title="Email body"
                />
            </div>
        </div>
    );
};

export default SelectedEmailComponent;
