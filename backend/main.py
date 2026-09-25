from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import boto3
import requests
import os
import pandas as pd
import uuid
import json
import joblib
from dotenv import load_dotenv


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Строим путь к модели и словарю
MODEL_PATH = os.path.join(BASE_DIR, "..", "ml_model", "nft_price_regressor.pkl")


# Загружаем модель
price_model = joblib.load(MODEL_PATH)


# === Загрузка переменных окружения ===
load_dotenv()

# === Инициализация S3 клиента ===
s3 = boto3.client(
    service_name='s3',
    endpoint_url=os.getenv("S3_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("S3_KEY"),
    aws_secret_access_key=os.getenv("S3_SECRET"),
)

# === Константы путей в бакете ===
BUCKET_NAME = os.getenv("S3_BUCKET_NAME")
INVENTORY_PREFIX = "inventories/"
PROFILE_PREFIX = "profiles/"
SELL_PRICES_KEY = "config/sell_prices.json"
MARKETPLACE_PREFIX = 'marketplace/'
USER_NFT_PREFIX = 'nft_data/'




class NFTPriceRequest(BaseModel):
    itemType: str
    rarity: str
    bonusValue: int
    price: Optional[float] = None  # None по умолчанию

class NFTWrapRequest(BaseModel):
    account: str
    itemId: str
    json: dict  # содержит поля itemType, rarity, bonus, image и т.д.

class FinalNFT(BaseModel):
    tokenId: int
    itemType: str
    rarity: int
    bonus: dict
    image: str
    uri: str
    owner: str

# === Pydantic-модели ===
class Item(BaseModel):
    id: str
    type: str
    rarity: str
    image: str
    attributes: dict

class Profile(BaseModel):
    address: str
    created_at: Optional[str] = None
    nickname: Optional[str] = None
    local_gems: Optional[int] = 0  # 💎 Добавляем

# === Локальные хранилища в памяти ===
user_inventory = {}
user_profiles = {}
sell_prices = {}

# === Работа с инвентарём ===
def save_inventory_to_s3(address: str):
    key = f"{INVENTORY_PREFIX}{address.lower()}.json"
    data = json.dumps([item.model_dump() for item in user_inventory[address]])
    s3.put_object(Bucket=BUCKET_NAME, Key=key, Body=data)

def load_inventory_from_s3(address: str):
    key = f"{INVENTORY_PREFIX}{address.lower()}.json"
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
        items = json.loads(response["Body"].read().decode("utf-8"))
        user_inventory[address.lower()] = [Item(**item) for item in items]
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            user_inventory[address.lower()] = []
        else:
            raise

# === Работа с профилем ===
def save_profile_to_s3(profile: Profile):
    key = f"{PROFILE_PREFIX}{profile.address.lower()}.json"
    s3.put_object(Bucket=BUCKET_NAME, Key=key, Body=profile.model_dump_json())

def load_profile_from_s3(address: str):
    key = f"{PROFILE_PREFIX}{address.lower()}.json"
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
        profile_data = json.loads(response["Body"].read().decode("utf-8"))
        user_profiles[address.lower()] = Profile(**profile_data)
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] != 'NoSuchKey':
            raise

# === Работа с глобальными ценами продажи ===
def load_sell_prices():
    global sell_prices
    try:
        response = s3.get_object(Bucket=BUCKET_NAME, Key=SELL_PRICES_KEY)
        sell_prices = json.loads(response["Body"].read().decode("utf-8"))
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchKey':
            sell_prices = {
                "common": 5,
                "rare": 20,
                "epic": 50,
                "legendary": 100
            }
            save_sell_prices()
        else:
            raise

def save_sell_prices():
    s3.put_object(Bucket=BUCKET_NAME, Key=SELL_PRICES_KEY, Body=json.dumps(sell_prices))

# === API ===

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔁 Lifespan init: запуск сервера")
    load_sell_prices()  # 👈 если раньше это было в startup_event, добавь сюда
    yield
    print("⛔ Lifespan shutdown: сервер остановлен")

app = FastAPI(lifespan=lifespan)

# === CORS ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Можно указать конкретные источники
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "GameGems backend is running 🚀"}

@app.get("/inventory/{address}", response_model=List[Item])
def get_inventory(address: str):
    address = address.lower()
    if address not in user_inventory:
        load_inventory_from_s3(address)
    return user_inventory.get(address, [])

@app.post("/inventory/{address}")
def add_item(address: str, item: Item):
    address = address.lower()
    if address not in user_inventory:
        load_inventory_from_s3(address)

    if any(existing.id == item.id for existing in user_inventory[address]):
        raise HTTPException(status_code=400, detail="Предмет с таким ID уже существует.")

    user_inventory[address].append(item)
    save_inventory_to_s3(address)
    return {"status": "ok", "item_id": item.id}

@app.get("/profile/{address}", response_model=Profile)
def get_profile(address: str):
    address = address.lower()
    if address not in user_profiles:
        load_profile_from_s3(address)
    profile = user_profiles.get(address)
    if profile is None:
        raise HTTPException(status_code=404, detail="Профиль не найден")
    return profile
@app.patch("/profile/{address}")
def patch_profile(address: str, updates: dict = Body(...)):
    address = address.lower()
    if address not in user_profiles:
        load_profile_from_s3(address)

    profile = user_profiles.get(address)
    if not profile:
        raise HTTPException(status_code=404, detail="Профиль не найден")

    # Применяем обновления
    for key, value in updates.items():
        if hasattr(profile, key):
            setattr(profile, key, value)

    user_profiles[address] = profile
    save_profile_to_s3(profile)
    return {"status": "ok", "updated": updates}

@app.post("/profile/")
def create_or_update_profile(profile: Profile):
    address = profile.address.lower()
    user_profiles[address] = profile
    save_profile_to_s3(profile)
    return {"status": "ok", "address": profile.address}

@app.get("/sell-prices")
def get_sell_prices():
    return sell_prices

@app.post("/sell-prices")
def update_sell_prices(new_prices: dict):
    global sell_prices
    for rarity in ["common", "rare", "epic", "legendary"]:
        if rarity in new_prices:
            sell_prices[rarity] = new_prices[rarity]
    save_sell_prices()
    return {"status": "ok", "updated": sell_prices}

@app.delete("/inventory/{address}/{item_id}")
def delete_item(address: str, item_id: str):
    address = address.lower()
    if address not in user_inventory:
        load_inventory_from_s3(address)

    before_count = len(user_inventory[address])
    user_inventory[address] = [
        item for item in user_inventory[address] if item.id != item_id
    ]
    after_count = len(user_inventory[address])

    save_inventory_to_s3(address)

    if before_count == after_count:
        raise HTTPException(status_code=404, detail="Предмет не найден")

    return {"status": "ok", "deleted": 1}


@app.get("/profiles", response_model=List[Profile])
def get_all_profiles():
    keys = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PROFILE_PREFIX)
    results = []

    for obj in keys.get("Contents", []):
        key = obj["Key"]
        if not key.endswith(".json"):
            continue
        try:
            response = s3.get_object(Bucket=BUCKET_NAME, Key=key)
            data = json.loads(response["Body"].read().decode("utf-8"))
            results.append(Profile(**data))
        except Exception as e:
            print(f"❌ Ошибка чтения профиля {key}: {e}")
    return results


@app.post("/nft/create-json")
def create_nft_json(payload: NFTWrapRequest):
    filename = f"nft_data/{payload.account}_{payload.itemId}_{uuid.uuid4()}.json"
    content = json.dumps(payload.json, ensure_ascii=False)

    try:
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=filename,
            Body=content,
            ContentType="application/json",
            ACL="public-read"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки в S3: {str(e)}")

    url = f"https://storage.yandexcloud.net/{BUCKET_NAME}/{filename}"
    return {"uri": url}


@app.post("/nft/save")
def save_final_nft(data: FinalNFT):
    print("📥 Получено тело запроса:", data)
    # Ключ с одним уровнем вложенности: NFT/{tokenId}.json
    key = f"NFT/{data.tokenId}.json"

    try:
        # Сохраняем полный JSON с актуальным владельцем
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=key,
            Body=json.dumps(data.model_dump(), ensure_ascii=False),
            ContentType="application/json",
            ACL="public-read"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки в S3: {str(e)}")

    return {"status": "ok", "saved": key}

@app.get("/nft")
def get_all_nfts():
    # Возвращаем все NFT из папки NFT/
    prefix = "NFT/"
    try:
        response = s3.list_objects_v2(Bucket=BUCKET_NAME, Prefix=prefix)
        contents = response.get("Contents", [])
        nft_list = []

        for obj in contents:
            key = obj["Key"]
            if not key.endswith(".json"):
                continue
            s3_object = s3.get_object(Bucket=BUCKET_NAME, Key=key)
            data = json.loads(s3_object["Body"].read().decode("utf-8"))
            nft_list.append(data)

        return nft_list
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки NFT: {str(e)}")
    
@app.get("/nft/{tokenId}")
def get_nft_by_id(tokenId: int):
    key = f"NFT/{tokenId}.json"
    try:
        s3_object = s3.get_object(Bucket=BUCKET_NAME, Key=key)
        data = json.loads(s3_object["Body"].read().decode("utf-8"))
        return data
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"NFT с tokenId {tokenId} не найден: {str(e)}")
    
@app.get("/metadata-proxy/")
def proxy_metadata(url: str):
    try:
        response = requests.get(url)  # ← response — это просто результат запроса
        response.raise_for_status()
        return response.json()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка загрузки: {str(e)}")
    

@app.post("/predict-price")
def predict_nft_price(nft: NFTPriceRequest):
    try:
        # Подготовка данных для модели
        df = pd.DataFrame([{
            "itemType": nft.itemType,
            "rarity": nft.rarity,
            "bonusValue": nft.bonusValue
        }])

        # Получение рекомендованной цены
        predicted_price = round(price_model.predict(df)[0])
        result = {
            "status": "ok",
            "recommended_price": round(predicted_price, 2)
        }

        # Если пользователь передал цену, рассчитать отклонение
        if nft.price is not None:
            deviation = round((nft.price - predicted_price) / predicted_price * 100, 2)
            result["deviation"] = deviation

            if deviation < -10:
                result["price_status"] = "занижена"
            elif deviation > 10:
                result["price_status"] = "завышена"
            else:
                result["price_status"] = "нормальная"

        return result

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка при предсказании цены: {str(e)}")
