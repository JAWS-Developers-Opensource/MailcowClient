import React, { useState, useEffect, useCallback } from 'react';
import './ContactsPage.css';
import { DAVAddressBook, DAVVCard } from 'tsdav';
import { Contact, parseVCard } from '../../types/contact.types';
import ContactFormComponent from '../../components/contacts/ContactFormComponent';
import { useNotification } from '../../contexts/NotificationContext';
import { FiSearch, FiUserPlus, FiRefreshCw, FiEdit2, FiTrash2 } from 'react-icons/fi';

const ContactsPage: React.FC = () => {
    const { addNotification } = useNotification();

    const [addressBooks, setAddressBooks] = useState<DAVAddressBook[]>([]);
    const [selectedBook, setSelectedBook] = useState<DAVAddressBook | null>(null);
    const [rawVCards, setRawVCards] = useState<DAVVCard[]>([]);
    const [contacts, setContacts] = useState<(Contact & { vCard: DAVVCard })[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [editingContact, setEditingContact] = useState<(Contact & { vCard: DAVVCard }) | null>(null);
    const [saving, setSaving] = useState(false);

    // ── Load address books ────────────────────────────────────────────────────

    const loadAddressBooks = useCallback(async () => {
        setLoading(true);
        try {
            await window.electron.cardCreateConn();
            const books = await window.electron.cardFetchAddressBooks();
            setAddressBooks(books);
            if (books.length > 0 && !selectedBook) {
                setSelectedBook(books[0]);
                await loadContacts(books[0]);
            }
        } catch (e: any) {
            addNotification("Contacts", `Failed to load address books: ${e.message}`, 'error');
        }
        setLoading(false);
    }, []);

    const loadContacts = async (book: DAVAddressBook) => {
        setLoading(true);
        try {
            const vcards = await window.electron.cardFetchContacts(book);
            setRawVCards(vcards);
            const parsed = vcards.map((vc) => ({
                ...parseVCard(vc.data ?? ''),
                vCard: vc,
            }));
            setContacts(parsed.filter((c) => c.displayName.trim()));
        } catch (e: any) {
            addNotification("Contacts", `Failed to load contacts: ${e.message}`, 'error');
        }
        setLoading(false);
    };

    useEffect(() => { loadAddressBooks(); }, []);

    // ── Filter ────────────────────────────────────────────────────────────────

    const filtered = contacts.filter((c) => {
        const q = search.toLowerCase();
        return (
            c.displayName.toLowerCase().includes(q) ||
            c.email.toLowerCase().includes(q) ||
            c.company.toLowerCase().includes(q)
        );
    });

    // ── Create / update ───────────────────────────────────────────────────────

    const handleSave = async (data: Omit<Contact, 'uid' | 'displayName'>) => {
        if (!selectedBook) return;
        setSaving(true);
        try {
            if (editingContact) {
                await window.electron.cardUpdateContact({
                    vCard: editingContact.vCard,
                    ...data,
                });
                addNotification("Contacts", 'Contact updated!', 'success');
            } else {
                await window.electron.cardCreateContact({
                    addressBook: selectedBook,
                    ...data,
                });
                addNotification("Contacts", 'Contact created!', 'success');
            }
            setShowForm(false);
            setEditingContact(null);
            await loadContacts(selectedBook);
        } catch (e: any) {
            addNotification("", `Save failed: ${e.message}`, 'error');
        }
        setSaving(false);
    };

    const handleDelete = async (contact: Contact & { vCard: DAVVCard }) => {
        if (!confirm(`Delete contact "${contact.displayName}"?`)) return;
        try {
            await window.electron.cardDeleteContact(contact.vCard);
            addNotification("Contacts", 'Contact deleted.', 'success');
            setContacts((prev) => prev.filter((c) => c.uid !== contact.uid));
        } catch (e: any) {
            addNotification("", `Delete failed: ${e.message}`, 'error');
        }
    };

    const openEdit = (contact: Contact & { vCard: DAVVCard }) => {
        setEditingContact(contact);
        setShowForm(true);
    };

    const openNew = () => {
        setEditingContact(null);
        setShowForm(true);
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="contacts-page">
            {showForm && (
                <ContactFormComponent
                    initial={editingContact ?? undefined}
                    onSave={handleSave}
                    onCancel={() => { setShowForm(false); setEditingContact(null); }}
                    saving={saving}
                />
            )}

            {/* Sidebar: address books */}
            <div className="contacts-sidebar">
                <h2 className="contacts-sidebar-title">Address Books</h2>
                <ul className="address-book-list">
                    {addressBooks.map((book) => (
                        <li
                            key={book.url}
                            className={`address-book-item${selectedBook?.url === book.url ? ' address-book-item--active' : ''}`}
                            onClick={async () => {
                                setSelectedBook(book);
                                await loadContacts(book);
                            }}
                        >
                            📒 {String(book.displayName ?? book.url)}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Main: contact list */}
            <div className="contacts-main">
                <div className="contacts-toolbar">
                    <div className="contacts-search-wrap">
                        <FiSearch size={14} className="contacts-search-icon" />
                        <input
                            className="contacts-search"
                            type="text"
                            placeholder="Search contacts…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <button className="contacts-new-btn" onClick={openNew}>
                        <FiUserPlus size={15} /> New Contact
                    </button>
                    <button
                        className="contacts-refresh-btn"
                        onClick={() => selectedBook && loadContacts(selectedBook)}
                        title="Refresh"
                    >
                        <FiRefreshCw size={15} className={loading ? 'spin' : ''} />
                    </button>
                </div>

                {loading ? (
                    <div className="contacts-loading">Loading contacts…</div>
                ) : filtered.length === 0 ? (
                    <div className="contacts-empty">
                        {search ? 'No contacts match your search.' : 'No contacts found. Add your first contact!'}
                    </div>
                ) : (
                    <div className="contacts-grid">
                        {filtered.map((contact) => (
                            <div key={contact.uid || contact.email} className="contact-card">
                                <div className="contact-avatar">
                                    {(contact.firstName?.[0] ?? contact.displayName?.[0] ?? '?').toUpperCase()}
                                </div>
                                <div className="contact-info">
                                    <div className="contact-name">{contact.displayName}</div>
                                    {contact.email && <div className="contact-detail">✉ {contact.email}</div>}
                                    {contact.phone && <div className="contact-detail">📞 {contact.phone}</div>}
                                    {contact.company && <div className="contact-detail">🏢 {contact.company}</div>}
                                </div>
                                <div className="contact-actions">
                                    <button
                                        className="contact-action-btn"
                                        onClick={() => openEdit(contact)}
                                        title="Edit"
                                    >
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button
                                        className="contact-action-btn contact-action-btn--danger"
                                        onClick={() => handleDelete(contact)}
                                        title="Delete"
                                    >
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ContactsPage;
