import musicserver
import webserver

def start():
    musicserver.app.run(host='0.0.0.0', port=5000, debug=True)
    webserver.app.run(host='0.0.0.0', port=2020, debug=True)


if __name__ == '__main__':
    start()