const mapConfigs = {
    xbox: {
        title: "Xbox Smoke",
        text: "Встань у mid doors на Dust2, наведи прицел выше Xbox и кинь smoke для безопасного выхода в short.",
        image: "xbox.png"
    },
    window: {
        title: "Smoke Window",
        text: "Классический smoke в окно на Mirage для контроля мида."
    },
    banana: {
        title: "Banana Control",
        text: "Используй molotov и flash, чтобы выбить соперника с banana."
    }
};

const coachTips = [
    "Не пикай без инфы.",
    "Играй от тайминга, а не только от аима.",
    "Следи за экономикой врага каждый раунд.",
    "После смерти думай, что сделал не так.",
    "Не спеши в клатче.",
    "Перед выходом проверь позиции и флешки.",
    "Слушай шаги и используй звук как инфу.",
    "Не делай одинаковый мув каждый раунд."
];

const dailyMissions = [
    { id: "mission_aim", text: "Сделать 100 ботов", xp: 40 },
    { id: "mission_faceit", text: "Сыграть 1 серьёзную игру", xp: 60 },
    { id: "mission_demo", text: "Разобрать 1 ошибку после матча", xp: 50 }
];

const defaultStats = {
    aim: 62,
    macro: 48,
    sense: 55
};

const themes = {
    green: {
        main: "#00ff88",
        dark: "#00c853",
        glow: "rgba(0,255,136,0.35)"
    },
    blue: {
        main: "#4dc3ff",
        dark: "#1d8fff",
        glow: "rgba(77,195,255,0.35)"
    },
    red: {
        main: "#ff5c7a",
        dark: "#ff2d55",
        glow: "rgba(255,92,122,0.35)"
    }
};

const achievementsConfig = [
    { id: "first_xp", title: "Первый шаг", text: "Получи первые XP" },
    { id: "lvl3", title: "Level 3", text: "Дойди до 3 уровня" },
    { id: "lvl5", title: "Level 5", text: "Дойди до 5 уровня" },
    { id: "aim_70", title: "Aim Grinder", text: "Подними Aim до 70%" },
    { id: "macro_60", title: "Macro Brain", text: "Подними Macro до 60%" },
    { id: "sense_60", title: "Game Sense", text: "Подними Game Sense до 60%" },
    { id: "maps_lover", title: "Smoke Learner", text: "Открой 5 раскидок" },
    { id: "history_3", title: "Workhorse", text: "Сделай 3 тренировки" },
    { id: "streak_3", title: "3-Day Streak", text: "Тренируйся 3 дня подряд" },
    { id: "streak_7", title: "7-Day Streak", text: "Тренируйся 7 дней подряд" }
]; 