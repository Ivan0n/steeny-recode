from flask import Flask, send_from_directory, abort
import os

app = Flask(__name__)
MUSIC_DIR = os.path.join(os.path.dirname(__file__), 'music')

@app.route('/music/<artist>/<song_name>')
def stream_music(song_name, artist):
    filename = f"{artist}/{song_name}.mp3"
    filepath = os.path.join(MUSIC_DIR, filename)
    
    if not os.path.isfile(filepath):
        return abort(404, description="Песня не найдена.")

    return send_from_directory(MUSIC_DIR, filename, as_attachment=False)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
