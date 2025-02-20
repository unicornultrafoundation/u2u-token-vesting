import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
  let tx;
  // const amdin = "0xb629A9b24AcE79211cB43f5b7e96f7AfeB8dD4E1"
  const amdin = "0x556180984Ec8B4d28476376f99A071042f262a5c"
  const factory = await ethers.deployContract("Factory", []);
  await factory.waitForDeployment();
  console.log(`Factory deployed to ${factory.target}`);
  const factoryAddress = factory.target

  const treasury = await ethers.deployContract("Treasury", [factoryAddress]);
  await treasury.waitForDeployment();
  console.log(`Treasury deployed to ${treasury.target}`);
  const treasuryAddress = treasury.target

  await sleep(3000)

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

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


// npx hardhat verify --network nebulas 0x6459a2eA857646464511630102866B586d623De6 0xC493D168e4c135589eaa9b8AA10Dd8b49A1E8380


// Factory deployed to 0x252d558c213a0b09D4e4826416893A252Be942fe
// Treasury deployed to 0xD977D844605430C01c71664b8F2462B0D5bDFC7E

// Factory deployed to 0xF8d2393074e46813578f89aabc3d8cCDBDaA2FF2
// Treasury deployed to 0x3a7cdb5aaB319CE14E06925245dAEC4672e9c8d2

// ---- mainet ------


//// New ////
// Factory deployed to 0x7Df3E84F2531b48948fCd39D16166c4280d8b703
// Treasury deployed to 0x1C2e20f83244Ea0bE4FA8b02A27a5cB54970E29D
// VestingWrapper deployed to 0x991cbC6E088BeFE55434aC31B0CF78aDf4443D02