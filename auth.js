// Import Firebase
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signOut,
  sendPasswordResetEmail,
  getIdTokenResult
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { doc, serverTimestamp, setDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

// Lấy DOM elements
const getElement = (id) => document.getElementById(id);
const loginForm = getElement("loginForm");
const registerForm = getElement("registerForm");

// Hiển thị thông báo
const showMessage = (text) => {
  const messageEl = getElement("message");
  if (messageEl) messageEl.textContent = text;
};

const AUTH_ERROR_MESSAGES = {
  "auth/email-already-in-use": "This email is already in use.",
  "auth/invalid-email": "Invalid email address.",
  "auth/weak-password": "Password is too weak.",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/network-request-failed": "Network error. Please check your connection."
};

function getAuthErrorMessage(error, fallback = "Authentication failed. Please try again.") {
  return AUTH_ERROR_MESSAGES[error?.code] || error?.message || fallback;
}

// usernanme validate

function validateUsername(username) {
  // Regex: 3-20 characters, alphanumeric and underscore
  const regex = /^[a-zA-Z0-9_]{3,20}$/;
  return regex.test(username);
}


// Đăng ký
window.register = async () => {
  const username = getElement("registerUsername").value.trim();
  const email = getElement("registerEmail").value.trim();
  const password = getElement("registerPassword").value;
  const repeat = getElement("registerRepeat").value;

  if (!email || !password || !username) {
    showMessage("Please fill in all the boxes");
    return;
  }

  if (password.length < 8) {
    showMessage("Password must be at least 8 characters.");
    return;
  }

  if (username.length < 3 || username.length > 20 || !validateUsername(username)) {
    showMessage("Invalid username. Use 3-20 letters, numbers, or underscores.");
    return;
  }

  if (password !== repeat) {
    showMessage("Passwords do not match.");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCredential.user.uid), {
      username,
      email,
      createdAt: serverTimestamp()
    });

    await sendEmailVerification(userCredential.user);
    showMessage("Registration successful. Please verify your email before signing in.");
    showLogin();
  } catch (error) {
    showMessage(getAuthErrorMessage(error, "Registration failed. Please try again."));
  }
};

// Đăng nhập
window.login = async (event) => {
  if (event) event.preventDefault();
  const email = getElement("loginEmail").value.trim();
  const password = getElement("loginPassword").value;

  if (!email || !password) {
    showMessage("Please enter both email and password.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      showMessage("Please verify your email before logging in.");
      return;
    }
    // Redirect admins to the admin panel, regular users to homepage
    const tokenResult = await getIdTokenResult(userCredential.user);
    if (tokenResult?.claims?.admin) {
      window.location.href = "Admin Stuff/admin.html";
    } else {
      window.location.href = "index.html";
    }
  } catch (error) {
    showMessage(getAuthErrorMessage(error, "Incorrect email or password."));
  }
};

// Chuyển đổi form
window.showRegister = () => {
  loginForm.style.display = "none";
  registerForm.style.display = "block";
};

window.showLogin = () => {
  registerForm.style.display = "none";
  loginForm.style.display = "block";
};

// Kiểm tra nếu đã đăng nhập thì chuyển sang index.html
onAuthStateChanged(auth, (user) => {
  const accountEmail = getElement("accountEmail");
  const accountPanel = getElement("accountPanel");
  const signOutBtn = getElement("signOutBtn");
  const currentPage = window.location.pathname.split("/").pop();

  if (user && accountEmail) {
    accountEmail.textContent = user.email || "Signed in";
  }

  if (accountPanel) {
    accountPanel.style.display = user ? "flex" : "none";
  }

  if (signOutBtn) {
    signOutBtn.onclick = async () => {
      await signOut(auth);
      window.location.href = "login.html";
    };
  }

  // Redirect authenticated users away from auth pages
  if (user && (currentPage === "login.html" || currentPage === "signup.html")) {
    window.location.href = "index.html";
  }
});

// Reset password
window.resetPassword = async (event) => {
  if (event) event.preventDefault();

  const email = getElement("resetEmail")?.value.trim();
  const resetMessage = getElement("resetMessage");

  if (!email) {
    if (resetMessage) {
      resetMessage.textContent = "Please enter your email address.";
      resetMessage.className = "text-sm mt-3 text-center text-red-500";
      resetMessage.classList.remove("hidden");
    }
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);

    if (resetMessage) {
      resetMessage.textContent = "Password reset email sent. Please check your inbox.";
      resetMessage.className = "text-sm mt-3 text-center text-green-600";
      resetMessage.classList.remove("hidden");
    }
  } catch (error) {
    if (resetMessage) {
      resetMessage.textContent = error.message || "Unable to send reset email.";
      resetMessage.className = "text-sm mt-3 text-center text-red-500";
      resetMessage.classList.remove("hidden");
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const resetForm = getElement("resetForm");
  if (resetForm) {
    resetForm.addEventListener("submit", window.resetPassword);
  }
});

