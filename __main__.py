import threading
import subprocess

import musicserver
import webserver

def run_music():
    musicserver.app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)


def run_web():
    webserver.app.run(host='0.0.0.0', port=2020, debug=True, use_reloader=False)

def print_logo():
    print("░██████╗████████╗███████╗███████╗███╗░░██╗██╗░░░██╗")
    print("██╔════╝╚══██╔══╝██╔════╝██╔════╝████╗░██║╚██╗░██╔╝")
    print("╚█████╗░░░░██║░░░█████╗░░█████╗░░██╔██╗██║░╚████╔╝░")
    print("░╚═══██╗░░░██║░░░██╔══╝░░██╔══╝░░██║╚████║░░╚██╔╝░░")
    print("██████╔╝░░░██║░░░███████╗███████╗██║░╚███║░░░██║░░░")
    print("╚═════╝░░░░╚═╝░░░╚══════╝╚══════╝╚═╝░░╚══╝░░░╚═╝░░░")

if __name__ == '__main__':
    print_logo()
    servermusic = threading.Thread(target=run_music)
    serverweb = threading.Thread(target=run_web)

    servermusic.start()
    serverweb.start()

    servermusic.join()
    serverweb.join()