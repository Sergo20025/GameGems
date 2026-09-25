const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const ethers = hre.ethers;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("📦 Deploying contracts from:", deployer.address);

  // === 1. Deploy GameItemNFT ===
  const GameItemNFTFactory = await ethers.getContractFactory("GameItemNFT");
  console.log("ℹ️ Deploying GameItemNFT...");
  const tx1 = await GameItemNFTFactory.deploy();
  const receipt1 = await tx1.waitForDeployment();
  const gameItemNFTAddress = await receipt1.getAddress();
  console.log("✅ GameItemNFT deployed at:", gameItemNFTAddress);

  // === 2. Deploy GameGems ===
  const GameGemsFactory = await ethers.getContractFactory("GameGems");
  const initialSupply = 1000000;
  const gemPrice = 1; // 💰 Устанавливаем цену 1 GEM = 1 wei
  const tx2 = await GameGemsFactory.deploy(initialSupply, gemPrice, gameItemNFTAddress);
  const receipt2 = await tx2.waitForDeployment();
  const gameGemsAddress = await receipt2.getAddress();
  console.log("✅ GameGems deployed at:", gameGemsAddress);

  // === 3. Deploy GameMarketplace ===
  const GameMarketplaceFactory = await ethers.getContractFactory("GameMarketplace");
  const tx3 = await GameMarketplaceFactory.deploy(gameItemNFTAddress, gameGemsAddress);
  const receipt3 = await tx3.waitForDeployment();
  const marketplaceAddress = await receipt3.getAddress();
  console.log("✅ GameMarketplace deployed at:", marketplaceAddress);

  // === 4. Link the contracts used by minting and marketplace payments ===
  const gameItemNFT = await ethers.getContractAt("GameItemNFT", gameItemNFTAddress);
  const linkGameGemsTx = await gameItemNFT.setGameGemsContract(gameGemsAddress);
  await linkGameGemsTx.wait();
  console.log("🔗 GameItemNFT linked to GameGems:", gameGemsAddress);

  const gameGems = await ethers.getContractAt("GameGems", gameGemsAddress);
  const linkMarketplaceTx = await gameGems.setMarketplaceAddress(marketplaceAddress);
  await linkMarketplaceTx.wait();
  console.log("🔗 GameGems linked to GameMarketplace:", marketplaceAddress);

  // === 5. Save addresses to contracts/contracts.json ===
  const addresses = {
    GameGems: gameGemsAddress,
    GameItemNFT: gameItemNFTAddress,
    GameMarketplace: marketplaceAddress,
  };

  const addressesPath = path.join(__dirname, "contracts.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`💾 Saved to ${addressesPath}`);

  // === 6. Save ABI to src/contracts/ ===
  const abiDir = path.join(__dirname, "..", "src", "contracts");

  const saveABI = async (contractName) => {
    const artifact = await hre.artifacts.readArtifact(contractName);
    const abiFileName = contractName === "GameItemNFT" ? "GameItemABI.json" : `${contractName}ABI.json`;
    const abiPath = path.join(abiDir, abiFileName);
    fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2));
    console.log(`💾 ABI saved: ${abiPath}`);

  };

  await saveABI("GameGems");
  await saveABI("GameItemNFT");
  await saveABI("GameMarketplace");
}

main().catch((error) => {
  console.error("❌ Deployment error:", error);
  process.exitCode = 1;
});
