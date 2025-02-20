// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./interfaces/IFactory.sol";
import "./interfaces/IVesting.sol";
import "./Vesting.sol";
import "../libs/TransferHelper.sol";

contract VestingWrapper is IVesting, ReentrancyGuard, Pausable, AccessControl {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 HUNDRED_PERCENT = 1e20; // ~ 100%

    mapping(address => mapping(address => UserInfo)) private __users; // Users infos storage
    mapping(address => EnumerableSet.AddressSet) private __poolMigratedUsers;
    EnumerableSet.AddressSet private __poolMigrated;

    mapping(address => VestingSchedule) __vestingSchedules;

    EnumerableSet.AddressSet private _poolBlacklisted;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    event UserPoolMigration(address pool, address userAddr, UserInfo info);
    event PoolMigration(VestingSchedule info);

    event Released(
        address pool,
        address beneficiary,
        uint256 releasedAmount,
        uint256 releasedPeriods
    );

    modifier onlyMasterAdmin() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSender()),
            "DEFAULT_ADMIN_ROLE"
        );
        _;
    }

    modifier checkBlacklistedPool(address _pool) {
        require(!_poolBlacklisted.contains(_pool), "Pool blacklisted");
        _;
    }

    ////////////////////////// EXTERNAL FUNCTION ////////////////////////////
    function release(
        address _pool
    )
        external
        nonReentrant
        whenNotPaused
        checkBlacklistedPool(_pool)
        returns (uint256)
    {
        address _beneficiary = msg.sender;
        if (!__poolMigratedUsers[_pool].contains(_beneficiary)) {
            _userMigration(_pool, _beneficiary);
        }
        UserInfo storage __user = __users[_pool][_beneficiary];
        (uint256 _releasedAmount, uint256 _releasedPeriods) = _eligibleReleased(
            _beneficiary,
            _pool
        );
        require(_releasedAmount > 0, "Vesting: released amount is zero");
        __user.completedPeriods += _releasedPeriods;
        __user.releasedAmount += _releasedAmount;
        if (!__user.isFirstReleaseClaimed) {
            __user.isFirstReleaseClaimed = true;
        }
        __vestingSchedules[_pool].totalReleasedAmount += _releasedAmount;
        //////////////////////////////////////////////////////////
        // Transfer coin to beneficiary
        require(
            _releasedAmount <= address(this).balance,
            "Treasury: withdraw invalid amount"
        );
        TransferHelper.safeTransferNative(_beneficiary, _releasedAmount);
        //////////////////////////////////////////////////////////
        emit Released(_pool, _beneficiary, _releasedAmount, _releasedPeriods);
        return _releasedAmount;
    }

    function getUserInfo(
        address _pool,
        address _user
    ) external view returns (UserInfo memory) {
        return _getUserInfo(_pool, _user);
    }

    function getVestingSchedule(
        address _pool
    ) external view returns (VestingSchedule memory) {
        return __vestingSchedules[_pool];
    }

    function checkEligibleReleased(
        address _beneficiary,
        address _pool
    ) external view returns (uint256, uint256) {
        (uint256 _releasedAmount, uint256 _releasedPeriods) = _eligibleReleased(
            _beneficiary,
            _pool
        );
        return (_releasedAmount, _releasedPeriods);
    }

    function userMigration(address _pool, address _user) public onlyMasterAdmin {
        _userMigration(_pool, _user);
    }

    //////////////////////////// INTERNAL FUNCTION ////////////////////////////

    function _getUserInfo(
        address _pool,
        address _user
    ) internal view returns (UserInfo memory) {
        UserInfo memory migratedUser = __users[_pool][_user];
        if (migratedUser.totalAmount > 0) {
            return migratedUser;
        }
        return Vesting(_pool).getUserInfo(_user);
    }

    function _userMigration(address _pool, address _user) internal {
        require(
            !__poolMigratedUsers[_pool].contains(_user),
            "User pool already migration"
        );
        UserInfo memory _userInfo = Vesting(_pool).getUserInfo(_user);
        require(_userInfo.totalAmount > 0, "User info not found");
        __users[_pool][_user] = _userInfo;
        __poolMigratedUsers[_pool].add(_user);
        emit UserPoolMigration(_pool, _user, __users[_pool][_user]);
    }

    function _eligibleReleased(
        address _beneficiary,
        address _pool
    ) internal view returns (uint256, uint256) {
        UserInfo memory _user = _getUserInfo(_pool, _beneficiary);
        if (__vestingSchedules[_pool].startTime > block.timestamp) {
            return (0, 0);
        }
        uint256 _periods = _eligiblePeriods(_beneficiary, _pool);
        uint256 _released;

        if (_periods > 0) {
            _released = _periods.mul(_user.amountPerPeriod);
        }
        if (!_user.isFirstReleaseClaimed) {
            _released += _user.firstReleaseAmount;
        }
        return (_released, _periods);
    }

    function _eligiblePeriods(
        address _beneficiary,
        address _pool
    ) internal view returns (uint256) {
        UserInfo memory _user = _getUserInfo(_pool, _beneficiary);
        if (
            block.timestamp <
            __vestingSchedules[_pool].startTime.add(
                __vestingSchedules[_pool].lockDuration
            )
        ) {
            return 0;
        }

        uint256 _timeSinceLock = block.timestamp.sub(
            (
                __vestingSchedules[_pool].startTime.add(
                    __vestingSchedules[_pool].lockDuration
                )
            )
        );

        uint256 _completedPeriods = _timeSinceLock.div(
            __vestingSchedules[_pool].period
        ) + 1;

        if (_completedPeriods > __vestingSchedules[_pool].vestingPeriods) {
            _completedPeriods = __vestingSchedules[_pool].vestingPeriods; // Cap to total periods
        }
        return _completedPeriods - _user.completedPeriods;
    }

    ////////////////////////// FACTORY CALL FUNCTION ////////////////////////////
    function poolMigration(address _oldPool) external onlyMasterAdmin {
        require(!__poolMigrated.contains(_oldPool), "Pool already migration");
        VestingSchedule memory _vs = Vesting(_oldPool).getVestingSchedule();
        require(_vs.startTime > 0, "Pool is invalid");
        __vestingSchedules[_oldPool] = _vs;
        __poolMigrated.add(_oldPool);
        emit PoolMigration(__vestingSchedules[_oldPool]);
    }

    function blacklistPool(address _pool) external onlyMasterAdmin {
        require(!_poolBlacklisted.contains(_pool), "blacklisted");
        _poolBlacklisted.add(_pool);
    }

    function removeBlacklistPool(address _pool) external onlyMasterAdmin {
        require(_poolBlacklisted.contains(_pool), "not found blacklisted");
        _poolBlacklisted.remove(_pool);
    }

    function pause() external onlyMasterAdmin whenNotPaused {
        _pause();
    }

    function unpause() external onlyMasterAdmin whenPaused {
        _unpause();
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
