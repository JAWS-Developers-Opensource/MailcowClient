import React, { useState, useEffect, useCallback, useMemo } from 'react';
import EmailList from '../../components/email/EmailListComponent';
import SelectedEmail from '../../components/email/SelectedEmailComponent';
import ComposeEmailComponent from '../../components/email/ComposeEmailComponent';
import './MailPage.css';
import { useNotification } from '../../contexts/NotificationContext';
import { ImapEmail, ImapEmailBody } from '../../types/mail.types';
import { FiRefreshCw, FiEdit, FiChevronRight, FiChevronDown } from 'react-icons/fi';

const PAGE_SIZE = 30;

// ── Folder tree helpers ───────────────────────────────────────────────────────

type FolderNode = {
    name: string;      // full path
    label: string;     // display segment
    children: FolderNode[];
};

/** Detect the most common separator used in a folder list. */
function detectSeparator(folders: string[]): string {
    const dotCount = folders.filter((f) => f.includes('.')).length;
    const slashCount = folders.filter((f) => f.includes('/')).length;
    return slashCount >= dotCount ? '/' : '.';
}

/** Build a tree of FolderNodes from a flat list of IMAP folder names. */
function buildFolderTree(folders: string[]): FolderNode[] {
    const sep = detectSeparator(folders);
    const root: FolderNode[] = [];
    const nodeMap = new Map<string, FolderNode>();

    // Pin common folders at top
    const pinned = ['INBOX', 'Sent', 'Drafts', 'Trash', 'Spam', 'Junk', 'Archive'];
    const pinOrder = (f: string) => {
        const n = f.toLowerCase();
        if (n === 'inbox') return 0;
        if (n.includes('sent')) return 1;
        if (n.includes('draft')) return 2;
        if (n.includes('trash') || n.includes('deleted')) return 3;
        if (n.includes('spam') || n.includes('junk')) return 4;
        if (n.includes('archive')) return 5;
        return 99;
    };

    const sorted = [...folders].sort((a, b) => {
        const pa = pinOrder(a.split(sep)[0]);
        const pb = pinOrder(b.split(sep)[0]);
        if (pa !== pb) return pa - pb;
        return a.localeCompare(b);
    });

    for (const fullPath of sorted) {
        const parts = fullPath.split(sep);
        let parentList = root;
        let currentPath = '';
        for (let i = 0; i < parts.length; i++) {
            currentPath = currentPath ? `${currentPath}${sep}${parts[i]}` : parts[i];
            if (!nodeMap.has(currentPath)) {
                const node: FolderNode = { name: currentPath, label: parts[i], children: [] };
                nodeMap.set(currentPath, node);
                parentList.push(node);
            }
            parentList = nodeMap.get(currentPath)!.children;
        }
    }
    return root;
}

// ── Folder tree component ─────────────────────────────────────────────────────

const FolderTree: React.FC<{
    nodes: FolderNode[];
    selected: string;
    onSelect: (name: string) => void;
    depth?: number;
}> = ({ nodes, selected, onSelect, depth = 0 }) => {
    const [open, setOpen] = useState<Record<string, boolean>>(() => {
        // auto-open first level by default
        const init: Record<string, boolean> = {};
        if (depth === 0) nodes.forEach((n) => { init[n.name] = true; });
        return init;
    });

    return (
        <ul className="folder-tree" style={{ paddingLeft: depth === 0 ? 0 : 14 }}>
            {nodes.map((node) => {
                const hasChildren = node.children.length > 0;
                const isOpen = open[node.name] ?? false;
                const isSelected = selected === node.name;
                return (
                    <li key={node.name}>
                        <div
                            className={`folder-item${isSelected ? ' folder-item--active' : ''}`}
                            style={{ paddingLeft: depth * 6 + 10 }}
                            onClick={() => onSelect(node.name)}
                        >
                            {hasChildren ? (
                                <span
                                    className="folder-expand-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpen((prev) => ({ ...prev, [node.name]: !prev[node.name] }));
                                    }}
                                >
                                    {isOpen ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
                                </span>
                            ) : (
                                <span className="folder-expand-placeholder" />
                            )}
                            <span className="folder-icon">{folderIcon(node.label)}</span>
                            <span className="folder-label">{node.label}</span>
                        </div>
                        {hasChildren && isOpen && (
                            <FolderTree
                                nodes={node.children}
                                selected={selected}
                                onSelect={onSelect}
                                depth={depth + 1}
                            />
                        )}
                    </li>
                );
            })}
        </ul>
    );
};

// ── MailPage ──────────────────────────────────────────────────────────────────

const MailPage: React.FC = () => {
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

    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

    // ── Load folders ──────────────────────────────────────────────────────────
    const loadFolders = useCallback(async () => {
        try {
            const result = await window.electron.imapFetchFolders();
            if (result.success) setFolders(result.folders);
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
                addNotification('Mail', `Failed to load emails: ${result.error}`, 'error');
            }
        } catch (e: any) {
            addNotification('', `IMAP error: ${e.message}`, 'error');
        }
        setEmailsLoading(false);
    }, [addNotification]);

    // ── Select email ──────────────────────────────────────────────────────────
    const handleSelectEmail = async (email: ImapEmail) => {
        setSelectedUid(email.uid);
        setSelectedEmailBody(null);
        try {
            const body = await window.electron.imapFetchEmailBody(email.folder, email.uid);
            setSelectedEmailBody(body);
            setEmails((prev) =>
                prev.map((e) =>
                    e.uid === email.uid
                        ? { ...e, flags: [...e.flags.filter((f) => f !== '\\Seen'), '\\Seen'] }
                        : e
                )
            );
        } catch (e: any) {
            addNotification('Mail', `Failed to load email: ${e.message}`, 'error');
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
            addNotification('Mail', 'Email deleted.', 'success');
        } catch (e: any) {
            addNotification('', `Delete failed: ${e.message}`, 'error');
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

    // ── Infinite scroll ───────────────────────────────────────────────────────
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

    const handleRefresh = () => {
        setPage(0);
        loadEmails(selectedFolder, 0, true);
    };

    return (
        <div className="mail-page">
            {/* ── Folder sidebar ─────────────────────────────────── */}
            <div className="mail-folders">
                <div className="mail-compose-area">
                    <button className="compose-btn" onClick={() => setShowCompose(true)}>
                        <FiEdit size={14} /> Compose
                    </button>
                </div>
                <div className="folder-section-label">Folders</div>
                <div className="folder-tree-scroll">
                    <FolderTree
                        nodes={folderTree}
                        selected={selectedFolder}
                        onSelect={handleFolderChange}
                    />
                </div>
            </div>

            {/* ── Email list ─────────────────────────────────────── */}
            <div className="email-list-container" onScroll={handleScroll}>
                <div className="email-list-toolbar">
                    <span className="email-list-folder-name">{selectedFolder.split(/[./]/).pop()}</span>
                    <button className="icon-btn" onClick={handleRefresh} title="Refresh">
                        <FiRefreshCw size={14} className={emailsLoading ? 'spin' : ''} />
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
                        onDelete={
                            selectedUid !== undefined
                                ? () => handleDeleteEmail({ uid: selectedUid, folder: selectedFolder } as ImapEmail)
                                : undefined
                        }
                    />
                ) : (
                    <div className="no-email-div">
                        <div className="no-email-placeholder">
                            <span className="no-email-icon">✉️</span>
                            <p>Select an email to read</p>
                        </div>
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
    if (n.includes('starred') || n.includes('flagged')) return '⭐';
    return '📁';
}

export default MailPage;
