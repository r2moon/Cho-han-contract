import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';

export const USER_SEED_PLACEHOLDER = 0;
export const VRF_KEY_HASH =
  '0xaa77729d3466ca35ae8d28b3bbac7cc36a5031efdc430821c02bc31a238af445';

export const getRequestId = (requester: string, nonce: number): string => {
  const vRFSeed = BigNumber.from(
    ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'uint256', 'address', 'uint256'],
        [VRF_KEY_HASH, USER_SEED_PLACEHOLDER, requester, nonce],
      ),
    ),
  );
  const requestId = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ['bytes32', 'uint256'],
      [VRF_KEY_HASH, vRFSeed],
    ),
  );
  return requestId;
};

export const generateRandom = () => {
  return Math.floor(Math.random() * 10000000);
};
