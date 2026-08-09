// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import {Script, console2} from "forge-std/Script.sol";
import {RiverHoldem} from "../src/RiverHoldem.sol";

contract DeployRiverHoldem is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        uint256 bal = deployer.balance;
        console2.log("Deployer balance", bal);

        vm.startBroadcast(pk);
        RiverHoldem game = new RiverHoldem();

        // Prefund Inco shuffle reserve (~0.000104 ETH/hand).
        uint256 fund = 0.01 ether;
        if (bal < fund + 0.005 ether) {
            fund = bal > 0.008 ether ? 0.005 ether : 0;
        }
        if (fund > 0) {
            game.fundFees{value: fund}();
        }

        console2.log("RiverHoldem", address(game));
        console2.log("Funded fees", fund);
        vm.stopBroadcast();
    }
}
