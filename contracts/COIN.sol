// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Exactly one transferable COIN, minted once to the confirmed treasury.
contract COIN is ERC20 {
    constructor(address treasury) ERC20("COIN", "COIN") {
        require(treasury != address(0), "Treasury required");
        _mint(treasury, 1 ether);
    }
}
