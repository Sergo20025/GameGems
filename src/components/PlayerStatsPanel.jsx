// src/components/PlayerStatsPanel.jsx
import React, { useEffect, useState } from "react";

const defaultStats = {
  bootsRarityMod: 0,
  vestLuckBoost: 0,
  itemDropBoost: 0,
  clickPower: 1,
  gemMultiplier: 1,
};

export function calculateStats(equipment) {
  const stats = { ...defaultStats };

  Object.values(equipment).forEach((item) => {
    if (!item || !item.attributes) return;

    switch (item.type) {
      case "Boots":
        stats.bootsRarityMod += item.attributes.rarityModBonus || 0;
        break;

      case "Vest":
        stats.vestLuckBoost += item.attributes.vestLuckBoost || 0;
        break;

      case "Lamp":
        stats.itemDropBoost += item.attributes.dropChanceBonus || 0;
        break;

      case "Pickaxe":
        stats.clickPower += item.attributes.flatPowerBonus || 0;
        break;

      case "Gloves":
        const bonus = item.attributes.gemMultiplierBonus || 1;
        stats.gemMultiplier *= bonus;
        break;
    }
  });

  return stats;
}

const PlayerStatsPanel = ({ equipment }) => {
  const [stats, setStats] = useState(defaultStats);

  useEffect(() => {
    setStats(calculateStats(equipment));
  }, [equipment]);

  return (
    <div className="player-stats-panel">
        <h3>🧬 Характеристики</h3>
        <ul style={{ listStyle: "none", padding: 0, fontSize: 14 }}>
        <li>🎯 Сила клика: {stats.clickPower}</li>
        <li>💎 Множитель GEM: x{stats.gemMultiplier.toFixed(2)}</li>
        <li>🌟 Шанс редкости (ботинки): +{stats.bootsRarityMod}%</li>
        <li>🍀 Удача (жилет): +{stats.vestLuckBoost}%</li>
        <li>📦 Шанс дропа (лампа): +{stats.itemDropBoost}%</li>
        </ul>
    </div>
    );
};

export default PlayerStatsPanel;
