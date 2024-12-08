// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

interface ITreasury {
    function isTreasury() external pure returns (bool);
    function withdraw(address _beneficiary, uint256 _amount, address _poolAddr) external;

    event Withdrawn(address beneficiary, uint256 amount, address poolAddr);
}