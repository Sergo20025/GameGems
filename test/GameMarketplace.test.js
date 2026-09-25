import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("GameMarketplace - Unit Tests", function () {
  let gameItemNFT, gameGems, marketplace;
  let owner, seller, buyer;

  beforeEach(async () => {
    [owner, seller, buyer] = await ethers.getSigners();

    // Деплой GameItemNFT
    const GameItemNFT = await ethers.getContractFactory("GameItemNFT");
    gameItemNFT = await GameItemNFT.deploy();
    await gameItemNFT.setGameGemsContract(owner.address); // owner будет "GameGems" для mint

    // Деплой GameGems
    const GameGems = await ethers.getContractFactory("GameGems");
    gameGems = await GameGems.deploy(
      10000,
      ethers.parseEther("0.001"),
      gameItemNFT.target
    );

    // Деплой GameMarketplace
    const GameMarketplace = await ethers.getContractFactory("GameMarketplace");
    marketplace = await GameMarketplace.deploy(gameItemNFT.target, gameGems.target);

    // Минтим NFT для seller
    await gameItemNFT.mintNFT(seller.address, "Lamp", 2, 5, "ipfs://uri");

    // Даём buyer GEM и разрешаем marketplace переводить его от имени buyer
    await gameGems.transfer(buyer.address, 1000);
    await gameGems.setMarketplaceAddress(marketplace.target);

    // approve NFT для marketplace
    await gameItemNFT.connect(seller).approve(marketplace.target, 1);
  });

  it("should list an item", async () => {
    await marketplace.connect(seller).listItem(1, 150);
    const listing = await marketplace.getListing(1);
    expect(listing.seller).to.equal(seller.address);
    expect(listing.priceInGems).to.equal(150);
  });

  it("should reject listing by non-owner", async () => {
    await expect(
      marketplace.connect(buyer).listItem(1, 100)
    ).to.be.revertedWith("Not owner of NFT");
  });

  it("should reject listing with 0 price", async () => {
    await expect(
      marketplace.connect(seller).listItem(1, 0)
    ).to.be.revertedWith("Price must be > 0");
  });

  it("should delist item only by seller", async () => {
    await marketplace.connect(seller).listItem(1, 200);
    await expect(
      marketplace.connect(buyer).delistItem(1)
    ).to.be.revertedWith("Not your listing");

    await marketplace.connect(seller).delistItem(1);
    const listing = await marketplace.getListing(1);
    expect(listing.priceInGems).to.equal(0);
  });

  it("should allow a valid item purchase", async () => {
    await marketplace.connect(seller).listItem(1, 300);

    // Пропуск approve NFT (сделано в beforeEach)
    await gameGems.connect(buyer).approve(marketplace.target, 300);

    await expect(
      marketplace.connect(buyer).buyItem(1)
    ).to.emit(marketplace, "ItemPurchased").withArgs(1, buyer.address, seller.address, 300);

    const newOwner = await gameItemNFT.ownerOf(1);
    expect(newOwner).to.equal(buyer.address);

    const listing = await marketplace.getListing(1);
    expect(listing.priceInGems).to.equal(0);
  });

  it("should reject buying if not listed", async () => {
    await expect(
      marketplace.connect(buyer).buyItem(1)
    ).to.be.revertedWith("Item not listed");
  });

  it("should reject buying if not enough GEM", async () => {
    await marketplace.connect(seller).listItem(1, 3000);
    await expect(
      marketplace.connect(buyer).buyItem(1)
    ).to.be.revertedWith("Not enough GEM");
  });

  it("should emit MarketplacePayment with 5% commission", async () => {
    await marketplace.connect(seller).listItem(1, 100);
    await gameGems.connect(buyer).approve(marketplace.target, 100);

    await expect(
      marketplace.connect(buyer).buyItem(1)
    ).to.emit(marketplace, "MarketplacePayment").withArgs(
      buyer.address,
      seller.address,
      100,
      5
    );
  });
});
