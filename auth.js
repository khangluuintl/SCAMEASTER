// Import Firebase
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
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

// Đăng ký
window.register = async () => {
  const email = getElement("registerEmail").value.trim();
  const password = getElement("registerPassword").value;

  if (!email || !password) {
    showMessage("Vui lòng nhập đầy đủ!");
    return;
  }

  if (password.length < 6) {
    showMessage("Mật khẩu phải có ít nhất 6 ký tự!");
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = "ịndex.html";
  } catch ({ message }) {
    showMessage(`Lỗi: ${message}`);
  }
};

// Đăng nhập
window.login = async () => {
  const email = getElement("loginEmail").value.trim();
  const password = getElement("loginPassword").value;

  if (!email || !password) {
    showMessage("Vui lòng nhập đầy đủ!");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "ịndex.html";
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
  if (user) {
    window.location.href = "ịndex.html";
  }
});

