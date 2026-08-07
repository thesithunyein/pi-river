// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {CardLib} from "./CardLib.sol";

/// @notice Pure 5-to-7 card Texas Hold'em evaluator. Higher score wins.
library HoldemEval {
    struct Hand {
        uint256 score;
        uint8 category; // 0 high .. 8 royal/straight flush band
    }

    function bestOf(uint8[] memory cards) internal pure returns (Hand memory best) {
        require(cards.length >= 5 && cards.length <= 7, "card count");
        uint8 n = uint8(cards.length);
        uint8[5] memory pick;
        best.score = 0;

        if (n == 5) {
            return evaluate5(cards[0], cards[1], cards[2], cards[3], cards[4]);
        }

        // Choose every combination of 5
        for (uint8 a = 0; a < n - 4; a++) {
            for (uint8 b = a + 1; b < n - 3; b++) {
                for (uint8 c = b + 1; c < n - 2; c++) {
                    for (uint8 d = c + 1; d < n - 1; d++) {
                        for (uint8 e = d + 1; e < n; e++) {
                            pick[0] = cards[a];
                            pick[1] = cards[b];
                            pick[2] = cards[c];
                            pick[3] = cards[d];
                            pick[4] = cards[e];
                            Hand memory h = evaluate5(pick[0], pick[1], pick[2], pick[3], pick[4]);
                            if (h.score > best.score) best = h;
                        }
                    }
                }
            }
        }
    }

    function evaluate5(uint8 c0, uint8 c1, uint8 c2, uint8 c3, uint8 c4) internal pure returns (Hand memory) {
        uint8[5] memory ranks;
        uint8[5] memory suits;
        ranks[0] = CardLib.rank(c0);
        ranks[1] = CardLib.rank(c1);
        ranks[2] = CardLib.rank(c2);
        ranks[3] = CardLib.rank(c3);
        ranks[4] = CardLib.rank(c4);
        suits[0] = CardLib.suit(c0);
        suits[1] = CardLib.suit(c1);
        suits[2] = CardLib.suit(c2);
        suits[3] = CardLib.suit(c3);
        suits[4] = CardLib.suit(c4);

        // sort ranks desc (simple insertion)
        for (uint8 i = 1; i < 5; i++) {
            uint8 keyR = ranks[i];
            uint8 keyS = suits[i];
            uint8 j = i;
            while (j > 0 && ranks[j - 1] < keyR) {
                ranks[j] = ranks[j - 1];
                suits[j] = suits[j - 1];
                j--;
            }
            ranks[j] = keyR;
            suits[j] = keyS;
        }

        bool flush = suits[0] == suits[1] && suits[1] == suits[2] && suits[2] == suits[3] && suits[3] == suits[4];

        bool straight = false;
        uint8 straightHigh = 0;
        if (
            ranks[0] == ranks[1] + 1 && ranks[1] == ranks[2] + 1 && ranks[2] == ranks[3] + 1
                && ranks[3] == ranks[4] + 1
        ) {
            straight = true;
            straightHigh = ranks[0];
        } else if (ranks[0] == 14 && ranks[1] == 5 && ranks[2] == 4 && ranks[3] == 3 && ranks[4] == 2) {
            straight = true;
            straightHigh = 5;
        }

        // frequency
        uint8[15] memory count;
        for (uint8 i = 0; i < 5; i++) count[ranks[i]]++;

        uint8 trips;
        uint8 pairA;
        uint8 pairB;
        uint8 quads;
        for (uint8 r = 14; r >= 2; r--) {
            if (count[r] == 4) quads = r;
            else if (count[r] == 3) trips = r;
            else if (count[r] == 2) {
                if (pairA == 0) pairA = r;
                else pairB = r;
            }
            if (r == 2) break;
        }

        if (flush && straight) {
            return Hand({score: 8000000 + straightHigh, category: 8});
        }
        if (quads != 0) {
            uint8 kicker = ranks[0] == quads ? ranks[4] : ranks[0];
            return Hand({score: 7000000 + uint256(quads) * 100 + kicker, category: 7});
        }
        if (trips != 0 && pairA != 0) {
            return Hand({score: 6000000 + uint256(trips) * 100 + pairA, category: 6});
        }
        if (flush) {
            return Hand({
                score: 5000000 + uint256(ranks[0]) * 10000 + uint256(ranks[1]) * 1000 + uint256(ranks[2]) * 100
                    + uint256(ranks[3]) * 10 + ranks[4],
                category: 5
            });
        }
        if (straight) {
            return Hand({score: 4000000 + straightHigh, category: 4});
        }
        if (trips != 0) {
            uint8 k1;
            uint8 k2;
            for (uint8 i = 0; i < 5; i++) {
                if (ranks[i] != trips) {
                    if (k1 == 0) k1 = ranks[i];
                    else k2 = ranks[i];
                }
            }
            return Hand({score: 3000000 + uint256(trips) * 1000 + uint256(k1) * 10 + k2, category: 3});
        }
        if (pairA != 0 && pairB != 0) {
            uint8 high = pairA > pairB ? pairA : pairB;
            uint8 low = pairA > pairB ? pairB : pairA;
            uint8 kicker;
            for (uint8 i = 0; i < 5; i++) {
                if (ranks[i] != pairA && ranks[i] != pairB) {
                    kicker = ranks[i];
                    break;
                }
            }
            return Hand({score: 2000000 + uint256(high) * 1000 + uint256(low) * 10 + kicker, category: 2});
        }
        if (pairA != 0) {
            uint8 k1;
            uint8 k2;
            uint8 k3;
            uint8 filled;
            for (uint8 i = 0; i < 5; i++) {
                if (ranks[i] == pairA) continue;
                if (filled == 0) k1 = ranks[i];
                else if (filled == 1) k2 = ranks[i];
                else k3 = ranks[i];
                filled++;
            }
            return Hand({score: 1000000 + uint256(pairA) * 10000 + uint256(k1) * 100 + uint256(k2) * 10 + k3, category: 1});
        }
        return Hand({
            score: uint256(ranks[0]) * 10000 + uint256(ranks[1]) * 1000 + uint256(ranks[2]) * 100
                + uint256(ranks[3]) * 10 + ranks[4],
            category: 0
        });
    }
}
