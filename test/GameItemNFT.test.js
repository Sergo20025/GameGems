import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;

describe("GameItemNFT - Unit Tests", function () {
  let gameItemNFT;
  let owner, gameGems, addr1, addr2;

  beforeEach(async () => {
    [owner, gameGems, addr1, addr2] = await ethers.getSigners();

    const GameItemNFTFactory = await ethers.getContractFactory("GameItemNFT");
    gameItemNFT = await GameItemNFTFactory.deploy();

    await gameItemNFT.setGameGemsContract(gameGems.address);
  });

  it("should only allow GameGems to mint NFTs", async () => {
    await expect(
      gameItemNFT.connect(addr1).mintNFT(addr1.address, "Vest", 2, 7, "ipfs://uri")
    ).to.be.revertedWith("Only GameGems can mint");

    await gameItemNFT.connect(gameGems).mintNFT(
      addr1.address,
      "Gloves",
      2,
      7,
      "ipfs://uri-gloves"
    );

    const tokenId = await gameItemNFT.getLastTokenId();
    const item = await gameItemNFT.getItem(tokenId);
    expect(item.itemType).to.equal("Gloves");
    expect(item.rarity).to.equal(2);
    expect(item.bonus).to.equal(7);
  });

  it("should store correct tokenURI", async () => {
    await gameItemNFT.connect(gameGems).mintNFT(
      addr1.address,
      "Boots",
      3,
      9,
      "ipfs://boots-uri"
    );

    const tokenId = await gameItemNFT.getLastTokenId();
    const uri = await gameItemNFT.tokenURI(tokenId);
    expect(uri).to.equal("ipfs://boots-uri");
  });

  it("should emit NFTMinted event", async () => {
    await expect(
      gameItemNFT.connect(gameGems).mintNFT(
        addr1.address,
        "Lamp",
        1,
        6,
        "ipfs://lamp"
      )
    ).to.emit(gameItemNFT, "NFTMinted").withArgs(
      addr1.address,
      1,
      "Lamp",
      1,
      6,
      "ipfs://lamp"
    );
  });

  it("should return correct lastTokenId", async () => {
    await gameItemNFT.connect(gameGems).mintNFT(addr1.address, "A", 1, 1, "uri1");
    await gameItemNFT.connect(gameGems).mintNFT(addr1.address, "B", 2, 2, "uri2");
    expect(await gameItemNFT.getLastTokenId()).to.equal(2);
  });

  it("should support ERC721Enumerable functions", async () => {
    await gameItemNFT.connect(gameGems).mintNFT(addr1.address, "Boots", 1, 1, "ipfs://1");
    await gameItemNFT.connect(gameGems).mintNFT(addr1.address, "Gloves", 2, 2, "ipfs://2");

    const balance = await gameItemNFT.balanceOf(addr1.address);
    expect(balance).to.equal(2);

    const token0 = await gameItemNFT.tokenOfOwnerByIndex(addr1.address, 0);
    const token1 = await gameItemNFT.tokenOfOwnerByIndex(addr1.address, 1);
    expect(token0).to.not.equal(token1);

    const total = await gameItemNFT.totalSupply();
    expect(total).to.equal(2);
  });

  it("should revert getItem if token does not exist", async () => {
    await expect(gameItemNFT.getItem(999)).to.be.revertedWith("No such item");
  });

  it("should allow transferFrom and preserve item data", async () => {
    await gameItemNFT.connect(gameGems).mintNFT(addr1.address, "Pickaxe", 4, 12, "ipfs://pick");
    const tokenId = await gameItemNFT.getLastTokenId();

    await gameItemNFT.connect(addr1).transferFrom(addr1.address, addr2.address, tokenId);

    expect(await gameItemNFT.ownerOf(tokenId)).to.equal(addr2.address);
    const item = await gameItemNFT.getItem(tokenId);
    expect(item.itemType).to.equal("Pickaxe");
  });

  it("should reject setting GameGems address by non-owner", async () => {
    await expect(
      gameItemNFT.connect(addr1).setGameGemsContract(addr2.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("should revert tokenURI if token does not exist", async () => {
    await expect(gameItemNFT.tokenURI(1234)).to.be.revertedWith("Token does not exist");
  });
});
