import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("GameGems - Unit Tests", function () {
  let GameGems, gameGems;
  let MockNFT, mockNFT;
  let owner, addr1, addr2;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Деплой мок-контракта NFT
    MockNFT = await ethers.getContractFactory("MockGameItemNFT");
    mockNFT = await MockNFT.deploy();

    // Деплой GameGems
    GameGems = await ethers.getContractFactory("GameGems");
    gameGems = await GameGems.deploy(
      10000,
      ethers.parseEther("0.001"),
      mockNFT.target
    );
  });

  it("initializes correctly with total supply and available for sale", async () => {
    expect(await gameGems.totalSupply()).to.equal(10000);
    expect(await gameGems.availableForSale()).to.equal(10000);
    expect(await gameGems.balanceOf(owner.address)).to.equal(10000);
  });

  it("allows setting gem price and item contract (admin only)", async () => {
    await gameGems.setGemPrice(ethers.parseEther("0.002"));
    expect(await gameGems.gemPrice()).to.equal(ethers.parseEther("0.002"));

    const newAddr = addr1.address;
    await gameGems.setItemContract(newAddr);
    expect(await gameGems.gameItemNFT()).to.equal(newAddr);
  });

  it("allows users to buy gems with ETH", async () => {
    await gameGems.connect(addr1).buyGems({ value: ethers.parseEther("0.003") });
    expect(await gameGems.balanceOf(addr1.address)).to.equal(3);
    expect(await gameGems.availableForSale()).to.equal(9997);
  });

  it("rejects buying with not enough ETH", async () => {
    await expect(
      gameGems.connect(addr1).buyGems({ value: 1000 })
    ).to.be.revertedWith("Not enough ETH to buy GEM");
  });

  it("allows users to deposit local gems with 5% fee", async () => {
    await gameGems.connect(addr1).depositGems(1000);
    expect(await gameGems.balanceOf(addr1.address)).to.equal(950);
    expect(await gameGems.totalSupply()).to.equal(11000);
    expect(await gameGems.availableForSale()).to.equal(10050);
  });

  it("transfers between users correctly", async () => {
    await gameGems.transfer(addr1.address, 500);
    expect(await gameGems.balanceOf(addr1.address)).to.equal(500);
    expect(await gameGems.balanceOf(owner.address)).to.equal(9500);
  });

  it("supports approve and transferFrom", async () => {
    await gameGems.approve(addr1.address, 300);
    expect(await gameGems.allowance(owner.address, addr1.address)).to.equal(300);

    await gameGems.connect(addr1).transferFrom(owner.address, addr2.address, 200);
    expect(await gameGems.balanceOf(addr2.address)).to.equal(200);
  });

  it("adminDrop adds to totalSupply and availableForSale", async () => {
    await gameGems.adminDrop(500);
    expect(await gameGems.totalSupply()).to.equal(10500);
    expect(await gameGems.availableForSale()).to.equal(10500);
  });

  it("allows transferForMarketplace with 5% commission", async () => {
    // owner → addr1: 1000 GEM
    await gameGems.transfer(addr1.address, 1000);
    // установить marketplace
    await gameGems.setMarketplaceAddress(addr2.address);

    // addr2 (marketplace) переводит 200 GEM от addr1 к addr2
    await gameGems.connect(addr2).transferForMarketplace(
      addr1.address,
      addr2.address,
      200
    );

    // Проверяем: addr2 получил 190 (95%), админ (owner) получил 10 (5%)
    expect(await gameGems.balanceOf(addr2.address)).to.equal(190);
    expect(await gameGems.balanceOf(owner.address)).to.equal(9010); // 10000-1000+10 = 9010

    // availableForSale: изначально 10000, +10 комиссии = 10010
    expect(await gameGems.availableForSale()).to.equal(10010);
  });

  it("wraps item and emits event", async () => {
    // Мок возвращает tokenId = 1
    await expect(
      gameGems.wrapItemAsNFT("Boots", 1, 5, "ipfs://uri")
    ).to.emit(gameGems, "ItemWrapped").withArgs(
      owner.address,
      1,
      "Boots",
      1,
      5,
      "ipfs://uri"
    );
  });

  it("withdrawEth only by admin", async () => {
  const oneMilliEther = ethers.parseEther("0.01");

  await gameGems.connect(addr1).buyGems({ value: oneMilliEther });
  const contractBalance = await ethers.provider.getBalance(gameGems.target);
  expect(contractBalance).to.equal(oneMilliEther);

  const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
  await gameGems.connect(owner).withdrawEth();

  const contractBalanceAfter = await ethers.provider.getBalance(gameGems.target);
  expect(contractBalanceAfter).to.equal(0);

  const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
  expect(ownerBalanceAfter).to.be.gt(ownerBalanceBefore); // Проверяем, что баланс увеличился
});
});
