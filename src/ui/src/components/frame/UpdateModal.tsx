import React from 'react';
import './UpdateModal.css';

interface UpdateModalProps {
    currentVersion: string;
    latestVersion: string;
    releaseName: string;
    releaseNotes: string;
    releaseUrl: string;
    onDismiss: () => void;
}

const UpdateModal: React.FC<UpdateModalProps> = ({
    currentVersion,
    latestVersion,
    releaseName,
    releaseNotes,
    releaseUrl,
    onDismiss,
}) => {
    const handleOpenRelease = () => {
        // Use the shell module via the browser's default handler
        // (window.open works in Electron renderer with target="_blank")
        window.open(releaseUrl, '_blank');
    };

    return (
        <div className="update-overlay" onClick={onDismiss}>
            <div className="update-modal" onClick={(e) => e.stopPropagation()}>
                <div className="update-modal-header">
                    <span className="update-modal-icon">🆕</span>
                    <h2 className="update-modal-title">Update Available</h2>
                </div>

                <div className="update-modal-body">
                    <div className="update-version-row">
                        <span className="update-version-label">Current</span>
                        <span className="update-version-badge update-version-current">v{currentVersion}</span>
                    </div>
                    <div className="update-version-row">
                        <span className="update-version-label">Latest</span>
                        <span className="update-version-badge update-version-latest">v{latestVersion}</span>
                    </div>

                    {releaseName && (
                        <p className="update-release-name">{releaseName}</p>
                    )}

                    {releaseNotes && (
                        <div className="update-notes">
                            <h4 className="update-notes-title">What's new</h4>
                            <pre className="update-notes-body">{releaseNotes}</pre>
                        </div>
                    )}
                </div>

                <div className="update-modal-footer">
                    <button className="update-btn-primary" onClick={handleOpenRelease}>
                        ⬇ Download Update
                    </button>
                    <button className="update-btn-secondary" onClick={onDismiss}>
                        Later
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateModal;
