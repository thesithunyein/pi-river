// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @notice Maps Inco deck values 1..52 to rank (2..14) and suit (0..3).
library CardLib {
    function toId(uint256 value) internal pure returns (uint8) {
        require(value >= 1 && value <= 52, "bad card");
        return uint8(value);
    }

    /// @return rank 2..14 (Ace high)
    function rank(uint8 id) internal pure returns (uint8) {
        return uint8(((id - 1) % 13) + 2);
    }

    /// @return suit 0=spades 1=hearts 2=diamonds 3=clubs
    function suit(uint8 id) internal pure returns (uint8) {
        return uint8((id - 1) / 13);
    }
}
