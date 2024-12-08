// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "../libs/TransferHelper.sol";
import "./interfaces/ITreasury.sol";

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Treasury is ITreasury, AccessControl {
    address public factory;

    constructor(address _factory) {
        factory = _factory;
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyMasterAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "DEFAULT_ADMIN_ROLE"
        );
        _;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Treasury: FORBIDDEN");
        _;
    }

    function isTreasury() external pure returns (bool) {
        return true;
    }

    function withdraw(
        address _beneficiary,
        uint256 _amount,
        address _poolAddr
    ) external onlyFactory {
        require(
            _amount <= address(this).balance,
            "Treasury: withdraw invalid amount"
        );
        TransferHelper.safeTransferNative(_beneficiary, _amount);
        emit Withdrawn(_beneficiary, _amount, _poolAddr);
    }

    receive() external payable {}

    function emergencyWithdrawU2U(
        address _to,
        uint256 _amount
    ) external onlyMasterAdmin {
        require(_amount <= address(this).balance, "Treasury: invalid amount");
        TransferHelper.safeTransferNative(_to, _amount);
    }
}
