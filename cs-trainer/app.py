from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import sqlite3
import json
import os

app = Flask(__name__)
app.secret_key = "change-this-secret-key-please"

DB_PATH = "database.db"


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
        password_hash TEXT NOT NULL
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
        "completedMissions": [],
        "progressHistory": [],
        "nickname": "Faceit Player",
        "stats": {"aim": 62, "macro": 48, "sense": 55},
        "faceit": {"elo": 840, "matches": 12, "winrate": 54, "kd": 1.08},
        "theme": "green",
        "music": "off",
        "achievements": [],
        "mapViews": 0,
        "streak": 0,
        "lastTrainingDate": "",
        "aiChat": []
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
def setup():
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
def auth_page():
    return render_template("auth.html")


@app.route("/api/register", methods=["POST"])
def api_register():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if len(username) < 3:
        return jsonify({"ok": False, "error": "Логин должен быть минимум 3 символа"}), 400

    if len(password) < 4:
        return jsonify({"ok": False, "error": "Пароль должен быть минимум 4 символа"}), 400

    conn = get_db()
    cur = conn.cursor()

    cur.execute("SELECT id FROM users WHERE username = ?", (username,))
    if cur.fetchone():
        conn.close()
        return jsonify({"ok": False, "error": "Такой логин уже существует"}), 400

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

    if not user or not check_password_hash(user["password_hash"], password):
        return jsonify({"ok": False, "error": "Неверный логин или пароль"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]

    return jsonify({"ok": True, "username": user["username"]})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/me")
def api_me():
    user_id = session.get("user_id")
    username = session.get("username")
    return jsonify({
        "logged_in": bool(user_id),
        "username": username
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
    app.run(debug=True)