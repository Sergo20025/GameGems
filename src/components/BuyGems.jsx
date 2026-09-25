import { useState } from 'react';

export default function BuyGems({ onBuy }) {
  const [amount, setAmount] = useState('');

  const handleBuy = () => {
    const count = parseInt(amount);
    if (!count || count <= 0) {
      alert("Введите корректное количество GEM");
      return;
    }
    onBuy(count);
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Количество GEM"
        style={{
          padding: '10px',
          width: '150px',
          marginRight: '10px',
          borderRadius: '6px',
          border: '1px solid #ccc'
        }}
      />
      <button onClick={handleBuy} style={{
        padding: '10px 20px',
        backgroundColor: '#4caf50',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }}>
        Купить GEM
      </button>
    </div>
  );
}