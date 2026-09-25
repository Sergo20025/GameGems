import "../styles/AccountPage.css";
import { useState } from "react";
import { useWeb3 } from "../contexts/Web3Provider";
import axios from "axios";

export default function AccountPage({
  account,
  username,
  onBack,
  gems, 
  onSendLocalGems,
  gemCount,
  setGemCount,
  onBuyGems,
  gemPrice,
}) {
  const [localAmount, setLocalAmount] = useState("");
 const { txHistory, fetchHistory, localGems, setLocalGems, backendUrl } = useWeb3();

  const handleSend = async () => {
  const amount = parseInt(localAmount, 10);
  if (isNaN(amount) || amount <= 0) {
    alert("Введите положительное количество GEM");
    return;
  }
  if (amount > localGems) {
    alert("Недостаточно локальных GEM");
    return;
  }

  const success = await onSendLocalGems(amount);
  if (success) {
    setLocalAmount("");
    await fetchHistory();
  }
};

  const handleBuy = async () => {
    await onBuyGems();         // ✅ вызов оригинальной функции
    await fetchHistory();      // ✅ обновление истории
  };

  const handleManualRefresh = async () => {
    await fetchHistory();
    alert("История обновлена");
  };

  const totalCost = gemCount && gemPrice
    ? (gemCount * gemPrice).toFixed(6)
    : "?";

  const getIcon = (type) => {
    if (type === "Покупка") return "🛒";
    if (type === "Депозит") return "📤";
    if (type === "Предмет") return "🎁";
    return "ℹ️";
    
  };

  return (
    <div className="account-container">
      <h2>👤 {username}</h2>
      <p>📦 Адрес: {account}</p>
      <p>💰 GEM на контракте: {gems}</p>
      <p>💎 Локальные GEM: {localGems}</p>

      <hr />

      <p>📤 Отправить локальные GEM в контракт</p>
      <input
        type="number"
        min="1"
        placeholder="Сколько GEM отправить?"
        value={localAmount}
        onChange={(e) => setLocalAmount(e.target.value)}
      />
      <button onClick={handleSend} disabled={!localAmount}>
        Отправить GEM
      </button>

      <hr />

      <p>🛒 Купить GEM напрямую у контракта</p>
      <p>💎 Цена за 1 GEM: {gemPrice ? `${gemPrice} ETH` : "?"}</p>
      <input
        type="number"
        min="1"
        placeholder="Сколько GEM купить?"
        value={gemCount ?? ""}
        onChange={(e) => setGemCount(Number(e.target.value))}
      />
      <p>💸 Стоимость: ≈ {totalCost} ETH</p>
      <button onClick={handleBuy} disabled={!gemCount}>
        Купить GEM
      </button>

      <hr />
      
      <h3>📜 История транзакций</h3>
      <button onClick={handleManualRefresh}>🔄 Обновить</button>

      {txHistory.length === 0 ? (
        <p>Нет транзакций</p>
      ) : (
        <div style={{ maxHeight: "220px", overflowY: "auto", paddingRight: "8px" }}>
          <ul className="tx-list">
            {txHistory.map((tx, i) => (
              <li key={i} className="tx-item">
                <span className="tx-icon">{getIcon(tx.type)}</span>
                <span className="tx-type">{tx.type}</span>

                {/* Универсальный рендер значения */}
                <span className="tx-amount">
                  {tx.type.includes("NFT") || tx.value?.includes("NFT") ? (
                    <>🎫 {tx.value}</>
                  ) : tx.value?.includes("GEM") ? (
                    <>💎 {tx.value}</>
                  ) : (
                    <>{tx.value}</>
                  )}
                </span>

                <span className="tx-time">🕒 {tx.timestamp}</span>
                <span className="tx-block">🔢 Блок #{tx.blockNumber}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <br />
      <button className="back" onClick={onBack}>🔙 Назад</button>
    </div>
  );
}
