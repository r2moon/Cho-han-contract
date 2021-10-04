import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, Signer, BigNumber, utils } from 'ethers';
import { VRF_KEY_HASH, getRequestId } from './utils';

describe('ChohanDice', () => {
  let accounts: Signer[];
  let chohanDice: Contract;
  let chohanTable: Contract;
  let owner: Signer;
  let alice: Signer;
  let gameToken: Contract;
  let linkToken: Contract;
  let vrfCoordinator: Signer;
  let nonce: number;
  const MIN_BET_AMOUNT = utils.parseEther('0.1');
  const vrfFee = utils.parseEther('2');
  const DENOMINATOR = BigNumber.from('10000');
  const FEE_PCT = BigNumber.from('100');
  const CHO = 0;
  const HAN = 1;

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [owner, alice, vrfCoordinator] = accounts;
    const MockToken = await ethers.getContractFactory('MockToken');
    gameToken = await MockToken.deploy();
    const MockLink = await ethers.getContractFactory('MockLink');
    linkToken = await MockLink.deploy();

    const ChohanTableFactory = await ethers.getContractFactory('ChohanTable');
    chohanTable = await ChohanTableFactory.deploy(gameToken.address, FEE_PCT);

    const ChohanDiceFactory = await ethers.getContractFactory('ChohanDice');
    chohanDice = await ChohanDiceFactory.deploy(
      gameToken.address,
      chohanTable.address,
      vrfCoordinator.getAddress(),
      linkToken.address,
      VRF_KEY_HASH,
      vrfFee,
      MIN_BET_AMOUNT,
    );
    chohanTable.setDice(chohanDice.address);
  });

  describe('constructor', () => {
    it('check initial values', async () => {
      expect(await chohanDice.gameToken()).to.equal(gameToken.address);
      expect(await chohanDice.table()).to.equal(chohanTable.address);
      expect(await chohanDice.vrfKeyHash()).to.equal(VRF_KEY_HASH);
      expect(await chohanDice.vrfFee()).to.equal(vrfFee);
      expect(await chohanDice.minBetAmount()).to.equal(MIN_BET_AMOUNT);
    });
  });

  describe('#bet', () => {
    const betAmount = utils.parseEther('1');

    beforeEach(async () => {
      nonce = 0;
      const tokenBalance = utils.parseEther('100');
      await linkToken.connect(owner).transfer(chohanDice.address, tokenBalance);
      await gameToken
        .connect(owner)
        .transfer(await alice.getAddress(), tokenBalance);
      await gameToken.connect(alice).approve(chohanDice.address, tokenBalance);
    });

    it('revert if bet amount is less than minimum', async () => {
      expect(
        chohanDice.connect(alice).bet(utils.parseEther('0.01'), HAN),
      ).to.revertedWith('too small');
    });

    it('revert if msg.sender is not EOD', async () => {
      const MockBetterFactory = await ethers.getContractFactory('MockBetter');
      let mockBetter = await MockBetterFactory.deploy();

      await gameToken.connect(owner).transfer(mockBetter.address, betAmount);
      expect(
        mockBetter.bet(gameToken.address, chohanDice.address, betAmount, HAN),
      ).to.revertedWith('!EOD');
    });

    it('start bet', async () => {
      const aliceBalanceBefore = await gameToken.balanceOf(
        await alice.getAddress(),
      );
      const tx = await chohanDice.connect(alice).bet(betAmount, CHO);
      const requestId = getRequestId(chohanDice.address, nonce);
      expect(await chohanDice.betRequestId(await alice.getAddress())).to.equal(
        requestId,
      );
      expect(await gameToken.balanceOf(chohanDice.address)).to.equal(betAmount);
      expect(await gameToken.balanceOf(await alice.getAddress())).to.equal(
        aliceBalanceBefore.sub(betAmount),
      );
      const bet = await chohanDice.bets(requestId);
      expect(bet.amount).to.equal(betAmount);
      expect(bet.user).to.equal(await alice.getAddress());
      expect(bet.expected).to.equal(CHO);
      expect(bet.dice1).to.equal(0);
      expect(bet.dice2).to.equal(0);
      expect(tx)
        .to.emit(chohanDice, 'BetRequested')
        .withArgs(await alice.getAddress(), requestId, betAmount, CHO);
    });

    it('revert if there is pending bet', async () => {
      await chohanDice.connect(alice).bet(betAmount, CHO);
      expect(chohanDice.connect(alice).bet(betAmount, HAN)).to.revertedWith(
        'beting!',
      );
    });
  });

  describe('fulfillRandomness', () => {
    const betAmount = utils.parseEther('1');

    beforeEach(async () => {
      nonce = 0;
      const tokenBalance = utils.parseEther('100');
      await linkToken.connect(owner).transfer(chohanDice.address, tokenBalance);
      await gameToken
        .connect(owner)
        .transfer(await alice.getAddress(), tokenBalance);
      await gameToken.connect(alice).approve(chohanDice.address, tokenBalance);
      await gameToken
        .connect(owner)
        .transfer(chohanTable.address, tokenBalance);
    });

    it('revert if requester is empty', async () => {
      const MOCK_REQUEST_ID =
        '0x99919f72c61facba0c0cf1743a905f127af41ad556f2214678795f55d2d360dd';
      expect(
        chohanDice
          .connect(vrfCoordinator)
          .rawFulfillRandomness(MOCK_REQUEST_ID, 10),
      ).to.revertedWith('invalid request');
    });

    it('give 2x reward if win', async () => {
      await chohanDice.connect(alice).bet(betAmount, CHO);
      const aliceBalanceBefore = await gameToken.balanceOf(
        await alice.getAddress(),
      );
      const tableBalanceBefore = await gameToken.balanceOf(chohanTable.address);
      const requestId = getRequestId(chohanDice.address, nonce);
      nonce += 1;
      const randomNumber = 88;
      const tx = await chohanDice
        .connect(vrfCoordinator)
        .rawFulfillRandomness(requestId, randomNumber);
      let dice1 = (randomNumber % 6) + 1;
      let dice2 = (Math.floor(randomNumber / 6) % 6) + 1;
      let fee = betAmount.mul(FEE_PCT).div(DENOMINATOR);
      expect(await gameToken.balanceOf(await alice.getAddress())).to.equal(
        aliceBalanceBefore.add(betAmount).add(betAmount).sub(fee),
      );
      expect(await gameToken.balanceOf(chohanTable.address)).to.equal(
        tableBalanceBefore.sub(betAmount).add(fee),
      );
      expect(await gameToken.balanceOf(chohanDice.address)).to.equal(0);
      const bet = await chohanDice.bets(requestId);
      expect(bet.amount).to.equal(betAmount);
      expect(bet.user).to.equal(await alice.getAddress());
      expect(bet.expected).to.equal(CHO);
      expect(bet.dice1).to.equal(dice1);
      expect(bet.dice2).to.equal(dice2);
      expect(tx)
        .to.emit(chohanDice, 'BetCompleted')
        .withArgs(
          await alice.getAddress(),
          requestId,
          betAmount,
          CHO,
          dice1,
          dice2,
          CHO,
        );
    });

    it('move token to table if lose', async () => {
      await chohanDice.connect(alice).bet(betAmount, HAN);
      const aliceBalanceBefore = await gameToken.balanceOf(
        await alice.getAddress(),
      );
      const tableBalanceBefore = await gameToken.balanceOf(chohanTable.address);
      const requestId = getRequestId(chohanDice.address, nonce);
      nonce += 1;
      const randomNumber = 88;
      const tx = await chohanDice
        .connect(vrfCoordinator)
        .rawFulfillRandomness(requestId, randomNumber);
      let dice1 = (randomNumber % 6) + 1;
      let dice2 = (Math.floor(randomNumber / 6) % 6) + 1;
      expect(await gameToken.balanceOf(await alice.getAddress())).to.equal(
        aliceBalanceBefore,
      );
      expect(await gameToken.balanceOf(chohanTable.address)).to.equal(
        tableBalanceBefore.add(betAmount),
      );
      expect(await gameToken.balanceOf(chohanDice.address)).to.equal(0);
      const bet = await chohanDice.bets(requestId);
      expect(bet.amount).to.equal(betAmount);
      expect(bet.user).to.equal(await alice.getAddress());
      expect(bet.expected).to.equal(HAN);
      expect(bet.dice1).to.equal(dice1);
      expect(bet.dice2).to.equal(dice2);
      expect(tx)
        .to.emit(chohanDice, 'BetCompleted')
        .withArgs(
          await alice.getAddress(),
          requestId,
          betAmount,
          HAN,
          dice1,
          dice2,
          CHO,
        );
    });

    it('revert if already finished', async () => {
      await chohanDice.connect(alice).bet(betAmount, CHO);
      const requestId = getRequestId(chohanDice.address, nonce);
      nonce += 1;
      const randomNumber = 88;
      await chohanDice
        .connect(vrfCoordinator)
        .rawFulfillRandomness(requestId, randomNumber);
      expect(
        chohanDice.connect(vrfCoordinator).rawFulfillRandomness(requestId, 89),
      ).to.revertedWith('finished');
    });
  });

  describe('#setTable', () => {
    const newTable = '0xA23E5aEa36e7c2612102C82224cDc32021759e0d';

    it('revert if msg.sender is not owner', async () => {
      expect(chohanDice.connect(alice).setTable(newTable)).to.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('revert if address is zero', async () => {
      expect(
        chohanDice
          .connect(owner)
          .setTable('0x0000000000000000000000000000000000000000'),
      ).to.revertedWith('0x!');
    });

    it('update table', async () => {
      await chohanDice.connect(owner).setTable(newTable);

      expect(await chohanDice.table()).to.equal(newTable);
    });
  });

  describe('#setMinBetAmount', () => {
    const newBetAmount = utils.parseEther('1');

    it('revert if msg.sender is not owner', async () => {
      expect(
        chohanDice.connect(alice).setMinBetAmount(newBetAmount),
      ).to.revertedWith('Ownable: caller is not the owner');
    });

    it('update table', async () => {
      await chohanDice.connect(owner).setMinBetAmount(newBetAmount);

      expect(await chohanDice.minBetAmount()).to.equal(newBetAmount);
    });
  });
});
