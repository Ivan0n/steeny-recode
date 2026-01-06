from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash, send_from_directory
import secrets
import csv
import os
import random
from werkzeug.utils import secure_filename
from datetime import datetime

app = Flask(__name__)
app.secret_key = "steeny_key_5252525byby235672153"

MUSICSERVER = "127.0.0.1:5000"
UPLOAD_FOLDER = 'uploads/avatars'
UPLOAD_FOLDER_BANNERS = 'uploads/banners'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['UPLOAD_FOLDER_BANNERS'] = UPLOAD_FOLDER_BANNERS
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def load_users():
    users = {}
    try:
        with open("base/user/auth.csv", "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                email = (row.get("email") or "").strip()
                if email:
                    users[email] = {
                        "password": (row.get("password") or "").strip(),
                        "name": (row.get("name") or "").strip(),
                        "avatar": (row.get("avatar") or "").strip(),
                        "banner": (row.get("banner") or "").strip()
                    }
    except FileNotFoundError:
        print("⚠️ Файл base/user/auth.csv не найден!")
    return users

def save_users():
    os.makedirs(os.path.dirname("base/user/auth.csv"), exist_ok=True)
    with open("base/user/auth.csv", "w", newline="", encoding="utf-8-sig") as f:
        fieldnames = ['email', 'password', 'name', 'avatar', 'banner']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for email, data in USERS.items():
            row = {'email': email, **data}
            writer.writerow(row)

def get_user_favorites(user):
    """Получить set ID избранных треков пользователя"""
    favorites = set()
    try:
        with open('base/user/favorites.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['user'] == user:
                    favorites.add(row['id'])
    except FileNotFoundError:
        pass
    return favorites

def get_all_tracks():
    """Получить все треки из базы"""
    tracks = []
    try:
        with open('base/music/music.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                tracks.append(row)
    except FileNotFoundError:
        pass
    return tracks

def format_track(row, favorites):
    """Форматировать трек для JSON ответа"""
    return {
        'id': row['id'],
        'title': row['musicname'],
        'artist': row['artist'],
        'src': f"http://{MUSICSERVER}/music/{row['artist']}/{row['musicname']}",
        'cover': row['img'],
        'path': row['path'],
        'favorite': row['id'] in favorites
    }

def add_to_history(user, track_id):
    """Добавить трек в историю прослушивания"""
    history_file = 'base/user/history.csv'
    os.makedirs(os.path.dirname(history_file), exist_ok=True)
    
    # Читаем текущую историю
    history = []
    try:
        with open(history_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                history.append(row)
    except FileNotFoundError:
        pass
    
    # Удаляем старую запись этого трека для этого пользователя (если есть)
    history = [h for h in history if not (h['user'] == user and h['track_id'] == track_id)]
    
    # Добавляем новую запись
    history.append({
        'user': user,
        'track_id': track_id,
        'played_at': datetime.now().isoformat()
    })
    
    # Записываем обратно
    with open(history_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['user', 'track_id', 'played_at'])
        writer.writeheader()
        writer.writerows(history)

def get_user_history(user, limit=20):
    """Получить историю прослушивания пользователя"""
    history = []
    try:
        with open('base/user/history.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['user'] == user:
                    history.append(row)
    except FileNotFoundError:
        pass
    
    # Сортируем по дате (новые первые) и берём limit
    history.sort(key=lambda x: x.get('played_at', ''), reverse=True)
    return history[:limit]

USERS = load_users()
TOKENS = {}

# === Авторизация ===
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

@app.route("/home")
def secret():
    user_email = session.get("user")
    token = session.get("token")

    if not user_email or TOKENS.get(user_email) != token:
        return redirect(url_for("login"))

    user_data = USERS.get(user_email, {})
    
    return render_template(
        "newhome.html", 
        user=user_email, 
        avatar=user_data.get("avatar", ""), 
        name=user_data.get("name", ""),
        banner=user_data.get("banner", "")
    )

@app.route("/logout")
def logout():
    user = session.get("user")
    if user in TOKENS:
        TOKENS.pop(user)
    session.clear()
    return redirect(url_for("login"))

# === Загрузка файлов ===
@app.route('/uploads/banners/<filename>')
def uploaded_banner(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER_BANNERS'], filename)

@app.route('/uploads/avatars/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# === Обновление профиля ===
@app.route('/profile/update/name', methods=['POST'])
def update_name():
    user_email = session.get("user")
    if not user_email or TOKENS.get(user_email) != session.get("token"):
        return redirect(url_for("login"))

    new_name = request.form.get('name')
    if new_name and len(new_name) > 2:
        USERS[user_email]['name'] = new_name
        save_users()
        flash("Имя успешно обновлено!", "success")
    else:
        flash("Имя должно быть длиннее 2 символов.", "error")
        
    return redirect(url_for('secret'))

@app.route('/profile/update/password', methods=['POST'])
def update_password():
    user_email = session.get("user")
    if not user_email or TOKENS.get(user_email) != session.get("token"):
        return redirect(url_for("login"))
        
    old_password = request.form.get('old_password')
    new_password = request.form.get('new_password')

    if USERS[user_email]['password'] != old_password:
        flash("Старый пароль введён неверно.", "error")
        return redirect(url_for('secret'))

    if not new_password or len(new_password) < 3:
        flash("Новый пароль слишком короткий.", "error")
        return redirect(url_for('secret'))
    
    USERS[user_email]['password'] = new_password
    save_users()
    flash("Пароль успешно изменён!", "success")
    
    return redirect(url_for('secret'))

@app.route('/profile/update/avatar', methods=['POST'])
def update_avatar():
    user_email = session.get("user")
    if not user_email or TOKENS.get(user_email) != session.get("token"):
        return redirect(url_for("login"))
        
    if 'avatar' not in request.files:
        flash('Файл не был отправлен.', 'error')
        return redirect(url_for('secret'))
        
    file = request.files['avatar']
    
    if file.filename == '':
        flash('Файл не выбран.', 'error')
        return redirect(url_for('secret'))
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{user_email.split('@')[0]}_{secrets.token_hex(4)}_{filename}"
        
        os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
        
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        avatar_url = url_for('uploaded_file', filename=unique_filename)
        
        USERS[user_email]['avatar'] = avatar_url
        save_users()
        flash('Аватар успешно обновлён!', 'success')
    else:
        flash('Недопустимый формат файла. Разрешены: png, jpg, jpeg, gif.', 'error')

    return redirect(url_for('secret'))

@app.route('/profile/update/banner', methods=['POST'])
def update_banner():
    user_email = session.get("user")
    if not user_email or TOKENS.get(user_email) != session.get("token"):
        return redirect(url_for("login"))
        
    if 'banner' not in request.files:
        flash('Файл баннера не был отправлен.', 'error')
        return redirect(url_for('secret'))
        
    file = request.files['banner']
    
    if file.filename == '':
        flash('Файл баннера не выбран.', 'error')
        return redirect(url_for('secret'))
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        unique_filename = f"{user_email.split('@')[0]}_{secrets.token_hex(4)}_{filename}"
        
        os.makedirs(app.config['UPLOAD_FOLDER_BANNERS'], exist_ok=True)
        file_path = os.path.join(app.config['UPLOAD_FOLDER_BANNERS'], unique_filename)
        file.save(file_path)
        
        banner_url = url_for('uploaded_banner', filename=unique_filename)
        
        USERS[user_email]['banner'] = banner_url
        save_users()
        flash('Баннер успешно обновлён!', 'success')
    else:
        flash('Недопустимый формат баннера. Разрешены: png, jpg, jpeg, gif.', 'error')

    return redirect(url_for('secret'))

# === API для музыки ===
@app.route("/playlist/data")
def playlist_data():
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401

    offset = int(request.args.get("offset", 0))
    limit = int(request.args.get("limit", 20))
    sort = request.args.get("sort", "default")

    favorites = set()
    try:
        with open('base/user/favorites.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['user'] == user:
                    favorites.add(row['id'])
    except FileNotFoundError:
        pass

    music_data = []
    try:
        with open('base/music/music.csv', 'r', encoding='utf-8') as f:
            rows = list(csv.DictReader(f))
            
            if sort == "recent":
                rows = rows[::-1]
            elif sort == "random":
                import random
                random.shuffle(rows)
            
            slice_data = rows[offset:offset+limit]
            
            for row in slice_data:
                track_id = row['id']
                music_data.append({
                    'id': track_id,
                    'title': row['musicname'],
                    'artist': row['artist'],
                    'src': f"http://{MUSICSERVER}/music/{row['artist']}/{row['musicname']}",
                    'cover': row['img'],
                    'path': row['path'],
                    'favorite': track_id in favorites
                })
    except FileNotFoundError:
        return jsonify({"error": "Файл музыки не найден"}), 404

    return jsonify(music_data)

@app.route("/playlist/random")
def playlist_random():
    """Случайные треки"""
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401

    limit = int(request.args.get("limit", 10))
    favorites = get_user_favorites(user)
    all_tracks = get_all_tracks()
    
    # Выбираем случайные треки
    random_tracks = random.sample(all_tracks, min(limit, len(all_tracks)))
    music_data = [format_track(row, favorites) for row in random_tracks]

    return jsonify(music_data)

@app.route("/playlist/history")
def playlist_history():
    """Недавно прослушанные треки"""
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401

    limit = int(request.args.get("limit", 10))
    favorites = get_user_favorites(user)
    
    # Получаем историю
    history = get_user_history(user, limit)
    track_ids = [h['track_id'] for h in history]
    
    # Получаем данные о треках
    all_tracks = get_all_tracks()
    tracks_dict = {t['id']: t for t in all_tracks}
    
    music_data = []
    for track_id in track_ids:
        if track_id in tracks_dict:
            music_data.append(format_track(tracks_dict[track_id], favorites))

    return jsonify(music_data)

@app.route("/playlist/track-played", methods=["POST"])
def track_played():
    """Записать прослушивание трека"""
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401
    
    data = request.get_json()
    track_id = data.get('id')
    
    if track_id:
        add_to_history(user, track_id)
        return jsonify({"success": True})
    
    return jsonify({"error": "ID трека обязателен"}), 400

@app.route("/playlist/favorites")
def get_all_favorites():
    """Все любимые треки"""
    user = session.get("user")
    token = session.get("token")
    if not user or TOKENS.get(user) != token:
        return jsonify({"error": "Не авторизован"}), 401

    favorite_ids = get_user_favorites(user)

    if not favorite_ids:
        return jsonify([])

    all_tracks = get_all_tracks()
    favorite_tracks = []
    
    for row in all_tracks:
        if row['id'] in favorite_ids:
            favorite_tracks.append(format_track(row, favorite_ids))

    return jsonify(favorite_tracks)

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

    favorites = get_user_favorites(user)
    if track_id in favorites:
        return jsonify({"success": True, "message": "Уже в избранном"})

    favorites_file = 'base/user/favorites.csv'
    os.makedirs(os.path.dirname(favorites_file), exist_ok=True)
    
    try:
        with open(favorites_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([user, track_id])
    except FileNotFoundError:
        with open(favorites_file, 'w', newline='', encoding='utf-8') as f:
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
    
    query = request.args.get('q', '').lower()
    
    if not query:
        return jsonify({'tracks': [], 'artists': []})
    
    favorites = get_user_favorites(user)
    all_tracks = get_all_tracks()

    found_tracks = []
    found_artists = set()
    
    for row in all_tracks:
        track_title = row.get('musicname', '').lower()
        artist_name = row.get('artist', '').lower()

        if query in track_title or query in artist_name:
            found_tracks.append(format_track(row, favorites))
        
        if query in artist_name:
            found_artists.add((row['artist'], row['img']))

    artists_list = [{'name': name, 'cover': cover} for name, cover in found_artists]

    return jsonify({'tracks': found_tracks, 'artists': artists_list})

@app.route("/avatar/<username>")
def avatar(username):
    if username not in USERS:
        return jsonify({"error": "Пользователь не найден"}), 404
    
    avatar_url = USERS[username].get("avatar", "")
    if not avatar_url:
        return jsonify({"error": "Аватар не найден"}), 404
    if avatar_url.startswith('http'):
        return redirect(avatar_url)
    return redirect(avatar_url)

