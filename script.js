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
    spawnFloatingOrbs();
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

    // Deteksi Gizi (Dummy)
    document.getElementById("btn-start-cam-gizi").addEventListener("click", startCameraGizi);
    document.getElementById("btn-capture-gizi").addEventListener("click", captureGiziDummy);
    document.getElementById("btn-back-gizi").addEventListener("click", () => { stopCameraGizi(); showScreen("dashboard"); });

    // Leaderboard
    document.getElementById("btn-back-lb").addEventListener("click", () => showScreen("dashboard"));

    // Insight Modal
    const btnOpenInsight = document.getElementById("btn-open-insight");
    if (btnOpenInsight) btnOpenInsight.addEventListener("click", showInsightDummy);
    const btnCloseInsight = document.getElementById("btn-close-insight");
    if (btnCloseInsight) btnCloseInsight.addEventListener("click", () => document.getElementById("insight-overlay").classList.add("hidden"));

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

    const streak = user.streak || 0;
    const totalScans = user.totalScans || 0;
    const weeklyScans = getUserWeeklyScans(user.id);

    // Animate stat counters
    animateCounter("stat-streak", streak);
    animateCounter("stat-scans", totalScans);
    animateCounter("stat-weekly", weeklyScans.length);

    // XP & Level system
    const xp = totalScans;
    const level = Math.floor(xp / 10) + 1;
    const xpInLevel = xp % 10;
    const xpNeeded = 10;
    const xpPercent = (xpInLevel / xpNeeded) * 100;

    document.getElementById("xp-level").textContent = level;
    document.getElementById("xp-text").textContent = `${xpInLevel} / ${xpNeeded} XP`;
    setTimeout(() => {
        document.getElementById("xp-bar").style.width = xpPercent + "%";
    }, 300);

    // Achievement badges
    renderBadges(user, streak, totalScans, weeklyScans.length);

    // Insight
    const insightEl = document.getElementById("insight-text");
    insightEl.textContent = "Tap lihat total kalori & rapormu minggu ini!";
}

function showInsightDummy() {
    const user = getCurrentUser();
    if (!user) return;
    
    document.getElementById("insight-kelas-name").textContent = user.kelas || "-";
    document.getElementById("insight-overlay").classList.remove("hidden");
}

function animateCounter(elementId, targetValue) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const current = parseInt(el.textContent) || 0;
    if (current === targetValue) return;

    const duration = 800;
    const steps = 30;
    const increment = (targetValue - current) / steps;
    let step = 0;

    const timer = setInterval(() => {
        step++;
        const val = Math.round(current + increment * step);
        el.textContent = val;
        if (step >= steps) {
            el.textContent = targetValue;
            clearInterval(timer);
        }
    }, duration / steps);
}

function renderBadges(user, streak, totalScans, weeklyScanCount) {
    const container = document.getElementById("achievement-badges");
    if (!container) return;
    container.innerHTML = "";

    const badges = [];
    if (streak >= 3) badges.push({ icon: "🔥", label: `Streak ${streak}!` });
    if (streak >= 7) badges.push({ icon: "⭐", label: "On Fire!" });
    if (totalScans >= 5) badges.push({ icon: "📷", label: "Scanner" });
    if (totalScans >= 20) badges.push({ icon: "🌟", label: "Pro Scanner" });
    if (weeklyScanCount >= 3) badges.push({ icon: "🎯", label: "Rajin!" });
    if (totalScans >= 50) badges.push({ icon: "💎", label: "Legend" });

    badges.forEach((b, i) => {
        const span = document.createElement("span");
        span.className = "achievement-badge";
        span.textContent = `${b.icon} ${b.label}`;
        span.style.animationDelay = (i * 0.1) + "s";
        container.appendChild(span);
    });
}

// ——— Dummy Camera Gizi ———
let isGiziCameraOn = false;

function startCameraGizi() {
    const btnStart = document.getElementById("btn-start-cam-gizi");
    btnStart.classList.add("hidden");
    
    document.getElementById("camera-placeholder-gizi").style.display = "none";
    document.getElementById("webcam-container-gizi").style.display = "block";
    
    document.getElementById("btn-capture-gizi").classList.remove("hidden");
    isGiziCameraOn = true;
    
    document.getElementById("camera-wrapper-gizi").scrollIntoView({ behavior: "smooth", block: "center" });
}

function stopCameraGizi() {
    isGiziCameraOn = false;
    document.getElementById("webcam-container-gizi").style.display = "none";
    document.getElementById("camera-placeholder-gizi").style.display = "";
    
    const btnStart = document.getElementById("btn-start-cam-gizi");
    btnStart.classList.remove("hidden");
    btnStart.textContent = "Nyalakan Kamera 📹";
    btnStart.disabled = false;
    
    document.getElementById("btn-capture-gizi").classList.add("hidden");
}

function captureGiziDummy() {
    if (!isGiziCameraOn) return;

    // Show loading overlay
    const overlay = document.getElementById("loading-overlay");
    overlay.classList.remove("hidden");
    
    const progressBar = document.getElementById("loading-bar");
    progressBar.style.width = "0%";
    
    const titleEl = document.getElementById("loading-title");
    const subEl = document.getElementById("loading-sub");
    const emojiEl = document.getElementById("loading-emoji");

    const messages = [
        { emoji: "🔍", title: "Memindai makanan...", sub: "Mendeteksi bahan..." },
        { emoji: "🤖", title: "AI sedang berpikir...", sub: "Menghitung kalori..." },
        { emoji: "📊", title: "Menganalisis gizi...", sub: "Mengecek protein & karbo..." },
        { emoji: "✨", title: "Hampir selesai!", sub: "Menyiapkan hasil..." }
    ];

    for (let i = 0; i < messages.length; i++) {
        setTimeout(() => {
            emojiEl.textContent = messages[i].emoji;
            titleEl.textContent = messages[i].title;
            subEl.textContent = messages[i].sub;
            progressBar.style.width = ((i + 1) / messages.length * 100) + "%";
        }, i * 1000);
    }
    
    setTimeout(() => {
        overlay.classList.add("hidden");
        progressBar.style.width = "0%";
        
        // Show result
        const dummyFoods = [
            { emoji: "🍗🍚", name: "Nasi Ayam Bakar", cals: "450 kcal", protein: "28g", carbs: "45g" },
            { emoji: "🥗🥚", name: "Salad Telur Sayur", cals: "250 kcal", protein: "15g", carbs: "10g" },
            { emoji: "🍲🍛", name: "Soto Ayam Nasi", cals: "380 kcal", protein: "20g", carbs: "50g" },
            { emoji: "🐟🥒", name: "Ikan Nila Bakar Lalapan", cals: "320 kcal", protein: "35g", carbs: "12g" },
            { emoji: "🥪🥛", name: "Roti Isi & Susu", cals: "300 kcal", protein: "12g", carbs: "40g" }
        ];
        const food = dummyFoods[Math.floor(Math.random() * dummyFoods.length)];
        
        const resultOverlay = document.getElementById("result-overlay");
        const resultCard = document.getElementById("result-card");
        document.getElementById("result-emoji").textContent = food.emoji;
        document.getElementById("result-status").textContent = food.name;
        document.getElementById("result-desc").innerHTML = `
            <div style="font-size: 1rem; margin-top: 10px; line-height: 1.6; text-align: left; background: rgba(255,255,255,0.5); padding: 12px; border-radius: 12px; border: 1px dashed rgba(0,0,0,0.1);">
                <div>🔥 <strong>Kalori:</strong> ${food.cals}</div>
                <div>💪 <strong>Protein:</strong> ${food.protein}</div>
                <div>🍚 <strong>Karbo:</strong> ${food.carbs}</div>
            </div>
            <div style="margin-top:10px; font-size:0.9rem; color:var(--text-main);">Tetap semangat jaga nutrisi harianmu!</div>
        `;
        document.getElementById("result-points").classList.remove("hidden");
        
        // Hack: temporarily remove inline background so claymorphism styles show up nice
        resultCard.style.background = "";
        // Manually apply background to resultcard to ensure green styling applies nicely or rely on the class. 
        // We'll just define inline similar to the previous script
        resultCard.style.background = "linear-gradient(135deg, rgba(209,250,229,0.92), rgba(187,247,208,0.85))";
        
        resultOverlay.classList.remove("hidden");
        
        fireConfetti();
    }, 4000);
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
        bgColor = "linear-gradient(135deg, rgba(209,250,229,0.95), rgba(187,247,208,0.9))";
        resultPoints.classList.remove("hidden");

        // Record scan
        addScan(user.id, user.kelas, "habis");
        fireConfetti();

    } else if (classLabel.includes("setengah") || classLabel.includes("sisa")) {
        resultEmoji.textContent = "🍛";
        resultStatus.textContent = "Makan Setengah!";
        resultDesc.textContent = "Yah, ayo dihabiskan! Makan bergizi itu penting lho!";
        bgColor = "linear-gradient(135deg, #FFF8E1, #FEF3C7)";
        resultPoints.classList.add("hidden");
        addScan(user.id, user.kelas, "setengah");

    } else if (classLabel.includes("penuh") || classLabel.includes("utuh") || classLabel.includes("belum")) {
        resultEmoji.textContent = "🍚😱";
        resultStatus.textContent = "Masih Penuh?!";
        resultDesc.textContent = "Ompreng masih penuh! Sayang banget kalau nggak dimakan.";
        bgColor = "linear-gradient(135deg, #FFE4E6, #FECDD3)";
        resultPoints.classList.add("hidden");
        addScan(user.id, user.kelas, "penuh");

    } else {
        resultEmoji.textContent = "👀";
        resultStatus.textContent = classLabel.charAt(0).toUpperCase() + classLabel.slice(1);
        resultDesc.textContent = "Model mendeteksi status ompreng kamu.";
        bgColor = "linear-gradient(135deg, #EFF6FF, #DBEAFE)";
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

// ——— Confetti — enhanced with sparkles ———
function fireConfetti() {
    const container = document.getElementById("confetti-container");
    const colors = ["#7C5CFC", "#FF6B8A", "#00D4AA", "#FFB347", "#FFD43B", "#CC5DE8", "#22B8CF", "#FF922B"];
    const count = 80;

    for (let i = 0; i < count; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (2.5 + Math.random() * 2.5) + "s";
        piece.style.animationDelay = Math.random() * 1 + "s";
        piece.style.width = (6 + Math.random() * 12) + "px";
        piece.style.height = (6 + Math.random() * 12) + "px";
        const shapes = ["50%", "3px", "0"];
        piece.style.borderRadius = shapes[Math.floor(Math.random() * shapes.length)];
        if (Math.random() > 0.5) {
            piece.style.boxShadow = `0 0 6px ${piece.style.background}`;
        }
        container.appendChild(piece);
    }

    // Clean up after animation
    setTimeout(() => { container.innerHTML = ""; }, 5000);
}

// ——— Floating Ambient Orbs ———
function spawnFloatingOrbs() {
    const container = document.getElementById("floating-orbs");
    if (!container) return;

    const orbs = [
        { color: "#7C5CFC", size: 200, x: 10, y: 20, dur: 15 },
        { color: "#FF6B8A", size: 160, x: 70, y: 10, dur: 18 },
        { color: "#00D4AA", size: 180, x: 50, y: 70, dur: 12 },
        { color: "#FFB347", size: 140, x: 85, y: 60, dur: 20 },
        { color: "#CC5DE8", size: 120, x: 25, y: 80, dur: 16 },
    ];

    orbs.forEach(o => {
        const el = document.createElement("div");
        el.className = "floating-orb";
        el.style.width = o.size + "px";
        el.style.height = o.size + "px";
        el.style.background = o.color;
        el.style.left = o.x + "%";
        el.style.top = o.y + "%";
        el.style.setProperty("--dur", o.dur + "s");
        container.appendChild(el);
    });
}
