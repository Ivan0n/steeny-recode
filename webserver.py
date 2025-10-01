from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import secrets

import csv

app = Flask(__name__)
app.secret_key = "steeny_key_5252525byby235672153"

def load_users():
    users = {}
    try:
        with open("base/user/auth.csv", "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                email = (row.get("email") or "").strip()
                password = (row.get("password") or "").strip()
                avatar = (row.get("avatar") or "").strip()
                name = (row.get("name") or "").strip()

                if email:  # пропускаем пустые строки
                    users[email] = {
                        "password": password,
                        "name": name,
                        "avatar": avatar
                    }
    except FileNotFoundError:
        print("⚠️ Файл base/auth.csv не найден!")
    return users


USERS = load_users()


TOKENS = {}

@app.route("/", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        email = (request.form.get("email") or "").strip()
        password = (request.form.get("password") or "").strip()

        if email in USERS and password == USERS[email]["password"]:
            token = secrets.token_hex(16)
            TOKENS[email] = token
            session["user"] = email
            session["token"] = token
            return redirect(url_for("secret"))
        else:
            error = "❌ Неверный логин или пароль"

    return render_template("auth.html", error=error)

@app.route("/avatar/<username>")
def avatar(username):
    if username not in USERS:
        return jsonify({"error": "Пользователь не найден"}), 404
    
    avatar_url = USERS[username].get("avatar", "")
    if not avatar_url:
        return jsonify({"error": "Аватар не найден"}), 404

    return redirect(avatar_url)




@app.route("/home")
def secret():
    user = session.get("user")
    token = session.get("token")

    if not user or TOKENS.get(user) != token:
        return redirect(url_for("login"))

    avatar_url = USERS.get(user, {}).get("avatar", "")
    name = USERS.get(user, {}).get("name", "")
    print(name)
    return render_template("newhome.html", user=user, avatar=avatar_url, name=name)


@app.route("/logout")
def logout():
    user = session.get("user")
    if user in TOKENS:
        TOKENS.pop(user)
    session.clear()
    return redirect(url_for("login"))

@app.route("/playlist/data")
def playlist_data():
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401

    offset = int(request.args.get("offset", 0))
    limit = int(request.args.get("limit", 20))

    music_data = []
    try:
        with open('base/music/music.csv', 'r', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
            slice_data = rows[offset:offset+limit]
            for row in slice_data:
                music_data.append({
                    'id': row['id'],
                    'title': row['musicname'],
                    'artist': row['artist'],
                    'src': f"https://music.steeny.fun/music/{row['artist']}/{row['musicname']}",
                    'cover': row['img'],
                    'path': row['path']
                })
    except FileNotFoundError:
        return jsonify({"error": "Файл музыки не найден"}), 404

    favorites = set()
    try:
        with open('base/user/favorites.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['user'] == user:
                    favorites.add(row['id'])
    except FileNotFoundError:
        pass

    for track in music_data:
        track['favorite'] = track['id'] in favorites

    return jsonify(music_data)


@app.route("/playlist/add", methods=["POST"])
def add_to_favorites():
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401
    
    data = request.get_json()
    track_id = data.get('id')
    
    if not track_id:
        return jsonify({"error": "ID трека обязателен"}), 400

    try:
        with open('base/user/favorites.csv', 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([user, track_id])
    except FileNotFoundError:
        with open('base/user/favorites.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['user', 'id'])
            writer.writerow([user, track_id])
    
    return jsonify({"success": True})

@app.route("/playlist/remove", methods=["POST"])
def remove_from_favorites():
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401
    
    data = request.get_json()
    track_id = data.get('id')
    
    if not track_id:
        return jsonify({"error": "ID трека обязателен"}), 400
    
    try:
        rows = []
        with open('base/user/favorites.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not (row['user'] == user and row['id'] == track_id):
                    rows.append(row)
        
        with open('base/user/favorites.csv', 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['user', 'id'])
            for row in rows:
                writer.writerow([row['user'], row['id']])
    except FileNotFoundError:
        pass
    
    return jsonify({"success": True})

@app.route("/search")
def search_music():
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401
    
    query = request.args.get('query', '').lower()
    
    if not query:
        return jsonify([])
    
    results = []
    try:
        with open('base/music/music.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if (query in row['musicname'].lower() or 
                    query in row['artist'].lower()):
                    results.append({
                        'id': row['id'],
                        'title': row['musicname'],
                        'artist': row['artist'],
                        'src': f"https://music.steeny.fun/music/{row['artist']}/{row['musicname']}",
                        'cover': row['img'],
                        'path': row['path']
                    })
    except FileNotFoundError:
        pass
    
    return jsonify(results)

