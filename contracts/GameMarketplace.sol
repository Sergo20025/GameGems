// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IGameGems {
    function balanceOf(address user) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // Добавь сюда новую функцию
    function transferForMarketplace(address from, address to, uint256 amount) external returns (bool);
}

interface IGameItemNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
}

contract GameMarketplace {
    struct Listing {
        address seller;
        uint256 priceInGems;
    }

    address public admin;
    IGameItemNFT public gameItemNFT;
    IGameGems public gameGems;

    mapping(uint256 => Listing) public listings;

    event ItemListed(uint256 indexed tokenId, address indexed seller, uint256 priceInGems);
    event ItemDelisted(uint256 indexed tokenId, address indexed seller);
    event ItemPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 priceInGems);
    event MarketplacePayment(address indexed buyer, address indexed seller, uint256 amount, uint256 commission);

    constructor(address _gameItemNFT, address _gameGems) {
        admin = msg.sender;
        gameItemNFT = IGameItemNFT(_gameItemNFT);
        gameGems = IGameGems(_gameGems);
    }

    function listItem(uint256 tokenId, uint256 priceInGems) external {
        require(gameItemNFT.ownerOf(tokenId) == msg.sender, "Not owner of NFT");
        require(priceInGems > 0, "Price must be > 0");

        listings[tokenId] = Listing({
            seller: msg.sender,
            priceInGems: priceInGems
        });

        emit ItemListed(tokenId, msg.sender, priceInGems);
    }

    function delistItem(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.seller == msg.sender, "Not your listing");

        delete listings[tokenId];
        emit ItemDelisted(tokenId, msg.sender);
    }

    function buyItem(uint256 tokenId) external {
        Listing memory listing = listings[tokenId];
        require(listing.priceInGems > 0, "Item not listed");
        require(gameGems.balanceOf(msg.sender) >= listing.priceInGems, "Not enough GEM");

        bool success = gameGems.transferForMarketplace(msg.sender, listing.seller, listing.priceInGems);
        require(success, "GEM transfer failed");

        emit MarketplacePayment(msg.sender, listing.seller, listing.priceInGems, (listing.priceInGems * 5) / 100);

        gameItemNFT.safeTransferFrom(listing.seller, msg.sender, tokenId);

        delete listings[tokenId];

        emit ItemPurchased(tokenId, msg.sender, listing.seller, listing.priceInGems);
    }

    function getListing(uint256 tokenId) external view returns (Listing memory) {
        return listings[tokenId];
    }
}
