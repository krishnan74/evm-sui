import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.23",
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [
        "80eb79c8967b1c6b51ed4be97e17f15229dd7ebcbfc08dcc8a4ed3dfde60125f",
      ],
      chainId: 84532,
    },
  },
};

export default config;
