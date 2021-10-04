// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IChohanTable.sol";

contract ChohanTable is Ownable, IChohanTable {
    using SafeERC20 for IERC20;

    uint256 constant DENOMINATOR = 10000;

    IERC20 public immutable gameToken;
    address public dice;
    uint256 public feePct;

    constructor(address _gameToken, uint256 _feePct) {
        require(_gameToken != address(0), "0x!");
        require(_feePct <= DENOMINATOR, "invalid");
        gameToken = IERC20(_gameToken);
        feePct = _feePct;
    }

    function getWinnerPrize(uint256 betAmount)
        external
        override
        returns (uint256 prize)
    {
        require(msg.sender == dice, "not dice");
        prize = betAmount - ((betAmount * feePct) / DENOMINATOR);
        gameToken.safeTransfer(msg.sender, prize);
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(amount > 0, "invalid");
        gameToken.safeTransfer(owner(), amount);
    }

    function setFeePct(uint256 _feePct) external onlyOwner {
        require(_feePct <= DENOMINATOR, "invalid");
        feePct = _feePct;
    }

    function setDice(address _dice) external onlyOwner {
        require(_dice != address(0), "0x!");
        dice = _dice;
    }
}
