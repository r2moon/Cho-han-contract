// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IChohanTable.sol";

contract ChohanDice is VRFConsumerBase, Ownable {
    using SafeERC20 for IERC20;

    event BetRequested(
        address indexed user,
        bytes32 indexed requestId,
        uint256 amount,
        BetResult expected
    );

    event BetCompleted(
        address indexed user,
        bytes32 indexed requestId,
        uint256 amount,
        BetResult expected,
        uint8 dice1,
        uint8 dice2,
        BetResult result
    );

    enum BetResult {
        CHO,
        HAN
    }

    struct Bet {
        uint256 amount;
        address user;
        BetResult expected;
        uint8 dice1;
        uint8 dice2;
    }

    bytes32 public vrfKeyHash;
    uint256 public vrfFee;

    mapping(bytes32 => Bet) public bets;
    mapping(address => bytes32) public betRequestId;

    IERC20 public immutable gameToken;
    address public table;
    uint256 public minBetAmount;

    modifier onlyEOD() {
        require(tx.origin == msg.sender, "!EOD");
        _;
    }

    constructor(
        address _gameToken,
        address _table,
        address _vrfCoordinator,
        address _linkToken,
        bytes32 _vrfKeyhash,
        uint256 _vrfFee,
        uint256 _minBetAmount
    ) VRFConsumerBase(_vrfCoordinator, _linkToken) {
        require(_gameToken != address(0), "0x!");
        require(_table != address(0), "0x!");
        gameToken = IERC20(_gameToken);
        table = _table;
        vrfKeyHash = _vrfKeyhash;
        vrfFee = _vrfFee;
        minBetAmount = _minBetAmount;
    }

    function bet(uint256 amount, BetResult expected)
        external
        onlyEOD
        returns (bytes32)
    {
        require(amount >= minBetAmount, "too small");
        gameToken.safeTransferFrom(msg.sender, address(this), amount);

        require(betRequestId[msg.sender] == bytes32(0), "beting!");
        bytes32 requestId = requestRandomness(vrfKeyHash, vrfFee);

        betRequestId[msg.sender] = requestId;
        bets[requestId] = Bet({
            amount: amount,
            user: msg.sender,
            expected: expected,
            dice1: 0,
            dice2: 0
        });

        emit BetRequested(msg.sender, requestId, amount, expected);
        return requestId;
    }

    function fulfillRandomness(bytes32 requestId, uint256 randomNumber)
        internal
        override
    {
        Bet storage betInfo = bets[requestId];
        require(betInfo.user != address(0), "invalid request");
        require(betInfo.dice1 == 0, "finished");

        uint8 dice1 = uint8((randomNumber % 6) + 1);
        uint8 dice2 = uint8(((randomNumber / 6) % 6) + 1);
        betInfo.dice1 = dice1;
        betInfo.dice2 = dice2;

        BetResult result = (dice1 + dice2) % 2 == 0
            ? BetResult.CHO
            : BetResult.HAN;
        if (betInfo.expected == result) {
            // Win
            uint256 prize = IChohanTable(table).getWinnerPrize(betInfo.amount);
            gameToken.safeTransfer(betInfo.user, betInfo.amount + prize);
        } else {
            gameToken.safeTransfer(table, betInfo.amount);
        }

        emit BetCompleted(
            betInfo.user,
            requestId,
            betInfo.amount,
            betInfo.expected,
            dice1,
            dice2,
            result
        );

        betRequestId[betInfo.user] = bytes32(0);
    }

    function setTable(address _table) external onlyOwner {
        require(_table != address(0), "0x!");
        table = _table;
    }

    function setMinBetAmount(uint256 _minBetAmount) external onlyOwner {
        minBetAmount = _minBetAmount;
    }
}
