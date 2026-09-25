import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import QuickSellZone from "../QuickSellZone";
import * as sellHelpers from "../../utils/sellHelpers";

// Мокаем функцию удаления
jest.mock("../../utils/sellHelpers", () => ({
  deleteItemFromBackend: jest.fn(),
}));

const sampleItem = {
  id: "item-123",
  type: "Pickaxe",
  rarity: "rare",
  attributes: { flatPowerBonus: 2 },
};

describe("QuickSellZone", () => {
  const sellPrices = {
    common: 1,
    rare: 5,
    epic: 10,
    legendary: 15,
  };

  let setInventory, setGems;

  beforeEach(() => {
    setInventory = jest.fn();
    setGems = jest.fn();
    sellHelpers.deleteItemFromBackend.mockClear();
  });

  const renderComponent = (override = {}) =>
    render(
      <QuickSellZone
        sellPrices={{ common: 1, rare: 5, epic: 10, legendary: 15 }}
        inventory={[]}
        setInventory={setInventory}
        setGems={setGems}
        account="0x123"
        {...override}
      />
    );

  it("отображает список цен по редкости", () => {
    renderComponent();
    expect(screen.getByText("common: 1 GEM")).toBeInTheDocument();
    expect(screen.getByText("rare: 5 GEM")).toBeInTheDocument();
    expect(screen.getByText("epic: 10 GEM")).toBeInTheDocument();
    expect(screen.getByText("legendary: 15 GEM")).toBeInTheDocument();
  });

  it("обрабатывает дроп обычного предмета и вызывает продажу", async () => {
    renderComponent();

    const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
    const dataTransfer = {
      data: {},
      setData(key, value) {
        this.data[key] = value;
      },
      getData(key) {
        return this.data[key];
      },
    };
    dataTransfer.setData("item", JSON.stringify(sampleItem));

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer });
    });

    expect(sellHelpers.deleteItemFromBackend).toHaveBeenCalledWith("0x123", "item-123");
    expect(setInventory).toHaveBeenCalled();
    expect(setGems).toHaveBeenCalledWith(expect.any(Function));
  });

  it("показывает подтверждение продажи для эпического предмета", async () => {
    const epicItem = { ...sampleItem, rarity: "epic" };
    renderComponent();

    const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
    const dataTransfer = {
      data: {},
      setData(key, value) {
        this.data[key] = value;
      },
      getData(key) {
        return this.data[key];
      },
    };
    dataTransfer.setData("item", JSON.stringify(epicItem));

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer });
    });

    expect(screen.getByText(/эпический предмет/)).toBeInTheDocument();
    expect(screen.getByText("✅ Да")).toBeInTheDocument();
    expect(screen.getByText("❌ Нет")).toBeInTheDocument();
  });

  it("отменяет подтверждение при нажатии 'Нет'", async () => {
    const epicItem = { ...sampleItem, rarity: "epic" };
    renderComponent();

    const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
    const dataTransfer = {
      data: {},
      setData(key, value) {
        this.data[key] = value;
      },
      getData(key) {
        return this.data[key];
      },
    };
    dataTransfer.setData("item", JSON.stringify(epicItem));

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer });
    });

    fireEvent.click(screen.getByText("❌ Нет"));
    expect(screen.queryByText(/эпический предмет/)).not.toBeInTheDocument();
  });

  it("ничего не делает, если данные drop отсутствуют", async () => {
  renderComponent();

  const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
  const dataTransfer = {
    getData: jest.fn().mockReturnValue(undefined),
  };

  await act(async () => {
    fireEvent.drop(zone, { dataTransfer });
  });

  // Можно добавить expect, если хочешь проверить отсутствие вызова alert или других побочных эффектов
});

  it("обрабатывает ошибку парсинга JSON", async () => {
    renderComponent();
    const zone = screen.getByText("🗑 Быстрая продажа").parentElement;

    const dataTransfer = {
      getData: () => "INVALID_JSON",
    };

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer });
    });

    expect(sellHelpers.deleteItemFromBackend).not.toHaveBeenCalled();
  });
  
 it("блокирует продажу предмета из NFT и показывает alert", () => {
  const nftItem = {
    id: 77,
    type: "Lamp",
    image: "nft-lamp.jpg",
    rarity: "rare", // Исправлено на строку
    fromNFT: true,
  };

  const alertMock = jest.spyOn(window, "alert").mockImplementation(() => {});
  const onSell = jest.fn();

  renderComponent({ onSell });

  const zone = screen.getByText((content) => content.includes("Быстрая продажа"));
  const dataTransfer = {
    data: {},
    setData(key, value) {
      this.data[key] = value;
    },
    getData(key) {
      return this.data[key];
    },
  };
  dataTransfer.setData("item", JSON.stringify(nftItem));

  fireEvent.drop(zone, { dataTransfer });

  expect(alertMock).toHaveBeenCalledWith(
    "❌ Этот предмет является частью NFT и не может быть продан."
  );
  expect(onSell).not.toHaveBeenCalled();

  alertMock.mockRestore();
});

it("добавляет цену к GEM при продаже", async () => {
  const item = {
    id: "88",
    type: "Boots",
    image: "boots.jpg",
    rarity: "common", // Цена для common = 1 GEM
  };

  const mockSetGems = jest.fn();
  const initialGems = 10; // Начальное значение GEM для теста

  renderComponent({ setGems: mockSetGems });

  const zone = screen.getByText((content) => content.includes("Быстрая продажа"));
  const dataTransfer = {
    data: {},
    setData(key, value) {
      this.data[key] = value;
    },
    getData(key) {
      return this.data[key];
    },
  };
  dataTransfer.setData("item", JSON.stringify(item));

  await act(async () => {
    fireEvent.drop(zone, { dataTransfer });
  });

  // Проверяем, что setGems вызывается с функцией, которая добавляет 1 GEM
  expect(mockSetGems).toHaveBeenCalledWith(
    expect.any(Function)
  );

  // Проверяем, что функция внутри setGems возвращает правильное значение
  const setGemsCallback = mockSetGems.mock.calls[0][0]; // Получаем переданную функцию
  expect(setGemsCallback(initialGems)).toBe(initialGems + 1); // Проверяем, что 10 + 1 = 11

  // Проверяем, что предмет удалён
  expect(sellHelpers.deleteItemFromBackend).toHaveBeenCalledWith("0x123", "88");
});

it("отображает '?' для редкости с отсутствующей ценой", () => {
  const incompleteSellPrices = {
    rare: 5,
    epic: 10,
    legendary: 15,
    // common отсутствует
  };

  renderComponent({ sellPrices: incompleteSellPrices });

  expect(screen.getByText("common: ? GEM")).toBeInTheDocument();
  expect(screen.getByText("rare: 5 GEM")).toBeInTheDocument();
  expect(screen.getByText("epic: 10 GEM")).toBeInTheDocument();
  expect(screen.getByText("legendary: 15 GEM")).toBeInTheDocument();
});



  it("обрабатывает предмет с неизвестной редкостью", async () => {
  const unknownItem = { ...sampleItem, rarity: "mythic" };

  const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  renderComponent();

  const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
  const dataTransfer = {
    data: {},
    setData(key, value) {
      this.data[key] = value;
    },
    getData(key) {
      return this.data[key];
    },
  };
  dataTransfer.setData("item", JSON.stringify(unknownItem));

  await act(async () => {
    fireEvent.drop(zone, { dataTransfer });
  });

  expect(warnSpy).toHaveBeenCalledWith(
    "⚠️ Цена не найдена для редкости:", "mythic", "| Все цены:", expect.anything()
  );
  warnSpy.mockRestore();
});

  it("подтверждает продажу легендарного предмета", async () => {
    const legendaryItem = { ...sampleItem, rarity: "legendary" };
    renderComponent();

    const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
    const dataTransfer = {
      data: {},
      setData(key, value) {
        this.data[key] = value;
      },
      getData(key) {
        return this.data[key];
      },
    };
    dataTransfer.setData("item", JSON.stringify(legendaryItem));

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer });
    });

    await act(async () => {
      fireEvent.click(screen.getByText("✅ Да"));
    });

    expect(sellHelpers.deleteItemFromBackend).toHaveBeenCalledWith("0x123", "item-123");
    expect(setInventory).toHaveBeenCalled();
    expect(setGems).toHaveBeenCalledWith(expect.any(Function));
  });

  it("сбрасывает confirmItem после успешной продажи", async () => {
    renderComponent();

    const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
    const dataTransfer = {
      data: {},
      setData(key, value) {
        this.data[key] = value;
      },
      getData(key) {
        return this.data[key];
      },
    };
    dataTransfer.setData("item", JSON.stringify(sampleItem));

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer });
    });

    // Здесь достаточно проверить, что не осталось confirm-подтверждения
    expect(screen.queryByText("✅ Да")).not.toBeInTheDocument();
  });

  it("показывает alert при ошибке в продаже", async () => {
    const errorItem = { ...sampleItem, rarity: "rare" };

    sellHelpers.deleteItemFromBackend.mockImplementationOnce(() => {
      throw new Error("fail");
    });

    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
    renderComponent();

    const zone = screen.getByText("🗑 Быстрая продажа").parentElement;
    const dataTransfer = {
      data: {},
      setData(key, value) {
        this.data[key] = value;
      },
      getData(key) {
        return this.data[key];
      },
    };
    dataTransfer.setData("item", JSON.stringify(errorItem));

    await act(async () => {
      fireEvent.drop(zone, { dataTransfer });
    });

    expect(alertSpy).toHaveBeenCalledWith("❌ Не удалось продать предмет.");
    alertSpy.mockRestore();
  });
});