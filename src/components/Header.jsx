export default function Header({ username, account, gems }) {
  return (
    <div style={{
      background: '#f5f5f5',
      padding: '15px 20px',
      borderRadius: '10px',
      marginBottom: '20px'
    }}>
      <p><strong>Имя:</strong> {username}</p>
      <p><strong>Адрес:</strong> {account}</p>
      <p><strong>Баланс GEM:</strong> {gems}</p>
    </div>
  );
}
