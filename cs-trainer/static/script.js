let timerInterval = null;
let remainingTime = 0;
let currentTask = "";
let isPaused = false;

const STORAGE_KEYS = {
    xp: "cs2_xp",
    nickname: "cs2_nickname",
    theme: "cs2_theme",
    music: "cs2_music",
    completedMissions: "cs2_completed_missions",
    progressHistory: "cs2_progress_history",
    achievements: "cs2_achievements",
    mapViews: "cs2_map_views",
    streak: "cs2_streak",
    lastTrainingDate: "cs2_last_training_date",
    aiChat: "cs2_ai_chat",
    activity: "cs2_activity"
};

function qs(id) {
    return document.getElementById(id);
}

/* =========================
   DEFAULT DATA
========================= */
function defaultActivity() {
    return {
        aim_completed: 0,
        macro_completed: 0,
        sense_completed: 0,
        map_views: 0,
        tips_used: 0
    };
}

function defaultProgress() {
    return {
        xp: 0,
        nickname: "Faceit Player",
        theme: "green",
        music: "off",
        completedMissions: [],
        progressHistory: [],
        achievements: [],
        mapViews: 0,
        streak: 0,
        lastTrainingDate: "",
        aiChat: [],
        activity: defaultActivity()
    };
}

/* =========================
   LOCAL GET / SET
========================= */
function getXP() {
    return Number(localStorage.getItem(STORAGE_KEYS.xp)) || 0;
}

function setXP(value) {
    localStorage.setItem(STORAGE_KEYS.xp, value);
    updateXPUI();
    updateRank();
}

function addXP(amount) {
    setXP(getXP() + amount);
}

function getNickname() {
    return localStorage.getItem(STORAGE_KEYS.nickname) || "Faceit Player";
}

function saveNickname() {
    const input = qs("nicknameInput");
    if (!input) return;
    localStorage.setItem(STORAGE_KEYS.nickname, input.value.trim() || "Faceit Player");
    renderNickname();
    saveCloudProgress();
}

function renderNickname() {
    const value = getNickname();
    if (qs("nicknameValue")) qs("nicknameValue").textContent = value;
    if (qs("nicknameInput")) qs("nicknameInput").value = value;
}

function getCompletedMissions() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.completedMissions) || "[]");
}

function setCompletedMissions(arr) {
    localStorage.setItem(STORAGE_KEYS.completedMissions, JSON.stringify(arr));
}

function getAchievements() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) || "[]");
}

function setAchievements(arr) {
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(arr));
    renderAchievements();
}

function getActivity() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.activity) || JSON.stringify(defaultActivity()));
}

function setActivity(data) {
    localStorage.setItem(STORAGE_KEYS.activity, JSON.stringify(data));
    updateSkillPercentages();
    renderPlayerAnalysis();
}

/* =========================
   XP / LEVEL
========================= */
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

    document.querySelectorAll('[data-role="levelValue"]').forEach(el => {
        el.textContent = `Level ${level}`;
    });

    document.querySelectorAll('[data-role="xpText"]').forEach(el => {
        el.textContent = `${currentXP}/100 XP`;
    });

    document.querySelectorAll('[data-role="xpBar"]').forEach(el => {
        el.style.width = `${currentXP}%`;
    });
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
    const el = qs("rankText");
    if (!el) return;
    el.textContent = `Rank: ${getRank(getXP())}`;
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
    playClickSound();
}

function runTimerTick() {
    remainingTime--;

    if (qs("timer")) qs("timer").textContent = formatTime(remainingTime);

    if (remainingTime <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;

        if (qs("taskName")) qs("taskName").textContent = `${currentTask} завершено`;
        if (qs("timerStatus")) qs("timerStatus").textContent = "Таймер завершён";

        completeTrainingByTask(currentTask);
        playFinishSound();
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

function completeTrainingByTask(taskName) {
    const lower = taskName.toLowerCase();

    addXP(25);
    updateStreak();
    saveTrainingHistory(taskName, "Завершено по таймеру");

    const activity = getActivity();

    if (lower.includes("aim")) {
        activity.aim_completed += 1;
    } else if (
        lower.includes("macro") ||
        lower.includes("map") ||
        lower.includes("smoke")
    ) {
        activity.macro_completed += 1;
    } else {
        activity.sense_completed += 1;
    }

    setActivity(activity);
    checkAchievements();
    saveCloudProgress();

    alert(`Тренировка "${taskName}" завершена! +25 XP`);
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
        saveCloudProgress();
    });
}

/* =========================
   THEME
========================= */
function setTheme(name) {
    if (typeof themes === "undefined") return;
    const theme = themes[name];
    if (!theme) return;

    document.documentElement.style.setProperty("--accent-main", theme.main);
    document.documentElement.style.setProperty("--accent-dark", theme.dark);
    document.documentElement.style.setProperty("--accent-glow", theme.glow);

    localStorage.setItem(STORAGE_KEYS.theme, name);

    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("theme-active", btn.dataset.theme === name);
    });

    saveCloudProgress();
}

function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEYS.theme) || "green";
    setTheme(saved);
}

/* =========================
   TIPS / AI
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

        const activity = getActivity();
        activity.tips_used += 1;
        setActivity(activity);
        saveCloudProgress();
    }
}

function showRandomCoachTip() {
    showTip();
}

function getAICoachAdvice() {
    const aiText = qs("aiCoachText");
    if (!aiText) return;

    const activity = getActivity();
    const aim = getAimPercent();
    const macro = getMacroPercent();
    const sense = getSensePercent();

    let advice = "";

    if (aim < macro && aim < sense) {
        advice = "Сейчас тебе лучше прокачивать aim: сделай Aim Botz, потом Fast Aim и немного DM.";
    } else if (macro < aim && macro < sense) {
        advice = "Слабое место сейчас — macro. Пора учить карту, тайминги и ротации.";
    } else if (sense < aim && sense < macro) {
        advice = "Тебе стоит апнуть game sense: разбирай ошибки, читай игру и чаще смотри советы.";
    } else if (activity.map_views < 3) {
        advice = "Ты мало работаешь с картами. Посмотри полезные раскидки и закрепи их в игре.";
    } else {
        advice = "Баланс уже неплохой. Сегодня рекомендую сделать 1 aim тренировку, 1 macro тренировку и 1 разбор игры.";
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
    saveCloudProgress();
}

function generateAIAnswer(question) {
    const q = question.toLowerCase();
    const aim = getAimPercent();
    const macro = getMacroPercent();
    const sense = getSensePercent();

    if (q.includes("aim")) {
        return "Для aim делай короткий, но плотный warmup: Aim Botz, Fast Aim и 10 минут DM.";
    }

    if (q.includes("macro") || q.includes("карта") || q.includes("ротац")) {
        return "Macro качается через карту, тайминги и понимание экономики. Учись принимать решения раньше соперника.";
    }

    if (q.includes("sense") || q.includes("гейм") || q.includes("чувств")) {
        return "Game sense растёт, когда ты анализируешь свои смерти, понимаешь инфу и читаешь игру по таймингам.";
    }

    if (q.includes("что качать")) {
        if (aim <= macro && aim <= sense) return "Сейчас качай aim.";
        if (macro <= aim && macro <= sense) return "Сейчас качай macro.";
        return "Сейчас качай game sense.";
    }

    return `Сейчас твои показатели такие: Aim ${aim}%, Macro ${macro}%, Game Sense ${sense}%. Продолжай тренировки и усиливай слабую сторону.`;
}

/* =========================
   MAPS
========================= */
function showMap(key) {
    const result = qs("mapResult");
    if (!result || typeof mapConfigs === "undefined") return;

    if (mapConfigs[key]) {
        let html = `<strong>${mapConfigs[key].title}</strong><br><br>${mapConfigs[key].text}`;

        if (mapConfigs[key].image) {
            html += `<br><br><img src="/static/${mapConfigs[key].image}" alt="${mapConfigs[key].title}" class="map-image">`;
        }

        result.innerHTML = html;

        const activity = getActivity();
        activity.map_views += 1;
        setActivity(activity);

        localStorage.setItem(STORAGE_KEYS.mapViews, String((Number(localStorage.getItem(STORAGE_KEYS.mapViews)) || 0) + 1));
        addXP(10);
        checkAchievements();
        saveCloudProgress();
    } else {
        result.textContent = "Нет данных по этой раскидке";
    }
}

/* =========================
   DAILY MISSIONS
========================= */
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
    saveCloudProgress();
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
   SKILLS
========================= */
function clampPercent(value) {
    return Math.max(0, Math.min(100, value));
}

function getAimPercent() {
    const activity = getActivity();
    return clampPercent(activity.aim_completed * 6);
}

function getMacroPercent() {
    const activity = getActivity();
    return clampPercent(activity.macro_completed * 6 + activity.map_views * 2);
}

function getSensePercent() {
    const activity = getActivity();
    return clampPercent(activity.sense_completed * 6 + activity.tips_used * 2);
}

function updateSkillPercentages() {
    const aim = getAimPercent();
    const macro = getMacroPercent();
    const sense = getSensePercent();

    if (qs("aimBar")) qs("aimBar").style.width = `${aim}%`;
    if (qs("macroBar")) qs("macroBar").style.width = `${macro}%`;
    if (qs("senseBar")) qs("senseBar").style.width = `${sense}%`;

    if (qs("aimValue")) qs("aimValue").textContent = `${aim}%`;
    if (qs("macroValue")) qs("macroValue").textContent = `${macro}%`;
    if (qs("senseValue")) qs("senseValue").textContent = `${sense}%`;
}

function renderPlayerAnalysis() {
    const el = qs("playerAnalysis");
    if (!el) return;

    const aim = getAimPercent();
    const macro = getMacroPercent();
    const sense = getSensePercent();

    if (aim <= macro && aim <= sense) {
        el.textContent = `Твоя слабая сторона сейчас — Aim (${aim}%). Тренируй наводку, реакцию и первый выстрел.`;
    } else if (macro <= aim && macro <= sense) {
        el.textContent = `Твоя слабая сторона сейчас — Macro (${macro}%). Учись ротациям, контролю карты и экономике.`;
    } else {
        el.textContent = `Твоя слабая сторона сейчас — Game Sense (${sense}%). Разбирай ошибки и читай игру внимательнее.`;
    }
}

/* =========================
   ACHIEVEMENTS
========================= */
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
    const mapViews = Number(localStorage.getItem(STORAGE_KEYS.mapViews)) || 0;
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
   DONATE
========================= */
function copyCard() {
    const el = qs("kaspiCard");
    if (!el) return;

    const text = el.textContent.trim();

    navigator.clipboard.writeText(text)
        .then(() => {
            alert("Карта скопирована 💳");
        })
        .catch(() => {
            alert("Ошибка копирования");
        });
}

/* =========================
   AUTH / CLOUD
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
        xp: getXP(),
        nickname: getNickname(),
        theme: localStorage.getItem(STORAGE_KEYS.theme) || "green",
        music: localStorage.getItem(STORAGE_KEYS.music) || "off",
        completedMissions: getCompletedMissions(),
        progressHistory: JSON.parse(localStorage.getItem(STORAGE_KEYS.progressHistory) || "[]"),
        achievements: getAchievements(),
        mapViews: Number(localStorage.getItem(STORAGE_KEYS.mapViews)) || 0,
        streak: getStreak(),
        lastTrainingDate: localStorage.getItem(STORAGE_KEYS.lastTrainingDate) || "",
        aiChat: getAIChatHistory(),
        activity: getActivity()
    };
}

function applyCloudProgress(progress) {
    localStorage.setItem(STORAGE_KEYS.xp, progress.xp ?? 0);
    localStorage.setItem(STORAGE_KEYS.nickname, progress.nickname ?? "Faceit Player");
    localStorage.setItem(STORAGE_KEYS.theme, progress.theme ?? "green");
    localStorage.setItem(STORAGE_KEYS.music, progress.music ?? "off");
    localStorage.setItem(STORAGE_KEYS.completedMissions, JSON.stringify(progress.completedMissions ?? []));
    localStorage.setItem(STORAGE_KEYS.progressHistory, JSON.stringify(progress.progressHistory ?? []));
    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(progress.achievements ?? []));
    localStorage.setItem(STORAGE_KEYS.mapViews, progress.mapViews ?? 0);
    localStorage.setItem(STORAGE_KEYS.streak, progress.streak ?? 0);
    localStorage.setItem(STORAGE_KEYS.lastTrainingDate, progress.lastTrainingDate ?? "");
    localStorage.setItem(STORAGE_KEYS.aiChat, JSON.stringify(progress.aiChat ?? []));
    localStorage.setItem(STORAGE_KEYS.activity, JSON.stringify(progress.activity ?? defaultActivity()));
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
            renderAchievements();
            renderStreak();
            renderAIChat();
            updateSkillPercentages();
            renderPlayerAnalysis();
            initTheme();
        }
    } catch (e) {
        console.log("cloud load error");
    }
}

async function registerAccount() {
    const username = qs("registerUsername")?.value?.trim();
    const password = qs("registerPassword")?.value?.trim();

    const usernameRegex = /^[a-zA-Z0-9_.]{3,20}$/;
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&_-]{8,}$/;

    if (!usernameRegex.test(username || "")) {
        alert("Логин: только английские буквы, цифры, _ и ., длина 3-20");
        return;
    }

    if (!passwordRegex.test(password || "")) {
        alert("Пароль: минимум 8 символов, хотя бы 1 буква и 1 цифра");
        return;
    }

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

/* =========================
   INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    updateXPUI();
    updateRank();
    renderDailyMissions();
    renderSavedProgress();
    renderNickname();
    renderAchievements();
    renderStreak();
    renderAIChat();
    updateSkillPercentages();
    renderPlayerAnalysis();
    initTheme();
    initMusic();
    loadCloudProgress();
});

setInterval(() => {
    saveCloudProgress();
}, 10000);
