// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockLink is ERC20 {
    event TransferWithData(
        address indexed from,
        address indexed to,
        uint256 value,
        bytes data
    );

    constructor() ERC20("TestLink", "TestLink") {
        _mint(msg.sender, 1e30);
    }

    function transferAndCall(
        address _to,
        uint256 _value,
        bytes memory _data
    ) external returns (bool success) {
        super.transfer(_to, _value);
        emit TransferWithData(msg.sender, _to, _value, _data);
        return true;
    }
}
