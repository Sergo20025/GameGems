// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameItemNFT is ERC721Enumerable, Ownable {
    struct Item {
        string itemType;
        uint8 rarity;
        uint8 bonus;
    }

    mapping(uint256 => Item) public itemStats;
    mapping(uint256 => string) private _tokenURIs;

    address public gameGemsContract;
    uint256 private _tokenIdCounter = 1;

    event NFTMinted(
        address indexed to,
        uint256 tokenId,
        string itemType,
        uint8 rarity,
        uint8 bonus,
        string uri
    );

    constructor() ERC721("GameItem", "GMI") {}

    modifier onlyGameGems() {
        require(msg.sender == gameGemsContract, "Only GameGems can mint");
        _;
    }

    function setGameGemsContract(address _gameGems) external onlyOwner {
        gameGemsContract = _gameGems;
    }

    function mintNFT(
        address to,
        string memory itemType,
        uint8 rarity,
        uint8 bonus,
        string memory uri
    ) external onlyGameGems {
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);

        itemStats[tokenId] = Item(itemType, rarity, bonus);
        _tokenURIs[tokenId] = uri;

        emit NFTMinted(to, tokenId, itemType, rarity, bonus, uri);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");
        return _tokenURIs[tokenId];
    }

    function getItem(uint256 tokenId) external view returns (Item memory) {
        require(_exists(tokenId), "No such item");
        return itemStats[tokenId];
    }

    function getLastTokenId() external view returns (uint256) {
        return _tokenIdCounter - 1;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
