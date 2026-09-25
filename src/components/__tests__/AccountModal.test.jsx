import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountModal from "../AccountModal";

describe("AccountModal", () => {
  let mockSetUsername;
  let mockOnCancel;
  let mockOnConfirm;

  beforeEach(() => {
    mockSetUsername = jest.fn();
    mockOnCancel = jest.fn();
    mockOnConfirm = jest.fn();

    render(
      <AccountModal
        username="testuser"
        setUsername={mockSetUsername}
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );
  });

  it("renders initial modal state", () => {
    expect(screen.getByText("Для создания аккаунта укажите имя и кошелек MetaMask")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Введите имя")).toHaveValue("testuser");
    expect(screen.queryByPlaceholderText("0x...")).not.toBeInTheDocument();
  });

  it("updates username on input change", () => {
    const nameInput = screen.getByPlaceholderText("Введите имя");
    fireEvent.change(nameInput, { target: { value: "newuser" } });
    expect(mockSetUsername).toHaveBeenCalledWith("newuser");
  });

  it("shows manual address input when checkbox is checked", () => {
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText("0x...")).toBeInTheDocument();
  });

  it("calls onCancel when Отмена is clicked", () => {
    fireEvent.click(screen.getByText("Отмена"));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it("calls onConfirm with correct values", () => {
    fireEvent.click(screen.getByRole("checkbox")); // Включаем ручной ввод
    const addressInput = screen.getByPlaceholderText("0x...");
    fireEvent.change(addressInput, { target: { value: "0xABC" } });

    fireEvent.click(screen.getByText("Создать"));
    expect(mockOnConfirm).toHaveBeenCalledWith({
      manual: true,
      manualAddress: "0xABC",
    });
  });
});