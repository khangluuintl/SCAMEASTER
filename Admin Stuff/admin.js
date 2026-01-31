// Import Firebase modules (if using CDN, these are already loaded; if npm, import them)
// For CDN: Add these scripts in <head>:
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js"></script>

// Firebase configuration (replace with your actual config from Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyB63LpitCOa2FX6H_gxQ3KjAo0PaeaJScY",
    authDomain: "scam-ikea.firebaseapp.com",
    projectId: "scam-ikea",
    storageBucket: "scam-ikea.firebasestorage.app",
    messagingSenderId: "51388598955",
    appId: "1:51388598955:web:f68dda50a6b2b719c745ee",
    measurementId: "G-P60CRPJCYX"
  };
  
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Check if user is authenticated on page load
auth.onAuthStateChanged(user => {
    if (!user) {
        // Redirect to login if not authenticated
        window.location.href = '../login.html';
    } else {
        // Proceed to load data
        populateRecentActivity();
        populateProducts();
        populateEmployees();
        populateAccounts();
        showSection('dashboard');
    }
});

// Function to show a specific section and update navigation (unchanged)
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.add('hidden'));
    
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }
    
    const pageTitle = document.getElementById('page-title');
    const titles = {
        'dashboard': 'Dashboard',
        'add-products': 'Add Products',
        'manage-products': 'Manage Products',
        'manage-employees': 'Manage Employees',
        'manage-accounts': 'Manage Accounts'
    };
    pageTitle.textContent = titles[sectionId] || 'Dashboard';
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`[data-section="${sectionId}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
}

// Populate Recent Activity from Firestore
async function populateRecentActivity() {
    const activityContainer = document.querySelector('#dashboard .space-y-4');
    activityContainer.innerHTML = ''; // Clear existing
    try {
        const snapshot = await db.collection('activities').orderBy('timestamp', 'desc').limit(4).get();
        snapshot.forEach(doc => {
            const data = doc.data();
            const activityDiv = document.createElement('div');
            activityDiv.className = 'flex items-center space-x-4 p-4 bg-gray-50 rounded-lg';
            activityDiv.innerHTML = `
                <div class="flex-shrink-0">
                    <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                    </div>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-medium text-gray-900">${data.action}</p>
                    <p class="text-sm text-gray-500">${data.details}</p>
                </div>
                <div class="text-sm text-gray-400">${data.time}</div>
            `;
            activityContainer.appendChild(activityDiv);
        });
    } catch (error) {
        console.error('Error fetching activities:', error);
    }
}

// Populate Products from Firestore
async function populateProducts() {
    const tbody = document.querySelector('#manage-products tbody');
    tbody.innerHTML = ''; // Clear existing
    try {
        const snapshot = await db.collection('products').get();
        snapshot.forEach(doc => {
            const product = doc.data();
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.id}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${product.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.category}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${product.price}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.stock}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${product.status === 'In Stock' ? 'bg-green-100 text-green-800' : product.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}">${product.status}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button class="text-blue-600 hover:text-blue-900" onclick="editProduct('${doc.id}')">Edit</button>
                    <button class="text-red-600 hover:text-red-900" onclick="deleteProduct('${doc.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching products:', error);
    }
}

// Populate Employees from Firestore
async function populateEmployees() {
    const tbody = document.querySelector('#manage-employees tbody');
    tbody.innerHTML = ''; // Clear existing
    try {
        const snapshot = await db.collection('employees').get();
        snapshot.forEach(doc => {
            const employee = doc.data();
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${employee.id}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">${employee.initials}</div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${employee.name}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.email}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${employee.position}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${employee.department}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${employee.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${employee.status}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button class="text-blue-600 hover:text-blue-900" onclick="editEmployee('${doc.id}')">Edit</button>
                    <button class="text-red-600 hover:text-red-900" onclick="removeEmployee('${doc.id}')">Remove</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching employees:', error);
    }
}

// Populate Accounts from Firestore
async function populateAccounts() {
    const tbody = document.querySelector('#manage-accounts tbody');
    tbody.innerHTML = ''; // Clear existing
    try {
        const snapshot = await db.collection('accounts').get();
        snapshot.forEach(doc => {
            const account = doc.data();
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${account.userId}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-bold">${account.initials}</div>
                        <div class="ml-3">
                            <div class="text-sm font-medium text-gray-900">${account.username}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${account.role === 'Admin' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">${account.role}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${account.registered}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${account.status === 'Active' ? 'bg-green-100 text-green-800' : account.status === 'Suspended' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}">${account.status}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button class="text-blue-600 hover:text-blue-900" onclick="viewAccount('${doc.id}')">View</button>
                    <button class="text-yellow-600 hover:text-yellow-900" onclick="suspendAccount('${doc.id}')">Suspend</button>
                    <button class="text-red-600 hover:text-red-900" onclick="deleteAccount('${doc.id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error fetching accounts:', error);
    }
}

// Handle form submission for adding products (now saves to Firestore)
document.querySelector('#add-products form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const product = {
        id: `#${Date.now()}`, // Simple ID generation
        name: formData.get('product-name'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        stock: parseInt(formData.get('stock')),
        description: formData.get('description'),
        status: parseInt(formData.get('stock')) > 10 ? 'In Stock' : parseInt(formData.get('stock')) > 0 ? 'Low Stock' : 'Out of Stock'
    };
    try {
        await db.collection('products').add(product);
        alert('Product added successfully!');
        this.reset();
        populateProducts(); // Refresh table
    } catch (error) {
        console.error('Error adding product:', error);
        alert('Failed to add product.');
    }
});

// Placeholder functions for actions (implement as needed)
function editProduct(id) { alert(`Edit product ${id}`); }
function deleteProduct(id) { db.collection('products').doc(id).delete().then(() => populateProducts()); }
function editEmployee(id) { alert(`Edit employee ${id}`); }
function removeEmployee(id) { db.collection('employees').doc(id).delete().then(() => populateEmployees()); }
function viewAccount(id) { alert(`View account ${id}`); }
function suspendAccount(id) { db.collection('accounts').doc(id).update({ status: 'Suspended' }).then(() => populateAccounts()); }
function deleteAccount(id) { db.collection('accounts').doc(id).delete().then(() => populateAccounts()); }

// Logout function
function logout() {
    auth.signOut().then(() => {
        window.location.href = '../login.html';
    });
}