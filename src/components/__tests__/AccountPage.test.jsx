// src/components/__tests__/AccountPage.test.jsx
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountPage from "../AccountPage";
import { Web3Context } from "../../contexts/Web3Provider";

describe("AccountPage", () => {
  const mockFetchHistory = jest.fn();
  const mockSendLocalGems = jest.fn().mockResolvedValue(true);
  const mockBuyGems = jest.fn();
  const mockSetGemCount = jest.fn();
  const mockOnBack = jest.fn();

  const mockWeb3Context = {
    txHistory: [
      {
        type: "Покупка",
        value: "10 GEM",
        timestamp: "12:00",
        blockNumber: 123,
      },
      {
        type: "NFT",
        value: "NFT #1",
        timestamp: "12:05",
        blockNumber: 124,
      },
    ],
    localGems: 100,
    onChainGems: 300,
    fetchHistory: mockFetchHistory,
  };

  const mockProps = {
    account: "0xABC123",
    username: "TestUser",
    gems: 300,
    gemCount: 10,
    gemPrice: 0.01,
    setGemCount: mockSetGemCount,
    onSendLocalGems: mockSendLocalGems,
    onBuyGems: mockBuyGems,
    onBack: mockOnBack,
  };

  const renderWithContext = () =>
    render(
      <Web3Context.Provider value={mockWeb3Context}>
        <AccountPage {...mockProps} />
      </Web3Context.Provider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders user info and balances", () => {
    renderWithContext();
    expect(screen.getByText("👤 TestUser")).toBeInTheDocument();
    expect(screen.getByText(/0xABC123/)).toBeInTheDocument();
    expect(screen.getByText(/GEM на контракте: 300/)).toBeInTheDocument();
    expect(screen.getByText(/Локальные GEM: 100/)).toBeInTheDocument();
  });

  it("показывает alert, если GEM для отправки больше, чем доступно локально", async () => {
  window.alert = jest.fn();
  renderWithContext();
  const input = screen.getByPlaceholderText("Сколько GEM отправить?");
  fireEvent.change(input, { target: { value: "200" } }); // localGems = 100
  const button = screen.getByText("Отправить GEM");
  fireEvent.click(button);
  expect(window.alert).toHaveBeenCalledWith("Недостаточно локальных GEM");
});

  it("показывает alert при ручном обновлении истории", async () => {
  window.alert = jest.fn();
  renderWithContext();
  const button = screen.getByText("🔄 Обновить");
  fireEvent.click(button);
  await waitFor(() => {
    expect(mockFetchHistory).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("История обновлена");
  });
});

  it("отображает иконки 📤 для Депозит и 🎁 для Предмет", () => {
  const txHistoryWithAllTypes = [
    { type: "Депозит", value: "10 GEM", timestamp: "12:10", blockNumber: 125 },
    { type: "Предмет", value: "SuperBoots", timestamp: "12:15", blockNumber: 126 },
  ];

  render(
    <Web3Context.Provider value={{ ...mockWeb3Context, txHistory: txHistoryWithAllTypes }}>
      <AccountPage {...mockProps} />
    </Web3Context.Provider>
  );

  expect(screen.getByText("📤")).toBeInTheDocument();
  expect(screen.getByText("🎁")).toBeInTheDocument();
  });

  it("сбрасывает поле отправки после успешной передачи GEM", async () => {
  renderWithContext();
  const input = screen.getByPlaceholderText("Сколько GEM отправить?");
  fireEvent.change(input, { target: { value: "20" } });
  const button = screen.getByText("Отправить GEM");
  fireEvent.click(button);

  await waitFor(() => {
    expect(mockSendLocalGems).toHaveBeenCalledWith(20);
    expect(input.value).toBe(""); // Проверка сброса localAmount
  });
});

  it("calls onBuyGems and fetchHistory when купить GEM", async () => {
    renderWithContext();
    const button = screen.getByText("Купить GEM");
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockBuyGems).toHaveBeenCalled();
      expect(mockFetchHistory).toHaveBeenCalled();
    });
  });

  it("calls onSendLocalGems and fetchHistory when отправить GEM", async () => {
    renderWithContext();
    const input = screen.getByPlaceholderText("Сколько GEM отправить?");
    fireEvent.change(input, { target: { value: "20" } });
    const button = screen.getByText("Отправить GEM");
    fireEvent.click(button);
    await waitFor(() => {
      expect(mockSendLocalGems).toHaveBeenCalledWith(20);
      expect(mockFetchHistory).toHaveBeenCalled();
    });
  });

  it("shows alert on invalid отправка GEM", () => {
    window.alert = jest.fn();
    renderWithContext();
    const input = screen.getByPlaceholderText("Сколько GEM отправить?");
    fireEvent.change(input, { target: { value: "-5" } });
    const button = screen.getByText("Отправить GEM");
    fireEvent.click(button);
    expect(window.alert).toHaveBeenCalledWith("Введите положительное количество GEM");
  });

  it("отображает иконку ℹ️ для неизвестного типа транзакции", () => {
  const customContext = {
    ...mockWeb3Context,
    txHistory: [
      {
        type: "Неизвестный тип",
        value: "??",
        timestamp: "00:00",
        blockNumber: 999,
      },
    ],
  };

  render(
    <Web3Context.Provider value={customContext}>
      <AccountPage {...mockProps} />
    </Web3Context.Provider>
  );

  expect(screen.getByText("ℹ️")).toBeInTheDocument(); // проверка fallback-иконки
  expect(screen.getByText("??")).toBeInTheDocument(); // проверка значения
  expect(screen.getByText(/Блок #999/)).toBeInTheDocument(); // проверка номера блока
});

it("отображает value без эмодзи, если не содержит GEM и NFT", () => {
  const customContext = {
    ...mockWeb3Context,
    txHistory: [
      {
        type: "Custom",
        value: "SomeValue",
        timestamp: "01:01",
        blockNumber: 888,
      },
    ],
  };

  render(
    <Web3Context.Provider value={customContext}>
      <AccountPage {...mockProps} />
    </Web3Context.Provider>
  );

  expect(screen.getByText("SomeValue")).toBeInTheDocument(); // без 💎 или 🎫
});

  it("displays transaction history correctly", () => {
  renderWithContext();

  expect(screen.getByText("🛒")).toBeInTheDocument();                     // Покупка
  expect(screen.queryAllByText("📤")).toHaveLength(0);                    // Нет депозита
  expect(screen.getByText((text) => text.includes("🎫"))).toBeInTheDocument(); // NFT
  expect(screen.getByText(/Блок #123/)).toBeInTheDocument();
  expect(screen.getByText(/Блок #124/)).toBeInTheDocument();
});

  it("shows fallback if no transactions", () => {
    render(
      <Web3Context.Provider value={{ ...mockWeb3Context, txHistory: [] }}>
        <AccountPage {...mockProps} />
      </Web3Context.Provider>
    );
    expect(screen.getByText("Нет транзакций")).toBeInTheDocument();
  });

  it("отображает ? как стоимость, если gemCount или gemPrice отсутствуют", () => {
  const propsWithNoPrice = { ...mockProps, gemCount: null, gemPrice: null };

  render(
    <Web3Context.Provider value={mockWeb3Context}>
      <AccountPage {...propsWithNoPrice} />
    </Web3Context.Provider>
  );

  expect(screen.getByText(/💸 Стоимость: ≈ \? ETH/)).toBeInTheDocument();
});

  it("calls fetchHistory on 'Обновить'", () => {
    window.alert = jest.fn();
    renderWithContext();
    fireEvent.click(screen.getByText("🔄 Обновить"));
    expect(mockFetchHistory).toHaveBeenCalled();
  });

  it("calls onBack when 'Назад' clicked", () => {
    renderWithContext();
    fireEvent.click(screen.getByText("🔙 Назад"));
    expect(mockOnBack).toHaveBeenCalled();
  });
});
