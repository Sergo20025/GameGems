import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import joblib

# === Загрузка данных ===
df = pd.read_csv("your_dataset.csv")

# === Признаки и целевая переменная
features = ["itemType", "rarity", "bonusValue"]
X = df[features]
y = df["price"]  # Цель — реальная цена

# === Категориальные признаки
categorical = ["itemType", "rarity"]

# === Преобразователь
preprocessor = ColumnTransformer([
    ("cat", OneHotEncoder(handle_unknown="ignore"), categorical)
], remainder="passthrough")

# === Модель регрессии
model = Pipeline([
    ("preprocessor", preprocessor),
    ("regressor", RandomForestRegressor(n_estimators=100, random_state=42))
])

# === Обучение модели
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
model.fit(X_train, y_train)

# === Сохранение обученной модели
joblib.dump(model, "nft_price_regressor.pkl")
print("✅ Модель регрессии обучена и сохранена как nft_price_regressor.pkl")
