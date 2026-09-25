import warnings
import sys
import os
import io
import pytest
import botocore
from fastapi.testclient import TestClient
import boto3


warnings.filterwarnings(
    "ignore",
    category=UserWarning,
    message='Field name "json" in "NFTWrapRequest" shadows an attribute in parent "BaseModel"'
)

# Добавляем родительскую папку (gamegems-app) в PYTHONPATH
sys.path.insert(
    0,
    os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

# Импортируем всё из backend/main.py
import backend.main as main_module
from backend.main import (
    app,
    user_inventory,
    user_profiles,
    sell_prices,
    BUCKET_NAME,
    INVENTORY_PREFIX,
    PROFILE_PREFIX,
    SELL_PRICES_KEY,
)

# === FIXTURE: единый синхронный TestClient ===
@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

# === Dummy S3-клиент «в памяти» ===
class DummyS3:
    def __init__(self):
        self._storage = {}
        # Добавляем атрибут exceptions, чтобы имитировать boto3.client('s3').exceptions
        self.exceptions = botocore.exceptions

    def put_object(self, Bucket, Key, Body, **kwargs):
        if isinstance(Body, str):
            data = Body.encode("utf-8")
        elif isinstance(Body, bytes):
            data = Body
        elif hasattr(Body, "read"):
            data = Body.read()
        else:
            data = str(Body).encode("utf-8")
        self._storage[(Bucket, Key)] = data

    def get_object(self, Bucket, Key):
        if (Bucket, Key) not in self._storage:
            raise self.exceptions.ClientError(
                {"Error": {"Code": "NoSuchKey", "Message": "Not Found"}}, "GetObject"
            )
        body_bytes = self._storage[(Bucket, Key)]
        return {"Body": io.BytesIO(body_bytes)}

    def list_objects_v2(self, Bucket, Prefix):
        contents = []
        for (b, k), _ in self._storage.items():
            if b == Bucket and k.startswith(Prefix):
                contents.append({"Key": k})
        return {"Contents": contents}

# === FIXTURE: автоматически подменяем boto3.client и main_module.s3 на DummyS3, сбрасываем состояние ===
@pytest.fixture(autouse=True)
def mock_s3_client(monkeypatch):
    dummy = DummyS3()

    # Подменяем boto3.client(), чтобы main_module.s3 создавался из DummyS3
    monkeypatch.setattr(boto3, "client", lambda *args, **kwargs: dummy)
    # Подменяем main_module.s3 напрямую
    monkeypatch.setattr(main_module, "s3", dummy)

    # Очищаем глобальные «хранилища» перед каждым тестом
    user_inventory.clear()
    user_profiles.clear()
    sell_prices.clear()

    return dummy

# === FIXTURE: подменяем requests.get для /metadata-proxy/ ===
@pytest.fixture(autouse=True)
def mock_requests_get(monkeypatch):
    class DummyResponse:
        def __init__(self, data, status_code=200):
            self._data = data
            self.status_code = status_code

        def raise_for_status(self):
            if not (200 <= self.status_code < 300):
                raise Exception(f"HTTP {self.status_code}")

        def json(self):
            return self._data

    def fake_get(url, *args, **kwargs):
        return DummyResponse({"dummy": "data"}, 200)

    monkeypatch.setattr("requests.get", fake_get)

# Остальные тесты остаются без изменений
def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "GameGems backend is running 🚀"}

def test_inventory_crud(client):
    address = "0xABC"

    # GET до создания → пустой список
    r1 = client.get(f"/inventory/{address}")
    assert r1.status_code == 200
    assert r1.json() == []

    # POST добавляем предмет
    item_payload = {
        "id": "item1",
        "type": "sword",
        "rarity": "rare",
        "image": "http://example.com/img.png",
        "attributes": {"damage": 10}
    }
    r2 = client.post(f"/inventory/{address}", json=item_payload)
    assert r2.status_code == 200
    assert r2.json()["status"] == "ok"
    assert r2.json()["item_id"] == "item1"

    # GET после добавления → один элемент
    r3 = client.get(f"/inventory/{address}")
    assert r3.status_code == 200
    inv = r3.json()
    assert isinstance(inv, list) and len(inv) == 1
    assert inv[0]["id"] == "item1"
    assert inv[0]["type"] == "sword"

    # POST с тем же ID → 400
    r4 = client.post(f"/inventory/{address}", json=item_payload)
    assert r4.status_code == 400
    assert r4.json()["detail"] == "Предмет с таким ID уже существует."

    # DELETE несуществующего ID → 404
    r5 = client.delete(f"/inventory/{address}/no-such-id")
    assert r5.status_code == 404
    assert "Предмет не найден" in r5.json()["detail"]

    # DELETE существующего → 200
    r6 = client.delete(f"/inventory/{address}/item1")
    assert r6.status_code == 200
    assert r6.json()["deleted"] == 1

    # GET после удаления → пустой список
    r7 = client.get(f"/inventory/{address}")
    assert r7.status_code == 200
    assert r7.json() == []

def test_profile_crud(client):
    address = "0xUSER"
    profile_payload = {"address": address, "created_at": "2023-01-01", "nickname": "Hero"}

    # GET до создания → 404
    r1 = client.get(f"/profile/{address}")
    assert r1.status_code == 404

    # POST создать/обновить профиль
    r2 = client.post("/profile/", json=profile_payload)
    assert r2.status_code == 200
    assert r2.json()["status"] == "ok"
    assert r2.json()["address"].lower() == address.lower()

    # GET после создания → 200 и корректные данные
    r3 = client.get(f"/profile/{address}")
    assert r3.status_code == 200
    prof = r3.json()
    assert prof["address"].lower() == address.lower()
    assert prof["nickname"] == "Hero"

    # GET всех профилей → список имеет хотя бы один элемент
    r4 = client.get("/profiles")
    assert r4.status_code == 200
    all_profiles = r4.json()
    assert isinstance(all_profiles, list)
    assert any(p["address"].lower() == address.lower() for p in all_profiles)

def test_sell_prices_crud(client):
    # GET /sell-prices → словарь с ключами common, rare, epic, legendary
    r1 = client.get("/sell-prices")
    assert r1.status_code == 200
    data1 = r1.json()
    for key in ["common", "rare", "epic", "legendary"]:
        assert key in data1

    # Обновляем epic и legendary
    update_payload = {"epic": 75, "legendary": 150}
    r2 = client.post("/sell-prices", json=update_payload)
    assert r2.status_code == 200
    updated = r2.json()["updated"]
    assert updated["epic"] == 75
    assert updated["legendary"] == 150

    # GET снова → убедимся, что ключи обновились
    r3 = client.get("/sell-prices")
    assert r3.status_code == 200
    data3 = r3.json()
    assert data3["epic"] == 75
    assert data3["legendary"] == 150

def test_nft_create_and_save_and_retrieve(client):
    # 1) POST /nft/create-json
    wrap_payload = {
        "account": "0xUSER",
        "itemId": "123",
        "json": {"foo": "bar", "value": 42}
    }
    r1 = client.post("/nft/create-json", json=wrap_payload)
    assert r1.status_code == 200
    result = r1.json()
    assert "uri" in result and "storage.yandexcloud.net" in result["uri"]

    # 2) POST /nft/save
    final_nft = {
        "tokenId": 7,
        "itemType": "Sword",
        "rarity": 2,
        "bonus": {"atk": 10},
        "image": "http://example.com/img.png",
        "uri": "ipfs://example",
        "owner": "0xUSER"
    }
    r2 = client.post("/nft/save", json=final_nft)
    assert r2.status_code == 200
    saved_key = r2.json()["saved"]
    assert saved_key == "NFT/7.json"

    # 3) GET /nft → среди возвращённых элементов должен быть tokenId == 7
    r3 = client.get("/nft")
    assert r3.status_code == 200
    nft_list = r3.json()
    assert isinstance(nft_list, list)
    assert any(item.get("tokenId") == 7 for item in nft_list)

    # 4) GET /nft/7 → возвращает сохранённый JSON
    r4 = client.get("/nft/7")
    assert r4.status_code == 200
    nft_data = r4.json()
    assert nft_data["itemType"] == "Sword"

    # 5) GET /nft/999 → 404
    r5 = client.get("/nft/999")
    assert r5.status_code == 404

def test_metadata_proxy(client):
    url = "http://example.com/api/data"
    r = client.get(f"/metadata-proxy/?url={url}")
    assert r.status_code == 200
    assert r.json() == {"dummy": "data"}

def test_predict_price_without_price(client):
    payload = {
        "itemType": "Sword",
        "rarity": "rare",
        "bonusValue": 10
    }
    r = client.post("/predict-price", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "recommended_price" in data

def test_predict_price_with_price(client):
    payload = {
        "itemType": "Sword",
        "rarity": "rare",
        "bonusValue": 10,
        "price": 50.0
    }
    r = client.post("/predict-price", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "recommended_price" in data