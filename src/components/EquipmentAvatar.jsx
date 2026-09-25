import React from "react";

const AvatarSilhouette = () => (
  <svg
    width="200"
    height="400"
    viewBox="0 0 200 400"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="100" cy="70" r="50" stroke="#888" strokeWidth="4" fill="none" />
    <rect x="50" y="130" width="100" height="170" stroke="#888" strokeWidth="4" fill="none" rx="20" />
    <rect x="20" y="130" width="40" height="100" stroke="#888" strokeWidth="4" fill="none" rx="15" />
    <rect x="140" y="130" width="40" height="100" stroke="#888" strokeWidth="4" fill="none" rx="15" />
    <rect x="60" y="300" width="30" height="80" stroke="#888" strokeWidth="4" fill="none" rx="15" />
    <rect x="110" y="300" width="30" height="80" stroke="#888" strokeWidth="4" fill="none" rx="15" />
  </svg>
);

export default function EquipmentAvatar({ equipment, setEquipment, setInventory }) {
  const EQUIPMENT_SLOTS = [
    { key: "Lamp", label: "Голова", className: "head" },
    { key: "Vest", label: "Тело", className: "body" },
    { key: "Gloves", label: "Левая рука", className: "left-arm" },
    { key: "Pickaxe", label: "Правая рука", className: "right-arm" },
    { key: "Boots", label: "Ноги", className: "legs" },
  ];

  const onDrop = (e, slotKey) => {
    e.preventDefault();
    const item = JSON.parse(e.dataTransfer.getData("item"));
    if (item.type !== slotKey) return;

    setEquipment((prev) => {
      const prevItem = prev[slotKey];
      setInventory((inv) => {
        let updated = inv.filter((i) => i.id !== item.id);
        if (prevItem && !updated.find((i) => i.id === prevItem.id)) {
          updated = [...updated, prevItem];
        }
        return updated;
      });
      return { ...prev, [slotKey]: item };
    });
  };

  const onDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="equipment-avatar-wrapper" style={{ position: "relative", width: 200, height: 400 }}>
      <AvatarSilhouette />
      {EQUIPMENT_SLOTS.map(({ key, label, className }) => (
        <div
          key={key}
          className={`equipment-slot ${className}`}
          onDrop={(e) => onDrop(e, key)}
          onDragOver={onDragOver}
          title={label}
          style={{
            position: "absolute",
            border: "2px dashed #888",
            borderRadius: 8,
            cursor: "pointer",
            backgroundColor: "rgba(255,255,255,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {equipment[key] ? (
            <img
              src={equipment[key].image}
              alt={equipment[key].type}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              draggable
              onDragStart={(e) => e.dataTransfer.setData("item", JSON.stringify(equipment[key]))}
              title={`${equipment[key].type} (${equipment[key].rarity})`}
            />
          ) : (
            <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
          )}
        </div>
      ))}

      {/* Стили позиционирования слотов */}
      <style>
        {`
          .equipment-slot.head {
            top: 10px;
            left: 75px;
            width: 50px;
            height: 50px;
          }
          .equipment-slot.body {
            top: 120px;
            left: 60px;
            width: 80px;
            height: 100px;
          }
          .equipment-slot.left-arm {
            top: 130px;
            left: 10px;
            width: 40px;
            height: 90px;
          }
          .equipment-slot.right-arm {
            top: 130px;
            left: 150px;
            width: 40px;
            height: 90px;
          }
          .equipment-slot.legs {
            top: 290px;
            left: 65px;
            width: 70px;
            height: 90px;
          }
        `}
      </style>
    </div>
  );
}
