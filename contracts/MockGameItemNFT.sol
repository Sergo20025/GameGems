// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract MockGameItemNFT {
    uint256 public lastId;

    function mintNFT(address, string memory, uint8, uint8, string memory) external {
        lastId++;
    }

    function getLastTokenId() external view returns (uint256) {
        return lastId;
    }
}