import React, { useState, useRef, useCallback, useEffect } from 'react';
import './ComposeEmailComponent.css';
import { useNotification } from '../../contexts/NotificationContext';
import {
    FiMaximize2, FiMinimize2, FiX, FiBold, FiItalic, FiUnderline,
    FiLink, FiList, FiAlignLeft, FiAlignCenter, FiAlignRight,
    FiMinus,
} from 'react-icons/fi';
import { MdFormatListNumbered, MdFormatStrikethrough, MdFormatColorText } from 'react-icons/md';

interface ComposeEmailProps {
    onClose: () => void;
    initialTo?: string;
    initialSubject?: string;
    initialBody?: string;
}

const FONTS = ['Arial', 'Georgia', 'Trebuchet MS', 'Verdana', 'Courier New', 'Times New Roman'];
const SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32'];

const ComposeEmailComponent: React.FC<ComposeEmailProps> = ({
    onClose,
    initialTo = '',
    initialSubject = '',
    initialBody = '',
}) => {
    const { addNotification } = useNotification();
    const [to, setTo] = useState(initialTo);
    const [cc, setCc] = useState('');
    const [bcc, setBcc] = useState('');
    const [subject, setSubject] = useState(initialSubject);
    const [sending, setSending] = useState(false);
    const [showCc, setShowCc] = useState(false);
    const [showBcc, setShowBcc] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [font, setFont] = useState('Arial');
    const [fontSize, setFontSize] = useState('14');
    const editorRef = useRef<HTMLDivElement>(null);

    // Initialize editor content
    useEffect(() => {
        if (editorRef.current && initialBody) {
            editorRef.current.innerHTML = initialBody.replace(/\n/g, '<br>');
        }
        if (editorRef.current) {
            editorRef.current.style.fontFamily = font;
            editorRef.current.style.fontSize = fontSize + 'px';
        }
    }, []);

    const exec = useCallback((command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    }, []);

    const handleFontChange = (newFont: string) => {
        setFont(newFont);
        exec('fontName', newFont);
    };

    const handleFontSizeChange = (newSize: string) => {
        setFontSize(newSize);
        // execCommand fontSize uses 1-7, so we use inline style via fontName trick
        exec('fontSize', '3');
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const fontElements = editorRef.current?.querySelectorAll('font[size="3"]');
            fontElements?.forEach((el) => {
                (el as HTMLElement).style.fontSize = newSize + 'px';
                el.removeAttribute('size');
            });
        }
    };

    const handleInsertLink = () => {
        const url = prompt('Enter URL:', 'https://');
        if (url) exec('createLink', url);
    };

    const handleColorText = () => {
        const color = prompt('Enter color (hex or name):', '#000000');
        if (color) exec('foreColor', color);
    };

    const getHtmlContent = () => editorRef.current?.innerHTML ?? '';

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
            const bodyHtml = getHtmlContent();
            const result = await window.electron.smtpSendEmail({
                to,
                cc: cc || undefined,
                bcc: bcc || undefined,
                subject,
                body: bodyHtml,
                isHtml: true,
            });
            if (result.success) {
                addNotification('Mail', 'Email sent!', 'success');
                onClose();
            } else {
                addNotification('Mail', `Send failed: ${result.error}`, 'error');
            }
        } catch (e: any) {
            addNotification('Mail', `Error: ${e.message}`, 'error');
        }
        setSending(false);
    };

    const modalClass = `compose-modal${fullscreen ? ' compose-modal--fullscreen' : ''}`;
    const overlayClass = `compose-overlay${fullscreen ? ' compose-overlay--fullscreen' : ''}`;

    return (
        <div className={overlayClass}>
            <div className={modalClass}>
                {/* ── Header ────────────────────────────────────────── */}
                <div className="compose-header">
                    <span className="compose-header-title">
                        {initialTo ? '↩ Reply' : 'New Message'}
                    </span>
                    <div className="compose-header-actions">
                        <button
                            className="compose-icon-btn"
                            onClick={() => setFullscreen(!fullscreen)}
                            title={fullscreen ? 'Restore' : 'Fullscreen'}
                        >
                            {fullscreen ? <FiMinimize2 size={14} /> : <FiMaximize2 size={14} />}
                        </button>
                        <button className="compose-icon-btn" onClick={onClose} title="Close">
                            <FiX size={14} />
                        </button>
                    </div>
                </div>

                {/* ── Recipients ────────────────────────────────────── */}
                <div className="compose-fields">
                    <div className="compose-field">
                        <label>To</label>
                        <div className="compose-to-row">
                            <input
                                type="text"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                placeholder="recipient@example.com"
                            />
                            <div className="compose-extra-btns">
                                <button type="button" onClick={() => setShowCc(!showCc)}>CC</button>
                                <button type="button" onClick={() => setShowBcc(!showBcc)}>BCC</button>
                            </div>
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
                    {showBcc && (
                        <div className="compose-field">
                            <label>BCC</label>
                            <input
                                type="text"
                                value={bcc}
                                onChange={(e) => setBcc(e.target.value)}
                                placeholder="bcc@example.com"
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
                </div>

                {/* ── Formatting toolbar ────────────────────────────── */}
                <div className="compose-toolbar">
                    <select
                        className="compose-toolbar-select"
                        value={font}
                        onChange={(e) => handleFontChange(e.target.value)}
                        title="Font family"
                    >
                        {FONTS.map((f) => (
                            <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                        ))}
                    </select>

                    <select
                        className="compose-toolbar-select compose-toolbar-size"
                        value={fontSize}
                        onChange={(e) => handleFontSizeChange(e.target.value)}
                        title="Font size"
                    >
                        {SIZES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <div className="compose-toolbar-divider" />

                    <button type="button" title="Bold" className="compose-toolbar-btn" onClick={() => exec('bold')}>
                        <FiBold size={13} />
                    </button>
                    <button type="button" title="Italic" className="compose-toolbar-btn" onClick={() => exec('italic')}>
                        <FiItalic size={13} />
                    </button>
                    <button type="button" title="Underline" className="compose-toolbar-btn" onClick={() => exec('underline')}>
                        <FiUnderline size={13} />
                    </button>
                    <button type="button" title="Strikethrough" className="compose-toolbar-btn" onClick={() => exec('strikeThrough')}>
                        <MdFormatStrikethrough size={14} />
                    </button>

                    <div className="compose-toolbar-divider" />

                    <button type="button" title="Text color" className="compose-toolbar-btn" onClick={handleColorText}>
                        <MdFormatColorText size={14} />
                    </button>
                    <button type="button" title="Insert link" className="compose-toolbar-btn" onClick={handleInsertLink}>
                        <FiLink size={13} />
                    </button>

                    <div className="compose-toolbar-divider" />

                    <button type="button" title="Align left" className="compose-toolbar-btn" onClick={() => exec('justifyLeft')}>
                        <FiAlignLeft size={13} />
                    </button>
                    <button type="button" title="Align center" className="compose-toolbar-btn" onClick={() => exec('justifyCenter')}>
                        <FiAlignCenter size={13} />
                    </button>
                    <button type="button" title="Align right" className="compose-toolbar-btn" onClick={() => exec('justifyRight')}>
                        <FiAlignRight size={13} />
                    </button>

                    <div className="compose-toolbar-divider" />

                    <button type="button" title="Unordered list" className="compose-toolbar-btn" onClick={() => exec('insertUnorderedList')}>
                        <FiList size={13} />
                    </button>
                    <button type="button" title="Ordered list" className="compose-toolbar-btn" onClick={() => exec('insertOrderedList')}>
                        <MdFormatListNumbered size={14} />
                    </button>

                    <div className="compose-toolbar-divider" />

                    <button type="button" title="Horizontal rule" className="compose-toolbar-btn" onClick={() => exec('insertHorizontalRule')}>
                        <FiMinus size={13} />
                    </button>
                </div>

                {/* ── Rich text body ────────────────────────────────── */}
                <div className="compose-body">
                    <div
                        ref={editorRef}
                        className="compose-editor"
                        contentEditable
                        suppressContentEditableWarning
                        data-placeholder="Write your message here…"
                        style={{ fontFamily: font, fontSize: fontSize + 'px' }}
                    />
                </div>

                {/* ── Footer ────────────────────────────────────────── */}
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
