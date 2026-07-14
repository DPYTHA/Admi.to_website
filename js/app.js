// js/app.js - Version avec arrêt d'urgence

// ============================================================
// State
// ============================================================
const state = {
    currentUser: null,
    offers: [],
    filteredOffers: [],
    currentFilter: 'all',
    searchQuery: '',
    wallet: [],
    subscription: null,
    isLoading: false,
    isInitialized: false,
    loadAttempts: 0,
    isStopped: false, // ⛔ Arrêt d'urgence
};

// ============================================================
// DOM Elements
// ============================================================
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {
    navLinks: $('#navLinks'),
    menuToggle: $('#menuToggle'),
    authButtons: $('#authButtons'),
    userMenu: $('#userMenu'),
    userAvatar: $('#userAvatar'),
    userInitials: $('#userInitials'),
    userName: $('#userName'),
    userEmail: $('#userEmail'),
    loginBtn: $('#loginBtn'),
    registerBtn: $('#registerBtn'),
    logoutBtn: $('#logoutBtn'),
    loginModal: $('#loginModal'),
    registerModal: $('#registerModal'),
    offerModal: $('#offerModal'),
    walletModal: $('#walletModal'),
    loginForm: $('#loginForm'),
    registerForm: $('#registerForm'),
    loginEmail: $('#loginEmail'),
    loginPassword: $('#loginPassword'),
    registerName: $('#registerName'),
    registerEmail: $('#registerEmail'),
    registerPassword: $('#registerPassword'),
    totalOffers: $('#totalOffers'),
    totalUsers: $('#totalUsers'),
    categoriesGrid: $('#categoriesGrid'),
    offersGrid: $('#offersGrid'),
    offersActions: $('#offersActions'),
    loadMoreBtn: $('#loadMoreBtn'),
    searchOffers: $('#searchOffers'),
    filterButtons: $$('.filter-btn'),
    subscribeBtn: $('#subscribeBtn'),
    toast: $('#toast'),
    toastMessage: $('#toast .toast-message'),
    toastIcon: $('#toast .toast-icon'),
    walletModalBody: $('#walletModalBody'),
    offerModalTitle: $('#offerModalTitle'),
    offerModalBody: $('#offerModalBody'),
    userDropdown: $('#userDropdown'),
};

// ============================================================
// Toast
// ============================================================
let toastTimeout;

function showToast(message, type = 'success') {
    if (!elements.toast) return;

    clearTimeout(toastTimeout);
    elements.toast.classList.remove('active', 'success', 'error');

    elements.toastIcon.textContent = type === 'success' ? '✅' : '❌';
    elements.toastMessage.textContent = message;
    elements.toast.classList.add(type, 'active');

    toastTimeout = setTimeout(() => {
        elements.toast.classList.remove('active');
    }, 4000);
}

// Exposer pour components.js
window.showToast = showToast;
window.WalletAPI = WalletAPI;
window.loadWallet = loadWallet;
window.renderWallet = renderWallet;

// ============================================================
// Auth
// ============================================================
async function checkAuth() {
    if (state.isStopped) return false;

    const token = getAuthToken();
    if (token) {
        try {
            const user = await AuthAPI.me();
            state.currentUser = user;

            // ✅ FORCER LE PREMIUM POUR ADMIN
            if (user && user.email === 'admin@admi.to') {
                user.is_premium = true;
                console.log('👑 Admin forcé en premium');
            }

            // ✅ SI LE BACKEND NE RENVOIE PAS is_premium, LE FORCER
            if (user && user.is_premium === undefined) {
                user.is_premium = true;
                console.log('⚠️ is_premium non défini, forcé à true');
            }

            updateUIForAuth(true);
            checkPremiumStatus();
            return true;
        } catch (error) {
            console.error('❌ Erreur checkAuth:', error);
            setAuthToken(null);
            updateUIForAuth(false);
            checkPremiumStatus();
            return false;
        }
    }
    updateUIForAuth(false);
    checkPremiumStatus();
    return false;
}


function updateUIForAuth(isAuthenticated) {
    if (isAuthenticated && state.currentUser) {
        if (elements.authButtons) elements.authButtons.style.display = 'none';
        if (elements.userMenu) elements.userMenu.style.display = 'block';
        const initials = state.currentUser.full_name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
        if (elements.userInitials) elements.userInitials.textContent = initials;
        if (elements.userName) elements.userName.textContent = state.currentUser.full_name;
        if (elements.userEmail) elements.userEmail.textContent = state.currentUser.email;
    } else {
        if (elements.authButtons) elements.authButtons.style.display = 'flex';
        if (elements.userMenu) elements.userMenu.style.display = 'none';
    }
}

// ============================================================
// Modals
// ============================================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modal.id);
        }
    });
});

// Close modal with close button
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        closeModal(btn.dataset.modal);
    });
});

// ============================================================
// Login / Register
// ============================================================
if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', () => openModal('loginModal'));
}
if (elements.registerBtn) {
    elements.registerBtn.addEventListener('click', () => openModal('registerModal'));
}

const switchToRegister = document.getElementById('switchToRegister');
if (switchToRegister) {
    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('loginModal');
        openModal('registerModal');
    });
}

const switchToLogin = document.getElementById('switchToLogin');
if (switchToLogin) {
    switchToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal('registerModal');
        openModal('loginModal');
    });
}

if (elements.loginForm) {
    elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = elements.loginEmail.value;
        const password = elements.loginPassword.value;

        try {
            const data = await AuthAPI.login({ email, password });
            setAuthToken(data.token);
            state.currentUser = data.user;
            updateUIForAuth(true);
            closeModal('loginModal');
            elements.loginForm.reset();
            showToast('Connexion réussie !', 'success');
            await loadOffers();
            await loadWallet();
        } catch (error) {
            showToast(error.data?.error || 'Erreur de connexion', 'error');
        }
    });
}

if (elements.registerForm) {
    elements.registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const full_name = elements.registerName.value;
        const email = elements.registerEmail.value;
        const password = elements.registerPassword.value;

        try {
            const data = await AuthAPI.register({ full_name, email, password });
            setAuthToken(data.token);
            state.currentUser = data.user;
            updateUIForAuth(true);
            closeModal('registerModal');
            elements.registerForm.reset();
            showToast('Inscription réussie !', 'success');
            await loadOffers();
            await loadWallet();
        } catch (error) {
            showToast(error.data?.error || 'Erreur d\'inscription', 'error');
        }
    });
}

if (elements.logoutBtn) {
    elements.logoutBtn.addEventListener('click', () => {
        setAuthToken(null);
        state.currentUser = null;
        state.wallet = [];
        updateUIForAuth(false);
        if (elements.userDropdown) elements.userDropdown.classList.remove('active');
        showToast('Déconnecté', 'success');
        loadOffers();
    });
}

// ============================================================
// User Dropdown
// ============================================================
if (elements.userAvatar) {
    elements.userAvatar.addEventListener('click', () => {
        if (elements.userDropdown) elements.userDropdown.classList.toggle('active');
    });
}

// Close dropdown on outside click
document.addEventListener('click', (e) => {
    if (elements.userDropdown && elements.userAvatar &&
        !elements.userAvatar.contains(e.target) &&
        !elements.userDropdown.contains(e.target)) {
        elements.userDropdown.classList.remove('active');
    }
});

// Dropdown navigation
const profileBtn = document.getElementById('profileBtn');
if (profileBtn) {
    profileBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (elements.userDropdown) elements.userDropdown.classList.remove('active');
        showToast('Profil - Fonctionnalité à venir', 'success');
    });
}

const subscriptionDropdownBtn = document.getElementById('subscriptionDropdownBtn');
if (subscriptionDropdownBtn) {
    subscriptionDropdownBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (elements.userDropdown) elements.userDropdown.classList.remove('active');
        const subscriptionSection = document.getElementById('subscription');
        if (subscriptionSection) subscriptionSection.scrollIntoView({ behavior: 'smooth' });
    });
}

const walletDropdownBtn = document.getElementById('walletDropdownBtn');
if (walletDropdownBtn) {
    walletDropdownBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (elements.userDropdown) elements.userDropdown.classList.remove('active');
        openWallet();
    });
}

// ============================================================
// Mobile Menu
// ============================================================
if (elements.menuToggle) {
    elements.menuToggle.addEventListener('click', () => {
        if (elements.navLinks) elements.navLinks.classList.toggle('active');
    });
}

// Close mobile menu on link click
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
        if (elements.navLinks) elements.navLinks.classList.remove('active');
    });
});

// Wallet nav link
const walletNavLink = document.getElementById('walletNavLink');
if (walletNavLink) {
    walletNavLink.addEventListener('click', (e) => {
        e.preventDefault();
        openWallet();
    });
}

const walletFooterLink = document.getElementById('walletFooterLink');
if (walletFooterLink) {
    walletFooterLink.addEventListener('click', (e) => {
        e.preventDefault();
        openWallet();
    });
}

// ============================================================
// Hero Stats
// ============================================================
async function loadStats() {
    if (state.isStopped) return;

    try {
        const stats = await StatsAPI.getStats();
        if (elements.totalOffers) {
            elements.totalOffers.textContent = stats.total_offers || 0;
        }
        if (elements.totalUsers) {
            elements.totalUsers.textContent = stats.total_users || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ============================================================
// Categories
// ============================================================
if (elements.categoriesGrid) {
    elements.categoriesGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.category-card');
        if (card) {
            const category = card.dataset.category;
            const filterBtn = document.querySelector(`.filter-btn[data-filter="${category}"]`);
            if (filterBtn) {
                filterBtn.click();
            }
            const offersSection = document.getElementById('offres');
            if (offersSection) offersSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
}

// ============================================================
// Offers - VERSION STABILISÉE
// ============================================================
let loadTimeout = null;
let isOffersLoading = false;
let abortController = null;

function stopAllLoading() {
    // ⛔ ARRÊT D'URGENCE
    state.isStopped = true;
    state.isLoading = false;
    isOffersLoading = false;

    if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
    }

    if (abortController) {
        abortController.abort();
        abortController = null;
    }

    console.log('⛔ Chargement arrêté');
}

async function loadOffers() {
    // Si le chargement est arrêté, ne rien faire
    if (state.isStopped) {
        console.log('⛔ Chargement arrêté, ignore');
        return;
    }

    // Éviter les chargements multiples
    if (isOffersLoading || state.isLoading) {
        console.log('⏳ Chargement déjà en cours...');
        return;
    }

    // Limiter les tentatives
    if (state.loadAttempts > 5) {
        console.log('❌ Trop de tentatives, arrêt');
        if (elements.offersGrid) {
            elements.offersGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:40px;">
                    <p style="font-size:48px; margin-bottom:16px;">⚠️</p>
                    <p style="color: var(--danger); font-size:18px;">Le chargement a été arrêté</p>
                    <p style="color: var(--text-light); font-size:14px;">Vérifiez votre connexion et réessayez</p>
                    <button class="btn btn-primary" onclick="resetAndReload()">
                        <i class="fas fa-sync"></i> Réessayer
                    </button>
                </div>
            `;
        }
        return;
    }

    isOffersLoading = true;
    state.isLoading = true;
    state.loadAttempts++;

    console.log(`🔄 Chargement des offres (tentative ${state.loadAttempts})...`);

    try {
        // Afficher le spinner
        if (elements.offersGrid) {
            elements.offersGrid.innerHTML = `
                <div class="loading-spinner">
                    <div class="spinner"></div>
                    <p>Chargement des offres...</p>
                </div>
            `;
        }

        // Créer un AbortController pour annuler la requête
        abortController = new AbortController();
        const signal = abortController.signal;

        const data = await OffersAPI.list();

        if (signal.aborted) {
            console.log('⛔ Requête annulée');
            return;
        }

        state.offers = data || [];
        state.loadAttempts = 0; // Réinitialiser les tentatives
        applyFilters();
        console.log(`✅ ${state.offers.length} offres chargées`);

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('⛔ Requête annulée par l\'utilisateur');
            return;
        }

        console.error('❌ Error loading offers:', error);

        if (state.loadAttempts < 5) {
            // Attendre avant de réessayer
            if (elements.offersGrid) {
                elements.offersGrid.innerHTML = `
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Tentative ${state.loadAttempts}/5...</p>
                    </div>
                `;
            }

            if (loadTimeout) clearTimeout(loadTimeout);
            loadTimeout = setTimeout(() => {
                if (!state.isStopped) {
                    loadOffers();
                }
            }, 2000);
            return;
        }

        // Afficher l'erreur après toutes les tentatives
        if (elements.offersGrid) {
            elements.offersGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:40px;">
                    <p style="font-size:48px; margin-bottom:16px;">❌</p>
                    <p style="color: var(--danger); font-size:18px;">Impossible de charger les offres</p>
                    <p style="color: var(--text-light); font-size:14px; margin-bottom:16px;">
                        ${error.message || 'Vérifiez votre connexion'}
                    </p>
                    <button class="btn btn-primary" onclick="resetAndReload()">
                        <i class="fas fa-sync"></i> Réessayer
                    </button>
                </div>
            `;
        }
        showToast('Erreur de chargement des offres', 'error');

    } finally {
        isOffersLoading = false;
        state.isLoading = false;
        if (loadTimeout) {
            clearTimeout(loadTimeout);
            loadTimeout = null;
        }
        abortController = null;
    }
}

// Fonction pour réinitialiser et recharger
function resetAndReload() {
    console.log('🔄 Réinitialisation...');
    state.isStopped = false;
    state.loadAttempts = 0;
    isOffersLoading = false;
    state.isLoading = false;

    if (loadTimeout) {
        clearTimeout(loadTimeout);
        loadTimeout = null;
    }

    if (abortController) {
        abortController.abort();
        abortController = null;
    }

    // Attendre un peu avant de recharger
    setTimeout(() => {
        loadOffers();
    }, 500);
}

// Exposer la fonction de réinitialisation
window.resetAndReload = resetAndReload;

function applyFilters() {
    if (state.isStopped) return;

    const { offers, currentFilter, searchQuery } = state;

    let filtered = [...offers];

    if (currentFilter !== 'all') {
        filtered = filtered.filter(offer => offer.category === currentFilter);
    }

    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(offer =>
            (offer.title && offer.title.toLowerCase().includes(query)) ||
            (offer.organization && offer.organization.toLowerCase().includes(query)) ||
            (offer.description && offer.description.toLowerCase().includes(query))
        );
    }

    state.filteredOffers = filtered;
    renderOffers(filtered);
}

function renderOffers(offers) {
    if (state.isStopped) return;
    if (!elements.offersGrid) return;

    if (!offers || offers.length === 0) {
        elements.offersGrid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
                <p style="font-size:48px; margin-bottom:16px;">🔍</p>
                <p style="color: var(--text-light); font-size:18px;">Aucune offre trouvée</p>
                <p style="color: var(--text-light); font-size:14px;">Essayez de modifier vos filtres</p>
            </div>
        `;
        if (elements.offersActions) elements.offersActions.style.display = 'none';
        return;
    }

    // Mettre à jour les walletIds
    const walletIds = state.wallet.map(w => w.offer ? w.offer.id : null).filter(id => id !== null);
    setWalletIds(walletIds);

    elements.offersGrid.innerHTML = offers.map(offer => renderOfferCard(offer)).join('');
    if (elements.offersActions) elements.offersActions.style.display = 'flex';

    // Event listeners for offer cards
    document.querySelectorAll('.offer-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-icon')) return;
            const id = parseInt(card.dataset.id);
            if (id) openOfferDetail(id);
        });
    });
}

// ============================================================
// Offer Detail
// ============================================================
async function openOfferDetail(offerId) {
    if (state.isStopped || !offerId) return;

    try {
        const offer = await OffersAPI.get(offerId);
        if (elements.offerModalTitle) elements.offerModalTitle.textContent = offer.title;
        if (elements.offerModalBody) elements.offerModalBody.innerHTML = renderOfferDetail(offer);
        openModal('offerModal');
    } catch (error) {
        showToast('Erreur lors du chargement de l\'offre', 'error');
    }
}

// ============================================================
// Wallet
// ============================================================
async function loadWallet() {
    if (state.isStopped) return;
    if (!state.currentUser) {
        state.wallet = [];
        return;
    }

    try {
        const wallet = await WalletAPI.list();
        state.wallet = wallet || [];
        window.walletState = state.wallet;
        const walletIds = state.wallet.map(w => w.offer ? w.offer.id : null).filter(id => id !== null);
        setWalletIds(walletIds);
    } catch (error) {
        state.wallet = [];
        if (error.status !== 402) {
            console.error('Error loading wallet:', error);
        }
    }
}

async function openWallet() {
    if (state.isStopped) return;

    if (!state.currentUser) {
        showToast('Connectez-vous pour voir votre portefeuille', 'error');
        openModal('loginModal');
        return;
    }

    await loadWallet();
    renderWallet(state.wallet);
    openModal('walletModal');
}

function renderWallet(wallet) {
    if (state.isStopped) return;
    if (!elements.walletModalBody) return;

    if (!wallet || wallet.length === 0) {
        elements.walletModalBody.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <p style="font-size: 48px; margin-bottom: 16px;">📭</p>
                <p style="color: var(--text-light); font-size: 18px;">Votre portefeuille est vide</p>
                <p style="color: var(--text-light); font-size: 14px;">Sauvegardez des offres pour les retrouver ici</p>
            </div>
        `;
        return;
    }

    elements.walletModalBody.innerHTML = `
        <div style="padding: 24px;">
            ${wallet.map(item => renderWalletItem(item)).join('')}
        </div>
    `;
}

// ============================================================
// Save Offer (toggle)
// ============================================================
async function toggleSaveOffer(offerId) {
    if (state.isStopped) return;

    if (!state.currentUser) {
        showToast('Connectez-vous pour sauvegarder des offres', 'error');
        openModal('loginModal');
        return;
    }

    try {
        const isSaved = state.wallet.some(w => w.offer && w.offer.id === offerId);

        if (isSaved) {
            const walletItem = state.wallet.find(w => w.offer && w.offer.id === offerId);
            if (walletItem) {
                await WalletAPI.remove(walletItem.id);
                state.wallet = state.wallet.filter(w => w.id !== walletItem.id);
                setWalletIds(state.wallet.map(w => w.offer ? w.offer.id : null).filter(id => id !== null));
                showToast('Offre retirée du portefeuille', 'success');
            }
        } else {
            await WalletAPI.add(offerId);
            await loadWallet();
            showToast('Offre ajoutée au portefeuille !', 'success');
        }

        // Mettre à jour les icônes
        document.querySelectorAll(`.offer-card[data-id="${offerId}"] .btn-icon i`).forEach(icon => {
            const isNowSaved = state.wallet.some(w => w.offer && w.offer.id === offerId);
            icon.className = isNowSaved ? 'fas fa-bookmark' : 'far fa-bookmark';
        });

    } catch (error) {
        showToast(error.data?.error || 'Erreur', 'error');
    }
}

// Exposer pour les boutons onclick
window.toggleSaveOffer = toggleSaveOffer;

// ============================================================
// Filters
// ============================================================
if (elements.filterButtons) {
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (state.isStopped) return;
            elements.filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.currentFilter = btn.dataset.filter;
            applyFilters();
        });
    });
}

if (elements.searchOffers) {
    elements.searchOffers.addEventListener('input', (e) => {
        if (state.isStopped) return;
        state.searchQuery = e.target.value;
        applyFilters();
    });
}

// ============================================================
// Subscription
// ============================================================
if (elements.subscribeBtn) {
    elements.subscribeBtn.addEventListener('click', async () => {
        if (state.isStopped) return;

        if (!state.currentUser) {
            showToast('Connectez-vous pour vous abonner', 'error');
            openModal('loginModal');
            return;
        }

        try {
            const sub = await SubscriptionAPI.get();
            if (sub.is_active) {
                showToast('Vous êtes déjà abonné !', 'success');
                return;
            }

            const payment = await SubscriptionAPI.payWithGeniusPay();
            if (payment.checkout_url) {
                window.open(payment.checkout_url, '_blank');
                showToast('Redirection vers la page de paiement...', 'success');

                let attempts = 0;
                const maxAttempts = 10;
                const interval = setInterval(async () => {
                    attempts++;
                    try {
                        const confirm = await SubscriptionAPI.confirmGeniusPay();
                        if (confirm.subscription && confirm.subscription.is_active) {
                            clearInterval(interval);
                            state.subscription = confirm.subscription;
                            showToast('🎉 Abonnement activé avec succès !', 'success');
                            await loadOffers();
                        }
                    } catch (e) {
                        if (attempts >= maxAttempts) {
                            clearInterval(interval);
                            showToast('Le paiement semble prendre du temps... Vérifiez plus tard', 'error');
                        }
                    }
                }, 3000);
            }
        } catch (error) {
            showToast(error.data?.error || 'Erreur lors du paiement', 'error');
        }
    });
}

// ============================================================
// Newsletter
// ============================================================
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input');
        if (input) {
            showToast(`Merci de vous être abonné ! 📧`, 'success');
            input.value = '';
        }
    });
}

// ============================================================
// Init
// ============================================================
let isInitializing = false;

async function init() {
    if (isInitializing) return;
    isInitializing = true;

    try {
        await checkAuth();
        await loadStats();
        await loadOffers();
        await loadWallet();
        state.isInitialized = true;
        console.log('✅ Application initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
        isInitializing = false;
    }
}

// Handle scroll for header
window.addEventListener('scroll', () => {
    const header = document.getElementById('header');
    if (header) {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }
});

// js/app.js - Ajouter la gestion premium

// ============================================================
// Premium Management
// ============================================================
let isPremium = false;

function checkPremiumStatus() {
    // Vérifier si l'utilisateur a un abonnement actif
    if (state.currentUser && state.currentUser.is_premium) {
        isPremium = true;
        showPremiumContent();
    } else {
        isPremium = false;
        showLockedContent();
    }
}

function showPremiumContent() {
    const lock = document.getElementById('premiumLock');
    const content = document.getElementById('offersContent');

    if (lock) lock.style.display = 'none';
    if (content) {
        content.style.display = 'block';
        content.classList.add('active');
    }
    // Mettre à jour le tag
    const tag = document.querySelector('.premium-tag');
    if (tag) {
        tag.textContent = '🌟 Premium';
        tag.style.background = '#4A7C59';
        tag.style.color = 'white';
    }
}

function showLockedContent() {
    const lock = document.getElementById('premiumLock');
    const content = document.getElementById('offersContent');

    if (lock) lock.style.display = 'flex';
    if (content) {
        content.style.display = 'none';
        content.classList.remove('active');
    }
    // Mettre à jour le tag
    const tag = document.querySelector('.premium-tag');
    if (tag) {
        tag.textContent = '🔒 Premium';
        tag.style.background = '#f0c040';
        tag.style.color = '#7a5a00';
    }
}

// ============================================================
// Mise à jour de l'init
// ============================================================
async function init() {
    if (isInitializing) return;
    isInitializing = true;

    try {
        await checkAuth();
        await loadStats();

        // Vérifier le statut premium
        checkPremiumStatus();

        // Si premium, charger les offres
        if (isPremium) {
            await loadOffers();
        } else {
            // Afficher un message dans la grille
            if (elements.offersGrid) {
                elements.offersGrid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:40px;">
                        <p style="font-size:48px; margin-bottom:16px;">🔒</p>
                        <p style="color: var(--text-light); font-size:18px;">Abonne-toi pour voir les offres</p>
                    </div>
                `;
            }
        }

        await loadWallet();
        state.isInitialized = true;
        console.log('✅ Application initialisée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
    } finally {
        isInitializing = false;
    }
}

// ============================================================
// Mise à jour après paiement
// ============================================================
async function refreshAfterPayment() {
    // Recharger l'utilisateur
    if (state.currentUser) {
        try {
            const user = await AuthAPI.me();
            state.currentUser = user;
            state.currentUser.is_premium = user.is_premium || false;
            checkPremiumStatus();

            if (isPremium) {
                await loadOffers();
                showToast('🎉 Abonnement activé ! Découvre toutes les offres', 'success');
            }
        } catch (error) {
            console.error('Erreur refresh après paiement:', error);
        }
    }
}

// ============================================================
// Mise à jour du bouton d'abonnement
// ============================================================
if (elements.subscribeBtn) {
    elements.subscribeBtn.addEventListener('click', async () => {
        if (state.isStopped) return;

        if (!state.currentUser) {
            showToast('Connectez-vous pour vous abonner', 'error');
            openModal('loginModal');
            return;
        }

        try {
            const sub = await SubscriptionAPI.get();
            if (sub.is_active) {
                showToast('Vous êtes déjà abonné !', 'success');
                return;
            }

            const payment = await SubscriptionAPI.payWithGeniusPay();
            if (payment.checkout_url) {
                window.open(payment.checkout_url, '_blank');
                showToast('Redirection vers la page de paiement...', 'success');

                let attempts = 0;
                const maxAttempts = 10;
                const interval = setInterval(async () => {
                    attempts++;
                    try {
                        const confirm = await SubscriptionAPI.confirmGeniusPay();
                        if (confirm.subscription && confirm.subscription.is_active) {
                            clearInterval(interval);
                            state.subscription = confirm.subscription;
                            // Mettre à jour le statut premium
                            state.currentUser.is_premium = true;
                            checkPremiumStatus();
                            await loadOffers();
                            showToast('🎉 Abonnement activé avec succès !', 'success');
                        }
                    } catch (e) {
                        if (attempts >= maxAttempts) {
                            clearInterval(interval);
                            showToast('Le paiement semble prendre du temps... Vérifiez plus tard', 'error');
                        }
                    }
                }, 3000);
            }
        } catch (error) {
            showToast(error.data?.error || 'Erreur lors du paiement', 'error');
        }
    });
}

// ============================================================
// Exposer refreshAfterPayment pour les boutons
// ============================================================
window.refreshAfterPayment = refreshAfterPayment;

// ============================================================
// Mise à jour de checkAuth
// ============================================================
async function checkAuth() {
    if (state.isStopped) return false;

    const token = getAuthToken();
    if (token) {
        try {
            const user = await AuthAPI.me();
            state.currentUser = user;
            state.currentUser.is_premium = user.is_premium || false;
            updateUIForAuth(true);
            checkPremiumStatus();
            return true;
        } catch (error) {
            setAuthToken(null);
            updateUIForAuth(false);
            checkPremiumStatus();
            return false;
        }
    }
    updateUIForAuth(false);
    checkPremiumStatus();
    return false;
}

// ============================================================
// Mise à jour des modals - Gestion des boutons
// ============================================================
if (elements.loginBtn) {
    elements.loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('loginModal');
    });
}
if (elements.registerBtn) {
    elements.registerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal('registerModal');
    });
}

// Hero explore button
document.getElementById('heroExploreBtn')?.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('offres');
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }
});

// Offres nav link
document.getElementById('offresNavLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.getElementById('offres');
    if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
    }
});

// ⛔ ARRÊT D'URGENCE : stopper tout si le DOM est chargé mais que les offres ne viennent pas
let emergencyTimeout = setTimeout(() => {
    if (state.isLoading && !state.isInitialized) {
        console.log('⛔ ARRÊT D\'URGENCE - Le chargement prend trop de temps');
        stopAllLoading();
        if (elements.offersGrid) {
            elements.offersGrid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:40px;">
                    <p style="font-size:48px; margin-bottom:16px;">⏰</p>
                    <p style="color: var(--danger); font-size:18px;">Le chargement a pris trop de temps</p>
                    <p style="color: var(--text-light); font-size:14px; margin-bottom:16px;">
                        Vérifiez votre connexion ou réessayez
                    </p>
                    <button class="btn btn-primary" onclick="resetAndReload()">
                        <i class="fas fa-sync"></i> Réessayer
                    </button>
                </div>
            `;
        }
    }
}, 15000); // 15 secondes max

// Démarrer l'application quand le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Annuler le timeout d'urgence une fois que le DOM est chargé
        clearTimeout(emergencyTimeout);
        init();
    });
} else {
    // DOM déjà chargé
    clearTimeout(emergencyTimeout);
    init();
}

// Exposer loadOffers pour le bouton de réessai
window.loadOffers = loadOffers;
window.stopAllLoading = stopAllLoading;

console.log('🚀 Application démarrée');
console.log('⚠️ Si le chargement bloque, utilisez stopAllLoading() dans la console');