import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { act } from "react";
import AdminPage from "../AdminPage";
import axios from "axios";

jest.mock("axios");

describe("AdminPage", () => {
  const mockProps = {
    totalSupply: 1000,
    availableForSale: 500,
    accounts: [
      { username: "Alice", address: "0x123", balance: 300 },
      { username: "Bob", address: "0x456", balance: 200 },
    ],
    ethBalance: "1.5",
    adminAddress: "0xADMIN",
    onBack: jest.fn(),
    onRefresh: jest.fn(),
    onExport: jest.fn(),
    onWithdraw: jest.fn(),
    onAdminDrop: jest.fn(),
  };

  beforeEach(() => {
    axios.get.mockResolvedValue({
      data: { common: 10, rare: 20, epic: 50, legendary: 100 },
    });

    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
    jest.clearAllMocks();
  });

  it("renders all base info correctly", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    expect(screen.getByText(/Админ-панель/)).toBeInTheDocument();
    expect(screen.getByText(/0xADMIN/i)).toBeInTheDocument();
    expect(screen.getByText(/1000/)).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/1.5 ETH/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("sorts accounts by username", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByText(/Имя/));
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alice");
    expect(rows[2]).toHaveTextContent("Bob");
  });

  it("renders accounts in original order when no sorting is applied", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alice");
    expect(rows[2]).toHaveTextContent("Bob");
  });

  it("сохраняет 0, если введено некорректное значение", async () => {
    axios.post.mockResolvedValue({});
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });

    fireEvent.change(screen.getByDisplayValue("10"), {
      target: { value: "abc" },
    });

    fireEvent.click(screen.getByText(/Сохранить цены/));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ common: 0 })
      );
    });
  });

  it("calls onRefresh when 'Обновить' clicked", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByText((t) => t.includes("Обновить")));
    expect(mockProps.onRefresh).toHaveBeenCalled();
  });

  it("calls onAdminDrop with valid input", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.change(screen.getByPlaceholderText(/Количество GEM/i), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByText("Добавить"));
    expect(mockProps.onAdminDrop).toHaveBeenCalledWith(50);
  });

  it("does not call onAdminDrop with empty input", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.change(screen.getByPlaceholderText(/Количество GEM/i), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByText("Добавить"));
    expect(mockProps.onAdminDrop).not.toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalledWith("Введите положительное количество GEM");
  });

  it("sorts accounts by balance", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByText(/Баланс GEM/));
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Bob");
    expect(rows[2]).toHaveTextContent("Alice");
  });

  it("saves prices via axios.post and shows alert", async () => {
    axios.post.mockResolvedValue({});
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByText((t) => t.includes("Сохранить цены")));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith("Цены сохранены!");
    });
  });

  it("shows alert on axios.post error", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    axios.post.mockRejectedValue(new Error("Network error"));
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByText((t) => t.includes("Сохранить цены")));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Не удалось сохранить цены");
    });
    console.error.mockRestore();
  });

  it("calls onBack when 'Назад' clicked", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByText((t) => t.includes("Назад")));
    expect(mockProps.onBack).toHaveBeenCalled();
  });

  it("calls onExport when 'Экспорт' clicked", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByText((t) => t.includes("Экспорт")));
    expect(mockProps.onExport).toHaveBeenCalled();
  });

  it("calls onWithdraw when 'Вывод ETH' clicked и подтверждено", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByRole("button", { name: /Вывод ETH/i }));
    expect(mockProps.onWithdraw).toHaveBeenCalled();
  });

  it("не вызывает onAdminDrop при 0 или отрицательном значении и показывает alert", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    const input = screen.getByPlaceholderText(/Количество GEM/i);

    // Тестируем 0
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(screen.getByText("Добавить"));
    expect(window.alert).toHaveBeenCalledWith("Введите положительное количество GEM");
    expect(mockProps.onAdminDrop).not.toHaveBeenCalled();

    // Тестируем отрицательное значение
    fireEvent.change(input, { target: { value: "-5" } });
    fireEvent.click(screen.getByText("Добавить"));
    expect(window.alert).toHaveBeenCalledWith("Введите положительное количество GEM");
    expect(mockProps.onAdminDrop).not.toHaveBeenCalled();

    // Тестируем NaN (например, нечисловой ввод)
    fireEvent.change(input, { target: { value: "abc" } });
    fireEvent.click(screen.getByText("Добавить"));
    expect(window.alert).toHaveBeenCalledWith("Введите положительное количество GEM");
    expect(mockProps.onAdminDrop).not.toHaveBeenCalled();
  });

  it("позволяет изменять цены и сохраняет их", async () => {
    axios.post.mockResolvedValue({});
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });

    fireEvent.change(screen.getByDisplayValue("10"), {
      target: { value: "15" },
    });

    fireEvent.click(screen.getByText(/Сохранить цены/));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("/sell-prices"),
        {
          common: 15,
          rare: 20,
          epic: 50,
          legendary: 100,
        }
      );
      expect(window.alert).toHaveBeenCalledWith("Цены сохранены!");
    });
  });

  it("не вызывает onWithdraw, если отменено подтверждение", async () => {
    window.confirm.mockReturnValue(false);
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    fireEvent.click(screen.getByRole("button", { name: /Вывод ETH/i }));
    expect(mockProps.onWithdraw).not.toHaveBeenCalled();
  });

  it("переключает сортировку по возрастанию/убыванию при повторном клике", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });

    // Первый клик — сортировка по возрастанию
    fireEvent.click(screen.getByText(/Имя/));

    // Второй клик — срабатывает setSortAsc(!sortAsc)
    fireEvent.click(screen.getByText(/Имя/));

    // Теперь Alice и Bob должны поменяться местами
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Bob");
    expect(rows[2]).toHaveTextContent("Alice");
  });


  it("обрабатывает ошибку axios.get в fetchPrices", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("Network error"));
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith("Ошибка загрузки цен:", expect.any(Error));
    });
    console.error.mockRestore();
  });

  it("покрывает дефолттный случай сортировки", async () => {
    await act(async () => {
      render(<AdminPage {...mockProps} />);
    });
    // Проверяем, что при sortBy = null (дефолтное состояние) аккаунты рендерятся в исходном порядке
    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Alice");
    expect(rows[2]).toHaveTextContent("Bob");
  });
});
