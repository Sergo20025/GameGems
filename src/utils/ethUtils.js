import { parseEther, formatEther } from 'ethers';

export function gemToEth(gems) {
  return parseEther((gems / 1000).toString());
}

export function ethToGem(eth) {
  return Math.floor(Number(formatEther(eth)) * 1000);
}
