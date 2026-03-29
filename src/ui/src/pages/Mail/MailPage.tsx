import React, { useState, useEffect, useCallback, useMemo } from 'react';
import EmailList from '../../components/email/EmailListComponent';
import SelectedEmail from '../../components/email/SelectedEmailComponent';
import ComposeEmailComponent from '../../components/email/ComposeEmailComponent';
import './MailPage.css';
import '../../components/email/EmailItemComponent.css';
import { useNotification } from '../../contexts/NotificationContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ImapEmail, ImapEmailBody } from '../../types/mail.types';
import { FiRefreshCw, FiEdit, FiChevronRight, FiChevronDown } from 'react-icons/fi';
import UILogger from '../../helpers/UILogger';

const PAGE_SIZE = 30;

// ── Folder tree helpers ───────────────────────────────────────────────────────
type FolderNode = { name: string; label: string; children: FolderNode[] };

function detectSeparator(folders: string[]): string {
    const dotCount   = folders.filter((f) => f.includes('.')).length;
    const slashCount = folders.filter((f) => f.includes('/')).length;
    return slashCount >= dotCount ? '/' : '.';
}

function buildFolderTree(folders: string[]): FolderNode[] {
    const sep = detectSeparator(folders);
    const root: FolderNode[] = [];
    const nodeMap = new Map<string, FolderNode>();

    const pinOrder = (f: string) => {
        const n = f.toLowerCase();
        if (n === 'inbox')                            return 0;
        if (n.includes('sent'))                       return 1;
        if (n.includes('draft'))                      return 2;
        if (n.includes('trash') || n.includes('del')) return 3;
        if (n.includes('spam') || n.includes('junk')) return 4;
        if (n.includes('archive'))                    return 5;
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

// ── Conversation grouping ─────────────────────────────────────────────────────
type Conversation = {
    id: string;          // normalised subject
    subject: string;
    latest: ImapEmail;
    messages: ImapEmail[];
    unreadCount: number;
};

function normaliseSubject(s: string): string {
    // Strip common reply/forward prefixes including German (Aw:) and Swedish (Sv:)
    return s.replace(/^(re|fwd?|aw|sv):\s*/gi, '').trim().toLowerCase();
}

function groupIntoConversations(emails: ImapEmail[]): Conversation[] {
    const map = new Map<string, Conversation>();
    for (const email of emails) {
        const key = normaliseSubject(email.subject ?? '');
        if (!map.has(key)) {
            map.set(key, {
                id: key,
                subject: email.subject ?? '',
                latest: email,
                messages: [],
                unreadCount: 0,
            });
        }
        const conv = map.get(key)!;
        conv.messages.push(email);
        if (!email.flags.includes('\\Seen')) conv.unreadCount++;
        // Keep most-recent as latest
        if (new Date(email.date) > new Date(conv.latest.date)) conv.latest = email;
    }
    return [...map.values()].sort((a, b) => new Date(b.latest.date).getTime() - new Date(a.latest.date).getTime());
}

// ── Folder tree component ─────────────────────────────────────────────────────
const FolderTree: React.FC<{
    nodes: FolderNode[];
    selected: string;
    onSelect: (name: string) => void;
    depth?: number;
}> = ({ nodes, selected, onSelect, depth = 0 }) => {
    const [open, setOpen] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {};
        if (depth === 0) nodes.forEach((n) => { init[n.name] = true; });
        return init;
    });

    return (
        <ul className="folder-tree" style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
            {nodes.map((node) => {
                const hasChildren = node.children.length > 0;
                const isOpen = open[node.name] ?? false;
                const isSelected = selected === node.name;
                return (
                    <li key={node.name}>
                        <div
                            className={`folder-item${isSelected ? ' folder-item--active' : ''}`}
                            style={{ paddingLeft: depth * 6 + 8 }}
                            onClick={() => onSelect(node.name)}
                        >
                            {hasChildren ? (
                                <span className="folder-expand-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    setOpen((prev) => ({ ...prev, [node.name]: !prev[node.name] }));
                                }}>
                                    {isOpen ? <FiChevronDown size={10} /> : <FiChevronRight size={10} />}
                                </span>
                            ) : (
                                <span className="folder-expand-placeholder" />
                            )}
                            <span className="folder-icon">{folderIcon(node.label)}</span>
                            <span className="folder-label">{node.label}</span>
                        </div>
                        {hasChildren && isOpen && (
                            <FolderTree nodes={node.children} selected={selected} onSelect={onSelect} depth={depth + 1} />
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
    const { t } = useLanguage();

    const [folders, setFolders]                   = useState<string[]>([]);
    const [selectedFolder, setSelectedFolder]     = useState('INBOX');
    const [emails, setEmails]                     = useState<ImapEmail[]>([]);
    const [selectedEmailBody, setSelectedEmailBody] = useState<ImapEmailBody | null>(null);
    const [selectedUid, setSelectedUid]           = useState<number | undefined>();
    const [page, setPage]                         = useState(0);
    const [hasMore, setHasMore]                   = useState(false);
    const [emailsLoading, setEmailsLoading]       = useState(false);
    const [showCompose, setShowCompose]           = useState(false);
    const [accountEmail, setAccountEmail]         = useState('');
    const [accountHost, setAccountHost]           = useState('');

    // Multi-account switcher
    const [accounts, setAccounts]                 = useState<{ email: string; host: string; label?: string }[]>([]);
    const [switchingAccount, setSwitchingAccount] = useState(false);

    const folderTree = useMemo(() => buildFolderTree(folders), [folders]);
    const conversations = useMemo(() => groupIntoConversations(emails), [emails]);

    // ── Load folders ──────────────────────────────────────────────────────────
    const loadFolders = useCallback(async () => {
        try {
            const result = await window.electron.imapFetchFolders();
            if (result.success) {
                setFolders(result.folders);
                UILogger.success('MailPage', `Loaded ${result.folders.length} folders`);
            }
        } catch (e: any) {
            UILogger.error('MailPage', 'Failed to load folders', e);
        }
    }, []);

    // ── Load emails ───────────────────────────────────────────────────────────
    const loadEmails = useCallback(async (folder: string, pageNum: number, replace: boolean) => {
        setEmailsLoading(true);
        try {
            const result = await window.electron.imapFetchEmails(folder, pageNum, PAGE_SIZE);
            if (result.success) {
                setEmails((prev) => replace ? result.emails : [...prev, ...result.emails]);
                setHasMore(result.hasMore);
                UILogger.success('MailPage', `Loaded ${result.emails.length} emails from ${folder}`);
            } else {
                addNotification('Mail', `Failed to load emails: ${result.error}`, 'error');
                UILogger.error('MailPage', `Failed to load emails: ${result.error}`);
            }
        } catch (e: any) {
            addNotification('', `IMAP error: ${e.message}`, 'error');
            UILogger.error('MailPage', 'IMAP error', e);
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
            if (selectedUid === email.uid) { setSelectedEmailBody(null); setSelectedUid(undefined); }
            addNotification('Mail', t('mail.delete') + ' OK', 'success');
            UILogger.success('MailPage', `Deleted email uid=${email.uid}`);
        } catch (e: any) {
            addNotification('', `Delete failed: ${e.message}`, 'error');
        }
    };

    // ── Move email ────────────────────────────────────────────────────────────
    const handleMoveEmail = async (uid: number, toFolder: string) => {
        try {
            await window.electron.imapMoveEmail(selectedFolder, uid, toFolder);
            setEmails((prev) => prev.filter((e) => e.uid !== uid));
            if (selectedUid === uid) { setSelectedEmailBody(null); setSelectedUid(undefined); }
            addNotification('Mail', `Moved to ${toFolder}`, 'success');
            UILogger.success('MailPage', `Moved email uid=${uid} → ${toFolder}`);
        } catch (e: any) {
            addNotification('', `Move failed: ${e.message}`, 'error');
        }
    };

    // ── Mark unread ───────────────────────────────────────────────────────────
    const handleMarkUnread = async (uid: number) => {
        try {
            await window.electron.imapMarkEmailSeen(selectedFolder, uid, false);
            setEmails((prev) =>
                prev.map((e) => e.uid === uid ? { ...e, flags: e.flags.filter((f) => f !== '\\Seen') } : e)
            );
            UILogger.info('MailPage', `Marked email uid=${uid} as unread`);
        } catch (e: any) {
            addNotification('', `Mark failed: ${e.message}`, 'error');
        }
    };

    // ── Folder change ─────────────────────────────────────────────────────────
    const handleFolderChange = (folder: string) => {
        setSelectedFolder(folder);
        setPage(0);
        setSelectedEmailBody(null);
        setSelectedUid(undefined);
        loadEmails(folder, 0, true);
        UILogger.info('MailPage', `Switched to folder: ${folder}`);
    };

    // ── Account switch ────────────────────────────────────────────────────────
    const handleSwitchAccount = async (acc: { email: string; host: string }) => {
        if (acc.email === accountEmail) return;
        setSwitchingAccount(true);
        try {
            await window.electron.switchAccount(acc);
            const creds = await window.electron.getUserCredentials();
            setAccountEmail(creds.email);
            setAccountHost(creds.host);
            setSelectedFolder('INBOX');
            setPage(0);
            setEmails([]);
            setSelectedEmailBody(null);
            setSelectedUid(undefined);
            await loadFolders();
            await loadEmails('INBOX', 0, true);
            addNotification('Mail', `Switched to ${acc.email}`, 'success');
        } catch (e: any) {
            addNotification('Mail', `Switch failed: ${e.message}`, 'error');
        }
        setSwitchingAccount(false);
    };

    // ── Infinite scroll ───────────────────────────────────────────────────────
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const el = e.currentTarget;
        if (el.scrollHeight - el.scrollTop <= el.clientHeight + 60 && hasMore && !emailsLoading) {
            const nextPage = page + 1;
            setPage(nextPage);
            loadEmails(selectedFolder, nextPage, false);
        }
    };

    useEffect(() => {
        loadFolders();
        loadEmails('INBOX', 0, true);
        window.electron.getUserCredentials().then((creds) => {
            setAccountEmail(creds.email);
            setAccountHost(creds.host);
        }).catch(() => {
            setAccountEmail('');
            setAccountHost('');
        });
        window.electron.getAccounts().then(setAccounts).catch(() => {});
    }, []);

    const handleRefresh = () => {
        setPage(0);
        loadEmails(selectedFolder, 0, true);
    };

    return (
        <div className="mail-page">
            {/* ── Folder sidebar ─────────────────────────────────── */}
            <div className="mail-folders">
                {/* Account switcher */}
                {accounts.length > 1 && (
                    <div className="mail-account-switcher">
                        {accounts.map((acc) => (
                            <button
                                key={acc.email}
                                className={`mail-account-tab${acc.email === accountEmail ? ' mail-account-tab--active' : ''}`}
                                onClick={() => handleSwitchAccount(acc)}
                                disabled={switchingAccount}
                                title={acc.host}
                            >
                                <span className="mail-account-avatar">
                                    {acc.email[0].toUpperCase()}
                                </span>
                                <span className="mail-account-label">
                                    {acc.label ?? acc.email.split('@')[1] ?? acc.email}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
                <div className="mail-compose-area">
                    <button className="compose-btn" onClick={() => setShowCompose(true)}>
                        <FiEdit size={13} /> {t('mail.compose')}
                    </button>
                </div>
                <div className="folder-section-label">{t('mail.folders')}</div>
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
                    <span className="email-list-folder-name">
                        {selectedFolder.split(/[./]/).pop()}
                    </span>
                    <button className="icon-btn" onClick={handleRefresh} title={t('mail.refresh')}>
                        <FiRefreshCw size={13} className={emailsLoading ? 'spin' : ''} />
                    </button>
                </div>
                {emailsLoading && !emails.length ? (
                    <div className="email-list-loading">{t('mail.loadingEmails')}</div>
                ) : (
                    <ConversationList
                        conversations={conversations}
                        selectedUid={selectedUid}
                        onSelectEmail={handleSelectEmail}
                        onDeleteEmail={handleDeleteEmail}
                    />
                )}
                {emailsLoading && emails.length > 0 && (
                    <div className="email-list-loading-more">{t('mail.loadingMore')}</div>
                )}
            </div>

            {/* ── Email body ─────────────────────────────────────── */}
            <div className="selected-email-container">
                {selectedEmailBody ? (
                    <SelectedEmail
                        email={selectedEmailBody}
                        folder={selectedFolder}
                        mailbox={accountEmail}
                        host={accountHost}
                        folders={folders}
                        onDelete={selectedUid !== undefined
                            ? () => handleDeleteEmail({ uid: selectedUid, folder: selectedFolder } as ImapEmail)
                            : undefined}
                        onMove={selectedUid !== undefined
                            ? (toFolder) => handleMoveEmail(selectedUid, toFolder)
                            : undefined}
                        onMarkUnread={selectedUid !== undefined
                            ? () => handleMarkUnread(selectedUid)
                            : undefined}
                    />
                ) : (
                    <div className="no-email-div">
                        <div className="no-email-placeholder">
                            <span className="no-email-icon">✉️</span>
                            <p>{t('mail.noEmailSelected')}</p>
                        </div>
                    </div>
                )}
            </div>

            {showCompose && (
                <ComposeEmailComponent onClose={() => setShowCompose(false)} />
            )}
        </div>
    );
};

// ── Conversation list component ───────────────────────────────────────────────
const ConversationList: React.FC<{
    conversations: Conversation[];
    selectedUid?: number;
    onSelectEmail: (email: ImapEmail) => void;
    onDeleteEmail: (email: ImapEmail) => void;
}> = ({ conversations, selectedUid, onSelectEmail, onDeleteEmail }) => {
    const { t } = useLanguage();
    const [expandedConv, setExpandedConv] = useState<Set<string>>(new Set());

    if (!conversations.length) {
        return <div className="email-list-empty">{t('mail.noMessages')}</div>;
    }

    return (
        <div className="email-list">
            {conversations.map((conv) => {
                const isExpanded = expandedConv.has(conv.id);
                const isSingle   = conv.messages.length === 1;
                const isSelected = conv.latest.uid === selectedUid || conv.messages.some((m) => m.uid === selectedUid);
                const isUnread   = conv.unreadCount > 0;

                return (
                    <div key={conv.id} className="conversation-group">
                        {/* Conversation header */}
                        <div
                            className={`email-item${isSelected ? ' email-item--selected' : ''}${isUnread ? ' email-item--unread' : ''}`}
                            onClick={() => {
                                if (isSingle) {
                                    onSelectEmail(conv.latest);
                                } else {
                                    setExpandedConv((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(conv.id)) next.delete(conv.id);
                                        else next.add(conv.id);
                                        return next;
                                    });
                                }
                            }}
                        >
                            <div className="email-content">
                                <div className="email-header">
                                    <div className="email-header-left">
                                        <h4 className={isUnread ? 'email-subject-unread' : ''}>{conv.subject || '(no subject)'}</h4>
                                        <p className="email-from">
                                            {conv.messages.length > 1
                                                ? `${conv.messages.length} ${t('mail.messages')} · ${conv.latest.from}`
                                                : conv.latest.from}
                                        </p>
                                    </div>
                                    <div className="email-header-right">
                                        <small>{formatDate(conv.latest.date)}</small>
                                        {isUnread && <span className="unread-dot" />}
                                        {conv.messages.length > 1 && (
                                            <span className="conv-count">{conv.messages.length}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="email-actions">
                                <div className="action-delete" onClick={(e) => { e.stopPropagation(); onDeleteEmail(conv.latest); }}>
                                    🗑
                                </div>
                            </div>
                        </div>

                        {/* Expanded conversation messages */}
                        {!isSingle && isExpanded && conv.messages.map((msg) => (
                            <div
                                key={msg.uid}
                                className={`email-item email-item--nested${msg.uid === selectedUid ? ' email-item--selected' : ''}${!msg.flags.includes('\\Seen') ? ' email-item--unread' : ''}`}
                                onClick={() => onSelectEmail(msg)}
                            >
                                <div className="email-content">
                                    <div className="email-header">
                                        <div className="email-header-left">
                                            <p className="email-from" style={{ fontWeight: !msg.flags.includes('\\Seen') ? 700 : 400 }}>{msg.from}</p>
                                        </div>
                                        <div className="email-header-right">
                                            <small>{formatDate(msg.date)}</small>
                                            {!msg.flags.includes('\\Seen') && <span className="unread-dot" />}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
};

function formatDate(date: string): string {
    const d = new Date(date);
    const now = new Date();
    if (isNaN(d.getTime())) return '';
    if (d.toDateString() === now.toDateString()) {
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString(undefined, { day:'numeric', month:'short' });
    return d.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'2-digit' });
}

function folderIcon(name: string): string {
    const n = name.toLowerCase();
    if (n === 'inbox')                           return '📥';
    if (n.includes('sent'))                      return '📤';
    if (n.includes('draft'))                     return '📝';
    if (n.includes('trash') || n.includes('del')) return '🗑';
    if (n.includes('spam') || n.includes('junk')) return '⚠️';
    if (n.includes('archive'))                   return '📦';
    if (n.includes('star') || n.includes('flag')) return '⭐';
    return '📁';
}

export default MailPage;
