import { useState } from "react";
import "../styles/AccountModal.css";

export default function AccountModal({ username, setUsername, onCancel, onConfirm }) {
  const [manual, setManual] = useState(false);
  const [manualAddress, setManualAddress] = useState("");

  const handleConfirm = () => {
    onConfirm({ manual, manualAddress });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <h3>Для создания аккаунта укажите имя и кошелек MetaMask</h3>

        <label>Имя аккаунта:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Введите имя"
        />

        <label>
          <input
            type="checkbox"
            checked={manual}
            onChange={() => setManual(!manual)}
          />
          Ввести адрес кошелька вручную
        </label>

        {manual && (
          <>
            <label>Адрес MetaMask:</label>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="0x..."
            />
          </>
        )}

        <div className="actions">
          <button className="cancel" onClick={onCancel}>Отмена</button>
          <button className="confirm" onClick={handleConfirm}>Создать</button>
        </div>
      </div>
    </div>
  );
}
