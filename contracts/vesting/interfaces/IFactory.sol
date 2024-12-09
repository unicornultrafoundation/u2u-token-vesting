// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface IFactory {
    
    struct VestingPool {
        string vestingTerm;
        uint256 createdAt;
        address poolAdmin;
        address poolAddr;
        uint256 totalPoolCap;
        uint256 totalReleasedAmount;
        uint256 totalVestingAdded;
    }

    function widthdraw(address _beneficiary, uint256 _amount) external;

    event NewPool(address id, VestingPool infos);
    event Paused(address poodAddr);
    event Unpaused(address poodAddr);
    event Withdrawn(address beneficiary, uint256 amount, address poolAddr);
    event PoolCapUpdated(address poodAddr, uint256 newCap);
    event BeneficiaryAdded(
        address poodAddr,
        address beneficiary,
        uint256 totalAmount
    );

    event BeneficiaryRemoved(
        address poodAddr,
        address beneficiary,
        uint256 removedAmount
    );
}
