import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BuyGems from '../BuyGems';

describe('BuyGems', () => {
  let onBuyMock;

  beforeEach(() => {
    onBuyMock = jest.fn();
    jest.spyOn(window, 'alert').mockImplementation(() => {}); // подавим alert
    render(<BuyGems onBuy={onBuyMock} />);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders input and button', () => {
    expect(screen.getByPlaceholderText('Количество GEM')).toBeInTheDocument();
    expect(screen.getByText('Купить GEM')).toBeInTheDocument();
  });

  it('calls onBuy with correct amount when valid input is provided', () => {
    const input = screen.getByPlaceholderText('Количество GEM');
    fireEvent.change(input, { target: { value: '10' } });

    const button = screen.getByText('Купить GEM');
    fireEvent.click(button);

    expect(onBuyMock).toHaveBeenCalledWith(10);
  });

  it('shows alert and does not call onBuy for invalid input (0)', () => {
    const input = screen.getByPlaceholderText('Количество GEM');
    fireEvent.change(input, { target: { value: '0' } });

    const button = screen.getByText('Купить GEM');
    fireEvent.click(button);

    expect(window.alert).toHaveBeenCalledWith('Введите корректное количество GEM');
    expect(onBuyMock).not.toHaveBeenCalled();
  });

  it('shows alert and does not call onBuy for invalid input (empty)', () => {
    const button = screen.getByText('Купить GEM');
    fireEvent.click(button);

    expect(window.alert).toHaveBeenCalledWith('Введите корректное количество GEM');
    expect(onBuyMock).not.toHaveBeenCalled();
  });
});