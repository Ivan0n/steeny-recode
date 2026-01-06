import threading
import subprocess
import time
import musicserver
import webserver

current_time = time.localtime()
time = f"{current_time.tm_hour}/{current_time.tm_min}/{current_time.tm_sec}"


def print_logo():
    print("░██████╗████████╗███████╗███████╗███╗░░██╗██╗░░░██╗")
    print("██╔════╝╚══██╔══╝██╔════╝██╔════╝████╗░██║╚██╗░██╔╝")
    print("╚█████╗░░░░██║░░░█████╗░░█████╗░░██╔██╗██║░╚████╔╝░")
    print("░╚═══██╗░░░██║░░░██╔══╝░░██╔══╝░░██║╚████║░░╚██╔╝░░")
    print("██████╔╝░░░██║░░░███████╗███████╗██║░╚███║░░░██║░░░")
    print("╚═════╝░░░░╚═╝░░░╚══════╝╚══════╝╚═╝░░╚══╝░░░╚═╝░░░")

def consolelog(message):
    print(f"[{time}] <STEENY> - {message}")

def run_music():
    consolelog("I'm trying to launch a music server")
    try:
        print(f"[{time}] <STEENY> - OK")
        print(f"[{time}] <STEENY> - Music server port (5000)")
        musicserver.app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
        
    except:
        consolelog("Error in starting the music server -_-")


def run_web():
    consolelog("I'm trying to launch a web server")
    try:
        webserver.app.run(host='0.0.0.0', port=2020, debug=True, use_reloader=False)
        print(f"[{time}] <STEENY> - OK")
    except:
        consolelog("Error in starting the web server -_-")

if __name__ == '__main__':
    print_logo()
    servermusic = threading.Thread(target=run_music)
    serverweb = threading.Thread(target=run_web)

    servermusic.start()
    serverweb.start()

    servermusic.join()
    serverweb.join()