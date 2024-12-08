import BigNumber from "bignumber.js";
import { expect } from "chai";
import { ethers } from "hardhat";
const zero_address = "0x0000000000000000000000000000000000000000"

describe("Vesting", function () {
  before(async function () {
    this.Factory = await ethers.getContractFactory("Factory");
    this.Treasury = await ethers.getContractFactory("Treasury");
    this.Vesting = await ethers.getContractFactory("Vesting");

    this.signers = await ethers.getSigners();
    this.admin = this.signers[0]
    this.adminAddr = this.signers[0].address
    this.bob = this.signers[1]
    this.bobAddr = this.signers[1].address
    this.alice = this.signers[2]
    this.aliceAddr = this.signers[2].address
    this.john = this.signers[3]
    this.johnAddr = this.signers[3].address
    console.log(`Admin address: ${this.adminAddr}`)

  })

  beforeEach(async function () {
    this.factory = await this.Factory.deploy()
    this.treasury = await this.Treasury.deploy(this.factory.target)
    console.log(`Factory address: ${this.factory.target}`)
    console.log(`Treasury address: ${this.treasury.target}`)

    // Grant master pool admin
    const MASTER_POOL_ADMIN = await this.factory.MASTER_POOL_ADMIN()
    console.log(`Treasury MASTER_POOL_ADMIN: ${MASTER_POOL_ADMIN}`)
    await this.factory.grantRole(MASTER_POOL_ADMIN, this.adminAddr)

    const POOL_ADMIN = await this.factory.POOL_ADMIN()
    console.log(`Treasury POOL_ADMIN: ${POOL_ADMIN}`)
    await this.factory.grantRole(POOL_ADMIN, this.adminAddr)

    // Factory set treasury amount
    await this.factory.setTreasury(this.treasury.target)
  })

  it("Create pool + vesting", async function () {
    const termName = "Private Round"
    const startTime = Math.round((new Date()).getTime() / 1000) + 60
    const firstUnlockPercentage = 10000
    const lockDuration = 60; // 1 min
    const vestingDuration = 9 * 60; // 9 mins
    const vestingPeriods = 18;
    const totalPoolCap = ethers.parseEther("1000")

    // Create new pool
    console.log(`New pool args: ${termName}, ${this.adminAddr}, ${startTime}, ${firstUnlockPercentage}, ${lockDuration}, ${vestingDuration}, ${vestingPeriods}, ${totalPoolCap}`)
    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    // Get pool address
    const pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(1)

    // Admin add beneficiary
    await this.factory.addBeneficiary(pools[0], this.bobAddr, ethers.parseEther("1000"))

    // Get vesting schedule infomation
    const vestingContract__ = await ethers.getContractAt("Vesting", pools[0])
    const vestingSchedule = await vestingContract__.getVestingSchedule()
    console.log(`Vesting schedule: ${vestingSchedule}`)

    const userAdded = await vestingContract__.getBeneficiariesAdded()
    await expect(userAdded).to.equal(1)

    let bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)


    // Vesting
    await increaseTime(60)
    let eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    await expect(vestingContract__.connect(this.bob).release()).to.be.revertedWith("Treasury: withdraw invalid amount");

    // Send U2U to treasury contract
    const sendTx = await this.admin.sendTransaction({
      to: this.treasury.target,
      value: ethers.parseEther("1000"),
    });
    await sendTx.wait();
    let treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("1000"));
    await vestingContract__.connect(this.bob).release()

    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("900"));

    // Vesting
    await increaseTime(60)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("0"));

    // Vesting
    await increaseTime(30)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("50"));

    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);
    expect(treasuryBalance).to.equal(ethers.parseEther("850"));

    bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)
    expect(bobInfos[4]).to.equal(ethers.parseEther("150"));
    expect(bobInfos[5]).to.equal(1);


    await increaseTime(90)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("150"));

    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);
    expect(treasuryBalance).to.equal(ethers.parseEther("700"));

    bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)
    expect(bobInfos[4]).to.equal(ethers.parseEther("300"));
    expect(bobInfos[5]).to.equal(4);


    await increaseTime(420)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("700"));

    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);

    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);
    expect(treasuryBalance).to.equal(ethers.parseEther("0"));
  })

  it("One time vesting all", async function () {
    const block = await ethers.provider.getBlock("latest"); // Fetch the latest block
    const timestamp = block ? block.timestamp : 0; // Get the timestamp from the block

    const termName = "Private Round"
    const startTime = timestamp + 60
    const firstUnlockPercentage = 10000
    const lockDuration = 60; // 1 min
    const vestingDuration = 9 * 60; // 9 mins
    const vestingPeriods = 18;
    const totalPoolCap = ethers.parseEther("1000")

    // Create new pool
    console.log(`New pool args: ${termName}, ${this.adminAddr}, ${startTime}, ${firstUnlockPercentage}, ${lockDuration}, ${vestingDuration}, ${vestingPeriods}, ${totalPoolCap}`)
    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    // Get pool address
    const pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(1)

    // Admin add beneficiary
    await this.factory.addBeneficiary(pools[0], this.bobAddr, ethers.parseEther("1000"))

    // Get vesting schedule infomation
    const vestingContract__ = await ethers.getContractAt("Vesting", pools[0])
    const vestingSchedule = await vestingContract__.getVestingSchedule()
    console.log(`Vesting schedule: ${vestingSchedule}`)

    const userAdded = await vestingContract__.getBeneficiariesAdded()
    await expect(userAdded).to.equal(1)

    let bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)

    // Vesting
    await increaseTime(660)
    let eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    await expect(vestingContract__.connect(this.bob).release()).to.be.revertedWith("Treasury: withdraw invalid amount");

    // Send U2U to treasury contract
    const sendTx = await this.admin.sendTransaction({
      to: this.treasury.target,
      value: ethers.parseEther("1000"),
    });
    await sendTx.wait();
    let treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("1000"));
    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("0"));
  })


  it("Max pool cap added", async function () {
    const block = await ethers.provider.getBlock("latest"); // Fetch the latest block
    const timestamp = block ? block.timestamp : 0; // Get the timestamp from the block

    const termName = "Private Round"
    const startTime = timestamp + 60
    const firstUnlockPercentage = 10000
    const lockDuration = 60; // 1 min
    const vestingDuration = 9 * 60; // 9 mins
    const vestingPeriods = 18;
    const totalPoolCap = ethers.parseEther("1000")

    // Create new pool
    console.log(`New pool args: ${termName}, ${this.adminAddr}, ${startTime}, ${firstUnlockPercentage}, ${lockDuration}, ${vestingDuration}, ${vestingPeriods}, ${totalPoolCap}`)
    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    // Get pool address
    const pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(1)

    // Admin add beneficiary
    await this.factory.addBeneficiary(pools[0], this.bobAddr, ethers.parseEther("600"))
    await expect(this.factory.addBeneficiary(pools[0], this.aliceAddr, ethers.parseEther("1000"))).to.be.revertedWith("Factory: max pool cap");


    await this.factory.addBeneficiary(pools[0], this.aliceAddr, ethers.parseEther("400"))

    // Get vesting schedule infomation
    const vestingContract__ = await ethers.getContractAt("Vesting", pools[0])
    const vestingSchedule = await vestingContract__.getVestingSchedule()
    console.log(`Vesting schedule: ${vestingSchedule}`)

    const userAdded = await vestingContract__.getBeneficiariesAdded()
    await expect(userAdded).to.equal(2)

    let bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)

    // Vesting
    await increaseTime(300)

    // Bob vesting
    let bobEigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Bob Eigible Released: ${ethers.formatUnits(bobEigibleReleased, 18)} U2U`)
    let aliceEigibleReleased = await vestingContract__.checkEligibleReleased(this.aliceAddr)
    console.log(`Alice Eigible Released: ${ethers.formatUnits(aliceEigibleReleased, 18)} U2U`)
    await expect(vestingContract__.connect(this.bob).release()).to.be.revertedWith("Treasury: withdraw invalid amount");
    // Send U2U to treasury contract
    const sendTx = await this.admin.sendTransaction({
      to: this.treasury.target,
      value: ethers.parseEther("1000"),
    });
    await sendTx.wait();
    let treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("1000"));
    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("760"));

    // Vesting
    await increaseTime(360)
    // Bob vesting
    bobEigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Bob Eigible Released: ${ethers.formatUnits(bobEigibleReleased, 18)} U2U`)
    aliceEigibleReleased = await vestingContract__.checkEligibleReleased(this.aliceAddr)
    console.log(`Alice Eigible Released: ${ethers.formatUnits(aliceEigibleReleased, 18)} U2U`)
    await vestingContract__.connect(this.bob).release()
    await vestingContract__.connect(this.alice).release()

    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("0"));

  })

  it("Paused/Unpaused pool", async function () {
    const block = await ethers.provider.getBlock("latest"); // Fetch the latest block
    const timestamp = block ? block.timestamp : 0; // Get the timestamp from the block

    const termName = "Private Round"
    const startTime = timestamp + 60
    const firstUnlockPercentage = 10000
    const lockDuration = 60; // 1 min
    const vestingDuration = 9 * 60; // 9 mins
    const vestingPeriods = 18;
    const totalPoolCap = ethers.parseEther("1000")

    // Create new pool
    console.log(`New pool args: ${termName}, ${this.adminAddr}, ${startTime}, ${firstUnlockPercentage}, ${lockDuration}, ${vestingDuration}, ${vestingPeriods}, ${totalPoolCap}`)
    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    // Get pool address
    const pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(1)

    // Admin add beneficiary
    await this.factory.addBeneficiary(pools[0], this.bobAddr, ethers.parseEther("600"))
    await expect(this.factory.addBeneficiary(pools[0], this.aliceAddr, ethers.parseEther("1000"))).to.be.revertedWith("Factory: max pool cap");


    await this.factory.addBeneficiary(pools[0], this.aliceAddr, ethers.parseEther("400"))

    // Get vesting schedule infomation
    const vestingContract__ = await ethers.getContractAt("Vesting", pools[0])
    const vestingSchedule = await vestingContract__.getVestingSchedule()
    console.log(`Vesting schedule: ${vestingSchedule}`)

    const userAdded = await vestingContract__.getBeneficiariesAdded()
    await expect(userAdded).to.equal(2)

    let bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)

    // Vesting
    await increaseTime(300)

    // Bob vesting
    let bobEigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Bob Eigible Released: ${ethers.formatUnits(bobEigibleReleased, 18)} U2U`)
    let aliceEigibleReleased = await vestingContract__.checkEligibleReleased(this.aliceAddr)
    console.log(`Alice Eigible Released: ${ethers.formatUnits(aliceEigibleReleased, 18)} U2U`)
    await expect(vestingContract__.connect(this.bob).release()).to.be.revertedWith("Treasury: withdraw invalid amount");
    // Send U2U to treasury contract
    const sendTx = await this.admin.sendTransaction({
      to: this.treasury.target,
      value: ethers.parseEther("1000"),
    });
    await sendTx.wait();
    let treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("1000"));

    await this.factory.pausePool(pools[0])

    await expect(vestingContract__.connect(this.bob).release()).to.be.revertedWith("Pausable: paused");

    await this.factory.unpausePool(pools[0])

    await vestingContract__.connect(this.bob).release()

    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("760"));

    // Vesting
    await increaseTime(360)
    // Bob vesting
    bobEigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Bob Eigible Released: ${ethers.formatUnits(bobEigibleReleased, 18)} U2U`)
    aliceEigibleReleased = await vestingContract__.checkEligibleReleased(this.aliceAddr)
    console.log(`Alice Eigible Released: ${ethers.formatUnits(aliceEigibleReleased, 18)} U2U`)
    await vestingContract__.connect(this.bob).release()


    let totalReleased = await this.factory.totalReleasedAmount()
    console.log(`Total factory released: ${totalReleased}`)
    expect(totalReleased).to.equal(ethers.parseEther("600"));

    await vestingContract__.connect(this.alice).release()

    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("0"));

    totalReleased = await this.factory.totalReleasedAmount()
    console.log(`Total factory released: ${totalReleased}`)
    expect(totalReleased).to.equal(ethers.parseEther("1000"));

  })

  it("Check pool info", async function () {
    const block = await ethers.provider.getBlock("latest"); // Fetch the latest block
    const timestamp = block ? block.timestamp : 0; // Get the timestamp from the block

    const termName = "Private Round"
    const startTime = timestamp + 60
    const firstUnlockPercentage = 10000
    const lockDuration = 60; // 1 min
    const vestingDuration = 9 * 60; // 9 mins
    const vestingPeriods = 18;
    const totalPoolCap = ethers.parseEther("1000")

    // Create new pool
    console.log(`New pool args: ${termName}, ${this.adminAddr}, ${startTime}, ${firstUnlockPercentage}, ${lockDuration}, ${vestingDuration}, ${vestingPeriods}, ${totalPoolCap}`)
    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    // Get pool address
    let pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(1)

    // Admin add beneficiary
    await this.factory.addBeneficiary(pools[0], this.bobAddr, ethers.parseEther("600"))
    await expect(this.factory.addBeneficiary(pools[0], this.aliceAddr, ethers.parseEther("1000"))).to.be.revertedWith("Factory: max pool cap");

    let vestingPool = await this.factory.getPoolDetails(pools[0])
    console.log(`Vesting Pool: ${vestingPool}`)
    expect(vestingPool[6]).to.equal(ethers.parseEther("600"));

    await this.factory.addBeneficiary(pools[0], this.aliceAddr, ethers.parseEther("400"))

    // Get vesting schedule infomation
    const vestingContract__ = await ethers.getContractAt("Vesting", pools[0])
    const vestingSchedule = await vestingContract__.getVestingSchedule()
    console.log(`Vesting schedule: ${vestingSchedule}`)

    vestingPool = await this.factory.getPoolDetails(pools[0])
    console.log(`Vesting Pool: ${vestingPool}`)
    expect(vestingPool[6]).to.equal(ethers.parseEther("1000"));

    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(2)

  })

  it("Add after pool started", async function () {
    const block = await ethers.provider.getBlock("latest"); // Fetch the latest block
    const timestamp = block ? block.timestamp : 0; // Get the timestamp from the block
    const termName = "Private Round"
    const startTime = timestamp + 60
    const firstUnlockPercentage = 10000
    const lockDuration = 60; // 1 min
    const vestingDuration = 9 * 60; // 9 mins
    const vestingPeriods = 18;
    const totalPoolCap = ethers.parseEther("1000")

    // Create new pool
    console.log(`New pool args: ${termName}, ${this.adminAddr}, ${startTime}, ${firstUnlockPercentage}, ${lockDuration}, ${vestingDuration}, ${vestingPeriods}, ${totalPoolCap}`)
    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    // Get pool address
    const pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(1)

    // Vesting
    await increaseTime(60)

    // Admin add beneficiary
    await this.factory.addBeneficiary(pools[0], this.bobAddr, ethers.parseEther("1000"))

    // Get vesting schedule infomation
    const vestingContract__ = await ethers.getContractAt("Vesting", pools[0])
    const vestingSchedule = await vestingContract__.getVestingSchedule()
    console.log(`Vesting schedule: ${vestingSchedule}`)

    const userAdded = await vestingContract__.getBeneficiariesAdded()
    await expect(userAdded).to.equal(1)

    let bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)


    let eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    await expect(vestingContract__.connect(this.bob).release()).to.be.revertedWith("Treasury: withdraw invalid amount");

    // Send U2U to treasury contract
    const sendTx = await this.admin.sendTransaction({
      to: this.treasury.target,
      value: ethers.parseEther("1000"),
    });
    await sendTx.wait();
    let treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("1000"));
    await vestingContract__.connect(this.bob).release()

    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    expect(treasuryBalance).to.equal(ethers.parseEther("900"));

    // Vesting
    await increaseTime(60)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("0"));

    // Vesting
    await increaseTime(30)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("50"));

    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);
    expect(treasuryBalance).to.equal(ethers.parseEther("850"));

    bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)
    expect(bobInfos[4]).to.equal(ethers.parseEther("150"));
    expect(bobInfos[5]).to.equal(1);


    await increaseTime(90)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("150"));

    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);
    expect(treasuryBalance).to.equal(ethers.parseEther("700"));

    bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)
    expect(bobInfos[4]).to.equal(ethers.parseEther("300"));
    expect(bobInfos[5]).to.equal(4);


    await increaseTime(420)
    eigibleReleased = await vestingContract__.checkEligibleReleased(this.bobAddr)
    console.log(`Eigible Released: ${ethers.formatUnits(eigibleReleased, 18)} U2U`)
    expect(eigibleReleased).to.equal(ethers.parseEther("700"));

    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);

    await vestingContract__.connect(this.bob).release()
    // Check truseary after withdraw
    treasuryBalance = await ethers.provider.getBalance(this.treasury.target);
    console.log(`TreasuryBalance: ${ethers.formatUnits(treasuryBalance, 18)}`);
    expect(treasuryBalance).to.equal(ethers.parseEther("0"));

  })

  it("Add multiple user", async function () {
    const block = await ethers.provider.getBlock("latest"); // Fetch the latest block
    const timestamp = block ? block.timestamp : 0; // Get the timestamp from the block
    const termName = "Private Round"
    const startTime = timestamp + 60
    const firstUnlockPercentage = 10000
    const lockDuration = 60; // 1 min
    const vestingDuration = 9 * 60; // 9 mins
    const vestingPeriods = 18;
    const totalPoolCap = ethers.parseEther("1000")

    // Create new pool
    console.log(`New pool args: ${termName}, ${this.adminAddr}, ${startTime}, ${firstUnlockPercentage}, ${lockDuration}, ${vestingDuration}, ${vestingPeriods}, ${totalPoolCap}`)
    await this.factory.newPool(termName, this.adminAddr, startTime, firstUnlockPercentage, lockDuration, vestingDuration, vestingPeriods, totalPoolCap)
    // Get pool address
    const pools = await this.factory.getPoolsAddress()
    console.log(`Vesting pools: ${pools}`)
    await expect(pools.length).to.equal(1)

    // Vesting
    await increaseTime(60)

    // Admin add beneficiary
    const userAddr = [this.bobAddr, this.aliceAddr, this.johnAddr]
    const amountArr = [ethers.parseEther("300"), ethers.parseEther("300"), ethers.parseEther("300")]
    await this.factory.addBeneficiaries(pools[0], userAddr, amountArr)

    // Get vesting schedule infomation
    const vestingContract__ = await ethers.getContractAt("Vesting", pools[0])
    const vestingSchedule = await vestingContract__.getVestingSchedule()
    console.log(`Vesting schedule: ${vestingSchedule}`)

    const userAdded = await vestingContract__.getBeneficiariesAdded()
    await expect(userAdded).to.equal(3)

    let bobInfos = await vestingContract__.getUserInfo(this.bobAddr)
    console.log(`Bob Infos: ${bobInfos}`)
  })
});


async function increaseTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}