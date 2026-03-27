// Firebase imports
import { 
    collection, 
    addDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { onAuthStateChanged, getIdTokenResult } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { auth, db } from "../firebase.js";
const productsRef = collection(db, "products");
const usersRef = collection(db, "users");
const ordersRef = collection(db, "orders");

let products = [];
let users = [];
let orders = [];
let recentActivities = [];

const pageTitles = {
    'dashboard': 'Dashboard',
    'add-products': 'Add Products',
    'manage-products': 'Manage Products',
    'manage-accounts': 'Manage Accounts',
    'manage-orders': 'Manage Orders',
};

window.showSection = function(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.add('hidden');
    });

    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('bg-white/10');
    });
    const activeNav = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
    if (activeNav) activeNav.classList.add('bg-white/10');

    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = pageTitles[sectionId] || 'Admin Panel';

    return false;
};

function getStockStatus(stock) {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= 25) return 'Low Stock';
    return 'In Stock';
}

function getStatusBadge(status) {
    const map = {
        'In Stock':     'bg-green-100 text-green-800',
        'Low Stock':    'bg-yellow-100 text-yellow-800',
        'Out of Stock': 'bg-red-100 text-red-800',
    };
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-800'}">${status}</span>`;
}

function showAddMessage(text, isError = false) {
    const el = document.getElementById('add-product-message');
    if (!el) return;
    el.textContent = text;
    el.className = `mb-4 p-3 rounded-lg text-sm font-medium ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
}

function addActivity(text, icon, color) {
    recentActivities.unshift({
        text,
        icon,
        color,
        time: new Date().toLocaleString()
    });
    if (recentActivities.length > 20) recentActivities.pop();
    renderRecentActivity();
}

function renderRecentActivity() {
    const container = document.getElementById('recent-activity');
    if (!container) return;

    if (recentActivities.length === 0) {
        container.innerHTML = `<p class="text-gray-500 text-sm">No recent activity.</p>`;
        return;
    }

    const colorMap = {
        blue: 'bg-blue-100 text-blue-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        red: 'bg-red-100 text-red-600',
        green: 'bg-green-100 text-green-600',
    };

    container.innerHTML = recentActivities.map(activity => `
        <div class="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
            <div class="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${colorMap[activity.color] || 'bg-gray-100 text-gray-600'}">
                ${activity.icon}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm text-gray-800">${activity.text}</p>
                <p class="text-xs text-gray-400 mt-1">${activity.time}</p>
            </div>
        </div>
    `).join('');
}

function updateDashboardStats() {
    const totalEl = document.getElementById('stat-total-products');
    const revenueEl = document.getElementById('stat-total-revenue');
    const inStockEl = document.getElementById('stat-in-stock');

    if (totalEl) totalEl.textContent = products.length;

    if (revenueEl) {
        const totalRevenue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
        revenueEl.textContent = `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    if (inStockEl) {
        const inStock = products.filter(p => p.stock > 0).length;
        inStockEl.textContent = inStock;
    }
}

// ==================== ADD PRODUCT ====================

window.handleAddProduct = async function(e) {
    e.preventDefault();

    const name = document.getElementById('product-name').value.trim();
    const category = document.getElementById('product-category').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value);
    const description = document.getElementById('product-description').value.trim();
    const image = document.getElementById('product-image').value.trim();
    const dealType = document.getElementById('product-deal-type').value;

    if (!name || !category || isNaN(price) || isNaN(stock)) {
        showAddMessage('Please fill in all required fields.', true);
        return;
    }

    const btn = document.getElementById('add-product-btn');
    btn.disabled = true;
    btn.textContent = 'Adding...';

    try {
        await addDoc(productsRef, {
            name,
            category,
            price,
            stock,
            description,
            image: image || '',
            dealType: dealType || '',
            status: getStockStatus(stock),
            createdAt: serverTimestamp()
        });

        showAddMessage(`Product "${name}" added successfully!`);
        document.getElementById('add-product-form').reset();
        addActivity(`Added new product: ${name}`, '📦', 'green');
    } catch (error) {
        showAddMessage(`Error: ${error.message}`, true);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Product';
    }
};

// ==================== RENDER PRODUCTS TABLE ====================

function renderProducts(list) {
    const tbody = document.getElementById('products-tbody');
    const countEl = document.getElementById('products-count');
    if (!tbody) return;

    if (list.length === 0) {
        const isSearching = document.getElementById('product-search')?.value.trim().length > 0;
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center space-y-2">
                        <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                        <p class="text-gray-500 font-medium">${isSearching ? 'No products match your search.' : 'No products yet.'}</p>
                        ${!isSearching ? '<p class="text-gray-400 text-sm">Go to <strong>Add Products</strong> to add your first product.</p>' : ''}
                    </div>
                </td>
            </tr>`;
        if (countEl) countEl.textContent = isSearching ? 'No products found.' : '0 products';
        return;
    }

    tbody.innerHTML = list.map(p => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-3">
                    ${p.image ? `<img src="${p.image}" class="w-10 h-10 rounded-lg object-cover" onerror="this.style.display='none'">` : '<div class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg">📦</div>'}
                    <span class="text-sm font-medium text-gray-900">${p.name}</span>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${p.category}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">$${p.price.toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.stock}</td>
            <td class="px-6 py-4 whitespace-nowrap">${getStatusBadge(p.status)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                <button onclick="openEditModal('${p.id}')" class="text-blue-600 hover:text-blue-900 transition-colors">Edit</button>
                <button onclick="deleteProduct('${p.id}')" class="text-red-600 hover:text-red-900 transition-colors">Delete</button>
            </td>
        </tr>
    `).join('');

    if (countEl) countEl.textContent = `Showing ${list.length} of ${products.length} products`;
}

// ==================== FILTER ====================

window.filterProducts = function(query) {
    const q = query.trim().toLowerCase();
    const filtered = q
        ? products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.status.toLowerCase().includes(q)
        )
        : products;
    renderProducts(filtered);
};

// ==================== EDIT PRODUCT ====================

window.openEditModal = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('edit-product-id').value = id;
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-category').value = product.category;
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-stock').value = product.stock;
    document.getElementById('edit-product-description').value = product.description || '';
    document.getElementById('edit-product-image').value = product.image || '';
    document.getElementById('edit-product-deal-type').value = product.dealType || '';

    document.getElementById('edit-modal').classList.remove('hidden');
};

window.closeEditModal = function() {
    document.getElementById('edit-modal').classList.add('hidden');
};

window.handleEditProduct = async function(e) {
    e.preventDefault();

    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value.trim();
    const category = document.getElementById('edit-product-category').value;
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const stock = parseInt(document.getElementById('edit-product-stock').value);
    const description = document.getElementById('edit-product-description').value.trim();
    const image = document.getElementById('edit-product-image').value.trim();
    const dealType = document.getElementById('edit-product-deal-type').value;

    if (!name || !category || isNaN(price) || isNaN(stock)) {
        alert('Please fill in all required fields.');
        return;
    }

    try {
        const docRef = doc(db, "products", id);
        await updateDoc(docRef, {
            name,
            category,
            price,
            stock,
            description,
            image: image || '',
            dealType: dealType || '',
            status: getStockStatus(stock)
        });

        closeEditModal();
        addActivity(`Updated product: ${name}`, '✏️', 'blue');
    } catch (error) {
        alert(`Error updating product: ${error.message}`);
    }
};

// ==================== DELETE PRODUCT ====================

window.deleteProduct = async function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
        const docRef = doc(db, "products", id);
        await deleteDoc(docRef);
        addActivity(`Deleted product: ${product.name}`, '🗑️', 'red');
    } catch (error) {
        alert(`Error deleting product: ${error.message}`);
    }
};

// ==================== REAL-TIME LISTENER (PRODUCTS) ====================

function listenToProducts() {
    const q = query(productsRef, orderBy("createdAt", "desc"));
    
    onSnapshot(q, (snapshot) => {
        products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderProducts(products);
        updateDashboardStats();
    }, (error) => {
        console.error("Error listening to products:", error);
        const countEl = document.getElementById('products-count');
        if (countEl) countEl.textContent = `Error loading products: ${error.message}`;
    });
}

// ==================== MANAGE ACCOUNTS ====================

function listenToUsers() {
    const q = query(usersRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        users = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderUsers(users);
        updateAccountStats();
    }, (error) => {
        console.error("Error listening to users:", error);
        const tbody = document.getElementById('users-tbody');
        if (tbody) tbody.innerHTML = `
            <tr><td colspan="5" class="px-6 py-10 text-center text-red-500 text-sm font-medium">
                Error loading accounts: ${error.message}
            </td></tr>`;
    });
}

function updateAccountStats() {
    const totalEl   = document.getElementById('stat-total-users');
    const adminEl   = document.getElementById('stat-total-admins');
    const regularEl = document.getElementById('stat-regular-users');
    if (totalEl)   totalEl.textContent   = users.length;
    if (adminEl)   adminEl.textContent   = users.filter(u => u.isAdmin).length;
    if (regularEl) regularEl.textContent = users.filter(u => !u.isAdmin).length;
}

function getRoleBadge(isAdmin) {
    return isAdmin
        ? `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Admin</span>`
        : `<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">User</span>`;
}

function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getInitials(email) {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
}

function renderUsers(list) {
    const tbody    = document.getElementById('users-tbody');
    const countEl  = document.getElementById('users-count');
    if (!tbody) return;

    if (list.length === 0) {
        const isSearching = document.getElementById('user-search')?.value.trim().length > 0;
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center space-y-2">
                        <svg class="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        <p class="text-gray-500 font-medium">${isSearching ? 'No accounts match your search.' : 'No registered accounts yet.'}</p>
                        ${!isSearching ? '<p class="text-gray-400 text-sm">Accounts appear here once users sign up.</p>' : ''}
                    </div>
                </td>
            </tr>`;
        if (countEl) countEl.textContent = isSearching ? 'No accounts found.' : '0 accounts';
        return;
    }

    tbody.innerHTML = list.map(u => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-3">
                    <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                         style="background-color: var(--ib);">${getInitials(u.email)}</div>
                    <div>
                        <p class="text-sm font-semibold text-gray-900">${u.email || '—'}</p>
                        ${u.displayName ? `<p class="text-xs text-gray-400">${u.displayName}</p>` : ''}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-xs text-gray-400 font-mono" title="${u.id}">${u.id.slice(0, 12)}…</span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">${getRoleBadge(u.isAdmin)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatDate(u.createdAt)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                ${u.isAdmin
                    ? `<button onclick="toggleAdminRole('${u.id}', true)" class="text-yellow-600 hover:text-yellow-900 transition-colors">Remove Admin</button>`
                    : `<button onclick="toggleAdminRole('${u.id}', false)" class="text-blue-600 hover:text-blue-900 transition-colors">Make Admin</button>`
                }
                <button onclick="deleteUserRecord('${u.id}', '${(u.email || '').replace(/'/g, "\\'")}')" class="text-red-600 hover:text-red-900 transition-colors">Delete</button>
            </td>
        </tr>
    `).join('');

    if (countEl) countEl.textContent = `Showing ${list.length} of ${users.length} account${users.length !== 1 ? 's' : ''}`;
}

window.filterUsers = function(query) {
    const q = query.trim().toLowerCase();
    const filtered = q
        ? users.filter(u =>
            (u.email || '').toLowerCase().includes(q) ||
            (u.displayName || '').toLowerCase().includes(q) ||
            (u.isAdmin ? 'admin' : 'user').includes(q)
        )
        : users;
    renderUsers(filtered);
};

window.toggleAdminRole = async function(uid, currentIsAdmin) {
    const user = users.find(u => u.id === uid);
    if (!user) return;

    const action = currentIsAdmin ? 'remove admin role from' : 'grant admin role to';
    if (!confirm(`Are you sure you want to ${action} "${user.email}"?`)) return;

    try {
        const userDocRef = doc(db, "users", uid);
        await updateDoc(userDocRef, { isAdmin: !currentIsAdmin });
        addActivity(
            `${currentIsAdmin ? 'Removed admin from' : 'Granted admin to'}: ${user.email}`,
            currentIsAdmin ? '🔓' : '🛡️',
            currentIsAdmin ? 'yellow' : 'blue'
        );
    } catch (error) {
        alert(`Error updating role: ${error.message}`);
    }
};

window.deleteUserRecord = async function(uid, email) {
    if (!confirm(`Delete account record for "${email}"?\n\nThis removes the Firestore record only. The Firebase Auth account remains active.`)) return;

    try {
        const userDocRef = doc(db, "users", uid);
        await deleteDoc(userDocRef);
        addActivity(`Deleted account record: ${email}`, '🗑️', 'red');
    } catch (error) {
        alert(`Error deleting account record: ${error.message}`);
    }
};

// ==================== MANAGE ORDERS ====================

function listenToOrders() {
    const q = query(ordersRef, orderBy("createdAt", "desc"));

    onSnapshot(q, (snapshot) => {
        orders = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderOrders(orders);
        updateOrderStats();
    }, (error) => {
        console.error("Error listening to orders:", error);
        const tbody = document.getElementById('orders-tbody');
        if (tbody) tbody.innerHTML = `
            <tr><td colspan="8" class="px-6 py-10 text-center text-red-500 text-sm font-medium">
                Error loading orders: ${error.message}
            </td></tr>`;
    });
}

function updateOrderStats() {
    const totalEl      = document.getElementById('stat-total-orders');
    const processingEl = document.getElementById('stat-orders-processing');
    const paidEl       = document.getElementById('stat-orders-paid');
    const deliveredEl  = document.getElementById('stat-orders-delivered');
    if (totalEl)      totalEl.textContent      = orders.length;
    if (processingEl) processingEl.textContent = orders.filter(o => o.status === 'Processing').length;
    if (paidEl)       paidEl.textContent       = orders.filter(o => o.status === 'Paid').length;
    if (deliveredEl)  deliveredEl.textContent  = orders.filter(o => o.status === 'Delivered').length;
}

function getOrderStatusBadge(status) {
    const map = {
        'Processing': 'bg-yellow-100 text-yellow-800',
        'Paid':       'bg-green-100 text-green-800',
        'Delivered':  'bg-blue-100 text-blue-800',
    };
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-800'}">${status || '—'}</span>`;
}

function renderOrders(list) {
    const tbody   = document.getElementById('orders-tbody');
    const countEl = document.getElementById('orders-count');
    if (!tbody) return;

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="px-6 py-16 text-center">
                    <div class="flex flex-col items-center space-y-2">
                        <div class="text-5xl">📋</div>
                        <p class="text-gray-500 font-medium">No orders found.</p>
                    </div>
                </td>
            </tr>`;
        if (countEl) countEl.textContent = '0 orders';
        return;
    }

    tbody.innerHTML = list.map(o => {
        const itemCount = Array.isArray(o.items) ? o.items.length : 0;
        const itemSummary = Array.isArray(o.items)
            ? o.items.slice(0, 2).map(i => `${i.name} ×${i.qty}`).join(', ') + (o.items.length > 2 ? ` +${o.items.length - 2} more` : '')
            : '—';
        const date = o.createdAt?.toDate
            ? o.createdAt.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            : '—';
        const shortId = o.id.slice(0, 8) + '…';

        return `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-4 py-4 whitespace-nowrap">
                <span class="text-xs font-mono text-gray-500" title="${o.id}">${shortId}</span>
            </td>
            <td class="px-4 py-4">
                <p class="text-sm font-semibold text-gray-900">${o.name || '—'}</p>
                <p class="text-xs text-gray-400">${o.userEmail || '—'}</p>
                <p class="text-xs text-gray-400 truncate max-w-[160px]" title="${o.address || ''}">${o.address || '—'}</p>
            </td>
            <td class="px-4 py-4">
                <p class="text-xs text-gray-600 max-w-[160px]">${itemSummary}</p>
                <p class="text-xs text-gray-400 mt-0.5">${itemCount} item${itemCount !== 1 ? 's' : ''}</p>
            </td>
            <td class="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">$${(o.total || 0).toFixed(2)}</td>
            <td class="px-4 py-4 whitespace-nowrap text-xs text-gray-500">${o.paymentMethod || '—'}</td>
            <td class="px-4 py-4 whitespace-nowrap">${getOrderStatusBadge(o.status)}</td>
            <td class="px-4 py-4 whitespace-nowrap text-xs text-gray-500">${date}</td>
            <td class="px-4 py-4 whitespace-nowrap text-sm font-medium">
                <select onchange="updateOrderStatus('${o.id}', this.value)"
                    class="text-xs border-2 border-gray-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer">
                    <option value="" disabled selected>Change status</option>
                    <option value="Processing" ${o.status === 'Processing' ? 'disabled' : ''}>→ Processing</option>
                    <option value="Paid"       ${o.status === 'Paid'       ? 'disabled' : ''}>→ Paid</option>
                    <option value="Delivered"  ${o.status === 'Delivered'  ? 'disabled' : ''}>→ Delivered</option>
                </select>
            </td>
        </tr>`;
    }).join('');

    if (countEl) countEl.textContent = `Showing ${list.length} of ${orders.length} order${orders.length !== 1 ? 's' : ''}`;
}

window.filterOrders = function() {
    const statusFilter = document.getElementById('order-status-filter')?.value || '';
    const searchQ = (document.getElementById('order-search')?.value || '').trim().toLowerCase();

    const filtered = orders.filter(o => {
        const matchStatus = !statusFilter || o.status === statusFilter;
        const matchSearch = !searchQ ||
            (o.name || '').toLowerCase().includes(searchQ) ||
            (o.userEmail || '').toLowerCase().includes(searchQ) ||
            (o.id || '').toLowerCase().includes(searchQ);
        return matchStatus && matchSearch;
    });

    renderOrders(filtered);
};

window.updateOrderStatus = async function(orderId, newStatus) {
    if (!newStatus) return;
    try {
        const orderDocRef = doc(db, "orders", orderId);
        await updateDoc(orderDocRef, { status: newStatus });
        addActivity(`Order ${orderId.slice(0, 8)}… → ${newStatus}`, '📋', newStatus === 'Paid' ? 'green' : newStatus === 'Delivered' ? 'blue' : 'yellow');
    } catch (error) {
        alert(`Error updating order status: ${error.message}`);
    }
};

// ==================== INIT ====================

document.addEventListener('DOMContentLoaded', () => {
    // Set dashboard as active on load
    const dashNav = document.querySelector('.nav-item[data-section="dashboard"]');
    if (dashNav) dashNav.classList.add('bg-white/10');

    // Render initial dashboard content
    renderRecentActivity();
    updateDashboardStats();

    // Gate admin access by Firebase Auth custom claim
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "../login.html";
            return;
        }

        try {
            // First check cached token claims to reduce unnecessary force refreshes.
            let tokenResult = await getIdTokenResult(user);
            let isAdmin = !!tokenResult?.claims?.admin;

            // If claim is missing, force refresh once to pick up recent changes.
            if (!isAdmin) {
                tokenResult = await getIdTokenResult(user, true);
                isAdmin = !!tokenResult?.claims?.admin;
            }

            if (!isAdmin) {
                alert("Access denied. Admins only.");
                window.location.href = "../index.html";
                return;
            }

        // Start real-time listeners for products, users, and orders
            listenToProducts();
            listenToUsers();
            listenToOrders();
        } catch (error) {
            console.error("Error checking admin claim:", error);
            alert("Unable to verify admin access right now. Please try again.");
            window.location.href = "../index.html";
        }
    });
});
