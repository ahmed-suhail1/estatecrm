import {
  auth, db,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut,
  doc, setDoc, getDoc, serverTimestamp
} from "./firebase-config.js";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginError = document.getElementById("loginError");
const pendingNotice = document.getElementById("pendingNotice");

document.getElementById("showRegister").addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.style.display = "none";
  registerForm.style.display = "block";
  document.getElementById("toggleToRegister").style.display = "none";
  document.getElementById("toggleToLogin").style.display = "inline";
  hideMessages();
});

document.getElementById("showLogin").addEventListener("click", (e) => {
  e.preventDefault();
  registerForm.style.display = "none";
  loginForm.style.display = "block";
  document.getElementById("toggleToLogin").style.display = "none";
  document.getElementById("toggleToRegister").style.display = "inline";
  hideMessages();
});

function hideMessages() {
  loginError.classList.remove("show");
  pendingNotice.classList.remove("show");
}

function showError(msg) {
  loginError.textContent = msg;
  loginError.classList.add("show");
  pendingNotice.classList.remove("show");
}

// Firebase hata kodlarını Türkçe okunabilir mesajlara çevir
function translateAuthError(code) {
  const map = {
    "auth/invalid-email": "Geçersiz e-posta adresi.",
    "auth/user-not-found": "Bu e-posta ile kayıtlı kullanıcı bulunamadı.",
    "auth/wrong-password": "Şifre hatalı.",
    "auth/invalid-credential": "E-posta veya şifre hatalı.",
    "auth/email-already-in-use": "Bu e-posta zaten kayıtlı.",
    "auth/weak-password": "Şifre en az 6 karakter olmalı.",
    "auth/too-many-requests": "Çok fazla deneme yapıldı. Lütfen biraz bekleyin."
  };
  return map[code] || "Bir hata oluştu. Lütfen tekrar deneyin.";
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessages();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const btn = document.getElementById("loginBtn");
  btn.disabled = true;
  btn.textContent = "Giriş yapılıyor...";

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const agentDoc = await getDoc(doc(db, "agents", cred.user.uid));

    if (!agentDoc.exists()) {
      showError("Hesap kaydı bulunamadı. Lütfen yöneticinizle iletişime geçin.");
      await signOut(auth);
      return;
    }

    const agentData = agentDoc.data();
    if (agentData.status === "pending") {
      pendingNotice.classList.add("show");
      await signOut(auth);
      return;
    }
    if (agentData.status === "disabled") {
      showError("Hesabınız devre dışı bırakılmış. Yöneticinizle iletişime geçin.");
      await signOut(auth);
      return;
    }

    window.location.href = "pages/dashboard.html";
  } catch (err) {
    showError(translateAuthError(err.code));
  } finally {
    btn.disabled = false;
    btn.textContent = "Giriş Yap";
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideMessages();
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value;
  const btn = document.getElementById("registerBtn");
  btn.disabled = true;
  btn.textContent = "Oluşturuluyor...";

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "agents", cred.user.uid), {
      name,
      email,
      role: "agent",
      status: "pending", // yönetici onayı bekliyor
      createdAt: serverTimestamp()
    });

    await signOut(auth);
    registerForm.reset();
    registerForm.style.display = "none";
    loginForm.style.display = "block";
    document.getElementById("toggleToLogin").style.display = "none";
    document.getElementById("toggleToRegister").style.display = "inline";
    pendingNotice.classList.add("show");
  } catch (err) {
    showError(translateAuthError(err.code));
  } finally {
    btn.disabled = false;
    btn.textContent = "Hesap Oluştur";
  }
});

// Zaten giriş yapmışsa doğrudan panele yönlendir
onAuthStateChanged(auth, async (user) => {
  const onLoginPage = window.location.pathname.endsWith("index.html") || window.location.pathname === "/";
  if (user && onLoginPage) {
    const agentDoc = await getDoc(doc(db, "agents", user.uid));
    if (agentDoc.exists() && agentDoc.data().status === "active") {
      window.location.href = "pages/dashboard.html";
    }
  }
});
