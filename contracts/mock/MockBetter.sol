// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../ChohanDice.sol";

contract MockBetter {
    function bet(
        IERC20 gameToken,
        ChohanDice dice,
        uint256 amount,
        ChohanDice.BetResult expected
    ) external {
        gameToken.approve(address(dice), amount);
        dice.bet(amount, expected);
    }
}
