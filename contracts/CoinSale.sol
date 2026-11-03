// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Fixed-price, inventory-backed sale; payment and delivery are atomic.
contract CoinSale is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    IERC20 public immutable COIN_TOKEN;
    IERC20 public immutable PAYMENT_TOKEN;
    address public immutable TREASURY;
    uint256 public constant PRICE_PER_COIN_RAW = 1_000_000 * 1e6;
    uint256 public soldRaw;
    uint256 public receivedUsdtRaw;

    event Purchased(address indexed buyer, address indexed paymentToken, uint256 usdtRaw, uint256 coinRaw);
    event UnsoldWithdrawn(uint256 coinRaw);

    constructor(address coinToken, address paymentToken, address treasury, address admin) Ownable(admin) {
        require(coinToken != address(0) && paymentToken != address(0) && treasury != address(0) && admin != address(0), "Address required");
        require(coinToken != paymentToken && treasury != address(this), "Invalid address");
        require(IERC20Metadata(coinToken).decimals() == 18, "COIN decimals mismatch");
        require(IERC20Metadata(paymentToken).decimals() == 6, "USDT decimals mismatch");
        require(IERC20(coinToken).totalSupply() == 1 ether, "COIN supply mismatch");
        COIN_TOKEN = IERC20(coinToken);
        PAYMENT_TOKEN = IERC20(paymentToken);
        TREASURY = treasury;
        _pause(); // Explicit inventory funding and operator unpause are required.
    }

    function quote(uint256 usdtAmountRaw) public pure returns (uint256) {
        return usdtAmountRaw * 1e6;
    }

    function buy(uint256 usdtAmountRaw, uint256 minCoinOutRaw, uint256 deadline) external nonReentrant whenNotPaused {
        require(msg.sender != TREASURY, "Treasury cannot buy");
        require(usdtAmountRaw > 0 && block.timestamp <= deadline, "Invalid amount or deadline");
        uint256 coinRaw = quote(usdtAmountRaw);
        require(coinRaw >= minCoinOutRaw && minCoinOutRaw > 0, "Minimum not met");
        require(COIN_TOKEN.balanceOf(address(this)) >= coinRaw, "Insufficient COIN inventory");
        uint256 beforeBalance = PAYMENT_TOKEN.balanceOf(TREASURY);
        PAYMENT_TOKEN.safeTransferFrom(msg.sender, TREASURY, usdtAmountRaw);
        require(PAYMENT_TOKEN.balanceOf(TREASURY) - beforeBalance == usdtAmountRaw, "Incomplete USDT payment");
        COIN_TOKEN.safeTransfer(msg.sender, coinRaw);
        soldRaw += coinRaw;
        receivedUsdtRaw += usdtAmountRaw;
        emit Purchased(msg.sender, address(PAYMENT_TOKEN), usdtAmountRaw, coinRaw);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner {
        require(COIN_TOKEN.balanceOf(address(this)) > 0, "No inventory");
        _unpause();
    }
    function withdrawUnsold() external onlyOwner whenPaused nonReentrant {
        uint256 balance = COIN_TOKEN.balanceOf(address(this));
        require(balance > 0, "No inventory");
        COIN_TOKEN.safeTransfer(TREASURY, balance);
        emit UnsoldWithdrawn(balance);
    }
}
