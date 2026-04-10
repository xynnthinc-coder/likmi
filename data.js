// ===== MBG Tracker - Scan Data & Leaderboard =====

const LS_SCANS = "mbg_scans";

function initData() {
    if (!localStorage.getItem(LS_SCANS)) {
        // Pre-seed dummy weekly scans for demo leaderboard
        const scans = generateDummyScans();
        localStorage.setItem(LS_SCANS, JSON.stringify(scans));
    }
}

function generateDummyScans() {
    const results = ["habis", "setengah", "penuh"];
    const scans = [];
    const now = new Date();

    // Get start of current week (Monday)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startOfWeek.setDate(startOfWeek.getDate() - diff);
    startOfWeek.setHours(8, 0, 0, 0);

    // Generate dummy scans for this week
    const dummyData = {
        "XI RPL C": { habis: 28, setengah: 3, penuh: 1 },
        "XII RPL A": { habis: 25, setengah: 5, penuh: 2 },
        "X RPL B":  { habis: 22, setengah: 4, penuh: 3 },
        "XI RPL A": { habis: 19, setengah: 6, penuh: 4 },
        "XII RPL B": { habis: 17, setengah: 5, penuh: 5 },
        "X RPL A":  { habis: 15, setengah: 7, penuh: 3 },
        "XII RPL C": { habis: 12, setengah: 8, penuh: 5 },
        "XI RPL B": { habis: 10, setengah: 6, penuh: 7 },
        "X RPL C":  { habis: 8, setengah: 9, penuh: 6 }
    };

    Object.entries(dummyData).forEach(([kelas, counts]) => {
        Object.entries(counts).forEach(([result, count]) => {
            for (let i = 0; i < count; i++) {
                const scanDate = new Date(startOfWeek);
                scanDate.setDate(scanDate.getDate() + Math.floor(Math.random() * 5));
                scanDate.setHours(11 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
                scans.push({
                    id: "s" + Date.now() + Math.random().toString(36).slice(2, 6),
                    userId: "dummy",
                    kelas,
                    result,
                    timestamp: scanDate.toISOString()
                });
            }
        });
    });

    return scans;
}

function getAllScans() {
    return JSON.parse(localStorage.getItem(LS_SCANS) || "[]");
}

function saveAllScans(scans) {
    localStorage.setItem(LS_SCANS, JSON.stringify(scans));
}

function addScan(userId, kelas, result) {
    const scans = getAllScans();
    const scan = {
        id: "s" + Date.now(),
        userId,
        kelas,
        result: result.toLowerCase(),
        timestamp: new Date().toISOString()
    };
    scans.push(scan);
    saveAllScans(scans);

    // Update user stats
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        users[idx].totalScans = (users[idx].totalScans || 0) + 1;

        // Streak logic: if result is "habis" and last scan wasn't today
        if (result.toLowerCase().includes("habis") || result.toLowerCase().includes("kosong")) {
            const today = new Date().toDateString();
            const lastDate = users[idx].lastScanDate;

            if (lastDate !== today) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (lastDate === yesterday.toDateString()) {
                    users[idx].streak = (users[idx].streak || 0) + 1;
                } else if (!lastDate) {
                    users[idx].streak = 1;
                } else {
                    users[idx].streak = 1; // Reset streak
                }
                users[idx].lastScanDate = today;
            }
        }

        saveAllUsers(users);
        // Refresh current user in session
        const current = getCurrentUser();
        if (current && current.id === userId) {
            localStorage.setItem(LS_CURRENT, JSON.stringify(users[idx]));
        }
    }

    return scan;
}

function getStartOfWeek() {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(now);
    start.setDate(start.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

function getWeeklyLeaderboard() {
    const scans = getAllScans();
    const weekStart = getStartOfWeek();

    // Filter scans this week where result is "habis"
    const weeklyHabis = scans.filter(s => {
        const scanDate = new Date(s.timestamp);
        return scanDate >= weekStart &&
               (s.result.includes("habis") || s.result.includes("kosong"));
    });

    // Group by kelas
    const grouped = {};
    AVAILABLE_CLASSES.forEach(k => grouped[k] = 0);

    weeklyHabis.forEach(s => {
        if (grouped[s.kelas] !== undefined) {
            grouped[s.kelas]++;
        }
    });

    // Convert to array, sort desc
    return Object.entries(grouped)
        .map(([kelas, count]) => ({ kelas, count }))
        .sort((a, b) => b.count - a.count);
}

function getUserWeeklyScans(userId) {
    const scans = getAllScans();
    const weekStart = getStartOfWeek();
    return scans.filter(s => s.userId === userId && new Date(s.timestamp) >= weekStart);
}

function getWeeklyStats() {
    const scans = getAllScans();
    const weekStart = getStartOfWeek();
    const weekly = scans.filter(s => new Date(s.timestamp) >= weekStart);

    const total = weekly.length;
    const habis = weekly.filter(s => s.result.includes("habis") || s.result.includes("kosong")).length;
    const percentage = total > 0 ? Math.round((habis / total) * 100) : 0;

    return { total, habis, percentage };
}
