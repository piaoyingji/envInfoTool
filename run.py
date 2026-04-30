import os
import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent


def install_requirements():
    requirements = BASE_DIR / "requirements.txt"
    if not requirements.exists():
        return
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(requirements)])


def main():
    os.chdir(BASE_DIR)
    install_requirements()
    import server
    server.main()


if __name__ == "__main__":
    main()
