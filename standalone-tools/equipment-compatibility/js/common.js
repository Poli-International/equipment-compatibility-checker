// This script now runs immediately, as the loading process guarantees the DOM and data are ready.

// --- Dark & Light Mode Toggle ---
const darkModeToggle = document.getElementById('dark-mode-toggle');
const body = document.body;

const applyTheme = (isDark) => {
    body.classList.toggle('dark-mode', isDark);
    body.classList.toggle('light-mode', !isDark);
};

// Initialize theme based on saved preference or system setting
const savedMode = localStorage.getItem('compatCheckerTheme');
if (savedMode) {
    applyTheme(savedMode === 'dark');
} else {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark);
}

if(darkModeToggle) {
    darkModeToggle.addEventListener('click', () => {
        const isCurrentlyDark = body.classList.contains('dark-mode');
        applyTheme(!isCurrentlyDark);
        localStorage.setItem('compatCheckerTheme', !isCurrentlyDark ? 'dark' : 'light');
    });
}

// --- Generic Modal Handler ---
function setupModal(triggerId, modalId, closeId, overlayId) {
    const trigger = document.getElementById(triggerId);
    const modal = document.getElementById(modalId);
    if (!trigger || !modal) return;

    const closeBtn = document.getElementById(closeId);
    const overlay = document.getElementById(overlayId);

    const openModal = (e) => {
        if (e) e.preventDefault();
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
    };

    const closeModal = () => {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
    };

    trigger.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', closeModal);
}

// --- Initialize All Modals ---
// Embed Modal
setupModal('embed-button', 'embed-modal', 'modal-close', 'modal-overlay');
// Legal Modals
setupModal('privacy-link', 'privacy-modal', 'privacy-close', 'privacy-overlay');
setupModal('terms-link', 'terms-modal', 'terms-close', 'terms-overlay');


// --- Specific Logic for Embed Modal ---
const embedButton = document.getElementById('embed-button');
const copyEmbedCodeButton = document.getElementById('copy-embed-code');

if (embedButton) {
     embedButton.addEventListener('click', () => {
        const embedUrl = 'https://poliinternational.com/tools/equipment-compatibility/embed.html';
        const iframeCode = `<iframe src="${embedUrl}" style="width: 100%; height: 550px; border: 1px solid #ddd; border-radius: 12px;" title="Equipment Compatibility Checker"></iframe>`;
        document.getElementById('embed-code').textContent = iframeCode.trim();
        document.getElementById('copy-success').style.display = 'none';
        document.getElementById('copy-embed-code').textContent = 'Copy Code';
    });
}

// --- Toast Notification System ---
function showToast(title, message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
        <div class="toast__icon">${icons[type] || icons.info}</div>
        <div class="toast__content">
            <div class="toast__title">${title}</div>
            ${message ? `<p class="toast__message">${message}</p>` : ''}
        </div>
    `;

    container.appendChild(toast);

    // Auto-remove after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Make toast function globally available
window.showToast = showToast;

if (copyEmbedCodeButton) {
    copyEmbedCodeButton.addEventListener('click', () => {
        const embedCodeEl = document.getElementById('embed-code');
        navigator.clipboard.writeText(embedCodeEl.textContent).then(() => {
            showToast('Copied!', 'Embed code copied to clipboard', 'success');
            copyEmbedCodeButton.textContent = 'Copied!';
            setTimeout(() => {
                document.getElementById('embed-modal').style.display = 'none';
                document.body.classList.remove('modal-open');
                copyEmbedCodeButton.textContent = 'Copy Code';
            }, 1500);
        }).catch(err => {
            showToast('Copy Failed', 'Please try again', 'error');
            console.error('Failed to copy text: ', err);
        });
    });
}