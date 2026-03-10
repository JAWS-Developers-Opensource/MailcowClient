import React, { useState, useEffect, useCallback } from 'react';
import EmailList from '../../components/email/EmailListComponent';
import SelectedEmail from '../../components/email/SelectedEmailComponent';
import ComposeEmailComponent from '../../components/email/ComposeEmailComponent';
import './MailPage.css';
import { useLoading } from '../../contexts/LoadingContext';
import { useNotification } from '../../contexts/NotificationContext';
import { ImapEmail, ImapEmailBody } from '../../types/mail.types';
import { FiRefreshCw, FiEdit, FiChevronRight, FiChevronDown } from 'react-icons/fi';

const PAGE_SIZE = 30;

const MailPage: React.FC = () => {
    const { setLoadingStatus } = useLoading();
    const { addNotification } = useNotification();

    const [folders, setFolders] = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder] = useState('INBOX');
    const [emails, setEmails] = useState<ImapEmail[]>([]);
    const [selectedEmailBody, setSelectedEmailBody] = useState<ImapEmailBody | null>(null);
    const [selectedUid, setSelectedUid] = useState<number | undefined>();
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [emailsLoading, setEmailsLoading] = useState(false);
    const [showCompose, setShowCompose] = useState(false);
    const [folderOpen, setFolderOpen] = useState(true);

    // ── Load folders ──────────────────────────────────────────────────────────

    const loadFolders = useCallback(async () => {
        try {
            const result = await window.electron.imapFetchFolders();
            if (result.success) {
                setFolders(result.folders);
            }
        } catch { /* ignore */ }
    }, []);

    // ── Load emails ───────────────────────────────────────────────────────────

    const loadEmails = useCallback(async (folder: string, pageNum: number, replace: boolean) => {
        setEmailsLoading(true);
        try {
            const result = await window.electron.imapFetchEmails(folder, pageNum, PAGE_SIZE);
            if (result.success) {
                setEmails((prev) => replace ? result.emails : [...prev, ...result.emails]);
                setHasMore(result.hasMore);
            } else {
                addNotification("Mail", `Failed to load emails: ${result.error}`, 'error');
            }
        } catch (e: any) {
            addNotification("", `IMAP error: ${e.message}`, 'error');
        }
        setEmailsLoading(false);
    }, []);

    // ── Select email ──────────────────────────────────────────────────────────

    const handleSelectEmail = async (email: ImapEmail) => {
        setSelectedUid(email.uid);
        setSelectedEmailBody(null);
        try {
            const body = await window.electron.imapFetchEmailBody(email.folder, email.uid);
            setSelectedEmailBody(body);
            // Mark as read locally
            setEmails((prev) =>
                prev.map((e) =>
                    e.uid === email.uid
                        ? { ...e, flags: [...e.flags.filter((f) => f !== '\\Seen'), '\\Seen'] }
                        : e
                )
            );
        } catch (e: any) {
            addNotification("Mail", `Failed to load email: ${e.message}`, 'error');
        }
    };

    // ── Delete email ──────────────────────────────────────────────────────────

    const handleDeleteEmail = async (email: ImapEmail) => {
        try {
            await window.electron.imapDeleteEmail(email.folder, email.uid);
            setEmails((prev) => prev.filter((e) => e.uid !== email.uid));
            if (selectedUid === email.uid) {
                setSelectedEmailBody(null);
                setSelectedUid(undefined);
            }
            addNotification("Mail", 'Email deleted.', 'success');
        } catch (e: any) {
            addNotification("", `Delete failed: ${e.message}`, 'error');
        }
    };

    // ── Folder change ─────────────────────────────────────────────────────────

    const handleFolderChange = (folder: string) => {
        setSelectedFolder(folder);
        setPage(0);
        setSelectedEmailBody(null);
        setSelectedUid(undefined);
        loadEmails(folder, 0, true);
    };

    // ── Load more ─────────────────────────────────────────────────────────────

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50 && hasMore && !emailsLoading) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadEmails(selectedFolder, nextPage, false);
        }
    };

    // ── Initial load ──────────────────────────────────────────────────────────

    useEffect(() => {
        loadFolders();
        loadEmails('INBOX', 0, true);
    }, []);

    // ── Refresh ───────────────────────────────────────────────────────────────

    const handleRefresh = () => {
        setPage(0);
        loadEmails(selectedFolder, 0, true);
    };

    return (
        <div className="mail-page">
            {/* ── Folder sidebar ─────────────────────────────────── */}
            <div className="mail-folders">
                <div className="mail-folders-header">
                    <button
                        className="folder-toggle"
                        onClick={() => setFolderOpen(!folderOpen)}
                    >
                        {folderOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                        Folders
                    </button>
                </div>
                {folderOpen && (
                    <ul className="folder-list">
                        {['INBOX', 'Sent', 'Drafts', 'Trash', ...folders.filter((f) =>
                            !['INBOX', 'Sent', 'Drafts', 'Trash'].includes(f)
                        )].map((folder) => (
                            <li
                                key={folder}
                                className={`folder-item${selectedFolder === folder ? ' folder-item--active' : ''}`}
                                onClick={() => handleFolderChange(folder)}
                            >
                                {folderIcon(folder)} {folder}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="mail-compose-area">
                    <button className="compose-btn" onClick={() => setShowCompose(true)}>
                        <FiEdit size={15} /> Compose
                    </button>
                </div>
            </div>

            {/* ── Email list ─────────────────────────────────────── */}
            <div className="email-list-container" onScroll={handleScroll}>
                <div className="email-list-toolbar">
                    <span className="email-list-folder-name">{selectedFolder}</span>
                    <button className="icon-btn" onClick={handleRefresh} title="Refresh">
                        <FiRefreshCw size={15} className={emailsLoading ? 'spin' : ''} />
                    </button>
                </div>
                {emailsLoading && !emails.length ? (
                    <div className="email-list-loading">Loading…</div>
                ) : (
                    <EmailList
                        emails={emails}
                        onSelectEmail={handleSelectEmail}
                        onDeleteEmail={handleDeleteEmail}
                        selectedUid={selectedUid}
                    />
                )}
                {emailsLoading && emails.length > 0 && (
                    <div className="email-list-loading-more">Loading more…</div>
                )}
            </div>

            {/* ── Email body ─────────────────────────────────────── */}
            <div className="selected-email-container">
                {selectedEmailBody ? (
                    <SelectedEmail
                        email={selectedEmailBody}
                        onDelete={selectedUid !== undefined
                            ? () => handleDeleteEmail({ uid: selectedUid, folder: selectedFolder } as ImapEmail)
                            : undefined}
                    />
                ) : (
                    <div className="no-email-div">
                        <h3>Select an email to read</h3>
                    </div>
                )}
            </div>

            {/* ── Compose modal ──────────────────────────────────── */}
            {showCompose && (
                <ComposeEmailComponent onClose={() => setShowCompose(false)} />
            )}
        </div>
    );
};

function folderIcon(name: string): string {
    const n = name.toLowerCase();
    if (n === 'inbox') return '📥';
    if (n.includes('sent')) return '📤';
    if (n.includes('draft')) return '📝';
    if (n.includes('trash') || n.includes('deleted')) return '🗑';
    if (n.includes('spam') || n.includes('junk')) return '⚠️';
    if (n.includes('archive')) return '📦';
    return '📁';
}

export default MailPage;
