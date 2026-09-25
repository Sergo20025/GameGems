import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import EquipmentAvatar from "../EquipmentAvatar";
import { createEvent } from "@testing-library/react";

describe("EquipmentAvatar", () => {
  let equipment, setEquipment, setInventory;

  beforeEach(() => {
    equipment = {
      Lamp: null,
      Vest: null,
      Gloves: null,
      Pickaxe: null,
      Boots: null,
    };
    setEquipment = jest.fn((fn) => {
      equipment = fn(equipment);
    });
    setInventory = jest.fn((fn) => {
      // для проверки возврата в инвентарь
      const dummyInventory = [];
      const updated = fn(dummyInventory);
      setInventory.mock.results.push({ value: updated });
    });
  });

  it("renders all equipment slots with default labels", () => {
    render(
      <EquipmentAvatar
        equipment={equipment}
        setEquipment={setEquipment}
        setInventory={setInventory}
      />
    );

    expect(screen.getByText("Голова")).toBeInTheDocument();
    expect(screen.getByText("Тело")).toBeInTheDocument();
    expect(screen.getByText("Левая рука")).toBeInTheDocument();
    expect(screen.getByText("Правая рука")).toBeInTheDocument();
    expect(screen.getByText("Ноги")).toBeInTheDocument();
  });

  it("handles drop of matching item into correct slot", () => {
    const item = { id: 1, type: "Lamp", image: "lamp.jpg", rarity: 2 };
    render(
      <EquipmentAvatar
        equipment={equipment}
        setEquipment={setEquipment}
        setInventory={setInventory}
      />
    );

    const slot = screen.getByTitle("Голова");
    const dataTransfer = {
      getData: () => JSON.stringify(item),
    };

    fireEvent.drop(slot, { dataTransfer });
    expect(setEquipment).toHaveBeenCalled();
  });

 it("prevents default on drag over equipment slot", () => {
  render(
    <EquipmentAvatar
      equipment={equipment}
      setEquipment={setEquipment}
      setInventory={setInventory}
    />
  );

  const slot = screen.getByTitle("Ноги");
  const dragOverEvent = createEvent.dragOver(slot);
  dragOverEvent.preventDefault = jest.fn();

  fireEvent(slot, dragOverEvent);

  expect(dragOverEvent.preventDefault).toHaveBeenCalled();
});

  it("ignores drop of item into wrong slot", () => {
    const item = { id: 2, type: "Boots", image: "boots.jpg", rarity: 1 };
    render(
      <EquipmentAvatar
        equipment={equipment}
        setEquipment={setEquipment}
        setInventory={setInventory}
      />
    );

    const headSlot = screen.getByTitle("Голова");
    const dataTransfer = {
      getData: () => JSON.stringify(item),
    };

    fireEvent.drop(headSlot, { dataTransfer });
    expect(setEquipment).not.toHaveBeenCalled();
  });

    it("returns previous item in slot to inventory", () => {
    const prevItem = { id: 10, type: "Vest", image: "vest1.jpg", rarity: 1 };
    const newItem = { id: 11, type: "Vest", image: "vest2.jpg", rarity: 2 };
    let inventoryResult = [];

    equipment = {
      ...equipment,
      Vest: prevItem,
    };

    setInventory = jest.fn((fn) => {
      inventoryResult = fn([]); // начальный инвентарь пустой
    });

    render(
      <EquipmentAvatar
        equipment={equipment}
        setEquipment={setEquipment}
        setInventory={setInventory}
      />
    );

    const slot = screen.getByTitle("Тело");
    const dataTransfer = {
      getData: () => JSON.stringify(newItem),
    };

    fireEvent.drop(slot, { dataTransfer });

    // Проверим, что предыдущий предмет вернулся в инвентарь
    expect(inventoryResult.find((i) => i.id === prevItem.id)).toBeDefined();
  });

  it("renders equipped item image", () => {
    equipment = {
      ...equipment,
      Pickaxe: {
        id: 5,
        type: "Pickaxe",
        image: "pickaxe.jpg",
        rarity: 4,
      },
    };

    render(
      <EquipmentAvatar
        equipment={equipment}
        setEquipment={setEquipment}
        setInventory={setInventory}
      />
    );

    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "pickaxe.jpg");
    expect(img).toHaveAttribute("alt", "Pickaxe");
    expect(img).toHaveAttribute("title", "Pickaxe (4)");
  });
});