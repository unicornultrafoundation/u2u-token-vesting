import { ethers } from "hardhat";

async function main() {
    let tx;
    const factoryAddress = "0x9d4c2E691b99E98Fc28aa5577C5CD2497994b59a"
    const factory = await ethers.getContractAt("Factory", factoryAddress);

    const termName = "Pool 1"
    const poolAdmin = "0x556180984Ec8B4d28476376f99A071042f262a5c"
    const startTime = 1733644800
    const firstUnlockPercentage = 10000
    const lockDuration = 60 * 60
    const vestingDuration = 5 * 60 * 18
    const vestingPeriods = 18
    const totalPoolCap = ethers.parseEther("100000")
    tx = await factory.newPool(termName, poolAdmin, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap, {gasLimit: 3000000})

    console.log("New pool tx hash: ", tx.hash)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});


// npx hardhat verify --network nebulas 0xC639aB0771009593B9E94265dac89Cd63FE53Bbf

// Factory deployed to 0x9d4c2E691b99E98Fc28aa5577C5CD2497994b59a
// Treasury deployed to 0xE8EA903324f9287A2698549230fC017bB3c4bbA5