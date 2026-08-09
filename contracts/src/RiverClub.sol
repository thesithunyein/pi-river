// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title RiverClub — on-chain club ladder (no SQL required)
contract RiverClub {
    struct Entry {
        address wallet;
        string name;
        uint32 wins;
        uint32 tickets;
        uint64 score;
        uint64 updatedAt;
    }

    address public admin;
    mapping(address => bool) public operators;

    Entry[] public entries;
    mapping(address => uint256) public indexPlusOne; // 0 = missing

    event OperatorUpdated(address indexed account, bool enabled);
    event ScoreUpserted(address indexed wallet, string name, uint32 wins, uint32 tickets, uint64 score);

    error NotAdmin();
    error NotOperator();
    error BadWallet();

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

    function length() external view returns (uint256) {
        return entries.length;
    }

    function upsert(
        address wallet,
        string calldata name,
        uint32 wins,
        uint32 tickets,
        uint64 score
    ) external onlyOperator {
        if (wallet == address(0)) revert BadWallet();
        uint256 idx1 = indexPlusOne[wallet];
        if (idx1 == 0) {
            entries.push(
                Entry({
                    wallet: wallet,
                    name: name,
                    wins: wins,
                    tickets: tickets,
                    score: score,
                    updatedAt: uint64(block.timestamp)
                })
            );
            indexPlusOne[wallet] = entries.length;
        } else {
            Entry storage e = entries[idx1 - 1];
            e.name = name;
            e.wins = wins;
            e.tickets = tickets;
            e.score = score;
            e.updatedAt = uint64(block.timestamp);
        }
        emit ScoreUpserted(wallet, name, wins, tickets, score);
    }

    function getEntry(uint256 index) external view returns (Entry memory) {
        return entries[index];
    }
}
