// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IVesting {
    struct VestingSchedule {
        uint256 startTime; // First/TGE vesting time
        uint256 firstUnlockPercentage; // TGE % unlock 1000 ~ 1%
        uint256 lockDuration; // ex:  30 days, locked after TGE time
        uint256 vestingDuration; // ex: 18 months linear vesting
        uint256 vestingPeriods; // Number of vesting periods (e.g., 18)
        uint256 period; // Period of time
        uint256 periodUnlockPercentage; // period % unlock
        uint256 endTime; // End of vesting
        uint256 totalPoolCap;
        uint256 totalReleasedAmount;
    }

    struct UserInfo {
        uint256 totalAmount;
        bool isFirstReleaseClaimed;
        uint256 firstReleaseAmount;
        uint256 amountPerPeriod;
        uint256 releasedAmount;
        uint256 completedPeriods;
    }

    event Initialized(VestingSchedule info);
    event BeneficiaryAdded(address beneficiary, UserInfo user);
    event BeneficiaryRemoved(address beneficiary);
    event Released(
        address beneficiary,
        uint256 releasedAmount,
        uint256 releasedPeriods
    );
}