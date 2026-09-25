import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LoginModal from '../LoginModal';

describe('LoginModal', () => {
  it('renders login modal with default MetaMask mode', () => {
    render(<LoginModal onLogin={jest.fn()} onCancel={jest.fn()} />);
    expect(screen.getByText('Вход в аккаунт')).toBeInTheDocument();
    expect(screen.getByText('Войти')).toBeInTheDocument();
    expect(screen.getByText('Отмена')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Адрес кошелька')).not.toBeInTheDocument();
    });

  it('calls onCancel when "Отмена" is clicked', () => {
    const handleCancel = jest.fn();
    render(<LoginModal onLogin={jest.fn()} onCancel={handleCancel} />);
    fireEvent.click(screen.getByText('Отмена'));
    expect(handleCancel).toHaveBeenCalled();
  });

  it('calls onLogin without address when manual is unchecked (MetaMask login)', () => {
    const handleLogin = jest.fn();
    render(<LoginModal onLogin={handleLogin} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByText('Войти'));
    expect(handleLogin).toHaveBeenCalledWith();
  });

  it('enables manual mode and shows input', () => {
    render(<LoginModal onLogin={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByPlaceholderText('Адрес кошелька')).toBeInTheDocument();
  });

  it('shows alert for invalid address in manual mode', () => {
    window.alert = jest.fn(); // mock alert
    render(<LoginModal onLogin={jest.fn()} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole('checkbox')); // enable manual
    fireEvent.change(screen.getByPlaceholderText('Адрес кошелька'), {
      target: { value: '0x123' }
    });
    fireEvent.click(screen.getByText('Войти'));
    expect(window.alert).toHaveBeenCalledWith('Введите корректный адрес');
  });

  it('calls onLogin with address when valid manual input is given', () => {
    const handleLogin = jest.fn();
    render(<LoginModal onLogin={handleLogin} onCancel={jest.fn()} />);
    fireEvent.click(screen.getByRole('checkbox')); // enable manual
    fireEvent.change(screen.getByPlaceholderText('Адрес кошелька'), {
      target: { value: '0x1234567890abcdef' }
    });
    fireEvent.click(screen.getByText('Войти'));
    expect(handleLogin).toHaveBeenCalledWith({ address: '0x1234567890abcdef' });
  });
});
