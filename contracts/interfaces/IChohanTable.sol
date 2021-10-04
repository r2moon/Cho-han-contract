// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IChohanTable {
    function getWinnerPrize(uint256 betAmount) external returns (uint256);
}
