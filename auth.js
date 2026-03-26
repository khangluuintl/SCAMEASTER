// Import Firebase
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signOut
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { firebaseConfig } from "./config.js";

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Lấy DOM elements
const getElement = (id) => document.getElementById(id);
const loginForm = getElement("loginForm");
const registerForm = getElement("registerForm");

// Hiển thị thông báo
const showMessage = (text) => {
  const messageEl = getElement("message");
  messageEl.textContent = text;
};

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
    showMessage("Password must have atleast 8 charactaers");
    return;
  }
  if (username.length < 3 || username.length > 20 || !validateUsername(username)){
    showMessage("Invalid Username")
    return;
  }

  if (password != repeat){
    showMessage("Password not the same")
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(userCredential.user);
    showMessage("Registration successful. Please verify your email before signing in.");
    showLogin();
  } catch ({ message }) {
    showMessage(`Lỗi: ${message}`);
  }
};

// Đăng nhập
window.login = async (event) => {
  if (event) event.preventDefault();
  const email = getElement("loginEmail").value.trim();
  const password = getElement("loginPassword").value;

  if (!email || !password) {
    showMessage("Vui lòng nhập đầy đủ!");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      showMessage("Please verify your email before logging in.");
      return;
    }
    window.location.href = "index.html";
  } catch (error) {
    showMessage("Email hoặc mật khẩu không đúng!");
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

  if (user && window.location.pathname.endsWith("login.html")) {
    window.location.href = "index.html";
  }
});

