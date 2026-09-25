import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("Integration: GameGems + GameItemNFT + GameMarketplace", function () {
  let gameGems, gameItemNFT, marketplace;
  let owner, seller, buyer;

  beforeEach(async () => {
    [owner, seller, buyer] = await ethers.getSigners();

    // 1) Деплой GameItemNFT
    const GameItemNFTFactory = await ethers.getContractFactory("GameItemNFT");
    gameItemNFT = await GameItemNFTFactory.deploy();
    await gameItemNFT.waitForDeployment();

    // 2) Деплой GameGems
    const GameGemsFactory = await ethers.getContractFactory("GameGems");
    gameGems = await GameGemsFactory.deploy(
      10000,
      ethers.parseEther("0.001"),
      await gameItemNFT.getAddress()
    );
    await gameGems.waitForDeployment();

    // 3) Дать GameGems право минтить NFT
    await gameItemNFT.connect(owner).setGameGemsContract(await gameGems.getAddress());

    // 4) Деплой GameMarketplace
    const GameMarketplaceFactory = await ethers.getContractFactory("GameMarketplace");
    marketplace = await GameMarketplaceFactory.deploy(
      await gameItemNFT.getAddress(),
      await gameGems.getAddress()
    );
    await marketplace.waitForDeployment();

    // 5) Установить marketplace в GameGems
    await gameGems.connect(owner).setMarketplaceAddress(marketplace.target);

    // 6) Перевести 500 GEM покупателю
    await gameGems.connect(owner).transfer(buyer.address, 500);

    // 7) Продавец (seller) оборачивает предмет (минт через wrap)
    await gameGems.connect(seller).wrapItemAsNFT("Pickaxe", 3, 12, "ipfs://pickaxe");
  });

  it("should allow full flow: wrap → list → buy", async () => {
    const tokenId = await gameItemNFT.getLastTokenId();

    // Проверяем, что seller владеет NFT
    expect(await gameItemNFT.ownerOf(tokenId)).to.equal(seller.address);

    // seller листит
    await marketplace.connect(seller).listItem(tokenId, 200);

    // seller одобряет GameMarketplace для управления NFT
    await gameItemNFT.connect(seller).approve(marketplace.target, tokenId);

    // buyer апрувит маркетплейс на списание GEM
    await gameGems.connect(buyer).approve(marketplace.target, 200);

    // buyer покупает NFT
    await marketplace.connect(buyer).buyItem(tokenId);

    // Проверяем, что buyer стал владельцем NFT
    expect(await gameItemNFT.ownerOf(tokenId)).to.equal(buyer.address);
  });
});