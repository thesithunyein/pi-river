// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console2} from "forge-std/Script.sol";
import {RiverHoldem} from "../src/RiverHoldem.sol";

contract DeployRiverHoldem is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(pk);
        RiverHoldem game = new RiverHoldem();
        // Prefund shuffle fees for first hands
        game.fundFees{value: 0.05 ether}();
        console2.log("RiverHoldem", address(game));
        vm.stopBroadcast();
    }
}
