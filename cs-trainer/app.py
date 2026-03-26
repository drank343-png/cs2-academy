from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import json
import re
import os

app = Flask(__name__)
app.secret_key = "cs2-academy-secret-change-this"

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS user_progress (
        user_id INTEGER PRIMARY KEY,
        progress_json TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()


def default_progress():
    return {
        "xp": 0,
        "nickname": "Faceit Player",
        "theme": "green",
        "music": "off",
        "completedMissions": [],
        "progressHistory": [],
        "achievements": [],
        "mapViews": 0,
        "streak": 0,
        "lastTrainingDate": "",
        "aiChat": [],
        "activity": {
            "aim_completed": 0,
            "macro_completed": 0,
            "sense_completed": 0,
            "map_views": 0,
            "tips_used": 0
        }
    }


def get_user_progress(user_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT progress_json FROM user_progress WHERE user_id = ?", (user_id,))
    row = cur.fetchone()

    if row is None:
        progress = default_progress()
        cur.execute(
            "INSERT INTO user_progress (user_id, progress_json) VALUES (?, ?)",
            (user_id, json.dumps(progress, ensure_ascii=False))
        )
        conn.commit()
        conn.close()
        return progress

    progress = json.loads(row["progress_json"])
    conn.close()
    return progress


def save_user_progress(user_id: int, progress: dict):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO user_progress (user_id, progress_json)
        VALUES (?, ?)
        ON CONFLICT(user_id) DO UPDATE SET progress_json = excluded.progress_json
    """, (user_id, json.dumps(progress, ensure_ascii=False)))
    conn.commit()
    conn.close()


@app.before_request
def before_request():
    init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/training")
def training():
    return render_template("training.html")


@app.route("/maps")
def maps():
    return render_template("maps.html")


@app.route("/progress")
def progress():
    return render_template("progress.html")


@app.route("/auth")
def auth():
    return render_template("auth.html")


@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(force=True)

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    # ЛОГИН: только английские буквы, цифры, _ .
    if not re.fullmatch(r"[A-Za-z0-9_.]{3,20}", username):
        return jsonify({
            "ok": False,
            "error": "Логин: 3-20 символов, только английские буквы, цифры, _ и ."
        }), 400

    # ПАРОЛЬ: минимум 8 символов, хотя бы 1 буква и 1 цифра
    if len(password) < 8:
        return jsonify({"ok": False, "error": "Пароль минимум 8 символов"}), 400

    if not re.search(r"[A-Za-z]", password):
        return jsonify({"ok": False, "error": "В пароле должна быть хотя бы 1 английская буква"}), 400

    if not re.search(r"\d", password):
        return jsonify({"ok": False, "error": "В пароле должна быть хотя бы 1 цифра"}), 400

    # Русские символы в пароле запрещаем
    if re.search(r"[А-Яа-яЁё]", password):
        return jsonify({"ok": False, "error": "Пароль только на английской раскладке"}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    exists = cur.fetchone()

    if exists:
        conn.close()
        return jsonify({"ok": False, "error": "Такой логин уже занят"}), 400

    password_hash = generate_password_hash(password)

    cur.execute(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        (username, password_hash)
    )
    user_id = cur.lastrowid

    cur.execute(
        "INSERT INTO user_progress (user_id, progress_json) VALUES (?, ?)",
        (user_id, json.dumps(default_progress(), ensure_ascii=False))
    )

    conn.commit()
    conn.close()

    session["user_id"] = user_id
    session["username"] = username

    return jsonify({"ok": True, "username": username})


@app.route("/api/login", methods=["POST"])
def api_login():
    data = request.get_json(force=True)

    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    user = cur.fetchone()
    conn.close()

    if not user:
        return jsonify({"ok": False, "error": "Пользователь не найден"}), 404

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"ok": False, "error": "Неверный пароль"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]

    return jsonify({"ok": True, "username": user["username"]})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/me", methods=["GET"])
def api_me():
    return jsonify({
        "logged_in": bool(session.get("user_id")),
        "username": session.get("username")
    })


@app.route("/api/progress", methods=["GET"])
def api_get_progress():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "Не авторизован"}), 401

    progress = get_user_progress(user_id)
    return jsonify({"ok": True, "progress": progress})


@app.route("/api/progress", methods=["POST"])
def api_save_progress():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"ok": False, "error": "Не авторизован"}), 401

    data = request.get_json(force=True)
    progress = data.get("progress")

    if not isinstance(progress, dict):
        return jsonify({"ok": False, "error": "Некорректные данные"}), 400

    save_user_progress(user_id, progress)
    return jsonify({"ok": True})


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
