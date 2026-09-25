import React, { useState } from "react";
import { deleteItemFromBackend } from "../utils/sellHelpers";
import "../styles/QuickSellZone.css";

export default function QuickSellZone({
  sellPrices,
  inventory,
  setInventory,
  setGems,
  account,
}) {
  const [confirmItem, setConfirmItem] = useState(null);

  const handleDrop = async (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("item");
    if (!raw) return;

    let item;
    try {
      item = JSON.parse(raw);
    } catch (err) {
      console.error("❌ Ошибка парсинга предмета из drop:", err);
      return;
    }

    // 🚫 Блокируем продажу виртуальных предметов из NFT
    if (item.fromNFT) {
      alert("❌ Этот предмет является частью NFT и не может быть продан.");
      return;
    }

    const rarityKey = item.rarity?.toLowerCase();
    const price = Number(sellPrices[rarityKey]);

    if (!price && price !== 0) {
      console.warn("⚠️ Цена не найдена для редкости:", item.rarity, "| Все цены:", sellPrices);
    }

    if (rarityKey === "epic" || rarityKey === "legendary") {
      setConfirmItem(item);
    } else {
      await sell(item, price);
    }
  };

  const sell = async (item, price) => {
    try {
      console.log("Цена продажи:", price);
      await deleteItemFromBackend(account, item.id);
      setInventory((prev) => prev.filter((i) => i.id !== item.id));
      setGems((prev) => {
        console.log("Было GEM:", prev, "Добавим:", price);
        return prev + price;
      });
      setConfirmItem(null);
    } catch (err) {
      console.error("❌ Ошибка при продаже:", err);
      alert("❌ Не удалось продать предмет.");
    }
  };

  return (
    <div
      className="quick-sell-zone"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <h3>🗑 Быстрая продажа</h3>
      <ul className="sell-prices">
        {["common", "rare", "epic", "legendary"].map((rarity) => (
          <li key={rarity}>
            {rarity}: {sellPrices[rarity] ?? "?"} GEM
          </li>
        ))}
      </ul>

      {confirmItem && (
        <div className="sell-confirm-modal">
          <p>
            Это {confirmItem.rarity === "legendary" ? "легендарный" : "эпический"} предмет.
            Вы уверены, что хотите его продать?
          </p>
          <div className="sell-confirm-buttons">
            <button
              className="yes"
              onClick={() =>
                sell(confirmItem, Number(sellPrices[confirmItem.rarity?.toLowerCase()] || 0))
              }
            >
              ✅ Да
            </button>
            <button
              className="no"
              onClick={() => setConfirmItem(null)}
            >
              ❌ Нет
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
