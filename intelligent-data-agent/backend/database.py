from sqlalchemy import create_engine
import os

# Start with a local SQLite database
DEFAULT_DATABASE_URL = "sqlite:///./system_data.db"

_current_engine = create_engine(DEFAULT_DATABASE_URL, connect_args={"check_same_thread": False})

def get_engine():
    """Returns the currently active SQLAlchemy engine."""
    global _current_engine
    return _current_engine

def set_database_url(url: str):
    """
    Attempts to connect to a new database URL. 
    If successful, upgrades the active engine.
    """
    global _current_engine
    try:
        # Auto-resolve simple SQLite files into absolute SQLAlchemy URI formats
        if not url.startswith(("postgresql", "mysql", "sqlite")):
            # If they just pass "my_data.db" assume SQLite and resolve it relative to parent
            if url.endswith(".db") or url.endswith(".sqlite"):
                abs_path = os.path.abspath(os.path.join(os.getcwd(), "..", url)).replace('\\', '/')
                url = f"sqlite:///{abs_path}"
        elif url.startswith("sqlite:///") and not url.startswith("sqlite:////"):
            # If they pass a relative sqlite syntax, resolve it to an absolute path for Windows compatibility
            filename = url.replace("sqlite:///", "")
            if "/" not in filename and "\\" not in filename:
                abs_path = os.path.abspath(os.path.join(os.getcwd(), "..", filename)).replace('\\', '/')
                url = f"sqlite:///{abs_path}"

        connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
        new_engine = create_engine(url, connect_args=connect_args)
        # Test connection by attempting to connect
        with new_engine.connect() as conn:
            pass
        _current_engine = new_engine
        return True, "Successfully connected to new database"
    except Exception as e:
        return False, str(e)
