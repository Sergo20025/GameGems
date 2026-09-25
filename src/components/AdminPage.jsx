import React, { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../contexts/Web3Provider";
import "../styles/AdminPage.css";

export default function AdminPage({
  totalSupply,
  availableForSale,
  accounts,
  ethBalance,
  adminAddress,
  onBack,
  onRefresh,
  onExport,
  onWithdraw,
  onAdminDrop,
}) {
  const [sortBy, setSortBy] = useState(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [dropAmount, setDropAmount] = useState("");
  const [sellPrices, setSellPrices] = useState({
    common: 5,
    rare: 20,
    epic: 50,
    legendary: 100,
  });

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/sell-prices`);
        setSellPrices(response.data);
      } catch (err) {
        console.error("Ошибка загрузки цен:", err);
      }
    };
    fetchPrices();
  }, []);

  const handlePriceChange = (rarity, value) => {
    setSellPrices((prev) => ({ ...prev, [rarity]: Number(value) || 0 }));
  };

  const savePrices = async () => {
    try {
      await axios.post(`${BACKEND_URL}/sell-prices`, sellPrices);
      alert("Цены сохранены!");
    } catch (err) {
      console.error("Ошибка при сохранении цен:", err);
      alert("Не удалось сохранить цены");
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(true);
    }
  };

  const sortedAccounts = [...accounts].sort((a, b) => {
    if (!sortBy) return 0;
    if (sortBy === "username") {
      return sortAsc
        ? a.username.localeCompare(b.username)
        : b.username.localeCompare(a.username);
    }
    if (sortBy === "balance") {
      return sortAsc ? a.balance - b.balance : b.balance - a.balance;
    }
  });

  const handleDrop = () => {
    const amount = parseInt(dropAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Введите положительное количество GEM");
      return;
    }
    onAdminDrop(amount);
    setDropAmount("");
  };

  return (
    <div className="admin-container">
      <h2>👑 Админ-панель</h2>
      <p><strong>🧾 Адрес админа:</strong> {adminAddress}</p>
      <p><strong>💰 GEM в обороте:</strong> {totalSupply}</p>
      <p><strong>🛒 Доступно к покупке GEM:</strong> {availableForSale}</p>
      <p><strong>📦 ETH на контракте:</strong> {ethBalance} ETH</p>

      <div className="admin-actions">
        <button onClick={onRefresh}>🔄 Обновить</button>
        <button onClick={onExport}>📤 Экспорт</button>
        <button
          onClick={() => {
            if (window.confirm("Вы уверены, что хотите вывести ETH?")) {
              onWithdraw();
            }
          }}
        >
          💸 Вывод ETH
        </button>
        <button onClick={onBack}>↩️ Назад</button>
      </div>

      {/* Контейнер с двумя колонками */}
      <div className="admin-main-layout">
        <div className="admin-main-left">
          <div className="admin-drop">
            <h4>📥 Добавить GEM в пул</h4>
            <input
              type="number"
              min="1"
              placeholder="Количество GEM"
              value={dropAmount}
              onChange={(e) => setDropAmount(e.target.value)}
            />
            <button onClick={handleDrop}>Добавить</button>
          </div>

          <h3 style={{ marginTop: "20px", textAlign: "left" }}>👥 Аккаунты пользователей</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th onClick={() => handleSort("username")} style={{ cursor: "pointer" }}>
                  Имя {sortBy === "username" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
                <th>Адрес</th>
                <th onClick={() => handleSort("balance")} style={{ cursor: "pointer" }}>
                  Баланс GEM {sortBy === "balance" ? (sortAsc ? "▲" : "▼") : ""}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedAccounts.map((acc, idx) => (
                <tr key={idx}>
                  <td>{acc.username}</td>
                  <td>{acc.address}</td>
                  <td>{acc.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-sell-prices">
          <h3>⚙️ Цены быстрой продажи предметов</h3>
          <table className="admin-table">
          <thead>
            <tr>
              <th>Редкость</th>
              <th>Цена (GEM)</th>
            </tr>
          </thead>
          <tbody>
            {sellPrices &&
              ["common", "rare", "epic", "legendary"].map((rarity) => (
                <tr key={rarity}>
                  <td>{rarity}</td>
                  <td>
                    <input
                      type="number"
                      value={sellPrices[rarity] ?? ""}
                      onChange={(e) => handlePriceChange(rarity, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
          <button onClick={savePrices}>💾 Сохранить цены</button>
        </div>
      </div>
    </div>
  );
}