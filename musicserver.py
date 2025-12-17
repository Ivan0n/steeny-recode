from flask import Flask, Response, abort, request
import os
import mimetypes
import logging

app = Flask(__name__)
logging.getLogger('flask.app').disabled = True

MUSIC_DIR = os.path.join(os.path.dirname(__file__), 'music')
CHUNK_SIZE = 5192 

def generate_audio_stream(path, start=0, end=None):
    with open(path, 'rb') as f:
        f.seek(start)
        bytes_to_read = (end - start + 1) if end else None

        while True:
            if bytes_to_read is not None:
                chunk = f.read(min(CHUNK_SIZE, bytes_to_read))
                bytes_to_read -= len(chunk)
                if not chunk:
                    break
            else:
                chunk = f.read(CHUNK_SIZE)
                if not chunk:
                    break

            yield chunk
            
@app.route('/music/<artist>/<song_name>')
def stream_music(artist, song_name):
    filepath = os.path.join(MUSIC_DIR, artist, f"{song_name}.mp3")

    if not os.path.isfile(filepath):
        abort(404, "Песня не найдена")

    file_size = os.path.getsize(filepath)
    range_header = request.headers.get('Range', None)
    mime_type, _ = mimetypes.guess_type(filepath)
    mime_type = mime_type or 'audio/mpeg'

    if range_header:
        bytes_range = range_header.replace('bytes=', '').split('-')
        start = int(bytes_range[0])
        end = int(bytes_range[1]) if bytes_range[1] else file_size - 1

        response = Response(
            generate_audio_stream(filepath, start, end),
            status=206,
            mimetype=mime_type,
            direct_passthrough=True
        )

        response.headers.add('Content-Range', f'bytes {start}-{end}/{file_size}')
        response.headers.add('Accept-Ranges', 'bytes')
        response.headers.add('Content-Length', str(end - start + 1))
    else:
        response = Response(
            generate_audio_stream(filepath),
            mimetype=mime_type,
            direct_passthrough=True
        )
        response.headers.add('Content-Length', str(file_size))

    return response