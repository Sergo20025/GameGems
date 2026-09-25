import React, { useState } from "react";
import { useWeb3 } from "../contexts/Web3Provider";
import axios from "axios";
import { getItemImageUrl } from "../utils/itemGenerator";

export default function WrapNFTPanel({ inventory, setInventory, setNftInventory }) {
  const {gemContract, nftContract, account, backendUrl } = useWeb3(); // <- обязательно берем контракты из контекста
  const [draggedItem, setDraggedItem] = useState(null);
  const [message, setMessage] = useState("");
  const [isWrapping, setIsWrapping] = useState(false);

  const handleDrop = async (e) => {
  e.preventDefault();
  if (isWrapping) return;

  const item = JSON.parse(e.dataTransfer.getData("item"));

  // 🚫 Блокировка повторного обёртывания
  if (item.fromNFT) {
  setMessage("❌ Этот предмет уже является частью NFT и не может быть обёрнут повторно.");
  setDraggedItem(null); // сброс отображаемого предмета
  setTimeout(() => setMessage(""), 3000); // очистить сообщение через 3 сек
  return;
  }
  setDraggedItem(item);

  console.log("📦 Контракты перед проверкой:", gemContract, nftContract);

  // СНАЧАЛА ПРОВЕРКА
  if (!gemContract || !nftContract) {
    setMessage("❌ Ошибка: Контракты не загружены");
    console.error("gemContract или nftContract не определены");
    return;
  }

  // Только после проверки — использование адресов
  const gameGemsAddress = gemContract.target?.toLowerCase();
  const gameItemNFTAddress = nftContract.target?.toLowerCase();

  try {
    setIsWrapping(true);
    console.log("🎯 Получен предмет:", item);

    const [attributeKey, attributeValue] = Object.entries(item.attributes || {})[0] || [];
    const rarityMap = { Common: 1, Rare: 2, Epic: 3, Legendary: 4 };
    const rarityValue = rarityMap[item.rarity] || 0;

    const nftJson = {
      itemType: item.type,
      rarity: rarityValue,
      bonus: {
        attribute: attributeKey || "unknown",
        value: attributeValue || 0,
      },
      image: getItemImageUrl(item.type, item.rarity),
    };

    console.log("📦 NFT JSON сформирован:", nftJson);

    const res = await axios.post(`${backendUrl}/nft/create-json`, {
      account,
      itemId: item.id,
      json: nftJson,
    });
    if (!res.data || !res.data.uri) throw new Error("Ошибка загрузки JSON в S3");

    const uri = res.data.uri;
    console.log("✅ JSON успешно загружен. URI:", uri);

    setMessage("⏳ Откройте MetaMask и подтвердите создание NFT");
    console.log("🪙 Минтим NFT через wrapItemAsNFT...");
    console.log("  - itemType:", nftJson.itemType);
    console.log("  - rarity:", Number(nftJson.rarity));
    console.log("  - bonus:", Number(nftJson.bonus.value));
    console.log("  - uri:", uri);

    const tx = await gemContract.wrapItemAsNFT(
      nftJson.itemType,
      Number(nftJson.rarity),
      Number(nftJson.bonus.value),
      uri
    );

    setMessage("⏳ Транзакция отправлена, ожидаем подтверждение");
    console.log("⏳ Транзакция отправлена. Ждём подтверждения...");
    const receipt = await tx.wait();

    console.log("✅ Транзакция подтверждена!");
    console.log("🧾 Все логи транзакции:", receipt.logs);

    let tokenId;
    for (const log of receipt.logs) {
      try {
        const logAddress = log.address.toLowerCase();

        if (logAddress === gameGemsAddress) {
          const parsed = gemContract.interface.parseLog(log);
          console.log("📨 Событие от GameGems:", parsed.name, parsed.args);
          if (parsed.name === "ItemWrapped") {
            tokenId = Number(parsed.args.tokenId);
            break;
          }

        } else if (logAddress === gameItemNFTAddress) {
          const parsed = nftContract.interface.parseLog(log);
          console.log("📨 Событие от GameItemNFT:", parsed.name, parsed.args);
          if (parsed.name === "NFTMinted") {
            tokenId = Number(parsed.args.tokenId);
            break;
          }
        }

      } catch (err) {
        console.warn("⚠️ Лог не подошёл:", err);
      }
    }

    const newNFT = {
      tokenId,
      itemType: nftJson.itemType,
      rarity: nftJson.rarity,
      bonus: nftJson.bonus,
      image: nftJson.image,
      uri,
      owner: account,
    };
    console.log("📤 Отправка в /nft/save:", newNFT);

    console.log("💾 Сохраняем NFT в S3...");
    await axios.post(`${backendUrl}/nft/save`, newNFT);
    console.log("✅ NFT сохранён!");

    setNftInventory((prev) => [...prev, newNFT]);
    setInventory((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await axios.delete(`${backendUrl}/inventory/${account}/${item.id}`);
      console.log(`🗑️ Предмет ${item.id} удалён из S3`);
    } catch (deleteErr) {
      console.warn(`⚠️ Не удалось удалить предмет ${item.id} из S3:`, deleteErr);
    }
    setMessage("✅ NFT создан и добавлен!");
    setDraggedItem(null);
    setTimeout(() => setMessage(""), 3000);
  } catch (err) {
    console.error("🔥 Ошибка обёртки:", err);
    const rejected = err?.code === "ACTION_REJECTED" || err?.code === 4001;
    setMessage(rejected
      ? "❌ Транзакция отклонена в MetaMask"
      : "❌ Ошибка: " + (err?.shortMessage || err?.message || "неизвестная ошибка"));
  } finally {
    setIsWrapping(false);
  }
};

  return (
    <div className="wrap-nft-panel">
      <h3>🔗 Преобразовать в NFT</h3>
      <div
        className="wrap-nft-dropzone"
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        aria-busy={isWrapping}
      >
        {draggedItem ? (
          <span>
            {isWrapping
              ? `${draggedItem.type} (⭐${draggedItem.rarity}) — обработка...`
              : `${draggedItem.type} (⭐${draggedItem.rarity}) готов к обёртке`}
          </span>
        ) : (
          <span>Перетащи сюда предмет из инвентаря</span>
        )}
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}
