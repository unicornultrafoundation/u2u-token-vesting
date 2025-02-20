import "@nomicfoundation/hardhat-toolbox";
require('dotenv').config()
require("hardhat-contract-sizer");
import "@typechain/hardhat";

const config: any = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true,

    },
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
  etherscan: {
    apiKey: "RX2H5QQVMY18Q49HDBDC9UTDWES1VNSHEZ",
    customChains: [
      {
        network: "solaris",
        chainId: 39,
        urls: {
          apiURL: "https://u2uscan.xyz/api",
          browserURL: "https://u2uscan.xyz"
        }
      },
      {
        network: "nebulas",
        chainId: 2484,
        urls: {
          apiURL: "https://testnet.u2uscan.xyz/api",
          browserURL: "https://testnet.u2uscan.xyz"
        }
      }
    ]
  },
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    solaris: {
      url: 'https://rpc-mainnet.u2u.xyz/',
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    nebulas: {
      url: 'https://rpc-nebulas-testnet.uniultra.xyz/',
      accounts: [
        `${process.env.PRIVATE_KEY}`
    ]
    },
  },
  defaultNetwork: "hardhat"
};

export default config;

