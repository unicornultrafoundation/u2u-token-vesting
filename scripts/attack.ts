import { ethers } from "hardhat";

interface PoolArgs {
    name: string
    poolAdmin: string
    startTime: number
    firstUnlockPercentage: number
    lockDuration: number
    vestingDuration: number
    vestingPeriods: number
    totalPoolCap: string
}

const startTime = Math.round((new Date()).getTime() / 1000) + 300

const poolArgs: PoolArgs[] = [
    {
        name: "Pool 3",
        poolAdmin: "0x556180984Ec8B4d28476376f99A071042f262a5c",
        startTime: startTime,
        firstUnlockPercentage: 10000,
        lockDuration: 600,
        vestingDuration: 5400,
        vestingPeriods: 18,
        totalPoolCap: "100000"
    }
]


async function main() {
    let tx;
    const factoryAddress = "0x9d4c2E691b99E98Fc28aa5577C5CD2497994b59a"
    const factory = await ethers.getContractAt("Factory", factoryAddress);
    let index = 0;
    while (index < poolArgs.length) {
        const params: PoolArgs = poolArgs[index]
        tx = await factory.newPool(
            params.name, 
            params.poolAdmin, 
            params.startTime, 
            params.firstUnlockPercentage, 
            params.lockDuration, 
            params.vestingDuration, 
            params.vestingPeriods, 
            ethers.parseEther(params.totalPoolCap),
            { gasLimit: 3000000 }
        )
        console.log(`Pool ${index}, tx: ${tx.hash}`)
        await sleep(2000)
        ++index;
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

// npx hardhat verify --network nebulas 0xC639aB0771009593B9E94265dac89Cd63FE53Bbf
// Factory deployed to 0x9d4c2E691b99E98Fc28aa5577C5CD2497994b59a
// Treasury deployed to 0xE8EA903324f9287A2698549230fC017bB3c4bbA5
