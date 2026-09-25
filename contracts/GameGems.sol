// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IGameItemNFT {
    function mintNFT(
        address to,
        string memory itemType,
        uint8 rarity,
        uint8 bonus,
        string memory uri
    ) external;

    function getLastTokenId() external view returns (uint256); // ← 🔥 Добавить это
}

contract GameGems {
    string public name = "GameGems";
    string public symbol = "GEM";
    uint8 public decimals = 0;

    uint256 public totalSupply;         // Все GEM в обороте
    uint256 public availableForSale;    // GEM, доступные для покупки
    uint256 public gemPrice;            // Цена 1 GEM в wei
    address public admin;
    address public marketplaceAddress;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    IGameItemNFT public gameItemNFT;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event GemsPurchased(address indexed buyer, uint256 ethSpent, uint256 gemsReceived);
    event GemsDeposited(address indexed player, uint256 amountSent, uint256 userGems, uint256 feeToPool);
    event AdminDrop(address indexed admin, uint256 addedAmount);
    event ItemWrapped(address indexed player, uint256 tokenId, string itemType, uint8 rarity, uint8 bonus, string uri);
    event ItemWrapFailed(address indexed player, string reason);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    constructor(uint256 _initialSupply, uint256 _gemPrice, address _itemContract) {
    admin = msg.sender;
    totalSupply = _initialSupply;
    availableForSale = _initialSupply;
    gemPrice = _gemPrice;
    gameItemNFT = IGameItemNFT(_itemContract);
    
    // Добавляем полный баланс администратору
    balanceOf[admin] = _initialSupply;
    emit Transfer(address(0), admin, _initialSupply);
}

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Not enough balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Not enough balance");
        require(allowance[from][msg.sender] >= amount, "Not allowed");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function transferForMarketplace(address from, address to, uint256 amount) external returns (bool) {
    require(msg.sender == marketplaceAddress, "Only marketplace allowed");

    uint256 commission = (amount * 5) / 100;  // 5%
    uint256 sellerAmount = amount - commission;

    require(balanceOf[from] >= amount, "Not enough balance");

    // Списываем с покупателя всю сумму
    balanceOf[from] -= amount;

    // Переводим продавцу 95%
    balanceOf[to] += sellerAmount;
    emit Transfer(from, to, sellerAmount);

    // Переводим администратору комиссию и увеличиваем availableForSale
    balanceOf[admin] += commission;
    availableForSale += commission;
    emit Transfer(from, admin, commission);
    emit AdminDrop(admin, commission);

    return true;
}

    function buyGems() public payable {
        require(gemPrice > 0, "Gem price not set");
        uint256 gemsToBuy = msg.value / gemPrice;
        require(gemsToBuy > 0, "Not enough ETH to buy GEM");
        require(availableForSale >= gemsToBuy, "Not enough GEM for sale");

        availableForSale -= gemsToBuy;
        balanceOf[msg.sender] += gemsToBuy;

        emit GemsPurchased(msg.sender, msg.value, gemsToBuy);
        emit Transfer(address(this), msg.sender, gemsToBuy);
    }

    function depositGems(uint256 localAmount) external {
        require(localAmount > 0, "Invalid amount");

        uint256 userAmount = (localAmount * 95) / 100;
        uint256 poolAmount = localAmount - userAmount;

        balanceOf[msg.sender] += userAmount;
        totalSupply += localAmount;
        availableForSale += poolAmount;

        emit GemsDeposited(msg.sender, localAmount, userAmount, poolAmount);
        emit Transfer(address(0), msg.sender, userAmount);
    }

    function adminDrop(uint256 amount) external onlyAdmin {
        totalSupply += amount;
        availableForSale += amount;

        emit AdminDrop(msg.sender, amount);
        emit Transfer(address(0), address(this), amount);
    }

    function withdrawEth() external onlyAdmin {
        payable(admin).transfer(address(this).balance);
    }

    function setGemPrice(uint256 newPrice) external onlyAdmin {
        gemPrice = newPrice;
    }

    function setItemContract(address newContract) external onlyAdmin {
        gameItemNFT = IGameItemNFT(newContract);
    }
    
    function setMarketplaceAddress(address _marketplace) external onlyAdmin {
    marketplaceAddress = _marketplace;
    }

    // Пользователь вручную оборачивает предмет в NFT
    function wrapItemAsNFT(
        string memory itemType,
        uint8 rarity,
        uint8 bonus,
        string memory tokenURI
    ) external {
    try gameItemNFT.mintNFT(msg.sender, itemType, rarity, bonus, tokenURI) {
        uint256 tokenId = gameItemNFT.getLastTokenId(); // ← получить id из контракта
        emit ItemWrapped(msg.sender, tokenId, itemType, rarity, bonus, tokenURI);
    } catch Error(string memory reason) {
        emit ItemWrapFailed(msg.sender, reason);
    } catch {
        emit ItemWrapFailed(msg.sender, "Unknown error");
    }
}

    receive() external payable {
        buyGems();
    }
}
