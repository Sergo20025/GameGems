import joblib
import pandas as pd

# === Загрузка обученной модели ===
model = joblib.load(r"C:\Blockchain\gamegems-app\ml_model\nft_price_regressor.pkl")

# === Пример NFT ===
itemType = "Boots"
rarity = "Common"
bonusValue = 1
real_price = 1250  # ← это фактическая цена, например, из смарт-контракта или ввода пользователя

# === Подготовка данных для модели ===
df = pd.DataFrame([{
    "itemType": itemType,
    "rarity": rarity,
    "bonusValue": bonusValue
}])

# === Предсказание рекомендованной цены ===
predicted_price = model.predict(df)[0]

# === Расчёт отклонения ===
deviation = round((real_price - predicted_price) / predicted_price * 100, 2)

# === Вывод результата ===
print("🔍 Прогноз по NFT:")
print(f"- Тип: {itemType}")
print(f"- Редкость: {rarity}")
print(f"- Бонус: {bonusValue}")
print(f"- Фактическая цена: {real_price}")
print(f"💰 Рекомендованная цена от модели: {round(predicted_price, 2)}")
print(f"📊 Отклонение от рекомендации: {deviation}%")

# === Интерпретация
if deviation < -10:
    print("📉 Цена занижена")
elif deviation > 10:
    print("📈 Цена завышена")
else:
    print("✅ Цена в нормальном диапазоне")
