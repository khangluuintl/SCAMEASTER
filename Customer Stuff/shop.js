const CART_KEY = 'scameaster_cart';
const WISH_KEY = 'scameaster_wishlist';

// ── State helpers ──────────────────────────────────────────────────────────
function getCart() {
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
}
function saveCart(cart) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

function getWishlist() {
    try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; }
}
function saveWishlist(wish) { localStorage.setItem(WISH_KEY, JSON.stringify(wish)); }

// ── Category emoji helper ──────────────────────────────────────────────────
function getCategoryEmoji(cat) {
    const map = {
        'Living Room': '🛋️', 'Bedroom': '🛏️', 'Kitchen': '🍳',
        'Bathroom': '🚿', 'Outdoor': '🌿', 'Storage': '🗄️',
        'Lighting': '💡', 'Home Decoration': '🖼️',
        'Home Office': '💼', 'Chairs & Stools': '🪑'
    };
    return map[cat] || '📦';
}

// ── Escape helper for inline onclick strings ───────────────────────────────
export function esc(str) {
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ── Cart operations ────────────────────────────────────────────────────────
function addToCart(id, name, price, image, category) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx >= 0) {
        cart[idx].qty += 1;
    } else {
        cart.push({ id, name, price: parseFloat(price), image: image || '', category, qty: 1 });
    }
    saveCart(cart);
    updateBadges();
    renderCartItems();
    openCart();
    showToast('"' + name + '" added to cart 🛒');
}

function removeFromCart(id) {
    saveCart(getCart().filter(i => i.id !== id));
    updateBadges();
    renderCartItems();
}

function updateCartQty(id, delta) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx < 0) return;
    cart[idx].qty = Math.max(1, cart[idx].qty + delta);
    saveCart(cart);
    updateBadges();
    renderCartItems();
}

// ── Wishlist operations ────────────────────────────────────────────────────
function toggleWishlist(id, name, price, image, category) {
    const wish = getWishlist();
    const idx = wish.findIndex(i => i.id === id);
    if (idx >= 0) {
        wish.splice(idx, 1);
        saveWishlist(wish);
        showToast('"' + name + '" removed from wishlist');
    } else {
        wish.push({ id, name, price: parseFloat(price), image: image || '', category });
        saveWishlist(wish);
        showToast('"' + name + '" saved to wishlist ❤️');
    }
    updateBadges();
    updateWishlistButtons();
    renderWishlistItems();
}

function moveToCart(id) {
    const wish = getWishlist();
    const item = wish.find(i => i.id === id);
    if (!item) return;
    // add to cart
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id);
    if (idx >= 0) { cart[idx].qty += 1; } else { cart.push({ ...item, qty: 1 }); }
    saveCart(cart);
    // remove from wishlist
    saveWishlist(wish.filter(i => i.id !== id));
    updateBadges();
    updateWishlistButtons();
    renderWishlistItems();
    renderCartItems();
    showToast('"' + item.name + '" moved to cart 🛒');
}

function removeFromWishlist(id) {
    saveWishlist(getWishlist().filter(i => i.id !== id));
    updateBadges();
    updateWishlistButtons();
    renderWishlistItems();
}

// ── Badge updates ──────────────────────────────────────────────────────────
function updateBadges() {
    const cartCount = getCart().reduce((sum, i) => sum + i.qty, 0);
    const wishCount = getWishlist().length;

    document.querySelectorAll('.cart-badge').forEach(el => {
        el.textContent = cartCount;
        el.style.display = cartCount > 0 ? 'flex' : 'none';
    });
    document.querySelectorAll('.wish-badge').forEach(el => {
        el.textContent = wishCount;
        el.style.display = wishCount > 0 ? 'flex' : 'none';
    });
}

// ── Wishlist button state (filled heart = wishlisted) ──────────────────────
function updateWishlistButtons() {
    const ids = new Set(getWishlist().map(i => i.id));
    document.querySelectorAll('[data-wish-id]').forEach(btn => {
        const id = btn.getAttribute('data-wish-id');
        const path = btn.querySelector('path');
        if (ids.has(id)) {
            btn.classList.add('wishlisted');
            btn.style.color = '#ef4444';
            if (path) { path.setAttribute('fill', '#ef4444'); path.setAttribute('stroke', '#ef4444'); }
        } else {
            btn.classList.remove('wishlisted');
            btn.style.color = '#4b5563';
            if (path) { path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'currentColor'); }
        }
    });
}

// ── Drawer open/close ──────────────────────────────────────────────────────
function openCart() {
    const d = document.getElementById('cart-drawer');
    const o = document.getElementById('shop-overlay');
    if (d) d.classList.remove('translate-x-full');
    if (o) { o.classList.remove('opacity-0', 'pointer-events-none'); }
    renderCartItems();
}
function closeCart() {
    const d = document.getElementById('cart-drawer');
    const o = document.getElementById('shop-overlay');
    if (d) d.classList.add('translate-x-full');
    // only hide overlay if wishlist is also closed
    const w = document.getElementById('wish-drawer');
    if (o && w && w.classList.contains('translate-x-full')) {
        o.classList.add('opacity-0', 'pointer-events-none');
    }
}
function openWishlist() {
    const d = document.getElementById('wish-drawer');
    const o = document.getElementById('shop-overlay');
    if (d) d.classList.remove('translate-x-full');
    if (o) { o.classList.remove('opacity-0', 'pointer-events-none'); }
    renderWishlistItems();
}
function closeWishlist() {
    const d = document.getElementById('wish-drawer');
    const o = document.getElementById('shop-overlay');
    if (d) d.classList.add('translate-x-full');
    const c = document.getElementById('cart-drawer');
    if (o && c && c.classList.contains('translate-x-full')) {
        o.classList.add('opacity-0', 'pointer-events-none');
    }
}

// ── Render cart items ──────────────────────────────────────────────────────
function renderCartItems() {
    const el = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const countEl = document.getElementById('cart-item-count');
    if (!el) return;
    const cart = getCart();
    if (cart.length === 0) {
        el.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="text-6xl mb-4">🛒</div>
            <p class="font-bold text-gray-700 text-lg">Your cart is empty</p>
            <p class="text-sm text-gray-400 mt-1">Add some products to get started</p>
        </div>`;
        if (subtotalEl) subtotalEl.textContent = '$0.00';
        if (countEl) countEl.textContent = '0 items';
        return;
    }
    let subtotal = 0;
    el.innerHTML = cart.map(item => {
        subtotal += item.price * item.qty;
        const pp = item.price.toFixed(2).split('.');
        const hasImg = item.image && item.image.trim() !== '';
        const emoji = getCategoryEmoji(item.category);
        return `<div class="flex gap-3 py-4 border-b border-gray-100 last:border-0">
            <div class="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                ${hasImg
                    ? `<img src="${item.image}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="hidden text-2xl">${emoji}</span>`
                    : `<span class="text-2xl">${emoji}</span>`}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-400 uppercase tracking-wide">${item.category}</p>
                <p class="text-sm font-semibold text-gray-800 leading-tight mt-0.5">${item.name}</p>
                <p class="text-sm font-black text-gray-900 mt-1">$${pp[0]}<span class="text-xs font-normal text-gray-500">.${pp[1]}</span></p>
                <div class="flex items-center gap-2 mt-2">
                    <button onclick="window._shopUpdateQty('${item.id}',-1)" class="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 hover:bg-gray-50 text-base font-bold leading-none transition-colors">−</button>
                    <span class="text-sm font-bold w-6 text-center">${item.qty}</span>
                    <button onclick="window._shopUpdateQty('${item.id}',1)" class="w-7 h-7 rounded-full border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 hover:bg-gray-50 text-base font-bold leading-none transition-colors">+</button>
                    <span class="ml-auto text-xs font-bold text-gray-700">$${(item.price * item.qty).toFixed(2)}</span>
                    <button onclick="window._shopRemoveCart('${item.id}')" class="text-gray-300 hover:text-red-500 transition-colors ml-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
    if (subtotalEl) subtotalEl.textContent = '$' + subtotal.toFixed(2);
    if (countEl) countEl.textContent = cart.reduce((s, i) => s + i.qty, 0) + ' item' + (cart.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : '');
}

// ── Render wishlist items ──────────────────────────────────────────────────
function renderWishlistItems() {
    const el = document.getElementById('wish-items');
    const countEl = document.getElementById('wish-item-count');
    if (!el) return;
    const wish = getWishlist();
    if (countEl) countEl.textContent = wish.length + ' item' + (wish.length !== 1 ? 's' : '');
    if (wish.length === 0) {
        el.innerHTML = `<div class="flex flex-col items-center justify-center py-16 text-center">
            <div class="text-6xl mb-4">❤️</div>
            <p class="font-bold text-gray-700 text-lg">Your wishlist is empty</p>
            <p class="text-sm text-gray-400 mt-1">Tap the heart on any product to save it</p>
        </div>`;
        return;
    }
    el.innerHTML = wish.map(item => {
        const pp = item.price.toFixed(2).split('.');
        const hasImg = item.image && item.image.trim() !== '';
        const emoji = getCategoryEmoji(item.category);
        return `<div class="flex gap-3 py-4 border-b border-gray-100 last:border-0">
            <div class="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                ${hasImg
                    ? `<img src="${item.image}" class="w-full h-full object-cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="hidden text-2xl">${emoji}</span>`
                    : `<span class="text-2xl">${emoji}</span>`}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs text-gray-400 uppercase tracking-wide">${item.category}</p>
                <p class="text-sm font-semibold text-gray-800 leading-tight mt-0.5">${item.name}</p>
                <p class="text-sm font-black text-gray-900 mt-1">$${pp[0]}<span class="text-xs font-normal text-gray-500">.${pp[1]}</span></p>
                <div class="flex gap-2 mt-2">
                    <button onclick="window._shopMoveToCart('${item.id}')" class="flex-1 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-full hover:bg-gray-700 transition-colors">Add to cart</button>
                    <button onclick="window._shopRemoveWish('${item.id}')" class="px-3 py-1.5 border-2 border-gray-200 text-gray-500 text-xs font-bold rounded-full hover:bg-gray-50 hover:border-gray-300 transition-colors">Remove</button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ── Toast notification ─────────────────────────────────────────────────────
function showToast(msg) {
    const toast = document.getElementById('shop-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('opacity-0', 'translate-y-2');
    toast.classList.add('opacity-100', 'translate-y-0');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        toast.classList.remove('opacity-100', 'translate-y-0');
    }, 2500);
}

// ── Inject drawer HTML into DOM ────────────────────────────────────────────
function injectDrawers() {
    // Resolve checkout path relative to current page location
    const inCustomerStuff = window.location.pathname.replace(/%20/g, ' ').includes('Customer Stuff');
    const checkoutPath = inCustomerStuff ? '../checkout.html' : 'checkout.html';

    const div = document.createElement('div');
    div.innerHTML = `
    <!-- Overlay -->
    <div id="shop-overlay" class="fixed inset-0 bg-black/40 z-[60] opacity-0 pointer-events-none transition-opacity duration-300"></div>

    <!-- Cart Drawer -->
    <div id="cart-drawer" class="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl transform translate-x-full transition-transform duration-300 flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div>
                <h2 class="text-lg font-black text-gray-900">Your Cart</h2>
                <p id="cart-item-count" class="text-xs text-gray-400 mt-0.5">0 items</p>
            </div>
            <button onclick="window._closeCart()" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div id="cart-items" class="flex-1 overflow-y-auto px-6 py-2"></div>
        <div class="px-6 py-5 border-t border-gray-200 bg-gray-50 space-y-3">
            <div class="flex justify-between items-center">
                <span class="font-bold text-gray-600 text-sm">Subtotal</span>
                <span id="cart-subtotal" class="text-2xl font-black text-gray-900">$0.00</span>
            </div>
            <p class="text-xs text-gray-400">Shipping & taxes calculated at checkout</p>
            <a href="${checkoutPath}" class="block w-full py-3.5 bg-gray-900 text-white font-bold rounded-full hover:bg-gray-700 transition-colors text-sm tracking-wide text-center">Proceed to Checkout →</a>
            <button onclick="window._closeCart()" class="w-full py-2.5 border-2 border-gray-200 text-gray-600 font-bold rounded-full hover:bg-gray-50 transition-colors text-sm">Continue Shopping</button>
        </div>
    </div>

    <!-- Wishlist Drawer -->
    <div id="wish-drawer" class="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl transform translate-x-full transition-transform duration-300 flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
            <div>
                <h2 class="text-lg font-black text-gray-900">Wishlist ❤️</h2>
                <p id="wish-item-count" class="text-xs text-gray-400 mt-0.5">0 items</p>
            </div>
            <button onclick="window._closeWishlist()" class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
        </div>
        <div id="wish-items" class="flex-1 overflow-y-auto px-6 py-2"></div>
        <div class="px-6 py-5 border-t border-gray-200 bg-gray-50">
            <button onclick="window._closeWishlist()" class="w-full py-2.5 border-2 border-gray-200 text-gray-600 font-bold rounded-full hover:bg-gray-50 transition-colors text-sm">Continue Shopping</button>
        </div>
    </div>

    <!-- Toast -->
    <div id="shop-toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-semibold px-5 py-3 rounded-full shadow-2xl z-[80] opacity-0 translate-y-2 transition-all duration-300 pointer-events-none whitespace-nowrap"></div>
    `;
    document.body.appendChild(div);

    // Close overlay on click
    document.getElementById('shop-overlay').addEventListener('click', () => {
        closeCart();
        closeWishlist();
    });
}

// ── Init (call once per page) ──────────────────────────────────────────────
export function initShop() {
    injectDrawers();

    // Expose globals for inline onclick handlers in dynamically generated card HTML
    window.addToCart       = addToCart;
    window.toggleWishlist  = toggleWishlist;
    window._openCart       = openCart;
    window._closeCart      = closeCart;
    window._openWishlist   = openWishlist;
    window._closeWishlist  = closeWishlist;
    window._shopUpdateQty  = updateCartQty;
    window._shopRemoveCart = removeFromCart;
    window._shopMoveToCart = moveToCart;
    window._shopRemoveWish = removeFromWishlist;

    updateBadges();

    // Re-run wishlist button highlights after products are rendered
    document.addEventListener('productsRendered', updateWishlistButtons);
}

// Also export updateWishlistButtons so pages can call it after rendering
export { updateWishlistButtons, updateBadges };
