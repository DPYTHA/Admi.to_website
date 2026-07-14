// js/components.js - Ajout des vérifications

function renderOfferCard(offer) {
    if (!offer) return '';

    const deadline = offer.deadline ? new Date(offer.deadline) : null;
    const isUrgent = deadline && (deadline - new Date()) < 7 * 24 * 60 * 60 * 1000;

    const categoryLabels = {
        bourse: '🎓 Bourse',
        admission: '📚 Admission',
        travail: '💼 Travail',
    };

    return `
        <div class="offer-card" data-id="${offer.id || ''}">
            <span class="offer-badge ${offer.category || ''}">${categoryLabels[offer.category] || offer.category || 'Offre'}</span>
            <h3>${escapeHtml(offer.title || 'Sans titre')}</h3>
            <p class="offer-organization">🏛️ ${escapeHtml(offer.organization || 'Organisation inconnue')}</p>
            <p class="offer-description">${escapeHtml(offer.description || 'Description non disponible')}</p>
            <div class="offer-footer">
                <span class="offer-deadline ${isUrgent ? 'urgent' : ''}">
                    ${deadline ? `📅 ${deadline.toLocaleDateString('fr-FR')}` : '📅 Date non définie'}
                    ${isUrgent ? ' ⚠️' : ''}
                </span>
                <div class="offer-actions">
                    <button class="btn-icon" title="Sauvegarder" onclick="event.stopPropagation(); toggleSaveOffer(${offer.id || 0})">
                        <i class="${isInWallet(offer.id) ? 'fas' : 'far'} fa-bookmark"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function renderOfferDetail(offer) {
    if (!offer) return '<p>Offre non disponible</p>';

    const categoryLabels = {
        bourse: '🎓 Bourse',
        admission: '📚 Admission',
        travail: '💼 Travail',
    };

    return `
        <div style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                <div>
                    <span style="display: inline-block; padding: 4px 12px; background: var(--cream); border-radius: 12px; font-size: 13px; color: var(--brown-dark);">
                        ${categoryLabels[offer.category] || offer.category || 'Offre'}
                    </span>
                    <h3 style="font-size: 24px; margin-top: 12px;">${escapeHtml(offer.title || 'Sans titre')}</h3>
                    <p style="color: var(--text-light); font-size: 16px;">🏛️ ${escapeHtml(offer.organization || 'Organisation inconnue')}</p>
                </div>
                ${offer.official_link ? `
                    <button class="btn btn-primary" onclick="window.open('${offer.official_link}', '_blank')">
                        <i class="fas fa-external-link-alt"></i> Postuler
                    </button>
                ` : ''}
            </div>

            ${offer.image_url ? `
                <div style="margin: 16px 0; border-radius: var(--radius); overflow: hidden;">
                    <img src="${offer.image_url}" alt="${escapeHtml(offer.title || 'Offre')}" style="width: 100%; max-height: 300px; object-fit: cover;" onerror="this.style.display='none'">
                </div>
            ` : ''}
            
            ${offer.country ? `
                <p style="color: var(--text-light); margin-bottom: 8px;">🌍 ${escapeHtml(offer.country)}</p>
            ` : ''}

            <div style="margin: 16px 0;">
                <h4 style="font-weight: 600; margin-bottom: 8px;">📝 Description</h4>
                <p style="color: var(--text-light); line-height: 1.8;">${escapeHtml(offer.description || 'Aucune description disponible')}</p>
            </div>
            
            ${offer.how_to_apply ? `
                <div style="margin: 16px 0;">
                    <h4 style="font-weight: 600; margin-bottom: 8px;">📋 Comment postuler</h4>
                    <p style="color: var(--text-light); line-height: 1.8; white-space: pre-line;">${escapeHtml(offer.how_to_apply)}</p>
                </div>
            ` : ''}
            
            ${offer.deadline ? `
                <div style="margin: 16px 0; padding: 16px; background: var(--cream); border-radius: var(--radius-sm);">
                    <p style="font-weight: 500;">📅 Date limite</p>
                    <p style="color: var(--text-light);">${new Date(offer.deadline).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
            ` : ''}
        </div>
    `;
}

function renderWalletItem(item) {
    if (!item || !item.offer) return '';

    const offer = item.offer;
    const statusLabels = {
        a_faire: 'À faire',
        en_cours: 'En cours',
        envoye: 'Envoyé',
        accepte: '✅ Accepté',
        refuse: '❌ Refusé',
    };

    return `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 16px; border-bottom: 1px solid rgba(92,58,33,0.06); flex-wrap: wrap; gap: 12px;">
            <div>
                <h4 style="font-weight: 600;">${escapeHtml(offer.title || 'Sans titre')}</h4>
                <p style="color: var(--text-light); font-size: 14px;">🏛️ ${escapeHtml(offer.organization || 'Organisation inconnue')}</p>
                <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; background: var(--cream); margin-top: 4px;">
                    ${statusLabels[item.status] || item.status || 'À faire'}
                </span>
            </div>
            <div style="display: flex; gap: 8px;">
                ${offer.official_link ? `
                    <button class="btn btn-outline" onclick="window.open('${offer.official_link}', '_blank')" style="padding: 6px 12px; font-size: 12px;">
                        <i class="fas fa-external-link-alt"></i>
                    </button>
                ` : ''}
                <button class="btn btn-danger" onclick="removeFromWallet(${item.id || 0})" style="padding: 6px 12px; font-size: 12px; background: var(--danger); color: white; border-radius: var(--radius-sm); border: none; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Helper to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Helper to check if offer is in wallet
let walletIds = [];

function setWalletIds(ids) {
    walletIds = ids || [];
}

function isInWallet(offerId) {
    return walletIds.includes(offerId);
}

// Global functions for onclick handlers
window.removeFromWallet = async function (id) {
    if (!id) return;

    try {
        if (window.WalletAPI && window.WalletAPI.remove) {
            await window.WalletAPI.remove(id);
            if (window.showToast) {
                window.showToast('Offre retirée du portefeuille', 'success');
            }
            if (window.loadWallet) {
                await window.loadWallet();
                if (window.renderWallet) {
                    window.renderWallet(window.walletState || []);
                }
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        if (window.showToast) {
            window.showToast('Erreur lors de la suppression', 'error');
        }
    }
};