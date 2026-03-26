let timerInterval = null;
let remainingTime = 0;
let currentTask = "";
let isPaused = false;

const STORAGE_KEYS = {
    xp: "cs2_xp",
    completedMissions: "cs2_completed_missions",
    progressHistory: "cs2_progress_history",
    nickname: "cs2_nickname",
    stats: "cs2_stats",
    faceit: "cs2_faceit",
    theme: "cs2_theme",
    music: "cs2_music",
    achievements: "cs2_achievements",
    mapViews: "cs2_map_views",
    streak: "cs2_streak",
    lastTrainingDate: "cs2_last_training_date",
    aiChat: "cs2_ai_chat"
};

function qs(id) {
    return document.getElementById(id);
}

/* =========================
   XP / LEVEL
========================= */
function getXP() {
    return Number(localStorage.getItem(STORAGE_KEYS.xp)) || 0;
}

function setXP(value) {
    localStorage.setItem(STORAGE_KEYS.xp, value);
    updateXPUI();
    updateRank();
    checkAchievements();
}

function addXP(amount) {
    setXP(getXP() + amount);
}

function getLevelFromXP(xp) {
    return Math.floor(xp / 100) + 1;
}

function getXPInCurrentLevel(xp) {
    return xp % 100;
}

function updateXPUI() {
    const xp = getXP();
    const level = getLevelFromXP(xp);
    const currentXP = getXPInCurrentLevel(xp);

    const levelElements = document.querySelectorAll('[data-role="levelValue"]');
    const xpTextElements = document.querySelectorAll('[data-role="xpText"]');
    const xpBarElements = document.querySelectorAll('[data-role="xpBar"]');

    levelElements.forEach(el => el.textContent = `Level ${level}`);
    xpTextElements.forEach(el => el.textContent = `${currentXP}/100 XP`);
    xpBarElements.forEach(el => el.style.width = `${currentXP}%`);
}

/* =========================
   RANK
========================= */
function getRank(xp) {
    if (xp < 100) return "Silver";
    if (xp < 300) return "Gold";
    if (xp < 600) return "Master";
    return "Pro";
}

function updateRank() {
    const rankEl = qs("rankText");
    if (!rankEl) return;
    rankEl.textContent = `Rank: ${getRank(getXP())}`;
}

/* =========================
   TIMER
========================= */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function startTimer(seconds, taskName) {
    stopTimer(false);

    remainingTime = seconds;
    currentTask = taskName;
    isPaused = false;

    if (qs("timer")) qs("timer").textContent = formatTime(remainingTime);
    if (qs("taskName")) qs("taskName").textContent = `Сейчас: ${taskName}`;
    if (qs("timerStatus")) qs("timerStatus").textContent = "Таймер запущен";

    timerInterval = setInterval(runTimerTick, 1000);
}

function runTimerTick() {
    remainingTime--;

    if (qs("timer")) qs("timer").textContent = formatTime(remainingTime);

    if (remainingTime <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;

        if (qs("taskName")) qs("taskName").textContent = `${currentTask} завершено`;
        if (qs("timerStatus")) qs("timerStatus").textContent = "Таймер завершён";

        playFinishSound();
        addXP(25);
        improveStatsAfterTraining(currentTask);
        saveTrainingHistory(currentTask, "Завершено по таймеру");
        updateFaceitMock();
        updateStreak();
        checkAchievements();
        alert(`Тренировка "${currentTask}" завершена! +25 XP`);
    }
}

function pauseTimer() {
    if (!timerInterval && !isPaused) return;

    if (!isPaused) {
        clearInterval(timerInterval);
        timerInterval = null;
        isPaused = true;
        if (qs("timerStatus")) qs("timerStatus").textContent = "Пауза";
    } else {
        timerInterval = setInterval(runTimerTick, 1000);
        isPaused = false;
        if (qs("timerStatus")) qs("timerStatus").textContent = "Таймер запущен";
    }

    playClickSound();
}

function stopTimer(resetText = true) {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    isPaused = false;

    if (resetText) {
        if (qs("timer")) qs("timer").textContent = "00:00";
        if (qs("taskName")) qs("taskName").textContent = "Пока ничего не запущено";
        if (qs("timerStatus")) qs("timerStatus").textContent = "Ожидание";
    }
}

/* =========================
   SOUND
========================= */
function playFinishSound() {
    try {
        const audio = new Audio("data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTAAAAAAAP//AAD//wAA//8AAP//AAD//wAA");
        audio.play();
    } catch (e) {}
}

function playClickSound() {
    try {
        const audio = new Audio("data:audio/wav;base64,UklGRkoAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSYAAAAA////AP///wD///8AAP///wAA");
        audio.volume = 0.15;
        audio.play();
    } catch (e) {}
}

document.addEventListener("click", (e) => {
    if (e.target.closest(".btn") || e.target.closest(".theme-btn") || e.target.closest(".music-btn")) {
        playClickSound();
    }
});

/* =========================
   MUSIC
========================= */
function initMusic() {
    const music = qs("bgMusic");
    const btn = qs("musicToggle");

    if (!music || !btn) return;

    let isPlaying = localStorage.getItem(STORAGE_KEYS.music) === "on";

    function updateMusicUI() {
        btn.textContent = isPlaying ? "🔊 Музыка" : "🔇 Без звука";
    }

    updateMusicUI();

    if (isPlaying) {
        music.volume = 0.15;
        music.play().catch(() => {});
    }

    btn.addEventListener("click", () => {
        isPlaying = !isPlaying;
        localStorage.setItem(STORAGE_KEYS.music, isPlaying ? "on" : "off");

        if (isPlaying) {
            music.volume = 0.15;
            music.play().catch(() => {});
        } else {
            music.pause();
        }

        updateMusicUI();
    });
}

/* =========================
   TIPS / AI COACH BUTTON
========================= */
function showTip(text = null) {
    const tipEl = qs("tipText");
    if (!tipEl) return;

    if (text) {
        tipEl.textContent = text;
        return;
    }

    if (typeof coachTips !== "undefined" && coachTips.length > 0) {
        const randomIndex = Math.floor(Math.random() * coachTips.length);
        tipEl.textContent = coachTips[randomIndex];
    }
}

function showRandomCoachTip() {
    showTip();
}

function getAICoachAdvice() {
    const aiText = qs("aiCoachText");
    if (!aiText) return;

    const stats = getStats();
    const xp = getXP();
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.progressHistory) || "[]");

    let advice = "";

    if (xp < 100) {
        advice = "Ты еще в начале пути. Сделай базу: 10 минут aim, 1 карту со смоками и 1 разбор ошибки после игры.";
    } else if (stats.aim > stats.macro && stats.aim > stats.sense) {
        advice = "У тебя аим уже сильнее остальных навыков. Сейчас выгоднее качать macro и game sense.";
    } else if (stats.macro < stats.aim && stats.macro < stats.sense) {
        advice = "Слабое место сейчас — macro. Пора больше работать над ротациями, пониманием карты и решениями по раунду.";
    } else if (stats.sense < 60) {
        advice = "Тебе стоит подтянуть game sense. Смотри демки, анализируй свои смерти и думай, какую инфу ты пропустил.";
    } else if (history.length === 0) {
        advice = "У тебя пока нет истории тренировок. Начни с Aim Routine, потом посмотри одну раскидку и сохрани первый прогресс.";
    } else {
        advice = "Баланс уже неплохой. Сегодня рекомендую сделать 10 минут aim, одну тренировку macro и повторить 2 полезные раскидки.";
    }

    aiText.textContent = advice;
}

/* =========================
   AI CHAT
========================= */
function getAIChatHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.aiChat) || "[]");
}

function setAIChatHistory(history) {
    localStorage.setItem(STORAGE_KEYS.aiChat, JSON.stringify(history));
}

function renderAIChat() {
    const chatBox = qs("aiChatMessages");
    if (!chatBox) return;

    const history = getAIChatHistory();

    if (history.length === 0) {
        chatBox.innerHTML = `<div class="progress-item"><p>AI тренер ждёт твой вопрос.</p></div>`;
        return;
    }

    chatBox.innerHTML = history.map(item => `
        <div class="progress-item">
            <p><strong>${item.role === "user" ? "Ты" : "AI Тренер"}:</strong></p>
            <p>${item.text}</p>
        </div>
    `).join("");
    chatBox.scrollTop = chatBox.scrollHeight;
}

function askAITrainer() {
    const input = qs("aiChatInput");
    if (!input) return;

    const question = input.value.trim();
    if (!question) return;

    const history = getAIChatHistory();
    history.push({ role: "user", text: question });

    const answer = generateAIAnswer(question);
    history.push({ role: "ai", text: answer });

    setAIChatHistory(history);
    renderAIChat();
    input.value = "";
}

function generateAIAnswer(question) {
    const q = question.toLowerCase();
    const stats = getStats();
    const xp = getXP();

    if (q.includes("aim")) {
        return "Если хочешь апнуть aim, делай 10 минут Aim Botz, потом Headshot DM и следи за точностью первого выстрела.";
    }

    if (q.includes("macro") || q.includes("карта") || q.includes("ротац")) {
        return "Для macro тебе нужно лучше читать карту: следи за таймингами, экономикой врага и не перетягивайся слишком рано.";
    }

    if (q.includes("faceit") || q.includes("elo")) {
        return "Для Faceit главное — стабильность. Сделай warmup, не тильтуй и после игры разбери 1-2 ошибки.";
    }

    if (q.includes("smoke") || q.includes("раскид")) {
        return "Выучи 2-3 полезные раскидки на одной карте и сразу закрепляй их в игре, а не только на практике.";
    }

    if (q.includes("что тренировать") || q.includes("что качать")) {
        if (stats.aim < stats.macro) {
            return "Сейчас тебе выгоднее качать aim. Начни с 10 минут Aim Botz и 10 минут DM.";
        }
        return "Сейчас тебе выгоднее качать macro и game sense: тайминги, инфа, ротации, разбор своих ошибок.";
    }

    if (xp < 100) {
        return "Ты в начале пути. Совет: базовый warmup, одна тактическая тренировка и 1 разбор своей ошибки.";
    }

    return "Норм вопрос. Мой совет: тренируй не только аим, но и мышление. Самые сильные игроки побеждают за счёт решений, а не только стрельбы.";
}

/* =========================
   MAPS
========================= */
function getMapViews() {
    return Number(localStorage.getItem(STORAGE_KEYS.mapViews)) || 0;
}

function setMapViews(value) {
    localStorage.setItem(STORAGE_KEYS.mapViews, value);
    checkAchievements();
}

function showMap(key) {
    const result = qs("mapResult");
    if (!result || typeof mapConfigs === "undefined") return;

    if (mapConfigs[key]) {
        let html = `<strong>${mapConfigs[key].title}</strong><br><br>${mapConfigs[key].text}`;

        if (mapConfigs[key].image) {
            html += `<br><br><img src="/static/${mapConfigs[key].image}" alt="${mapConfigs[key].title}" class="map-image">`;
        }

        result.innerHTML = html;
        addXP(10);
        setMapViews(getMapViews() + 1);
    } else {
        result.textContent = "Нет данных по этой раскидке";
    }
}

/* =========================
   DAILY MISSION
========================= */
function getCompletedMissions() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.completedMissions) || "[]");
}

function setCompletedMissions(arr) {
    localStorage.setItem(STORAGE_KEYS.completedMissions, JSON.stringify(arr));
}

function toggleMission(id, xp) {
    let completed = getCompletedMissions();

    if (completed.includes(id)) {
        completed = completed.filter(item => item !== id);
    } else {
        completed.push(id);
        addXP(xp);
    }

    setCompletedMissions(completed);
    renderDailyMissions();
    checkAchievements();
}

function renderDailyMissions() {
    const container = qs("dailyMissionList");
    if (!container || typeof dailyMissions === "undefined") return;

    const completed = getCompletedMissions();
    container.innerHTML = "";

    dailyMissions.forEach(mission => {
        const checked = completed.includes(mission.id);

        const item = document.createElement("div");
        item.className = `mission-item ${checked ? "mission-done" : ""}`;
        item.innerHTML = `
            <label>
                <input type="checkbox" ${checked ? "checked" : ""} onchange="toggleMission('${mission.id}', ${mission.xp})">
                <span>${mission.text} (+${mission.xp} XP)</span>
            </label>
        `;
        container.appendChild(item);
    });
}

/* =========================
   HISTORY
========================= */
function saveTrainingHistory(title, description) {
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.progressHistory) || "[]");
    const today = new Date();
    const dateText = today.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long"
    });

    history.unshift({
        date: dateText,
        title,
        description,
        done: true
    });

    localStorage.setItem(STORAGE_KEYS.progressHistory, JSON.stringify(history.slice(0, 12)));
    renderSavedProgress();
}

function renderSavedProgress() {
    const container = qs("savedProgressList");
    if (!container) return;

    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.progressHistory) || "[]");

    if (history.length === 0) {
        container.innerHTML = `<div class="progress-item"><h4>Пока пусто</h4><p>Начни тренироваться, и прогресс появится здесь.</p></div>`;
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="progress-item fade-in">
            <h4>📅 ${item.date}</h4>
            <p><strong>${item.title}</strong></p>
            <p>${item.description}</p>
            <div class="status-done">✅ Выполнено</div>
        </div>
    `).join("");
}

/* =========================
   PROFILE
========================= */
function getNickname() {
    return localStorage.getItem(STORAGE_KEYS.nickname) || "Faceit Player";
}

function saveNickname() {
    const input = qs("nicknameInput");
    if (!input) return;
    localStorage.setItem(STORAGE_KEYS.nickname, input.value.trim() || "Faceit Player");
    renderNickname();
}

function renderNickname() {
    const value = getNickname();
    if (qs("nicknameValue")) qs("nicknameValue").textContent = value;
    if (qs("nicknameInput")) qs("nicknameInput").value = value;
}

/* =========================
   STATS
========================= */
function getStats() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || JSON.stringify(defaultStats));
}

function setStats(stats) {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
    renderStats();
}

function renderStats() {
    const stats = getStats();

    const bind = (name, value) => {
        const bar = qs(`${name}Bar`);
        const text = qs(`${name}Value`);
        if (bar) bar.style.width = `${value}%`;
        if (text) text.textContent = `${value}%`;
    };

    bind("aim", stats.aim);
    bind("macro", stats.macro);
    bind("sense", stats.sense);
}

function improveStatsAfterTraining(taskName) {
    const stats = getStats();

    if (taskName.toLowerCase().includes("aim")) {
        stats.aim = Math.min(100, stats.aim + 2);
    } else if (taskName.toLowerCase().includes("warmup")) {
        stats.aim = Math.min(100, stats.aim + 1);
        stats.sense = Math.min(100, stats.sense + 1);
    } else {
        stats.macro = Math.min(100, stats.macro + 1);
        stats.sense = Math.min(100, stats.sense + 1);
    }

    setStats(stats);
}

/* =========================
   FACEIT MOCK
========================= */
function getFaceitData() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.faceit) || JSON.stringify({
        elo: 840,
        matches: 12,
        winrate: 54,
        kd: 1.08
    }));
}

function setFaceitData(data) {
    localStorage.setItem(STORAGE_KEYS.faceit, JSON.stringify(data));
    renderFaceit();
}

function renderFaceit() {
    const data = getFaceitData();
    if (qs("faceitElo")) qs("faceitElo").textContent = data.elo;
    if (qs("faceitMatches")) qs("faceitMatches").textContent = data.matches;
    if (qs("faceitWinrate")) qs("faceitWinrate").textContent = `${data.winrate}%`;
    if (qs("faceitKd")) qs("faceitKd").textContent = data.kd.toFixed(2);
}

function updateFaceitMock() {
    const data = getFaceitData();
    data.matches += 1;
    data.elo += Math.floor(Math.random() * 16) - 3;
    data.winrate = Math.min(100, Math.max(1, data.winrate + (Math.random() > 0.5 ? 1 : 0)));
    data.kd = Math.min(2.5, Math.max(0.5, data.kd + 0.01));
    setFaceitData(data);
}

/* =========================
   ACHIEVEMENTS
========================= */
function getAchievements() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) || "[]");
}

function setAchievements(list) {
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(list));
    renderAchievements();
}

function unlockAchievement(id, title) {
    const current = getAchievements();
    if (current.some(item => item.id === id)) return;

    current.push({ id, title });
    setAchievements(current);
    alert(`🏆 Достижение открыто: ${title}`);
}

function checkAchievements() {
    const xp = getXP();
    const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.progressHistory) || "[]");
    const mapViews = getMapViews();
    const streak = getStreak();

    if (history.length >= 1) unlockAchievement("first_training", "Первая тренировка");
    if (xp >= 100) unlockAchievement("grinder_100", "Гриндер 100 XP");
    if (xp >= 300) unlockAchievement("grinder_300", "Гриндер 300 XP");
    if (mapViews >= 3) unlockAchievement("smoke_learner", "Smoke Learner");
    if (streak >= 3) unlockAchievement("streak_3", "Стрик 3 дня");
}

function renderAchievements() {
    const box = qs("achievementsList");
    if (!box) return;

    const items = getAchievements();

    if (items.length === 0) {
        box.innerHTML = `<div class="progress-item"><p>Пока достижений нет.</p></div>`;
        return;
    }

    box.innerHTML = items.map(item => `
        <div class="progress-item">
            <h4>🏆 ${item.title}</h4>
        </div>
    `).join("");
}

/* =========================
   STREAK
========================= */
function getTodayDateString() {
    const today = new Date();
    return today.toISOString().split("T")[0];
}

function getYesterdayDateString() {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
}

function getStreak() {
    return Number(localStorage.getItem(STORAGE_KEYS.streak)) || 0;
}

function setStreak(value) {
    localStorage.setItem(STORAGE_KEYS.streak, value);
    renderStreak();
}

function updateStreak() {
    const today = getTodayDateString();
    const yesterday = getYesterdayDateString();
    const lastDate = localStorage.getItem(STORAGE_KEYS.lastTrainingDate);
    let streak = getStreak();

    if (lastDate === today) {
        renderStreak();
        return;
    }

    if (lastDate === yesterday) {
        streak += 1;
    } else {
        streak = 1;
    }

    localStorage.setItem(STORAGE_KEYS.lastTrainingDate, today);
    setStreak(streak);
    checkAchievements();
}

function renderStreak() {
    const el = qs("streakValue");
    if (!el) return;
    el.textContent = `🔥 Стрик: ${getStreak()} дн.`;
}

/* =========================
   THEME
========================= */
function setTheme(name) {
    const theme = themes[name];
    if (!theme) return;

    document.documentElement.style.setProperty("--accent-main", theme.main);
    document.documentElement.style.setProperty("--accent-dark", theme.dark);
    document.documentElement.style.setProperty("--accent-glow", theme.glow);
    document.documentElement.style.setProperty("--accent-soft", theme.glow.replace("0.35", "0.12"));
    document.documentElement.style.setProperty("--accent-border", theme.glow.replace("0.35", "0.28"));

    localStorage.setItem(STORAGE_KEYS.theme, name);

    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("theme-active", btn.dataset.theme === name);
    });
}

function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme) || "green";
    setTheme(saved);
}

/* =========================
   START
========================= */
document.addEventListener("DOMContentLoaded", () => {
    updateXPUI();
    renderDailyMissions();
    renderSavedProgress();
    renderNickname();
    renderStats();
    renderFaceit();
    renderAchievements();
    renderStreak();
    renderAIChat();
    initTheme();
    initMusic();
    updateRank();
});
/* =========================
   CLOUD ACCOUNT / SERVER SAVE
========================= */

async function apiJSON(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        ...options
    });
    return response.json();
}

function collectLocalProgress() {
    return {
        xp: Number(localStorage.getItem(STORAGE_KEYS.xp)) || 0,
        completedMissions: JSON.parse(localStorage.getItem(STORAGE_KEYS.completedMissions) || "[]"),
        progressHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.progressHistory) || "[]"),
        nickname: localStorage.getItem(STORAGE_KEYS.nickname) || "Faceit Player",
        stats: JSON.parse(localStorage.getItem(STORAGE_KEYS.stats) || JSON.stringify(defaultStats)),
        faceit: JSON.parse(localStorage.getItem(STORAGE_KEYS.faceit) || JSON.stringify({
            elo: 840, matches: 12, winrate: 54, kd: 1.08
        })),
        theme: localStorage.getItem(STORAGE_KEYS.theme) || "green",
        music: localStorage.getItem(STORAGE_KEYS.music) || "off",
        achievements: JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) || "[]"),
        mapViews: Number(localStorage.getItem(STORAGE_KEYS.mapViews)) || 0,
        streak: Number(localStorage.getItem(STORAGE_KEYS.streak)) || 0,
        lastTrainingDate: localStorage.getItem(STORAGE_KEYS.lastTrainingDate) || "",
        aiChat: JSON.parse(localStorage.getItem(STORAGE_KEYS.aiChat) || "[]")
    };
}

function applyCloudProgress(progress) {
    localStorage.setItem(STORAGE_KEYS.xp, progress.xp ?? 0);
    localStorage.setItem(STORAGE_KEYS.completedMissions, JSON.stringify(progress.completedMissions ?? []));
    localStorage.setItem(STORAGE_KEYS.progressHistory, JSON.stringify(progress.progressHistory ?? []));
    localStorage.setItem(STORAGE_KEYS.nickname, progress.nickname ?? "Faceit Player");
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(progress.stats ?? defaultStats));
    localStorage.setItem(STORAGE_KEYS.faceit, JSON.stringify(progress.faceit ?? { elo: 840, matches: 12, winrate: 54, kd: 1.08 }));
    localStorage.setItem(STORAGE_KEYS.theme, progress.theme ?? "green");
    localStorage.setItem(STORAGE_KEYS.music, progress.music ?? "off");
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(progress.achievements ?? []));
    localStorage.setItem(STORAGE_KEYS.mapViews, progress.mapViews ?? 0);
    localStorage.setItem(STORAGE_KEYS.streak, progress.streak ?? 0);
    localStorage.setItem(STORAGE_KEYS.lastTrainingDate, progress.lastTrainingDate ?? "");
    localStorage.setItem(STORAGE_KEYS.aiChat, JSON.stringify(progress.aiChat ?? []));
}

async function saveCloudProgress() {
    try {
        const me = await apiJSON("/api/me");
        if (!me.logged_in) return;

        const progress = collectLocalProgress();
        await apiJSON("/api/progress", {
            method: "POST",
            body: JSON.stringify({ progress })
        });
    } catch (e) {
        console.log("cloud save error");
    }
}

async function loadCloudProgress() {
    try {
        const me = await apiJSON("/api/me");
        const authStatus = qs("authStatus");

        if (authStatus) {
            authStatus.textContent = me.logged_in
                ? `Ты вошёл как: ${me.username}`
                : "Ты не вошёл в аккаунт";
        }

        if (!me.logged_in) return;

        const data = await apiJSON("/api/progress");
        if (data.ok && data.progress) {
            applyCloudProgress(data.progress);

            updateXPUI();
            updateRank();
            renderDailyMissions();
            renderSavedProgress();
            renderNickname();
            renderStats();
            renderFaceit();
            renderAchievements();
            renderStreak();
            renderAIChat();
            initTheme();
        }
    } catch (e) {
        console.log("cloud load error");
    }
}

async function registerAccount() {
    const username = qs("registerUsername")?.value?.trim();
    const password = qs("registerPassword")?.value?.trim();

    const data = await apiJSON("/api/register", {
        method: "POST",
        body: JSON.stringify({ username, password })
    });

    if (!data.ok) {
        alert(data.error || "Ошибка регистрации");
        return;
    }

    await saveCloudProgress();
    alert("Аккаунт создан");
    await loadCloudProgress();
}

async function loginAccount() {
    const username = qs("loginUsername")?.value?.trim();
    const password = qs("loginPassword")?.value?.trim();

    const data = await apiJSON("/api/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
    });

    if (!data.ok) {
        alert(data.error || "Ошибка входа");
        return;
    }

    await loadCloudProgress();
    alert("Ты вошёл в аккаунт");
}

async function logoutAccount() {
    await apiJSON("/api/logout", { method: "POST" });
    alert("Ты вышел");
    window.location.reload();
}

setInterval(() => {
    saveCloudProgress();
}, 10000);

document.addEventListener("DOMContentLoaded", () => {
    loadCloudProgress();
});
function copyCard() {
    const card = document.getElementById("kaspiCard").textContent.trim();

    navigator.clipboard.writeText(card)
        .then(() => alert("Карта скопирована 💳"))
        .catch(() => alert("Ошибка копирования"));
}
