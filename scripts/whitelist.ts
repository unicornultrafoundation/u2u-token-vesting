import { ethers } from "hardhat";

interface AddPoolArgs {
    address: string
    amount: string
}

const vestingPoolAddress = "0x310629265A928A3474404Af3eA3EB19B362FeE0D"

const addPoolArgs: AddPoolArgs[] = [
    {
        address: "0x35825c18FAfD43181EAB54eE68FD86f0B5998018",
        amount: "10000"
    }
]


async function main() {
    let tx;
    const factoryAddress = "0x9d4c2E691b99E98Fc28aa5577C5CD2497994b59a"
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
