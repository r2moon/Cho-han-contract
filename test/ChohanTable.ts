import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Contract, Signer, BigNumber, utils } from 'ethers';

describe('ChohanTable', () => {
  let accounts: Signer[];
  let chohanTable: Contract;
  let owner: Signer;
  let alice: Signer;
  let dice: Signer;
  let gameToken: Contract;
  const DENOMINATOR = BigNumber.from('10000');
  const FEE_PCT = BigNumber.from('100');

  beforeEach(async () => {
    accounts = await ethers.getSigners();
    [owner, alice, dice] = accounts;
    const MockToken = await ethers.getContractFactory('MockToken');
    gameToken = await MockToken.deploy();

    const ChohanTableFactory = await ethers.getContractFactory('ChohanTable');
    chohanTable = await ChohanTableFactory.deploy(gameToken.address, FEE_PCT);
    chohanTable.setDice(await dice.getAddress());
  });

  describe('constructor', () => {
    it('check initial values', async () => {
      expect(await chohanTable.gameToken()).to.equal(gameToken.address);
      expect(await chohanTable.feePct()).to.equal(FEE_PCT);
    });
  });

  describe('#getWinnerPrize', () => {
    beforeEach(async () => {
      const tokenBalance = utils.parseEther('100');
      await gameToken
        .connect(owner)
        .transfer(chohanTable.address, tokenBalance);
    });

    it('revert if msg.sender is not dice', async () => {
      expect(
        chohanTable.connect(alice).getWinnerPrize(utils.parseEther('0.01')),
      ).to.revertedWith('not dice');
    });

    it('give reward to dice', async () => {
      const betAmount = utils.parseEther('1');
      const tableBalanceBefore = await gameToken.balanceOf(chohanTable.address);
      await chohanTable.connect(dice).getWinnerPrize(betAmount);
      const fee = betAmount.mul(FEE_PCT).div(DENOMINATOR);
      expect(await gameToken.balanceOf(chohanTable.address)).to.equal(
        tableBalanceBefore.sub(betAmount).add(fee),
      );
      expect(await gameToken.balanceOf(await dice.getAddress())).to.equal(
        betAmount.sub(fee),
      );
    });
  });

  describe('#withdraw', () => {
    const amountToWithdraw = utils.parseEther('10');

    beforeEach(async () => {
      const tokenBalance = utils.parseEther('100');
      await gameToken
        .connect(owner)
        .transfer(chohanTable.address, tokenBalance);
    });

    it('revert if msg.sender is not owner', async () => {
      expect(
        chohanTable.connect(alice).withdraw(amountToWithdraw),
      ).to.revertedWith('Ownable: caller is not the owner');
    });

    it('revert if amount is zero', async () => {
      expect(chohanTable.connect(owner).withdraw(0)).to.revertedWith('invalid');
    });

    it('withdraw', async () => {
      const tableBalanceBefore = await gameToken.balanceOf(chohanTable.address);
      const ownerBalanceBefore = await gameToken.balanceOf(
        await owner.getAddress(),
      );
      await chohanTable.connect(owner).withdraw(amountToWithdraw);
      expect(await gameToken.balanceOf(chohanTable.address)).to.equal(
        tableBalanceBefore.sub(amountToWithdraw),
      );
      expect(await gameToken.balanceOf(await owner.getAddress())).to.equal(
        ownerBalanceBefore.add(amountToWithdraw),
      );
    });
  });

  describe('#setDice', () => {
    const newDice = '0xA23E5aEa36e7c2612102C82224cDc32021759e0d';

    it('revert if msg.sender is not owner', async () => {
      expect(chohanTable.connect(alice).setDice(newDice)).to.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('revert if address is zero', async () => {
      expect(
        chohanTable
          .connect(owner)
          .setDice('0x0000000000000000000000000000000000000000'),
      ).to.revertedWith('0x!');
    });

    it('update dice', async () => {
      await chohanTable.connect(owner).setDice(newDice);

      expect(await chohanTable.dice()).to.equal(newDice);
    });
  });

  describe('#setFeePct', () => {
    const newFeePct = 10;

    it('revert if msg.sender is not owner', async () => {
      expect(chohanTable.connect(alice).setFeePct(newFeePct)).to.revertedWith(
        'Ownable: caller is not the owner',
      );
    });

    it('revert if value is greater than DENOMINATOR', async () => {
      expect(
        chohanTable
          .connect(owner)
          .setFeePct(DENOMINATOR.add(BigNumber.from('1'))),
      ).to.revertedWith('invalid');
    });

    it('update table', async () => {
      await chohanTable.connect(owner).setFeePct(newFeePct);

      expect(await chohanTable.feePct()).to.equal(newFeePct);
    });
  });
});
