# COIN fixed-price sale: deployment handoff

Status on 2026-11-03: **not deployed; no purchase is enabled**. The site quotes the owner's fixed price but says purchases are unavailable. No treasury, sale admin, allocation, signer or gas budget is configured in this project or the production environment. Do not create a second COIN if a canonical one is later identified.

## Verified network facts

Avalanche C-Chain chain ID 43114, RPC `https://api.avax.network/ext/bc/C/rpc`. Tether's Avalanche USDT is `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7`. The RPC returned bytecode and `decimals() = 6` on 2026-11-03. The sale assumes this exact asset. Recheck at deployment.

## Contracts and price

`contracts/COIN.sol` mints exactly 1 COIN (18 decimals) to the confirmed treasury in its constructor. It has no further mint, burn, proxy or transfer restrictions. `contracts/CoinSale.sol` is a separate inventory-backed atomic sale. It starts paused. It accepts 6-decimal USDT and pays 18-decimal COIN at 1,000,000 USDT per COIN. It transfers USDT directly to treasury and COIN to `msg.sender` within one transaction. The admin may pause, unpause after funding, and withdraw unsold COIN to treasury only while paused. The admin cannot change price or transfer a buyer's allowance.

The 1 COIN supply is a hard ceiling, not a promise that all of it will be available for sale. Available inventory is the sale contract's on-chain COIN balance. Sold volume is the on-chain `soldRaw` counter, not supply minus inventory.

## Required owner inputs and transactions

1. Confirm whether a canonical COIN already exists, including network and contract address. If it does, verify code, decimals, supply and issuer before using these constructors.
2. Provide confirmed Avalanche treasury and sale admin addresses, sale allocation (0 < allocation <= 1 COIN), approved signing wallet and an AVAX gas budget. Never submit a private key or seed phrase in chat.
3. Compile with `node scripts/coin/compile.cjs`; use the recorded artifacts for wallet or multisig deployment. Deploy COIN with constructor argument `TREASURY_ADDRESS` only if no canonical token exists. Verify source in the explorer.
4. Deploy CoinSale with constructor arguments `[COIN_TOKEN_ADDRESS, 0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7, TREASURY_ADDRESS, SALE_ADMIN_ADDRESS]`. Verify source and check immutable addresses, `PRICE_PER_COIN_RAW`, decimals and paused state.
5. From treasury, transfer the approved allocation of COIN to CoinSale. Check the receipt and sale balance. From sale admin, call `unpause()` only after these checks. Record deployment block and addresses.
6. Configure site checkout against those exact addresses, verify real-wallet approve/buy receipts and Purchased event on mainnet with an explicitly approved test budget, then switch public status to FIXED-PRICE SALE.

No deployment transaction can be prepared with concrete `to` and constructor data until the owner supplies the addresses and confirms whether a canonical COIN already exists. The gas estimate also depends on the selected signer and live network state.

Source references: https://tether.to/en/supported-protocols/ ; https://build.avax.network/docs/primary-network ; https://docs.openzeppelin.com/contracts/5.x/api/token/erc20
