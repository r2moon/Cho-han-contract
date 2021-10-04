import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-deploy';
import '@typechain/hardhat';
import 'solidity-coverage';
import 'dotenv/config';

export default {
  networks: {
    hardhat: {},
    rinkeby: {
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_KEY}`,
      chainId: 4,
      accounts: [process.env.TESTNET_PRIVATE_KEY],
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    gameToken: {
      4: '0x5F72929F567911c89410105bD516Fd65A28219Ba',
    },
    linkToken: {
      4: '0x01BE23585060835E02B77ef475b0Cc51aA1e0709',
    },
    table: {
      4: '0x952FfE02BED68eF2fb7d5ff0b47e11EBf1fbc802',
    },
    vrfCoordinator: {
      4: '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B',
    },
  },
  typechain: {
    outDir: 'src/types',
    target: 'ethers-v5',
  },
  solidity: {
    version: '0.8.4',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
