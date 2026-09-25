import { useEffect, useState } from "react";
import { ethers } from "ethers";
import GameGemsABI from "../contracts/GameGemsABI.json";
import { useWeb3 } from "../contexts/Web3Provider";

export default function useTransactionHistory(account, provider) {
  const [history, setHistory] = useState([]);
  const { gemContract } = useWeb3(); // получаем контракт из контекста

  useEffect(() => {
    const loadHistory = async () => {
      if (!account || !provider || !gemContract) return;

      // получаем адрес из контракта: .target для ethers v6, .address для v5
      const contractAddress = gemContract.target || gemContract.address;

      const contract = new ethers.Contract(contractAddress, GameGemsABI, provider);

      const purchased = await contract.queryFilter(contract.filters.GemsPurchased(account));
      const deposited = await contract.queryFilter(contract.filters.GemsDeposited(account));
      const drops = await contract.queryFilter(contract.filters.ItemDropped(account));

      const all = [
        ...purchased.map((e) => ({ type: "Purchase", ...e.args, blockNumber: e.blockNumber })),
        ...deposited.map((e) => ({ type: "Deposit", ...e.args, blockNumber: e.blockNumber })),
        ...drops.map((e) => ({ type: "Drop", ...e.args, blockNumber: e.blockNumber })),
      ];

      all.sort((a, b) => b.blockNumber - a.blockNumber);
      setHistory(all);
    };

    loadHistory();
  }, [account, provider, gemContract]);

  return history;
}