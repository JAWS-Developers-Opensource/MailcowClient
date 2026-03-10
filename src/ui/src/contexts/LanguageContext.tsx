import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export type Language = 'en' | 'it' | 'de';

// ── Translation dictionary ────────────────────────────────────────────────────

const translations: Record<Language, Record<string, string>> = {
    en: {
        // Navigation
        'nav.mail': 'Mail',
        'nav.calendar': 'Calendar',
        'nav.contacts': 'Contacts',
        'nav.settings': 'Settings',
        'nav.logout': 'Sign out',
        'nav.lightMode': 'Light mode',
        'nav.darkMode': 'Dark mode',
        'nav.accounts': 'Accounts',
        'nav.addAccount': 'Add account',

        // Login
        'login.title': 'Welcome to MailcowClient',
        'login.email': 'Email',
        'login.password': 'Password',
        'login.host': 'Server host',
        'login.hostHint': 'auto: ',
        'login.signIn': 'Sign in',
        'login.mfaCode': 'TOTP / 2FA Code',
        'login.verify': 'Verify',
        'login.back': '← Back',
        'login.mfaHint': 'If your account has 2FA enabled, enter the 6-digit code from your authenticator app.',

        // Mail page
        'mail.folders': 'Folders',
        'mail.compose': 'Compose',
        'mail.noEmailSelected': 'Select an email to read',
        'mail.loadingEmails': 'Loading…',
        'mail.loadingMore': 'Loading more…',
        'mail.noMessages': 'No messages in this folder.',
        'mail.refresh': 'Refresh',
        'mail.reply': 'Reply',
        'mail.replyAll': 'Reply all',
        'mail.forward': 'Forward',
        'mail.delete': 'Delete',
        'mail.markRead': 'Mark as read',
        'mail.markUnread': 'Mark as unread',
        'mail.moveTo': 'Move to…',
        'mail.downloadImages': 'Download remote images',
        'mail.imagesBlocked': 'Remote images are blocked.',
        'mail.loadImages': 'Load images',
        'mail.conversation': 'conversation',
        'mail.messages': 'messages',

        // Compose
        'compose.newMessage': 'New Message',
        'compose.to': 'To',
        'compose.cc': 'CC',
        'compose.bcc': 'BCC',
        'compose.subject': 'Subject',
        'compose.send': '✈ Send',
        'compose.sending': 'Sending…',
        'compose.discard': 'Discard',
        'compose.placeholder': 'Write your message here…',
        'compose.fullscreen': 'Fullscreen',
        'compose.restore': 'Restore',
        'compose.errorTo': 'Please enter a recipient.',
        'compose.errorSubject': 'Please enter a subject.',
        'compose.sent': 'Email sent!',

        // Calendar
        'cal.newEvent': 'New Event',
        'cal.today': 'Today',
        'cal.eventsToday': 'events today',
        'cal.noEventsToday': 'No events today',
        'cal.edit': 'Edit',
        'cal.delete': 'Delete',
        'cal.close': 'Close',
        'cal.save': 'Save changes',
        'cal.create': 'Create event',
        'cal.title': 'Title',
        'cal.description': 'Description',
        'cal.location': 'Location',
        'cal.startDate': 'Start date',
        'cal.endDate': 'End date',
        'cal.startTime': 'Start time',
        'cal.endTime': 'End time',
        'cal.allDay': 'All day',
        'cal.calendar': 'Calendar',
        'cal.created': 'Event created!',
        'cal.updated': 'Event updated!',
        'cal.deleted': 'Event deleted.',
        'cal.moreDetails': 'More details',

        // Contacts
        'contacts.newContact': 'New contact',
        'contacts.save': 'Save',
        'contacts.cancel': 'Cancel',
        'contacts.delete': 'Delete',
        'contacts.firstName': 'First name',
        'contacts.lastName': 'Last name',
        'contacts.email': 'Email',
        'contacts.phone': 'Phone',
        'contacts.noContacts': 'No contacts found.',

        // Notifications
        'notif.success': 'Success',
        'notif.error': 'Error',
        'notif.info': 'Info',

        // Settings
        'settings.title': 'Settings',
        'settings.theme': 'Theme',
        'settings.language': 'Language',
        'settings.account': 'Account',
        'settings.save': 'Save',
    },

    it: {
        'nav.mail': 'Posta',
        'nav.calendar': 'Calendario',
        'nav.contacts': 'Contatti',
        'nav.settings': 'Impostazioni',
        'nav.logout': 'Esci',
        'nav.lightMode': 'Modalità chiara',
        'nav.darkMode': 'Modalità scura',
        'nav.accounts': 'Account',
        'nav.addAccount': 'Aggiungi account',

        'login.title': 'Benvenuto in MailcowClient',
        'login.email': 'Email',
        'login.password': 'Password',
        'login.host': 'Server',
        'login.hostHint': 'auto: ',
        'login.signIn': 'Accedi',
        'login.mfaCode': 'Codice TOTP / 2FA',
        'login.verify': 'Verifica',
        'login.back': '← Indietro',
        'login.mfaHint': 'Se il tuo account ha il 2FA attivo, inserisci il codice a 6 cifre dalla tua app di autenticazione.',

        'mail.folders': 'Cartelle',
        'mail.compose': 'Scrivi',
        'mail.noEmailSelected': 'Seleziona un\'email per leggerla',
        'mail.loadingEmails': 'Caricamento…',
        'mail.loadingMore': 'Caricamento ulteriori…',
        'mail.noMessages': 'Nessun messaggio in questa cartella.',
        'mail.refresh': 'Aggiorna',
        'mail.reply': 'Rispondi',
        'mail.replyAll': 'Rispondi a tutti',
        'mail.forward': 'Inoltra',
        'mail.delete': 'Elimina',
        'mail.markRead': 'Segna come letta',
        'mail.markUnread': 'Segna come non letta',
        'mail.moveTo': 'Sposta in…',
        'mail.downloadImages': 'Scarica immagini remote',
        'mail.imagesBlocked': 'Le immagini remote sono bloccate.',
        'mail.loadImages': 'Carica immagini',
        'mail.conversation': 'conversazione',
        'mail.messages': 'messaggi',

        'compose.newMessage': 'Nuovo messaggio',
        'compose.to': 'A',
        'compose.cc': 'CC',
        'compose.bcc': 'CCN',
        'compose.subject': 'Oggetto',
        'compose.send': '✈ Invia',
        'compose.sending': 'Invio…',
        'compose.discard': 'Elimina',
        'compose.placeholder': 'Scrivi il tuo messaggio qui…',
        'compose.fullscreen': 'Schermo intero',
        'compose.restore': 'Ripristina',
        'compose.errorTo': 'Inserisci un destinatario.',
        'compose.errorSubject': 'Inserisci un oggetto.',
        'compose.sent': 'Email inviata!',

        'cal.newEvent': 'Nuovo evento',
        'cal.today': 'Oggi',
        'cal.eventsToday': 'eventi oggi',
        'cal.noEventsToday': 'Nessun evento oggi',
        'cal.edit': 'Modifica',
        'cal.delete': 'Elimina',
        'cal.close': 'Chiudi',
        'cal.save': 'Salva modifiche',
        'cal.create': 'Crea evento',
        'cal.title': 'Titolo',
        'cal.description': 'Descrizione',
        'cal.location': 'Luogo',
        'cal.startDate': 'Data inizio',
        'cal.endDate': 'Data fine',
        'cal.startTime': 'Ora inizio',
        'cal.endTime': 'Ora fine',
        'cal.allDay': 'Tutto il giorno',
        'cal.calendar': 'Calendario',
        'cal.created': 'Evento creato!',
        'cal.updated': 'Evento aggiornato!',
        'cal.deleted': 'Evento eliminato.',
        'cal.moreDetails': 'Più dettagli',

        'contacts.newContact': 'Nuovo contatto',
        'contacts.save': 'Salva',
        'contacts.cancel': 'Annulla',
        'contacts.delete': 'Elimina',
        'contacts.firstName': 'Nome',
        'contacts.lastName': 'Cognome',
        'contacts.email': 'Email',
        'contacts.phone': 'Telefono',
        'contacts.noContacts': 'Nessun contatto trovato.',

        'notif.success': 'Successo',
        'notif.error': 'Errore',
        'notif.info': 'Info',

        'settings.title': 'Impostazioni',
        'settings.theme': 'Tema',
        'settings.language': 'Lingua',
        'settings.account': 'Account',
        'settings.save': 'Salva',
    },

    de: {
        'nav.mail': 'Post',
        'nav.calendar': 'Kalender',
        'nav.contacts': 'Kontakte',
        'nav.settings': 'Einstellungen',
        'nav.logout': 'Abmelden',
        'nav.lightMode': 'Hellmodus',
        'nav.darkMode': 'Dunkelmodus',
        'nav.accounts': 'Konten',
        'nav.addAccount': 'Konto hinzufügen',

        'login.title': 'Willkommen bei MailcowClient',
        'login.email': 'E-Mail',
        'login.password': 'Passwort',
        'login.host': 'Serveradresse',
        'login.hostHint': 'auto: ',
        'login.signIn': 'Anmelden',
        'login.mfaCode': 'TOTP / 2FA-Code',
        'login.verify': 'Bestätigen',
        'login.back': '← Zurück',
        'login.mfaHint': 'Falls Ihr Konto 2FA aktiviert hat, geben Sie den 6-stelligen Code aus Ihrer Authentifizierungs-App ein.',

        'mail.folders': 'Ordner',
        'mail.compose': 'Schreiben',
        'mail.noEmailSelected': 'E-Mail auswählen zum Lesen',
        'mail.loadingEmails': 'Wird geladen…',
        'mail.loadingMore': 'Weitere werden geladen…',
        'mail.noMessages': 'Keine Nachrichten in diesem Ordner.',
        'mail.refresh': 'Aktualisieren',
        'mail.reply': 'Antworten',
        'mail.replyAll': 'Allen antworten',
        'mail.forward': 'Weiterleiten',
        'mail.delete': 'Löschen',
        'mail.markRead': 'Als gelesen markieren',
        'mail.markUnread': 'Als ungelesen markieren',
        'mail.moveTo': 'Verschieben nach…',
        'mail.downloadImages': 'Remote-Bilder laden',
        'mail.imagesBlocked': 'Remote-Bilder sind blockiert.',
        'mail.loadImages': 'Bilder laden',
        'mail.conversation': 'Unterhaltung',
        'mail.messages': 'Nachrichten',

        'compose.newMessage': 'Neue Nachricht',
        'compose.to': 'An',
        'compose.cc': 'CC',
        'compose.bcc': 'BCC',
        'compose.subject': 'Betreff',
        'compose.send': '✈ Senden',
        'compose.sending': 'Wird gesendet…',
        'compose.discard': 'Verwerfen',
        'compose.placeholder': 'Schreiben Sie Ihre Nachricht hier…',
        'compose.fullscreen': 'Vollbild',
        'compose.restore': 'Wiederherstellen',
        'compose.errorTo': 'Bitte geben Sie einen Empfänger ein.',
        'compose.errorSubject': 'Bitte geben Sie einen Betreff ein.',
        'compose.sent': 'E-Mail gesendet!',

        'cal.newEvent': 'Neues Ereignis',
        'cal.today': 'Heute',
        'cal.eventsToday': 'Ereignisse heute',
        'cal.noEventsToday': 'Keine Ereignisse heute',
        'cal.edit': 'Bearbeiten',
        'cal.delete': 'Löschen',
        'cal.close': 'Schließen',
        'cal.save': 'Änderungen speichern',
        'cal.create': 'Ereignis erstellen',
        'cal.title': 'Titel',
        'cal.description': 'Beschreibung',
        'cal.location': 'Ort',
        'cal.startDate': 'Startdatum',
        'cal.endDate': 'Enddatum',
        'cal.startTime': 'Startzeit',
        'cal.endTime': 'Endzeit',
        'cal.allDay': 'Ganztägig',
        'cal.calendar': 'Kalender',
        'cal.created': 'Ereignis erstellt!',
        'cal.updated': 'Ereignis aktualisiert!',
        'cal.deleted': 'Ereignis gelöscht.',
        'cal.moreDetails': 'Mehr Details',

        'contacts.newContact': 'Neuer Kontakt',
        'contacts.save': 'Speichern',
        'contacts.cancel': 'Abbrechen',
        'contacts.delete': 'Löschen',
        'contacts.firstName': 'Vorname',
        'contacts.lastName': 'Nachname',
        'contacts.email': 'E-Mail',
        'contacts.phone': 'Telefon',
        'contacts.noContacts': 'Keine Kontakte gefunden.',

        'notif.success': 'Erfolg',
        'notif.error': 'Fehler',
        'notif.info': 'Info',

        'settings.title': 'Einstellungen',
        'settings.theme': 'Design',
        'settings.language': 'Sprache',
        'settings.account': 'Konto',
        'settings.save': 'Speichern',
    },
};

// ── Context ───────────────────────────────────────────────────────────────────

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = (): LanguageContextType => {
    const ctx = useContext(LanguageContext);
    if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider');
    return ctx;
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
    const storedRaw = typeof localStorage !== 'undefined' ? localStorage.getItem('mc_language') : null;
    const stored: Language = (storedRaw === 'it' || storedRaw === 'de') ? storedRaw : 'en';
    const [language, setLanguageState] = useState<Language>(stored);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        if (typeof localStorage !== 'undefined') localStorage.setItem('mc_language', lang);
    };

    const t = (key: string): string => {
        const dict = (translations as Record<string, Record<string, string>>)[language];
        const fallback = (translations as Record<string, Record<string, string>>)['en'];
        return dict?.[key] ?? fallback?.[key] ?? key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export default LanguageProvider;
