pragma solidity ^0.7.6;

import "./utils/SafeMath.sol";
import "./utils/Ownable.sol";

// NOTE: This is just a test contract, please delete me

contract EthPool is Ownable {
  using SafeMath for uint256;

  address public team;
  address[] public users;

  uint256 public totalDeposit;
  mapping (address => uint256) public deposits;
  mapping (address => uint256) public rewards;

  event DepositETH(address indexed user, uint256 amount);
  event DepositReward(address indexed team, uint256 amount);
  event Withdraw(address indexed team, uint256 amount);
  
  constructor (address _team) {
    team = _team;
  }

  function setTeam(address _team) external onlyOwner {
    team = _team;
  }

  function _checkUserExisted(address _user) internal view returns (bool) {
    for (uint i; i < users.length; i++) {
      if (users[i] == _user) {
        return true;
      }
    }
    return false;
  }

  function depositETH() external payable {
    require(msg.sender != team, 'EthPool: INSUFFICIENT PERMISSION');
    if (!_checkUserExisted(msg.sender)) {
      users.push(msg.sender);
    }

    deposits[msg.sender] = deposits[msg.sender].add(msg.value);
    totalDeposit = totalDeposit.add(msg.value);

    emit DepositETH(msg.sender, msg.value);
  }

  function depositReward() external payable {
    require(msg.sender == team, 'EthPool: INSUFFICIENT PERMISSION');

    for (uint i; i < users.length; i++) {
      uint256 reward = msg.value.mul(deposits[users[i]]).div(totalDeposit);
      rewards[users[i]] = rewards[users[i]].add(reward);
    }

    emit DepositETH(team, msg.value);
  }

  function availableAmount(address _user) public view returns (uint256) {
    return deposits[_user] + rewards[_user];
  }

  function _removeUser(address _user) internal {
    uint index;
    for (uint i; i < users.length; i++) {
      if (users[i] == _user) {
        index = i;
        break;
      }
    }

    if (index != users.length - 1) {
      users[index] = users[users.length-1];
    }
    users.pop();

    deposits[_user] = 0;
    rewards[_user] = 0;
  }

  function withdraw() external {
    require(msg.sender != team, 'EthPool: INSUFFICIENT PERMISSION');
    uint256 amount = availableAmount(msg.sender);
    
    require(amount > 0, 'EthPool: NO BALANCE');
    (bool success, ) = msg.sender.call{ value: amount}("");
    require(success, 'Address: unable to send value, recipient may have reverted');

    _removeUser(msg.sender);

    emit Withdraw(msg.sender, amount);
  }

  function numberOfDepositors() external view returns (uint256) {
    return users.length;
  }
}
