import { useState, useEffect } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { BACKEND_URL, useWeb3 } from "../contexts/Web3Provider";

export default function useAdminData(isActive, currentAccount) {
  const { gemContract: contract } = useWeb3();

  const [totalSupply, setTotalSupply] = useState(0);
  const [availableForSale, setAvailableForSale] = useState(0);
  const [accounts, setAccounts] = useState([]);
  const [ethBalance, setEthBalance] = useState(0);
  const [adminAddress, setAdminAddress] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminReady, setIsAdminReady] = useState(false);

  const refreshAdminData = async () => {
    console.log("🔁 [refreshAdminData] Запущен");

    if (!contract || !contract.runner?.provider) return;

    try {
      const [supplyRaw, adminAddr, availableRaw] = await Promise.all([
        contract.totalSupply(),
        contract.admin(),
        contract.availableForSale(),
      ]);

      setAdminAddress(adminAddr);

      const isRealAdmin = currentAccount?.toLowerCase() === adminAddr.toLowerCase();
      setIsAdmin(isRealAdmin);
      setIsAdminReady(true);

      if (!isRealAdmin) return;

      setTotalSupply(Number(supplyRaw));
      setAvailableForSale(Number(availableRaw));

      const resp = await axios.get(`${BACKEND_URL}/profiles`);
      const profiles = resp.data;

      console.log(`📄 [refreshAdminData] Получено ${profiles.length} профилей`);

      const enrichedProfiles = await Promise.all(
        profiles.map(async (profile, i) => {
          try {
            const rawAddress = profile.address?.trim();
            if (!ethers.isAddress(rawAddress)) return null;

            const balance = await contract.balanceOf(rawAddress);
            return {
              username: profile.nickname,
              address: rawAddress,
              balance: Number(balance),
            };
          } catch {
            return null;
          }
        })
      );

      const validAccounts = enrichedProfiles.filter(Boolean);
      setAccounts(validAccounts);
      console.log(`✅ [refreshAdminData] Загружено ${validAccounts.length} аккаунтов`);

      const provider = contract.runner.provider;
      const ethBalRaw = await provider.getBalance(contract.target || contract.address);
      const ethFormatted = Number(ethers.formatEther(ethBalRaw)).toExponential(8);
      setEthBalance(ethFormatted);
    } catch (e) {
      console.error("❌ [refreshAdminData] Общая ошибка:", e);
      setIsAdminReady(true);
    }
  };

  const exportAccounts = () => {
    const csv = ["Имя,Адрес,Баланс GEM"];
    accounts.forEach((acc) => {
      csv.push(`${acc.nickname || ""},${acc.address},${acc.balance}`);
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "accounts.csv";
    a.click();
  };

  const withdrawEth = async () => {
    if (!contract) return;
    try {
      const tx = await contract.withdrawEth();
      await tx.wait();
      await refreshAdminData();
      alert("✅ ETH выведены");
    } catch {
      alert("Не удалось вывести ETH");
    }
  };

  const dropTokens = async (amount) => {
    if (!contract) return;
    try {
      const tx = await contract.dropTokens(BigInt(amount));
      await tx.wait();
      await refreshAdminData();
      alert(`✅ Добавлено ${amount} GEM`);
    } catch {
      alert("Не удалось дропнуть токены");
    }
  };

  useEffect(() => {
    refreshAdminData();
    const interval = setInterval(refreshAdminData, 10000);
    return () => clearInterval(interval);
  }, [contract, isActive, currentAccount]);

  return {
    totalSupply: isAdmin ? totalSupply : 0,
    availableForSale: isAdmin ? availableForSale : 0,
    accounts: isAdmin ? accounts : [],
    ethBalance: isAdmin ? ethBalance : 0,
    adminAddress,
    isAdmin,
    isAdminReady,
    refreshAdminData,
    exportAccounts,
    withdrawEth,
    dropTokens,
  };
}
