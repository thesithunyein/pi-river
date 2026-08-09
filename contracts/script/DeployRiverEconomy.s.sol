// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console2} from "forge-std/Script.sol";
import {RiverChips} from "../src/RiverChips.sol";
import {RiverClub} from "../src/RiverClub.sol";

contract DeployRiverEconomy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);
        RiverChips chips = new RiverChips(deployer);
        RiverClub club = new RiverClub(deployer);
        vm.stopBroadcast();

        console2.log("Deployer", deployer);
        console2.log("RiverChips", address(chips));
        console2.log("RiverClub", address(club));
    }
}
