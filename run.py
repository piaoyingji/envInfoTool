import os
import subprocess
import sys
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent


def docker_command():
    for command in (["docker", "compose", "version"], ["docker-compose", "--version"]):
        try:
            subprocess.run(command, cwd=BASE_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
            return command[:2] if command[0] == "docker" else ["docker-compose"]
        except Exception:
            continue
    return None


def load_env_value(name, default=""):
    env_path = BASE_DIR / ".env"
    if not env_path.exists():
        return default
    for line in env_path.read_text(encoding="utf-8").splitlines():
        text = line.strip()
        if not text or text.startswith("#") or "=" not in text:
            continue
        key, value = text.split("=", 1)
        if key.strip() == name:
            return value.strip()
    return default


def start_guacamole_if_available():
    if load_env_value("GUACAMOLE_AUTO_START", "true").lower() not in ("1", "true", "yes", "on"):
        return
    compose_file = BASE_DIR / "docker-compose.guacamole.yml"
    if not compose_file.exists():
        return
    command = docker_command()
    if not command:
        print("Docker was not found. Guacamole integration is disabled.")
        return
    try:
        print("Starting Guacamole with Docker...")
        subprocess.run(command + ["-f", str(compose_file), "up", "-d"], cwd=BASE_DIR, check=True)
    except Exception as exc:
        print(f"Guacamole auto-start failed: {exc}")


def install_requirements():
    requirements = BASE_DIR / "requirements.txt"
    if not requirements.exists():
        return
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", str(requirements)])


def main():
    os.chdir(BASE_DIR)
    install_requirements()
    start_guacamole_if_available()
    import server
    server.main()


if __name__ == "__main__":
    main()
