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

// Local state
let products = [];
let recentActivities = [];

const pageTitles = {
    'dashboard': 'Dashboard',
    'add-products': 'Add Products',
    'manage-products': 'Manage Products',
};

// ==================== NAVIGATION ====================

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

// ==================== HELPERS ====================

function getStockStatus(stock) {
    if (stock <= 0) return 'Out of Stock';
    if (stock <= 10) return 'Low Stock';
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

// ==================== DASHBOARD ====================

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

// ==================== REAL-TIME LISTENER ====================

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

            // Start real-time listener for products only for admins
            listenToProducts();
        } catch (error) {
            console.error("Error checking admin claim:", error);
            alert("Unable to verify admin access right now. Please try again.");
            window.location.href = "../index.html";
        }
    });
});
