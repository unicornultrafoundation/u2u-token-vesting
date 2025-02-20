import { ethers } from "hardhat";

interface PoolArgs {
    name: string
    poolAdmin: string
    startTime: number
    firstUnlockPercentage: string
    lockDuration: number
    vestingDuration: number
    vestingPeriods: number
    totalPoolCap: string
}

const factoryAddress = "0x7Df3E84F2531b48948fCd39D16166c4280d8b703"

const aMonth = 2 * 60

const poolArgs: PoolArgs[] = [
    {
        name: "Pool 888888888",
        poolAdmin: "0x556180984Ec8B4d28476376f99A071042f262a5c",
        startTime: 1739200200,
        // startTime: 1733803200,
        firstUnlockPercentage: "20",
        lockDuration: 1 * aMonth + aMonth,
        vestingDuration: 5 * aMonth,
        vestingPeriods: 5,
        totalPoolCap: "34167917"
    }
]


async function main() {
    let tx;
    const factory = await ethers.getContractAt("Factory", factoryAddress);
    let index = 0;
    while (index < poolArgs.length) {
        const params: PoolArgs = poolArgs[index]
        tx = await factory.newPool(
            params.name, 
            params.poolAdmin, 
            params.startTime, 
            ethers.parseEther(params.firstUnlockPercentage), 
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

// npx hardhat verify --network solaris 0xf7dd30c2c080fd2686c336c9339efd9d2e18adc2
// Factory deployed to 0x9d4c2E691b99E98Fc28aa5577C5CD2497994b59a
// Treasury deployed to 0xE8EA903324f9287A2698549230fC017bB3c4bbA5


// Pool 0, tx: 0xcabf725d27b76fc45b34d1754352aa0c1d5413aeaf42b043d3b0dba4fc48b860