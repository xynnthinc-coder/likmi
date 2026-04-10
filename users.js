// ===== MBG Tracker - Auth & User Management =====
// Data disimpan di localStorage

const AVAILABLE_CLASSES = [
    "X RPL A", "X RPL B", "X RPL C",
    "XI RPL A", "XI RPL B", "XI RPL C",
    "XII RPL A", "XII RPL B", "XII RPL C"
];

const AVATAR_OPTIONS = [
    "😎", "🤓", "😄", "🥳", "🤩", "😺",
    "🦊", "🐸", "🐻", "🐼", "🦁", "🐯",
    "🌟", "⚡", "🔥", "🎯", "🚀", "💎"
];

const DEFAULT_USERS = [
    { id: "u1", username: "siswa1", password: "123456" },
    { id: "u2", username: "siswa2", password: "123456" },
    { id: "u3", username: "siswa3", password: "123456" },
    { id: "u4", username: "demo", password: "demo" }
];

const LS_USERS = "mbg_users";
const LS_CURRENT = "mbg_current_user";

function initAuth() {
    if (!localStorage.getItem(LS_USERS)) {
        const users = DEFAULT_USERS.map(u => ({
            ...u,
            nama: "",
            kelas: "",
            avatar: "😎",
            streak: 0,
            totalScans: 0,
            lastScanDate: null,
            onboarded: false
        }));
        localStorage.setItem(LS_USERS, JSON.stringify(users));
    }
}

function getAllUsers() {
    return JSON.parse(localStorage.getItem(LS_USERS) || "[]");
}

function saveAllUsers(users) {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function authenticate(username, password) {
    const users = getAllUsers();
    const user = users.find(u =>
        u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );
    if (user) {
        localStorage.setItem(LS_CURRENT, JSON.stringify(user));
        return user;
    }
    return null;
}

function registerUser(username, password) {
    const users = getAllUsers();
    if (users.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { error: "Username sudah dipakai!" };
    }
    if (username.length < 3) return { error: "Username minimal 3 karakter!" };
    if (password.length < 4) return { error: "Password minimal 4 karakter!" };

    const newUser = {
        id: "u" + Date.now(),
        username,
        password,
        nama: "",
        kelas: "",
        avatar: "😎",
        streak: 0,
        totalScans: 0,
        lastScanDate: null,
        onboarded: false
    };
    users.push(newUser);
    saveAllUsers(users);
    localStorage.setItem(LS_CURRENT, JSON.stringify(newUser));
    return { user: newUser };
}

function getCurrentUser() {
    const raw = localStorage.getItem(LS_CURRENT);
    return raw ? JSON.parse(raw) : null;
}

function updateUserProfile(userId, updates) {
    const users = getAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return null;

    users[idx] = { ...users[idx], ...updates };
    saveAllUsers(users);

    const current = getCurrentUser();
    if (current && current.id === userId) {
        localStorage.setItem(LS_CURRENT, JSON.stringify(users[idx]));
    }
    return users[idx];
}

function refreshCurrentUser() {
    const current = getCurrentUser();
    if (!current) return null;
    const users = getAllUsers();
    const fresh = users.find(u => u.id === current.id);
    if (fresh) {
        localStorage.setItem(LS_CURRENT, JSON.stringify(fresh));
    }
    return fresh;
}

function logoutUser() {
    localStorage.removeItem(LS_CURRENT);
}
