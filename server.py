from onecrm.app import app


def main():
    import uvicorn
    from onecrm.settings import BIND_ADDRESS, PORT

    uvicorn.run("onecrm.app:app", host=BIND_ADDRESS, port=PORT, reload=False)


if __name__ == "__main__":
    main()
