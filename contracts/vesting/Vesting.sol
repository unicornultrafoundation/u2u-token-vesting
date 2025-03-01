// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/IFactory.sol";
import "./interfaces/IVesting.sol";
import "hardhat/console.sol";

contract Vesting is IVesting, ReentrancyGuard, Pausable {
    using SafeMath for uint256;
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 HUNDRED_PERCENT = 1e20; // ~ 100%

    address public factory;

    VestingSchedule private __vestingSchedule; // Vesting infomation
    mapping(address => UserInfo) private __users; // Users infos storage
    EnumerableSet.AddressSet __poolUsers;

    constructor() {
        factory = msg.sender;
    }

    modifier onlyFactory() {
        require(msg.sender == factory, "Vesting: FORBIDDEN");
        _;
    }

    modifier onlyValidSender(address _sender) {
        require(
            __poolUsers.contains(_sender),
            "Vesting: sender address invalid"
        );
        _;
    }

    ////////////////////////// EXTERNAL FUNCTION ////////////////////////////
    function release()
        external
        nonReentrant
        onlyValidSender(msg.sender)
        whenNotPaused
        returns (uint256)
    {
        address _beneficiary = msg.sender;
        UserInfo storage __user = __users[_beneficiary];
        (uint256 _releasedAmount, uint256 _releasedPeriods) = _eligibleReleased(
            _beneficiary
        );
        require(_releasedAmount > 0, "Vesting: released amount is zero");
        __user.completedPeriods += _releasedPeriods;
        __user.releasedAmount += _releasedAmount;
        if (!__user.isFirstReleaseClaimed) {
            __user.isFirstReleaseClaimed = true;
        }
        __vestingSchedule.totalReleasedAmount += _releasedAmount;
        //////////////////////////////////////////////////////////
        // Transfer coin to beneficiary
        IFactory(factory).widthdraw(_beneficiary, _releasedAmount);
        //////////////////////////////////////////////////////////
        emit Released(_beneficiary, _releasedAmount, _releasedPeriods);
        return _releasedAmount;
    }

    function getBeneficiariesAdded() external view returns (uint256) {
        return __poolUsers.length();
    }

    function getUserInfo(
        address _user
    ) external view returns (UserInfo memory) {
        return __users[_user];
    }

    function getVestingSchedule()
        external
        view
        returns (VestingSchedule memory)
    {
        return __vestingSchedule;
    }

    function checkEligibleReleased(
        address _beneficiary
    ) external view returns (uint256, uint256) {
        (uint256 _releasedAmount, uint256 _releasedPeriods) = _eligibleReleased(_beneficiary);
        return (_releasedAmount, _releasedPeriods);
    }

    ////////////////////////// INTERNAL FUNCTION ////////////////////////////
    function _eligibleReleased(
        address _beneficiary
    ) internal view returns (uint256, uint256) {
        UserInfo memory _user = __users[_beneficiary];
        if (__vestingSchedule.startTime > block.timestamp) {
            return (0, 0);
        }
        uint256 _periods = _eligiblePeriods(_beneficiary);
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
        address _beneficiary
    ) internal view returns (uint256) {
        UserInfo memory _user = __users[_beneficiary];
        if (
            block.timestamp <
            __vestingSchedule.startTime.add(__vestingSchedule.lockDuration)
        ) {
            return 0;
        }
        uint256 _timeSinceLock = block.timestamp.sub(
            (__vestingSchedule.startTime.add(__vestingSchedule.lockDuration))
        );
        uint256 _completedPeriods = _timeSinceLock.div(
            __vestingSchedule.period
        );

        if (_completedPeriods > __vestingSchedule.vestingPeriods) {
            _completedPeriods = __vestingSchedule.vestingPeriods; // Cap to total periods
        }
        return _completedPeriods - _user.completedPeriods;
    }

    ////////////////////////// FACTORY CALL FUNCTION ////////////////////////////

    function initialize(
        uint256 _startTime,
        uint256 _firstUnlockPercentage,
        uint256 _lockDuration,
        uint256 _vestingDuration,
        uint256 _vestingPeriods,
        uint256 _totalPoolCap
    ) external onlyFactory {
        require(_startTime >= block.timestamp, "Vesting: args invalid");
        __vestingSchedule = VestingSchedule({
            startTime: _startTime,
            firstUnlockPercentage: _firstUnlockPercentage,
            lockDuration: _lockDuration,
            vestingDuration: _vestingDuration,
            vestingPeriods: _vestingPeriods,
            period: _vestingDuration.div(_vestingPeriods),
            periodUnlockPercentage: (
                HUNDRED_PERCENT.sub(_firstUnlockPercentage)
            ).div(_vestingPeriods),
            endTime: _startTime + _lockDuration + _vestingDuration,
            totalPoolCap: _totalPoolCap,
            totalReleasedAmount: 0
        });
        emit Initialized(__vestingSchedule);
    }

    // Allows the admin to add a new vesting schedule for a beneficiary
    function addBeneficiary(
        address _beneficiary,
        uint256 _totalAmount
    ) external onlyFactory {
        require(
            !__poolUsers.contains(_beneficiary),
            "Vesting: beneficiary already added"
        );
        __users[_beneficiary] = UserInfo({
            totalAmount: _totalAmount,
            isFirstReleaseClaimed: false,
            firstReleaseAmount: _totalAmount
                .mul(__vestingSchedule.firstUnlockPercentage)
                .div(HUNDRED_PERCENT),
            amountPerPeriod: _totalAmount
                .mul(__vestingSchedule.periodUnlockPercentage)
                .div(HUNDRED_PERCENT),
            releasedAmount: 0,
            completedPeriods: 0
        });
        __poolUsers.add(_beneficiary);
        emit BeneficiaryAdded(_beneficiary, __users[_beneficiary]);
    }

    function removeBeneficiary (address _beneficiary) external onlyFactory returns(uint256 removedAmount) {
        require(
            __poolUsers.contains(_beneficiary),
            "Vesting: beneficiary not added yet"
        );
        UserInfo memory _user = __users[_beneficiary];
        removedAmount = _user.totalAmount;
        __poolUsers.remove(_beneficiary);
        emit BeneficiaryRemoved(_beneficiary);
    }

    function pause() external onlyFactory whenNotPaused {
        _pause();
    }

    function unpause() external onlyFactory whenPaused {
        _unpause();
    }
}
