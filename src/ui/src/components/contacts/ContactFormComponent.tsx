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
    title: '', birthday: '', address: '', city: '', country: '', website: '',
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
        title: initial?.title ?? '',
        birthday: initial?.birthday ?? '',
        address: initial?.address ?? '',
        city: initial?.city ?? '',
        country: initial?.country ?? '',
        website: initial?.website ?? '',
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
                        <label>Job Title</label>
                        <input type="text" value={form.title ?? ''} onChange={set('title')} placeholder="e.g. Software Engineer" />
                    </div>
                    <div className="contact-field">
                        <label>Email</label>
                        <input type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
                    </div>
                    <div className="contact-form-row">
                        <div className="contact-field">
                            <label>Phone</label>
                            <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 234 567 890" />
                        </div>
                        <div className="contact-field">
                            <label>Birthday</label>
                            <input type="date" value={form.birthday ?? ''} onChange={set('birthday')} />
                        </div>
                    </div>
                    <div className="contact-field">
                        <label>Company</label>
                        <input type="text" value={form.company} onChange={set('company')} placeholder="Company name" />
                    </div>
                    <div className="contact-field">
                        <label>Street Address</label>
                        <input type="text" value={form.address ?? ''} onChange={set('address')} placeholder="123 Main St" />
                    </div>
                    <div className="contact-form-row">
                        <div className="contact-field">
                            <label>City</label>
                            <input type="text" value={form.city ?? ''} onChange={set('city')} placeholder="City" />
                        </div>
                        <div className="contact-field">
                            <label>Country</label>
                            <input type="text" value={form.country ?? ''} onChange={set('country')} placeholder="Country" />
                        </div>
                    </div>
                    <div className="contact-field">
                        <label>Website</label>
                        <input type="url" value={form.website ?? ''} onChange={set('website')} placeholder="https://example.com" />
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
