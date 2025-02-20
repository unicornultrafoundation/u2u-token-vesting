import { ethers } from "hardhat";
import hre from "hardhat";

async function main() {
    
    const vestingWrapper = await ethers.deployContract("VestingWrapper", []);
    await vestingWrapper.waitForDeployment();
    console.log(`VestingWrapper deployed to ${vestingWrapper.target}`);
    const vestingWrapperAddress = vestingWrapper.target

    try {
        await hre.run("verify:verify", {
            address: vestingWrapperAddress,
            constructorArguments: [],
        });
    } catch (error) {
        console.log('VestingWrapper: ', error);
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


// npx hardhat verify --network nebulas 0xd052ecd45c3f16b8f5b70dc4dd9d9f30dcd1bdbb 0xC493D168e4c135589eaa9b8AA10Dd8b49A1E8380
// VestingWrapper deployed to 0xc061a902b776326BF03B425593cA0ac35d11e897