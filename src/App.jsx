import { useState } from "react";
import { useWeb3 } from "./contexts/Web3Provider";
import useAdminData from "./hooks/useAdminData";
import AdminPage from "./components/AdminPage";
import AccountModal from "./components/AccountModal";
import AccountPage from "./components/AccountPage";
import GameScreen from "./components/GameScreen";
import MarketplacePage from "./components/MarketplacePage";
import "./styles/App.css";

function App() {
  const {
    account,
    username,
    setUsername,
    gems,
    gemContract,
    view,
    setView,
    showModal,
    setShowModal,
    handleCreate,
    handleLogin,
    handleAdminLogin,
    buyGems,
    gemPrice,
    sendLocalGemsToContract,
    resetAppState,
  } = useWeb3();

const {
  totalSupply,
  availableForSale,
  accounts,
  ethBalance,
  adminAddress,
  refreshAdminData,
  exportAccounts,
  withdrawEth,
  dropTokens,
  isAdmin,
  isAdminReady, // 👈 обязательно
  }  = useAdminData(view === "admin", account);

  const [gemCount, setGemCount] = useState("");
  const { localGems, setLocalGems } = useWeb3();

  const handleBuyGems = async () => {
    const count = parseInt(gemCount);
    if (isNaN(count) || count <= 0) {
      alert("Введите корректное количество GEM");
      return;
    }
    await buyGems(count);
    setGemCount("");
  };

  const handleSendLocalGems = async (amount) => {
    const success = await sendLocalGemsToContract(amount);
    if (success) {
      setLocalGems((prev) => prev - amount);
    }
  };

  const handleAdminDrop = async (amount) => {
    try {
      if (!gemContract) return alert("Контракт не загружен");
      const tx = await gemContract.adminDrop(amount);
      await tx.wait();
      alert(`Успешно добавлено ${amount} GEM в пул.`);
      refreshAdminData();
    } catch (err) {
      console.error("Ошибка при adminDrop:", err);
      alert("Не удалось выполнить adminDrop. См. консоль.");
    }
  };



  return (
    <div className="container">
      {view === "home" && (
        <>
          <h1>💎 GameGems</h1>
          <button className="login" onClick={handleLogin}>Войти</button>
          <button className="create" onClick={() => setShowModal(true)}>Создать аккаунт</button>
          <button
            className="admin"
            onClick={() => {
              console.log("🔐 Кнопка 'Войти как админ' нажата");
              handleAdminLogin();
            }}
            disabled={isAdminReady && !isAdmin}
          >
            Войти как админ
          </button>
        </>
      )}

      {view === "admin" && (
        !isAdminReady ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>🔄 Проверка прав администратора...</h2>
          </div>
        ) : isAdmin ? (
          <AdminPage
            totalSupply={totalSupply}
            availableForSale={availableForSale}
            accounts={accounts}
            ethBalance={ethBalance}
            adminAddress={adminAddress}
            onBack={resetAppState}
            onRefresh={refreshAdminData}
            onExport={exportAccounts}
            onWithdraw={withdrawEth}
            onAdminDrop={handleAdminDrop}
          />
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>🚫 У вас нет прав администратора</h2>
            <button onClick={resetAppState}>На главную</button>
          </div>
        )
      )}

      {view === "game" && (
        <GameScreen
          username={username}
          onAccountPage={() => setView("account")}
          onBack={resetAppState}
          localGems={localGems}
          setLocalGems={setLocalGems}
          onMarketplace={() => setView("marketplace")}
        />
      )}

      {view === "account" && (
        <AccountPage
          account={account}
          username={username}
          gems={gems}
          localGems={localGems}
          gemCount={gemCount}
          setGemCount={setGemCount}
          onBuyGems={handleBuyGems}
          onSendLocalGems={handleSendLocalGems}
          gemPrice={gemPrice}
          onBack={() => setView("game")}
        />
      )}

      {view === "marketplace" && (
        <MarketplacePage onBack={() => setView("game")} />
      )}

      {showModal && (
        <AccountModal
          username={username}
          setUsername={setUsername}
          onCancel={() => setShowModal(false)}
          onConfirm={handleCreate}
        />
      )}
      
    </div>
  );
}

export default App;
