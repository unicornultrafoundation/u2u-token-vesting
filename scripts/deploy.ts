import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  let tx;
  const amdin = "0x556180984Ec8B4d28476376f99A071042f262a5c"
  const factory = await ethers.deployContract("Factory", []);
  await factory.waitForDeployment();
  console.log(`Factory deployed to ${factory.target}`);
  const factoryAddress = factory.target

  const treasury = await ethers.deployContract("Treasury", [factoryAddress]);
  await treasury.waitForDeployment();
  console.log(`Treasury deployed to ${treasury.target}`);
  const treasuryAddress = treasury.target

  const MASTER_POOL_ADMIN = await factory.MASTER_POOL_ADMIN()
  tx = await factory.grantRole(MASTER_POOL_ADMIN, amdin)

  const POOL_ADMIN = await factory.POOL_ADMIN()
  tx = await factory.grantRole(POOL_ADMIN, amdin)
  tx = await factory.setTreasury(treasury.target)

  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [],
    });
  } catch (error) {
    console.log('Factory: ', error);
  }

  try {
    await hre.run("verify:verify", {
      address: treasuryAddress,
      constructorArguments: [factoryAddress],
    });
  } catch (error) {
    console.log('Treasury: ', error);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


// npx hardhat verify --network nebulas 0xEa175526472AB3C1A62B685677b75a1e1CcC08ff 0x8Fef26D79DA3Ac2AE5DaC2acfb5A802Fb043E6F0 1731382200 1731382800


// Factory deployed to 0x9d4c2E691b99E98Fc28aa5577C5CD2497994b59a
// Treasury deployed to 0xE8EA903324f9287A2698549230fC017bB3c4bbA5