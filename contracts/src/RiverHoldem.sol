// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {euint256, e} from "@inco/lightning/src/Lib.sol";
import {ConfidentialDeck} from "./kit/ConfidentialDeck.sol";
import {CardLib} from "./CardLib.sol";
import {HoldemEval} from "./HoldemEval.sol";

/// @title RiverHoldem
/// @notice Heads-up No-Limit Hold'em with Inco Lightning encrypted hole cards.
/// Community cards are revealed publicly. Showdown settles with covalidator attestations.
contract RiverHoldem is ConfidentialDeck {
    using e for euint256;

    enum Stage {
        Waiting,
        Preflop,
        Flop,
        Turn,
        River,
        Showdown,
        Settled
    }

    struct Table {
        address player0;
        address player1;
        uint256 buyIn;
        uint256 stack0;
        uint256 stack1;
        uint256 pot;
        uint256 bet0;
        uint256 bet1;
        uint256 currentBet;
        uint8 button; // 0 or 1: dealer / SB
        address toAct;
        Stage stage;
        bool folded0;
        bool folded1;
        uint8 boardCount;
        bool handLive;
    }

    uint256 public nextTableId = 1;
    // ~20 BB stacks so heads-up can play preflop → flop → turn → river
    // Tiny buy-in keeps the house faucet able to drip + seat the bot on testnet
    uint256 public constant MIN_BUY_IN = 0.000015 ether;
    uint256 public constant SB = 0.000000375 ether;
    uint256 public constant BB = 0.00000075 ether;

    mapping(uint256 => Table) public tables;
    mapping(uint256 => euint256[2]) internal hole0;
    mapping(uint256 => euint256[2]) internal hole1;
    mapping(uint256 => euint256[5]) internal board;

    event TableCreated(uint256 indexed tableId, address indexed creator, uint256 buyIn);
    event TableJoined(uint256 indexed tableId, address indexed joiner);
    event HandStarted(uint256 indexed tableId);
    event Action(uint256 indexed tableId, address indexed player, string action, uint256 amount);
    event BoardDealt(uint256 indexed tableId, uint8 boardCount);
    event HandSettled(uint256 indexed tableId, address indexed winner, uint256 pot);

    error NotSeat();
    error BadStage();
    error NotYourTurn();
    error TableFull();
    error BadValue();

    receive() external payable {}

    function createTable() external payable returns (uint256 tableId) {
        require(msg.value >= MIN_BUY_IN, "buy-in");
        tableId = nextTableId++;
        Table storage t = tables[tableId];
        t.player0 = msg.sender;
        t.buyIn = msg.value;
        t.stack0 = msg.value;
        t.stage = Stage.Waiting;
        emit TableCreated(tableId, msg.sender, msg.value);
    }

    function joinTable(uint256 tableId) external payable {
        Table storage t = tables[tableId];
        require(t.player0 != address(0) && t.player1 == address(0), "unavailable");
        require(msg.sender != t.player0, "self");
        require(msg.value == t.buyIn, "buy-in match");
        t.player1 = msg.sender;
        t.stack1 = msg.value;
        emit TableJoined(tableId, msg.sender);
        _startHand(tableId);
    }

    function startNextHand(uint256 tableId) external payable {
        Table storage t = tables[tableId];
        require(msg.sender == t.player0 || msg.sender == t.player1, "seat");
        require(t.stage == Stage.Settled || (t.stage == Stage.Waiting && t.player1 != address(0)), "busy");
        require(t.stack0 >= BB && t.stack1 >= BB, "stacks");
        // Caller may top up shuffle fee
        _startHand(tableId);
    }

    function _startHand(uint256 tableId) internal {
        Table storage t = tables[tableId];
        uint256 fee = deckFee(52);
        require(address(this).balance >= fee, "fund shuffle fee");

        t.pot = 0;
        t.bet0 = 0;
        t.bet1 = 0;
        t.currentBet = 0;
        t.folded0 = false;
        t.folded1 = false;
        t.boardCount = 0;
        t.handLive = true;
        t.button = uint8((t.button + 1) % 2);
        t.stage = Stage.Preflop;

        _newShuffledDeck(52);
        hole0[tableId][0] = _dealTo(t.player0);
        hole0[tableId][1] = _dealTo(t.player0);
        hole1[tableId][0] = _dealTo(t.player1);
        hole1[tableId][1] = _dealTo(t.player1);

        // Post blinds: button is SB in heads-up
        if (t.button == 0) {
            _post(tableId, 0, SB);
            _post(tableId, 1, BB);
            t.toAct = t.player0;
        } else {
            _post(tableId, 1, SB);
            _post(tableId, 0, BB);
            t.toAct = t.player1;
        }
        t.currentBet = BB;
        emit HandStarted(tableId);
    }

    function _post(uint256 tableId, uint8 seat, uint256 amount) internal {
        Table storage t = tables[tableId];
        uint256 stack = seat == 0 ? t.stack0 : t.stack1;
        uint256 pay = amount > stack ? stack : amount;
        if (seat == 0) {
            t.stack0 -= pay;
            t.bet0 += pay;
        } else {
            t.stack1 -= pay;
            t.bet1 += pay;
        }
        t.pot += pay;
    }

    function fold(uint256 tableId) external {
        Table storage t = tables[tableId];
        _requireTurn(t);
        if (msg.sender == t.player0) t.folded0 = true;
        else t.folded1 = true;
        emit Action(tableId, msg.sender, "fold", 0);
        address winner = t.folded0 ? t.player1 : t.player0;
        _payWinner(tableId, winner);
    }

    function checkCall(uint256 tableId) external {
        Table storage t = tables[tableId];
        _requireTurn(t);
        uint8 seat = msg.sender == t.player0 ? 0 : 1;
        uint256 myBet = seat == 0 ? t.bet0 : t.bet1;
        uint256 toCall = t.currentBet - myBet;
        if (toCall > 0) {
            _post(tableId, seat, toCall);
            emit Action(tableId, msg.sender, "call", toCall);
        } else {
            emit Action(tableId, msg.sender, "check", 0);
        }
        _afterAction(tableId);
    }

    function raiseTo(uint256 tableId, uint256 totalBet) external {
        Table storage t = tables[tableId];
        _requireTurn(t);
        require(totalBet > t.currentBet, "raise");
        uint8 seat = msg.sender == t.player0 ? 0 : 1;
        uint256 myBet = seat == 0 ? t.bet0 : t.bet1;
        uint256 add = totalBet - myBet;
        _post(tableId, seat, add);
        // if short all-in, currentBet may be less than totalBet requested
        uint256 newBet = seat == 0 ? t.bet0 : t.bet1;
        if (newBet > t.currentBet) t.currentBet = newBet;
        emit Action(tableId, msg.sender, "raise", newBet);
        _afterAction(tableId);
    }

    function _requireTurn(Table storage t) internal view {
        require(t.handLive && t.stage >= Stage.Preflop && t.stage <= Stage.River, "stage");
        require(msg.sender == t.toAct, "turn");
        if (msg.sender == t.player0) require(!t.folded0, "folded");
        else require(msg.sender == t.player1 && !t.folded1, "folded");
    }

    function _afterAction(uint256 tableId) internal {
        Table storage t = tables[tableId];
        // If bets matched and both acted this street (simplified: toAct switches; when both bets equal after opponent acted, advance)
        address other = msg.sender == t.player0 ? t.player1 : t.player0;
        bool betsMatched = t.bet0 == t.bet1;
        // Heads-up: after caller matches, or check-check, advance when bets matched and action returns to original aggressor/blind logic
        // Simple rule: switch turn; if bets matched and the next player already matched this street (bet equal after both moved), advance.
        // Track with: if bets matched AND the player who just acted was responding to a bet or both checked (currentBet == max of bets which are equal).
        if (betsMatched) {
            // Closing action: if currentBet > 0 and we just matched, or check-check when both bets 0 after first check from BB etc.
            // Use: when both bets equal, street completes when the non-aggressor has acted. For HU post-blind, SB acts first; when BB calls/checks and bets equal, advance.
            bool closing = (msg.sender != _streetOpener(t));
            if (closing || t.currentBet == 0) {
                // For preflop currentBet is BB so first check from SB doesn't close. closing when BB acts after SB.
                if (closing) {
                    _advanceStreet(tableId);
                    return;
                }
            }
        }
        t.toAct = other;
    }

    function _streetOpener(Table storage t) internal view returns (address) {
        // Preflop: SB (button) opens. Postflop: BB (non-button) opens.
        if (t.stage == Stage.Preflop) {
            return t.button == 0 ? t.player0 : t.player1;
        }
        return t.button == 0 ? t.player1 : t.player0;
    }

    function _advanceStreet(uint256 tableId) internal {
        Table storage t = tables[tableId];
        t.bet0 = 0;
        t.bet1 = 0;
        t.currentBet = 0;

        if (t.stage == Stage.Preflop) {
            board[tableId][0] = _dealFaceUp();
            board[tableId][1] = _dealFaceUp();
            board[tableId][2] = _dealFaceUp();
            t.boardCount = 3;
            t.stage = Stage.Flop;
            emit BoardDealt(tableId, 3);
        } else if (t.stage == Stage.Flop) {
            board[tableId][3] = _dealFaceUp();
            t.boardCount = 4;
            t.stage = Stage.Turn;
            emit BoardDealt(tableId, 4);
        } else if (t.stage == Stage.Turn) {
            board[tableId][4] = _dealFaceUp();
            t.boardCount = 5;
            t.stage = Stage.River;
            emit BoardDealt(tableId, 5);
        } else if (t.stage == Stage.River) {
            // Reveal hole cards so either player can gather attestations and settle.
            _revealCard(hole0[tableId][0]);
            _revealCard(hole0[tableId][1]);
            _revealCard(hole1[tableId][0]);
            _revealCard(hole1[tableId][1]);
            t.stage = Stage.Showdown;
            t.toAct = address(0);
            return;
        }

        t.toAct = _streetOpener(t);
    }

    /// @notice Submit one attested card for showdown. slots 0-1 = P0 holes, 2-3 = P1 holes, 4-8 = board.
    mapping(uint256 => uint8[9]) internal showdownCards;
    /// @dev 9 slots need 9 bits — uint8 overflowed bit 8 and made finalize always revert "incomplete".
    mapping(uint256 => uint16) internal showdownFilled; // bitfield

    function getShowdownFilled(uint256 tableId) external view returns (uint16) {
        return showdownFilled[tableId];
    }

    function submitShowdownCard(uint256 tableId, uint8 slot, uint256 value, bytes[] calldata sigs) external {
        Table storage t = tables[tableId];
        require(t.stage == Stage.Showdown, "not showdown");
        require(msg.sender == t.player0 || msg.sender == t.player1, "seat");
        require(slot < 9, "slot");

        uint16 bit = uint16(1) << slot;
        // Idempotent: already submitted this slot
        if (showdownFilled[tableId] & bit != 0) {
            return;
        }

        euint256 handle;
        if (slot == 0) handle = hole0[tableId][0];
        else if (slot == 1) handle = hole0[tableId][1];
        else if (slot == 2) handle = hole1[tableId][0];
        else if (slot == 3) handle = hole1[tableId][1];
        else handle = board[tableId][slot - 4];

        uint256 verified = _verifyValue(handle, value, _copySigs(sigs));
        showdownCards[tableId][slot] = CardLib.toId(verified);
        showdownFilled[tableId] |= bit;
    }

    function finalizeShowdown(uint256 tableId) external {
        Table storage t = tables[tableId];
        require(t.stage == Stage.Showdown, "not showdown");
        require(msg.sender == t.player0 || msg.sender == t.player1, "seat");
        require(showdownFilled[tableId] == 0x1FF, "incomplete");

        uint8[] memory hand0 = new uint8[](7);
        uint8[] memory hand1 = new uint8[](7);
        hand0[0] = showdownCards[tableId][0];
        hand0[1] = showdownCards[tableId][1];
        hand1[0] = showdownCards[tableId][2];
        hand1[1] = showdownCards[tableId][3];
        for (uint8 i = 0; i < 5; i++) {
            hand0[2 + i] = showdownCards[tableId][4 + i];
            hand1[2 + i] = showdownCards[tableId][4 + i];
        }

        HoldemEval.Hand memory h0 = HoldemEval.bestOf(hand0);
        HoldemEval.Hand memory h1 = HoldemEval.bestOf(hand1);

        showdownFilled[tableId] = 0;

        if (h0.score == h1.score) {
            uint256 half = t.pot / 2;
            t.stack0 += half;
            t.stack1 += t.pot - half;
            t.pot = 0;
            t.stage = Stage.Settled;
            t.handLive = false;
            emit HandSettled(tableId, address(0), half);
            return;
        }

        address winner = h0.score > h1.score ? t.player0 : t.player1;
        _payWinner(tableId, winner);
    }

    function _copySigs(bytes[] calldata src) internal pure returns (bytes[] memory out) {
        out = new bytes[](src.length);
        for (uint256 i = 0; i < src.length; i++) out[i] = src[i];
    }

    function _payWinner(uint256 tableId, address winner) internal {
        Table storage t = tables[tableId];
        uint256 amount = t.pot;
        t.pot = 0;
        if (winner == t.player0) t.stack0 += amount;
        else t.stack1 += amount;
        t.stage = Stage.Settled;
        t.handLive = false;
        t.toAct = address(0);
        emit HandSettled(tableId, winner, amount);
    }

    function cashOut(uint256 tableId) external {
        Table storage t = tables[tableId];
        require(!t.handLive, "hand live");
        require(t.stage == Stage.Settled || t.stage == Stage.Waiting, "stage");
        uint256 amt;
        if (msg.sender == t.player0) {
            amt = t.stack0;
            t.stack0 = 0;
            t.player0 = address(0);
        } else if (msg.sender == t.player1) {
            amt = t.stack1;
            t.stack1 = 0;
            t.player1 = address(0);
        } else {
            revert NotSeat();
        }
        (bool ok,) = msg.sender.call{value: amt}("");
        require(ok, "transfer");
    }

    function getHoleHandles(uint256 tableId) external view returns (bytes32, bytes32) {
        Table storage t = tables[tableId];
        if (msg.sender == t.player0) {
            return (euint256.unwrap(hole0[tableId][0]), euint256.unwrap(hole0[tableId][1]));
        }
        if (msg.sender == t.player1) {
            return (euint256.unwrap(hole1[tableId][0]), euint256.unwrap(hole1[tableId][1]));
        }
        revert NotSeat();
    }

    function getBoardHandles(uint256 tableId) external view returns (bytes32[5] memory out, uint8 count) {
        Table storage t = tables[tableId];
        count = t.boardCount;
        for (uint8 i = 0; i < 5; i++) {
            out[i] = euint256.unwrap(board[tableId][i]);
        }
    }

    function fundFees() external payable {}
}
