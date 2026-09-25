import "./AccountModal.css";
import { useState } from "react";

export default function LoginModal({ onLogin, onCancel }) {
  const [manual, setManual] = useState(false);
  const [address, setAddress] = useState("");

  const handleConfirm = () => {
    if (manual) {
      if (!address || address.length < 10) {
        alert("Введите корректный адрес");
        return;
      }
      onLogin({ address });
    } else {
      onLogin(); // MetaMask
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <h3>Вход в аккаунт</h3>

        <label>
          <input
            type="checkbox"
            checked={manual}
            onChange={() => setManual(!manual)}
          />
          Ручной ввод адреса
        </label>

        {manual && (
          <input
            type="text"
            placeholder="Адрес кошелька"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        )}

        <div className="actions">
          <button className="cancel" onClick={onCancel}>Отмена</button>
          <button className="confirm" onClick={handleConfirm}>Войти</button>
        </div>
      </div>
    </div>
  );
}
