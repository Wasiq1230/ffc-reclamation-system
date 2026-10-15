import pytest
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.seed import seed_database

# Use isolated in-memory SQLite database for test suite
TEST_DATABASE_URL = "sqlite:///:memory:"

engine_test = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    yield
    Base.metadata.drop_all(bind=engine_test)

@pytest.fixture
def db_session():
    connection = engine_test.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def admin_token(client):
    res = client.post("/api/auth/login", json={"username": "admin", "password": "Admin@FFC2026!"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def fab_token(client):
    res = client.post("/api/auth/login", json={"username": "fab_staff", "password": "FabShop@2026!"})
    assert res.status_code == 200
    return res.json()["access_token"]

@pytest.fixture
def inspector_token(client):
    res = client.post("/api/auth/login", json={"username": "inspector1", "password": "Insp@2026!"})
    assert res.status_code == 200
    return res.json()["access_token"]
