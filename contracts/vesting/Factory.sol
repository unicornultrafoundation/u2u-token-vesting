// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./Vesting.sol";
import "./interfaces/ITreasury.sol";
import "./interfaces/IFactory.sol";

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract Factory is IFactory, AccessControl {
    using EnumerableSet for EnumerableSet.AddressSet;
    using SafeMath for uint256;

    bytes32 public constant MASTER_POOL_ADMIN = keccak256("MASTER_POOL_ADMIN");
    bytes32 public constant POOL_ADMIN = keccak256("POOL_ADMIN");
    
    mapping(address => VestingPool) private __vestingPool;
    EnumerableSet.AddressSet _vestingPools;
    address public treasury;
    uint256 public totalReleasedAmount;
    uint256 public totalVestingAdded;

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyMasterPoolAdmin() {
        require(
            hasRole(MASTER_POOL_ADMIN, _msgSender()),
            "Factory: MASTER_POOL_ADMIN"
        );
        _;
    }

    modifier onlyPoolAdmin() {
        require(hasRole(POOL_ADMIN, _msgSender()), "Factory: POOL_ADMIN");
        _;
    }

    modifier onlyValidPool(address _poolAddr) {
        require(
            _vestingPools.contains(_poolAddr),
            "Factory: pool address invalid"
        );
        _;
    }

    ////////////////////////// EXTERNAL FUNCTION ////////////////////////////

    function setTreasury(address _treasuryAddr) external onlyMasterPoolAdmin {
        require(
            ITreasury(_treasuryAddr).isTreasury(),
            "Factory: treasury address invalid"
        );
        treasury = _treasuryAddr;
    }

    function newPool(
        string memory _term,
        address _poolAdmin,
        uint256 _startTime,
        uint256 _firstUnlockPercentage, // 1000 ~ 1%
        uint256 _lockDuration,
        uint256 _vestingDuration,
        uint256 _vestingPeriods,
        uint256 _totalPoolCap
    ) external onlyMasterPoolAdmin {
        bytes memory byteCode = type(Vesting).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(block.number, msg.sender));
        address _pool;
        assembly {
            _pool := create2(0, add(byteCode, 32), mload(byteCode), salt)
        }
        if (_pool != address(0)) {
            __vestingPool[_pool] = VestingPool({
                poolAdmin: _poolAdmin,
                createdAt: block.timestamp,
                poolAddr: _pool,
                vestingTerm: _term,
                totalPoolCap: _totalPoolCap,
                totalReleasedAmount: 0,
                totalVestingAdded: 0
            });
            Vesting(_pool).initialize(
                _startTime,
                _firstUnlockPercentage,
                _lockDuration,
                _vestingDuration,
                _vestingPeriods,
                _totalPoolCap
            );
            _vestingPools.add(_pool);
            emit NewPool(_pool, __vestingPool[_pool]);
        }
    }

    function getPoolLength() external view returns (uint256) {
        return _vestingPools.length();
    }

    function getPoolsAddress() external view returns (address[] memory) {
        return _vestingPools.values();
    }

    function getPoolDetails(
        address _poolAddr
    ) external view returns (VestingPool memory) {
        return __vestingPool[_poolAddr];
    }

    function updatePoolCap(
        address _poolAddress,
        uint256 _newCap
    ) external onlyMasterPoolAdmin onlyValidPool(_poolAddress) {
        __vestingPool[_poolAddress].totalPoolCap = _newCap;
        emit PoolCapUpdated(_poolAddress, _newCap);
    }

    // Allows the admin to add a new vesting schedule for a beneficiary
    function addBeneficiary(
        address _pooAddr,
        address _beneficiary,
        uint256 _totalAmount
    ) external onlyPoolAdmin onlyValidPool(_pooAddr) {
        Vesting(_pooAddr).addBeneficiary(_beneficiary, _totalAmount);
        totalVestingAdded += _totalAmount;
        __vestingPool[_pooAddr].totalVestingAdded += _totalAmount;
        require(
            __vestingPool[_pooAddr].totalVestingAdded <=
                __vestingPool[_pooAddr].totalPoolCap,
            "Factory: max pool cap"
        );
        emit BeneficiaryAdded(_pooAddr, _beneficiary, _totalAmount);
    }

    function removeBeneficiary(
        address _pooAddr,
        address _beneficiary
    ) external onlyPoolAdmin onlyValidPool(_pooAddr) {
        uint256 _removedAmount = Vesting(_pooAddr).removeBeneficiary(_beneficiary);
        totalVestingAdded -= _removedAmount;
        __vestingPool[_pooAddr].totalVestingAdded -= _removedAmount;
        emit BeneficiaryRemoved(_pooAddr, _beneficiary, _removedAmount);
    }

    function addBeneficiaries(
        address _pooAddr,
        address[] memory _beneficiaries,
        uint256[] memory _totalAmountArr
    ) external onlyPoolAdmin onlyValidPool(_pooAddr) {
        require(_beneficiaries.length == _totalAmountArr.length, "Factory: args invalid");
        for (uint256 i = 0; i < _beneficiaries.length; ++i) {
            Vesting(_pooAddr).addBeneficiary(
                _beneficiaries[i],
                _totalAmountArr[i]
            );
            totalVestingAdded += _totalAmountArr[i];
            __vestingPool[_pooAddr].totalVestingAdded += _totalAmountArr[i];
            require(
                __vestingPool[_pooAddr].totalVestingAdded <=
                    __vestingPool[_pooAddr].totalPoolCap,
                "Factory: max pool cap"
            );
            emit BeneficiaryAdded(
                _pooAddr,
                _beneficiaries[i],
                _totalAmountArr[i]
            );
        }
    }

    function widthdraw(address _beneficiary, uint256 _amount) external {
        address _poolSender = msg.sender;
        require(
            _vestingPools.contains(_poolSender),
            "Factory: pool address invalid"
        );
        VestingPool storage pool = __vestingPool[_poolSender];
        uint256 _remainingPool = pool.totalPoolCap.sub(
            pool.totalReleasedAmount
        );
        require(_amount <= _remainingPool, "Factory: not enough");
        ITreasury(treasury).withdraw(_beneficiary, _amount, _poolSender);
        pool.totalReleasedAmount += _amount;
        totalReleasedAmount += _amount;
        emit Withdrawn(_beneficiary, _amount, _poolSender);
    }

    function pausePool(
        address _poolAddress
    ) external onlyMasterPoolAdmin onlyValidPool(_poolAddress) {
        Vesting(_poolAddress).pause();
        emit Paused(_poolAddress);
    }

    function unpausePool(
        address _poolAddress
    ) external onlyMasterPoolAdmin onlyValidPool(_poolAddress) {
        Vesting(_poolAddress).unpause();
        emit Unpaused(_poolAddress);
    }
}
