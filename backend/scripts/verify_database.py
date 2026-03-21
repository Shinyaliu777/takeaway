from sqlmodel import Session, text

from app.db.session import engine


def main() -> None:
    with Session(engine) as session:
        result = session.exec(text("SELECT 1"))
        print(result.one())
    print("database connection ok")


if __name__ == "__main__":
    main()
