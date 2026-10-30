const sources = [
  ["Binance: Security Incident Update (30 Oct, 02:23 UTC)", "https://www.binance.com/en/support/announcement/detail/c5a8729a97ac486d963784d96c5642d7", "Primary statement"],
  ["Binance on X: incident response and loss coverage", "https://x.com/binance/status/2115960292115124558", "Primary statement"],
  ["Yi He on X: user funds and temporary suspension", "https://x.com/heyibinance/status/2115958049244631357", "Primary statement"],
  ["Changpeng Zhao on X: initial assessment", "https://x.com/cz_binance/status/2115915423174853077", "First-hand statement"],
  ["Circle CEO Jeremy Allaire on X: USDC freeze", "https://x.com/jerallaire/status/2115916207463481846", "Issuer statement"],
  ["Binance TH: separate custody and precautionary pause", "https://www.binance.th/en/announcement/crypto-deposit-%7C-withdrawal/d596e0d30341443aa477056a126e712a", "Primary statement"],
  ["Blockaid: transaction-level incident reconstruction", "https://blockaid.io/blog/binance-55b-hack-using-advanced-ai-models-blockaid-detects-the-biggest-theft-in-crypto-history", "Security research; vendor source"],
  ["Ethereum EIP-7702 specification", "https://eips.ethereum.org/EIPS/eip-7702", "Protocol specification"],
  ["Etherscan: Binance 14", "https://etherscan.io/address/0x28C6c06298d514Db089934071355E5743bf21d60", "On-chain record"],
  ["Etherscan: authorization transaction", "https://etherscan.io/tx/0xad99264d5532ae0dd04b2004eebda05f25657e70dacb764f7ac8d4ccd051298b", "On-chain record"],
  ["Etherscan: first sweep transaction", "https://etherscan.io/tx/0x53bd38b816c23e74134786c29a8c18d792777998a3b9326047b583100e88e2f3", "On-chain record"],
  ["Etherscan: 780M USDC transfer", "https://etherscan.io/tx/0xdc102dd89dded5a83f1008906883ffb7c81ff3b7d7965d8c7277d170b5e17481", "On-chain record"],
  ["Etherscan: collection address", "https://etherscan.io/address/0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c", "On-chain record"],
  ["Aave Risk: response to the hot-wallet incident", "https://governance.aave.com/t/binance-hot-wallet-exploit-aaves-response/25954", "First-hand protocol response"],
  ["Reuters: $2.54B frozen in the first public count", "https://www.reuters.com/legal/transactional/tether-circle-freeze-238-billion-after-binance-reports-security-incident-2026-10-29/", "Wire report"],
  ["Associated Press: Binance investigates the incident", "https://apnews.com/article/39cda8ceb8095e036334a18549d3d20d", "Wire report"],
  ["CoinDesk: reserve data and Binance 14", "https://www.coindesk.com/business/2026/10/30/binance-hack-drained-wallets-backing-customer-assets-reserve-data-shows", "Independent reserve-data analysis"],
  ["The Washington Post: industry response and freezes", "https://www.washingtonpost.com/technology/2026/10/29/suspected-binance-hack-sets-off-scramble-lock-down-billions-crypto/", "News report"],
  ["TechCrunch: initial incident and withdrawal pause", "https://techcrunch.com/2026/10/29/binance-pauses-withdrawals-as-hackers-suspected-of-stealing-billions-in-crypto/", "News report"],
  ["Axios: first-day timeline and exchange response", "https://www.axios.com/2026/10/29/binance-cyberattack-crypto-heist", "News report"],
  ["Decrypt: movement through DeFi venues", "https://decrypt.co/382194/binance-hack-exit-ramps-defi-exchange-ethereum", "On-chain reporting"],
  ["BleepingComputer: cross-chain loss estimates", "https://www.bleepingcomputer.com/news/security/binance-probes-potential-58-billion-crypto-theft-hack/", "Security news"],
  ["Sky News: reported scale and market reaction", "https://news.sky.com/story/crypto-worth-billions-frozen-over-potential-security-issue-13605627", "News report"],
  ["DRK: annotated transaction timeline and evidence ledger", "https://drk.vc/news/binance-14-eip-7702-drain", "Independent on-chain reconstruction"],
  ["LlamaRisk: Aave freeze mechanics", "https://governance.aave.com/t/binance-hot-wallet-exploit-aaves-response/25954", "Protocol risk analysis"],
  ["Binance on X: verified frozen-asset total", "https://x.com/binance/status/2115970069696217576", "Primary update"],
  ["Binance Square: verified cumulative frozen total", "https://www.binance.com/en/square/post/10-30-2026-binance-suspends-deposits-and-withdrawals-during-security-investigation-382683663031259", "Primary update"],
  ["Arbitrum on X: Security Council action", "https://x.com/arbitrum/status/2115961730920841644", "Primary update"],
  ["ZachXBT on X: Arbitrum transaction", "https://x.com/zachxbt/status/2115960582230913357", "On-chain investigator"],
  ["Odysseas on X: EIP-7702 transaction sequence", "https://x.com/odysseas_eth/status/2115910280140276155", "Independent analysis"],
  ["Arbiscan: Arbitrum Security Council transaction", "https://arbiscan.io/tx/0xb69c81774f507d46ce776aeaed8b4d31df96dd66ce6fd05073481011835355d6", "On-chain record"],
  ["Binance: October 2026 Proof of Reserves", "https://www.binance.com/en/proof-of-reserves", "Exchange reserve records"],
];

function SourceLink({ source }: { source: (typeof sources)[number] }) {
  return (
    <li>
      <a href={source[1]} target="_blank" rel="noreferrer">
        {source[0]}
      </a>
      <span>{source[2]}</span>
    </li>
  );
}

export default function BinanceBreakdown() {
  return (
    <article className="incident-report" aria-labelledby="incident-title">
      <div className="incident-reading-width">
        <p className="incident-kicker">Incident report · Updated October 30, 2026</p>
        <h1 id="incident-title">How Binance’s hot wallets were drained</h1>
        <p className="incident-deck">
          Binance links unauthorized withdrawals to an internal service path.
          A signed EIP-7702 authorization enabled the Binance 14 sweep. The
          final loss is not yet reconciled.
        </p>
        <div className="incident-meta">
          <span>Timeline and mechanics</span>
          <span>On-chain records and company statements</span>
          <a href="#incident-sources">Sources and method ↓</a>
        </div>

        <div className="incident-lede">
          <p>
            At 20:24:23 UTC on October 29, Binance 14 transferred 167,464 ETH,
            1.615 billion USDT and 63 other tokens to a newly active address.
            Binance 16 transferred another 28,005.6 ETH moments later. Further
            outflows followed across other networks.
          </p>
          <p>
            Binance’s October 30 preliminary update traces unauthorized
            withdrawals from a compromised DevOps laptop to a service container.
            It reports no evidence of a wallet private-key leak. The exact route
            from that access to the signed transactions remains unpublished.
          </p>
        </div>

        <section className="incident-section" aria-labelledby="confirmed-title">
          <p className="incident-eyebrow">01 · Binance’s response</p>
          <h2 id="confirmed-title">Binance suspended exchange flows during its response</h2>
          <p>
            Binance says it revoked the affected address authorization and is
            working with law enforcement and blockchain partners. Its incident
            account remains preliminary.
          </p>
        </section>

        <section className="incident-section" aria-labelledby="mechanics-title">
          <p className="incident-eyebrow">02 · What the transaction record shows</p>
          <h2 id="mechanics-title">A wallet authorization became a standing drain</h2>
          <p>
            Blockaid’s reconstruction traces the operator’s funding and rehearsal
            through test wallets to a contract deployed before the attack. At
            20:20:59 UTC, one Ethereum transaction carried 50 EIP-7702
            authorizations signed with Binance 14’s key. One matched the wallet’s
            live nonce. Three minutes later, the contract swept its ETH and tokens.
          </p>
          <p>
            EIP-7702 lets an externally owned account delegate execution to
            contract code. Blockaid says the authorization created a reusable
            sweep path until Binance revoked it, so later deposits could also
            be moved. This transaction-level reconstruction comes from a
            security vendor; Binance’s root-cause review remains open.
          </p>
          <p>
            A service can produce a valid signature without exposing its raw
            key. That could reconcile Blockaid’s observed authorization with
            Binance’s statement that it found no key leak, but this explanation
            is an inference, not a confirmed root cause.
          </p>
        </section>

        <section className="incident-section" aria-labelledby="numbers-title">
          <p className="incident-eyebrow">03 · Asset accounting</p>
          <h2 id="numbers-title">A freeze is not a recovery</h2>
          <div className="incident-numbers">
            <div><strong>~$6.3B</strong><span>Binance’s estimated incident impact</span></div>
            <div><strong>~$3B</strong><span>Assets Binance reported frozen on-chain</span></div>
            <div><strong>Unknown</strong><span>Final net loss after recoveries and replacement</span></div>
          </div>
          <p>
            Issuers can block tokens such as USDT and USDC at named addresses;
            ETH and other native assets have no equivalent issuer freeze. A
            frozen balance is inaccessible at its current address, not returned
            to Binance. Customer reimbursement and on-chain recovery are separate
            accounting events.
          </p>
          <p>
            CoinDesk found Binance 14 in the exchange’s October 1 reserve data
            and estimated that the ETH outflow could lower reported ETH coverage
            until replacement assets appear in a newer snapshot. The calculation
            uses reserve data, not a full balance-sheet audit. Binance says an
            updated Proof of Reserves will follow remediation.
          </p>
        </section>

        <section className="incident-section" aria-labelledby="spillover-title">
          <p className="incident-eyebrow">04 · The spillover</p>
          <h2 id="spillover-title">Aave froze markets while stolen funds moved through DeFi</h2>
          <p>
            Aave’s risk team says an address in the suspected attacker cluster
            supplied $60 million USDT and borrowed 19,762 WETH, then valued at
            about $44.6 million. Aave paused supply and borrowing across affected
            markets; existing users could still repay and withdraw.
          </p>
          <p>
            The pause limited new exposure while existing users retained the
            ability to repay and withdraw.
          </p>
        </section>

        <section className="incident-section" aria-labelledby="update-title">
          <p className="incident-eyebrow">05 · Update · October 30, 2026</p>
          <h2 id="update-title">Arbitrum moved related assets to a frozen wallet</h2>
          <p>
            Arbitrum’s Security Council said it moved 74,559,805 ARB and 8,425
            ETH linked to the incident into an intermediate frozen wallet. The
            assets can move only through another Council action or an Arbitrum
            DAO vote. The transaction confirms the intervention; it does not
            show a return to Binance.
          </p>
          <p>
            The transfer was valued at about $30.5 million. Binance separately
            put its cumulative verified freeze at about $3 billion, without
            itemizing whether this Arbitrum transfer is included. The amount is
            not added to Binance’s total here. Binance has not published a final
            net-loss figure, and deposits and withdrawals remained suspended in
            its latest update.
          </p>
        </section>

        <section className="incident-section" aria-labelledby="unknown-title">
          <p className="incident-eyebrow">06 · What remains unknown</p>
          <h2 id="unknown-title">The final loss is not yet reconciled</h2>
          <p>
            Binance has not published the forensic chain from laptop access to
            each wallet signature or reconciled transfers against frozen,
            recovered and replacement assets. The final post-mortem and reserve
            snapshot remain pending.
          </p>
        </section>

        <section id="incident-sources" className="incident-sources" aria-labelledby="sources-title">
          <h2 id="sources-title">Sources and method</h2>
          <p>
            Market Scan searched more than 100 result records through Keenable
            and SerpAPI, including X-targeted queries, and ran additional web
            searches through its two-account Gemini Web router. The register
            lists 32 source entries; repeated reports and overlapping freeze
            totals are not counted as independent evidence. X posts were found
            through search, not a direct X API.
          </p>
          <details>
            <summary>Open the core evidence register</summary>
            <ol className="incident-source-list">
              {sources.map((source, index) => <SourceLink key={`${source[1]}-${index}`} source={source} />)}
            </ol>
          </details>
        </section>

      </div>
    </article>
  );
}
