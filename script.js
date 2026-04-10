// ===== MBG Tracker — Main Application Logic =====

const TM_URL = "https://teachablemachine.withgoogle.com/models/GciE7jtOf/";

let tmModel, webcam, maxPredictions;
let isCameraOn = false;
let selectedKelas = "";
let selectedAvatar = "😎";

// ——— Init ———
document.addEventListener("DOMContentLoaded", () => {
    initAuth();
    initData();
    bindEvents();
    checkSession();
});

function bindEvents() {
    // Auth
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("register-form").addEventListener("submit", handleRegister);
    document.getElementById("go-register").addEventListener("click", e => { e.preventDefault(); showScreen("register"); });
    document.getElementById("go-login").addEventListener("click", e => { e.preventDefault(); showScreen("login"); });

    // Onboarding
    document.getElementById("onboard-next-1").addEventListener("click", () => onboardStep(2));
    document.getElementById("onboard-next-2").addEventListener("click", () => onboardStep(3));
    document.getElementById("onboard-finish").addEventListener("click", completeOnboarding);

    // Dashboard
    document.getElementById("btn-logout").addEventListener("click", handleLogout);
    document.getElementById("menu-gizi").addEventListener("click", () => showScreen("deteksi-gizi"));
    document.getElementById("menu-mbg").addEventListener("click", () => showScreen("deteksi-mbg"));
    document.getElementById("menu-leaderboard").addEventListener("click", () => showScreen("leaderboard"));

    // Deteksi MBG
    document.getElementById("btn-start-cam").addEventListener("click", startCamera);
    document.getElementById("btn-capture").addEventListener("click", captureAndPredict);
    document.getElementById("btn-back-mbg").addEventListener("click", () => { stopCamera(); showScreen("dashboard"); });

    // Leaderboard
    document.getElementById("btn-back-lb").addEventListener("click", () => showScreen("dashboard"));

    // Gizi Coming Soon
    document.getElementById("btn-back-gizi").addEventListener("click", () => showScreen("dashboard"));

    // Result modal
    document.getElementById("btn-close-result").addEventListener("click", closeResult);
}

// ——— SPA Router ———
function showScreen(name) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById("screen-" + name);
    if (target) {
        target.classList.add("active");
        // Scroll to top
        window.scrollTo(0, 0);
    }

    // Screen-specific init
    if (name === "dashboard") renderDashboard();
    if (name === "leaderboard") renderLeaderboard();
    if (name === "onboarding") initOnboarding();
}

function checkSession() {
    const user = getCurrentUser();
    if (user) {
        if (!user.onboarded) {
            showScreen("onboarding");
        } else {
            showScreen("dashboard");
        }
    } else {
        showScreen("login");
    }
}

// ——— Auth ———
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value;
    const errorEl = document.getElementById("login-error");

    if (!username || !password) {
        showError(errorEl, "Isi username dan password!");
        return;
    }

    const user = authenticate(username, password);
    if (!user) {
        showError(errorEl, "Username atau password salah!");
        return;
    }

    errorEl.classList.add("hidden");
    showToast("Login berhasil! 🎉");

    if (!user.onboarded) {
        showScreen("onboarding");
    } else {
        showScreen("dashboard");
    }
}

function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value;
    const errorEl = document.getElementById("register-error");

    if (!username || !password) {
        showError(errorEl, "Isi semua field!");
        return;
    }

    const result = registerUser(username, password);
    if (result.error) {
        showError(errorEl, result.error);
        return;
    }

    errorEl.classList.add("hidden");
    showToast("Akun berhasil dibuat! 🎉");
    showScreen("onboarding");
}

function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
}

function handleLogout() {
    stopCamera();
    logoutUser();
    showToast("Berhasil logout 👋");
    // Clear form values
    document.getElementById("login-username").value = "";
    document.getElementById("login-password").value = "";
    showScreen("login");
}

// ——— Onboarding ———
function initOnboarding() {
    selectedKelas = "";
    selectedAvatar = "😎";

    // Populate class grid
    const classGrid = document.getElementById("class-grid");
    classGrid.innerHTML = "";
    AVAILABLE_CLASSES.forEach(kelas => {
        const div = document.createElement("div");
        div.className = "class-option";
        div.textContent = kelas;
        div.addEventListener("click", () => {
            classGrid.querySelectorAll(".class-option").forEach(c => c.classList.remove("selected"));
            div.classList.add("selected");
            selectedKelas = kelas;
        });
        classGrid.appendChild(div);
    });

    // Populate avatar grid
    const avatarGrid = document.getElementById("avatar-grid");
    avatarGrid.innerHTML = "";
    AVATAR_OPTIONS.forEach(emoji => {
        const div = document.createElement("div");
        div.className = "avatar-option";
        div.textContent = emoji;
        if (emoji === "😎") div.classList.add("selected");
        div.addEventListener("click", () => {
            avatarGrid.querySelectorAll(".avatar-option").forEach(a => a.classList.remove("selected"));
            div.classList.add("selected");
            selectedAvatar = emoji;
        });
        avatarGrid.appendChild(div);
    });

    // Reset steps
    showOnboardStep(1);
}

function showOnboardStep(stepNum) {
    for (let i = 1; i <= 3; i++) {
        const el = document.getElementById("onboard-step-" + i);
        if (el) el.classList.toggle("hidden", i !== stepNum);
    }
    document.querySelectorAll(".step-dots .dot").forEach(d => {
        d.classList.toggle("active", parseInt(d.dataset.step) <= stepNum);
    });
}

function onboardStep(nextStep) {
    if (nextStep === 2) {
        const nama = document.getElementById("onboard-nama").value.trim();
        if (!nama) { showToast("Tulis nama kamu dulu ya! ✍️"); return; }
    }
    if (nextStep === 3) {
        if (!selectedKelas) { showToast("Pilih kelas kamu dulu! 🏫"); return; }
    }
    showOnboardStep(nextStep);
}

function completeOnboarding() {
    const user = getCurrentUser();
    if (!user) return;

    const nama = document.getElementById("onboard-nama").value.trim();
    if (!nama) { showToast("Tulis nama kamu dulu ya! ✍️"); return; }
    if (!selectedKelas) { showToast("Kembali pilih kelas kamu! 🏫"); return; }

    updateUserProfile(user.id, {
        nama,
        kelas: selectedKelas,
        avatar: selectedAvatar,
        onboarded: true
    });

    fireConfetti();
    showToast(`Selamat datang, ${nama}! 🎉`);
    setTimeout(() => showScreen("dashboard"), 800);
}

// ——— Dashboard ———
function renderDashboard() {
    const user = refreshCurrentUser();
    if (!user) return;

    document.getElementById("dash-avatar").textContent = user.avatar || "😎";
    document.getElementById("dash-greeting").textContent = `Hai, ${user.nama || user.username}! 👋`;
    document.getElementById("dash-kelas").textContent = user.kelas || "-";

    document.getElementById("stat-streak").textContent = user.streak || 0;
    document.getElementById("stat-scans").textContent = user.totalScans || 0;

    const weeklyScans = getUserWeeklyScans(user.id);
    document.getElementById("stat-weekly").textContent = weeklyScans.length;

    // Insight
    const stats = getWeeklyStats();
    const insightEl = document.getElementById("insight-text");
    if (stats.total > 0) {
        insightEl.textContent = `${stats.percentage}% MBG habis dari ${stats.total} scan total minggu ini`;
    } else {
        insightEl.textContent = "Belum ada data scan minggu ini";
    }
}

// ——— Camera & Teachable Machine ———
async function startCamera() {
    const btnStart = document.getElementById("btn-start-cam");
    btnStart.textContent = "Loading...";
    btnStart.disabled = true;

    try {
        const modelURL = TM_URL + "model.json";
        const metadataURL = TM_URL + "metadata.json";

        tmModel = await tmImage.load(modelURL, metadataURL);
        maxPredictions = tmModel.getTotalClasses();

        const flip = true;
        webcam = new tmImage.Webcam(400, 400, flip);
        await webcam.setup();
        await webcam.play();
        window.requestAnimationFrame(cameraLoop);

        const container = document.getElementById("webcam-container");
        container.innerHTML = "";
        container.appendChild(webcam.canvas);
        container.style.display = "block";

        document.getElementById("camera-placeholder").style.display = "none";
        isCameraOn = true;

        btnStart.classList.add("hidden");
        document.getElementById("btn-capture").classList.remove("hidden");

        document.getElementById("camera-wrapper").scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
        showToast("Gagal akses kamera! Cek izin browser. ❌");
        btnStart.textContent = "Nyalakan Kamera 📹";
        btnStart.disabled = false;
        console.error("Camera error:", err);
    }
}

function stopCamera() {
    if (webcam) {
        webcam.stop();
        isCameraOn = false;
    }
    // Reset UI
    const container = document.getElementById("webcam-container");
    if (container) { container.style.display = "none"; container.innerHTML = ""; }
    const placeholder = document.getElementById("camera-placeholder");
    if (placeholder) placeholder.style.display = "";

    const btnStart = document.getElementById("btn-start-cam");
    if (btnStart) { btnStart.classList.remove("hidden"); btnStart.textContent = "Nyalakan Kamera 📹"; btnStart.disabled = false; }
    const btnCapture = document.getElementById("btn-capture");
    if (btnCapture) btnCapture.classList.add("hidden");
}

function cameraLoop() {
    if (isCameraOn && webcam) {
        webcam.update();
        window.requestAnimationFrame(cameraLoop);
    }
}

async function captureAndPredict() {
    if (!isCameraOn || !tmModel) return;

    // Show loading
    const overlay = document.getElementById("loading-overlay");
    overlay.classList.remove("hidden");

    // Start progress bar animation
    const progressBar = document.getElementById("loading-bar");
    progressBar.style.width = "0%";

    // Predict immediately
    const prediction = await tmModel.predict(webcam.canvas);
    let highestProb = 0;
    let detectedClass = "";

    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            detectedClass = prediction[i].className.toLowerCase();
        }
    }

    // Animate loading messages and progress
    const messages = [
        { emoji: "🔍", title: "Memindai ompreng...", sub: "Mendeteksi gambar..." },
        { emoji: "🤖", title: "AI sedang berpikir...", sub: "Menganalisis pola makanan..." },
        { emoji: "📊", title: "Menganalisis kebersihan...", sub: "Menghitung sisa makanan..." },
        { emoji: "🧮", title: "Menghitung hasil...", sub: "Menentukan status ompreng..." },
        { emoji: "✨", title: "Hampir selesai!", sub: "Menyiapkan hasil..." }
    ];

    const titleEl = document.getElementById("loading-title");
    const subEl = document.getElementById("loading-sub");
    const emojiEl = document.getElementById("loading-emoji");

    for (let i = 0; i < messages.length; i++) {
        setTimeout(() => {
            emojiEl.textContent = messages[i].emoji;
            titleEl.textContent = messages[i].title;
            subEl.textContent = messages[i].sub;
            progressBar.style.width = ((i + 1) / messages.length * 100) + "%";
        }, i * 1000);
    }

    // After 5 seconds, show result
    setTimeout(() => {
        overlay.classList.add("hidden");
        progressBar.style.width = "0%";
        showResult(detectedClass);
    }, 5000);
}

function showResult(classLabel) {
    const user = getCurrentUser();
    if (!user) return;

    const resultOverlay = document.getElementById("result-overlay");
    const resultCard = document.getElementById("result-card");
    const resultEmoji = document.getElementById("result-emoji");
    const resultStatus = document.getElementById("result-status");
    const resultDesc = document.getElementById("result-desc");
    const resultPoints = document.getElementById("result-points");

    let bgColor = "var(--white)";

    if (classLabel.includes("habis") || classLabel.includes("kosong") || classLabel.includes("bersih")) {
        resultEmoji.textContent = "✨🍽️✨";
        resultStatus.textContent = "Piring Kosong!";
        resultDesc.textContent = `Mantap ${user.nama}! MBG kamu habis!`;
        bgColor = "var(--soft-green)";
        resultPoints.classList.remove("hidden");

        // Record scan
        addScan(user.id, user.kelas, "habis");
        fireConfetti();

    } else if (classLabel.includes("setengah") || classLabel.includes("sisa")) {
        resultEmoji.textContent = "🍛";
        resultStatus.textContent = "Makan Setengah!";
        resultDesc.textContent = "Yah, ayo dihabiskan! Makan bergizi itu penting lho!";
        bgColor = "var(--soft-yellow)";
        resultPoints.classList.add("hidden");
        addScan(user.id, user.kelas, "setengah");

    } else if (classLabel.includes("penuh") || classLabel.includes("utuh") || classLabel.includes("belum")) {
        resultEmoji.textContent = "🍚😱";
        resultStatus.textContent = "Masih Penuh?!";
        resultDesc.textContent = "Ompreng masih penuh! Sayang banget kalau nggak dimakan.";
        bgColor = "var(--soft-pink)";
        resultPoints.classList.add("hidden");
        addScan(user.id, user.kelas, "penuh");

    } else {
        resultEmoji.textContent = "👀";
        resultStatus.textContent = classLabel.charAt(0).toUpperCase() + classLabel.slice(1);
        resultDesc.textContent = "Model mendeteksi status ompreng kamu.";
        bgColor = "var(--soft-blue)";
        resultPoints.classList.add("hidden");
        addScan(user.id, user.kelas, classLabel);
    }

    resultCard.style.background = bgColor;
    resultOverlay.classList.remove("hidden");
}

function closeResult() {
    document.getElementById("result-overlay").classList.add("hidden");
    // Refresh dashboard stats in case user goes back
    renderDashboard();
}

// ——— Leaderboard ———
function renderLeaderboard() {
    const data = getWeeklyLeaderboard();

    // Podium top 3
    const podiumConfig = [
        { elId: "pod-1", index: 0 },
        { elId: "pod-2", index: 1 },
        { elId: "pod-3", index: 2 }
    ];

    podiumConfig.forEach(({ elId, index }) => {
        const el = document.getElementById(elId);
        const item = data[index];
        if (item && el) {
            el.querySelector(".podium-class").textContent = item.kelas;
            el.querySelector(".podium-score").textContent = item.count;
        }
    });

    // Full list
    const listEl = document.getElementById("lb-full-list");
    listEl.innerHTML = "";

    data.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = "lb-item";
        const rewardTag = index < 3 ? `<span class="lb-reward-tag">🎁 Reward</span>` : "";
        li.innerHTML = `
            <div class="lb-item-left">
                <div class="lb-rank">${index + 1}</div>
                <div>${item.kelas}${rewardTag}</div>
            </div>
            <div class="lb-score-badge">${item.count} Habis</div>
        `;
        listEl.appendChild(li);
    });
}

// ——— Toast ———
function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.remove("hidden");
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.classList.add("hidden"), 300);
    }, 2500);
}

// ——— Confetti ———
function fireConfetti() {
    const container = document.getElementById("confetti-container");
    const colors = ["#FFD43B", "#FF6B6B", "#51CF66", "#339AF0", "#CC5DE8", "#FF922B", "#22B8CF"];
    const count = 60;

    for (let i = 0; i < count; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (2 + Math.random() * 2) + "s";
        piece.style.animationDelay = Math.random() * 0.8 + "s";
        piece.style.width = (8 + Math.random() * 10) + "px";
        piece.style.height = (8 + Math.random() * 10) + "px";
        piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
        container.appendChild(piece);
    }

    // Clean up after animation
    setTimeout(() => { container.innerHTML = ""; }, 4000);
}
