// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title RiverChips — on-chain fun chips for pi River (Base Sepolia)
/// @dev Whole-token units (0 decimals). House operators mint/burn to mirror the app ledger.
contract RiverChips {
    string public constant name = "River Chips";
    string public constant symbol = "rCHIP";
    uint8 public constant decimals = 0;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    address public admin;
    mapping(address => bool) public operators;

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event OperatorUpdated(address indexed account, bool enabled);

    error NotAdmin();
    error NotOperator();
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    modifier onlyOperator() {
        if (!operators[msg.sender] && msg.sender != admin) revert NotOperator();
        _;
    }

    constructor(address admin_) {
        admin = admin_;
        operators[admin_] = true;
        emit OperatorUpdated(admin_, true);
    }

    function setOperator(address account, bool enabled) external onlyAdmin {
        operators[account] = enabled;
        emit OperatorUpdated(account, enabled);
    }

    function transferAdmin(address next) external onlyAdmin {
        admin = next;
    }

    function mint(address to, uint256 amount) external onlyOperator {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    /// @notice House burn (legacy sync). Prefer burnSelf for player spends.
    function burn(address from, uint256 amount) external onlyOperator {
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }

    /// @notice Player burns their own rCHIP (shop / ledger down) — no house key.
    function burnSelf(uint256 amount) external {
        uint256 bal = balanceOf[msg.sender];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[msg.sender] = bal - amount;
            totalSupply -= amount;
        }
        emit Transfer(msg.sender, address(0), amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < amount) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = allowed - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        uint256 bal = balanceOf[from];
        if (bal < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
