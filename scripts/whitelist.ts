import { ethers } from "hardhat";

interface AddPoolArgs {
    address: string
    amount: string
}

const factoryAddress = "0x7Df3E84F2531b48948fCd39D16166c4280d8b703"


// const vestingPoolAddress = "0xa4c478070800cca31ef4382206618093670b7a90"
const vestingPoolAddress = "0xd052ecd45c3f16b8f5b70dc4dd9d9f30dcd1bdbb"



const addPoolArgs: AddPoolArgs[] = [
    {
        address: "0xE4B8f63C111EF118587D30401e1Db99f4CfBD900",
        amount: "100"
    },
    {
        address: "0x4b3c21f21e56b88a861A0Db491ab4dA2b26E0490",
        amount: "100"
    }
]

async function main() {
    let tx;
    const factory = await ethers.getContractAt("Factory", factoryAddress);
    let index = 0;
    while (index < addPoolArgs.length) {
        const params: AddPoolArgs = addPoolArgs[index]
        tx = await factory.addBeneficiary(
            vestingPoolAddress, 
            params.address,
            ethers.parseEther(params.amount),
            { gasLimit: 3000000 }
        )
        console.log(`Address ${params.address}, tx: ${tx.hash}`)
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
