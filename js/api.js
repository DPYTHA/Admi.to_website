// js/api.js - Version classique sans modules

const API_BASE_URL = 'https://admitobackend-production.up.railway.app/api';

// Token management
let authToken = localStorage.getItem('admito_token');
let adminToken = localStorage.getItem('admito_admin_token');

function setAuthToken(token) {
    authToken = token;
    if (token) {
        localStorage.setItem('admito_token', token);
    } else {
        localStorage.removeItem('admito_token');
    }
}

function getAuthToken() {
    return authToken;
}

function setAdminToken(token) {
    adminToken = token;
    if (token) {
        localStorage.setItem('admito_admin_token', token);
    } else {
        localStorage.removeItem('admito_admin_token');
    }
}

function getAdminToken() {
    return adminToken;
}

// Base API request function
async function request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const config = {
        ...options,
        headers,
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw { status: response.status, data };
        }

        return data;
    } catch (error) {
        if (error.status === 401) {
            // Token expired, redirect to login
            setAuthToken(null);
            window.location.reload();
        }
        throw error;
    }
}

// Auth API
const AuthAPI = {
    register: (data) => request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    login: (data) => request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    me: () => request('/auth/me'),
};

// Offers API
const OffersAPI = {
    list: (category = null) => {
        const params = category ? `?category=${category}` : '';
        return request(`/offers${params}`);
    },
    get: (id) => request(`/offers/${id}`),
};

// Wallet API
const WalletAPI = {
    list: () => request('/wallet'),
    add: (offerId) => request('/wallet', {
        method: 'POST',
        body: JSON.stringify({ offer_id: offerId }),
    }),
    update: (id, data) => request(`/wallet/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    }),
    remove: (id) => request(`/wallet/${id}`, {
        method: 'DELETE',
    }),
};

// Subscription API
const SubscriptionAPI = {
    get: () => request('/subscription'),
    payWithGeniusPay: () => request('/subscription/pay/genius-pay', {
        method: 'POST',
        body: JSON.stringify({ currency: 'EUR' }),
    }),
    confirmGeniusPay: () => request('/subscription/confirm/genius-pay', {
        method: 'POST',
    }),
    payWithPaypal: () => request('/subscription/pay/paypal', {
        method: 'POST',
        body: JSON.stringify({ currency: 'EUR' }),
    }),
    confirmPaypal: () => request('/subscription/confirm/paypal', {
        method: 'POST',
    }),
};

// Admin API
const AdminAPI = {
    login: (data) => {
        const url = `${API_BASE_URL}/admin/login`;
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }).then(res => res.json());
    },
    listOffers: () => {
        const url = `${API_BASE_URL}/admin/offers`;
        const headers = { 'Content-Type': 'application/json' };
        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }
        return fetch(url, { headers }).then(res => res.json());
    },
    createOffer: (data) => {
        const url = `${API_BASE_URL}/admin/offers`;
        const headers = { 'Content-Type': 'application/json' };
        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }
        return fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        }).then(res => res.json());
    },
    updateOffer: (id, data) => {
        const url = `${API_BASE_URL}/admin/offers/${id}`;
        const headers = { 'Content-Type': 'application/json' };
        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }
        return fetch(url, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(data),
        }).then(res => res.json());
    },
    deleteOffer: (id) => {
        const url = `${API_BASE_URL}/admin/offers/${id}`;
        const headers = { 'Content-Type': 'application/json' };
        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }
        return fetch(url, {
            method: 'DELETE',
            headers,
        }).then(res => res.json());
    },
};

// Stats API
const StatsAPI = {
    getStats: () => {
        const url = `${API_BASE_URL}/admin/stats`;
        const headers = { 'Content-Type': 'application/json' };
        if (adminToken) {
            headers['Authorization'] = `Bearer ${adminToken}`;
        }
        return fetch(url, { headers }).then(res => res.json());
    },
};