import React, { useState } from 'react';
import './ContactFormComponent.css';
import { Contact } from '../../types/contact.types';

interface ContactFormProps {
    initial?: Partial<Contact>;
    onSave: (data: Omit<Contact, 'uid' | 'displayName'>) => void;
    onCancel: () => void;
    saving?: boolean;
}

const EMPTY: Omit<Contact, 'uid' | 'displayName'> = {
    firstName: '', lastName: '', email: '', phone: '', company: '', notes: '',
};

const ContactFormComponent: React.FC<ContactFormProps> = ({ initial, onSave, onCancel, saving }) => {
    const [form, setForm] = useState<Omit<Contact, 'uid' | 'displayName'>>({
        ...EMPTY,
        firstName: initial?.firstName ?? '',
        lastName: initial?.lastName ?? '',
        email: initial?.email ?? '',
        phone: initial?.phone ?? '',
        company: initial?.company ?? '',
        notes: initial?.notes ?? '',
    });

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }));

    return (
        <div className="contact-form-overlay">
            <div className="contact-form-modal">
                <div className="contact-form-header">
                    <h3>{initial?.firstName ? 'Edit Contact' : 'New Contact'}</h3>
                    <button onClick={onCancel} className="contact-form-close">✕</button>
                </div>

                <div className="contact-form-body">
                    <div className="contact-form-row">
                        <div className="contact-field">
                            <label>First Name</label>
                            <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="First name" />
                        </div>
                        <div className="contact-field">
                            <label>Last Name</label>
                            <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Last name" />
                        </div>
                    </div>
                    <div className="contact-field">
                        <label>Email</label>
                        <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
                    </div>
                    <div className="contact-field">
                        <label>Phone</label>
                        <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 234 567 890" />
                    </div>
                    <div className="contact-field">
                        <label>Company</label>
                        <input type="text" value={form.company} onChange={set('company')} placeholder="Company name" />
                    </div>
                    <div className="contact-field">
                        <label>Notes</label>
                        <textarea value={form.notes} onChange={set('notes')} placeholder="Notes…" rows={3} />
                    </div>
                </div>

                <div className="contact-form-footer">
                    <button className="contact-save-btn" onClick={() => onSave(form)} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button className="contact-cancel-btn" onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    );
};

export default ContactFormComponent;
