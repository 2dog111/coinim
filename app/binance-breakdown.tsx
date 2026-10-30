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
  ["Etherscan: later 2,961.99 ETH transfer into Binance 14", "https://etherscan.io/tx/0xc1f0fdb94fb909e3f12aa345e81c05d4adb0ea2d3243e844920d62a2936f4ae0", "On-chain record"],
  ["Etherscan: 780M USDC transfer", "https://etherscan.io/tx/0xdc102dd89dded5a83f1008906883ffb7c81ff3b7d7965d8c7277d170b5e17481", "On-chain record"],
  ["Etherscan: collection address", "https://etherscan.io/address/0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c", "On-chain record"],
  ["Aave Risk / LlamaRisk: attacker position and cross-network freeze", "https://governance.aave.com/t/binance-hot-wallet-exploit-aaves-response/25954", "Protocol risk update and response"],
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
  ["Binance on X: verified frozen-asset total", "https://x.com/binance/status/2115970069696217576", "Primary update"],
  ["Binance Square: verified cumulative frozen total", "https://www.binance.com/en/square/post/10-30-2026-binance-suspends-deposits-and-withdrawals-during-security-investigation-382683663031259", "Primary update"],
  ["Arbitrum on X: Security Council action", "https://x.com/arbitrum/status/2115961730920841644", "Primary update"],
  ["ZachXBT on X: Arbitrum transaction", "https://x.com/zachxbt/status/2115960582230913357", "On-chain investigator"],
  ["Odysseas on X: EIP-7702 transaction sequence", "https://x.com/odysseas_eth/status/2115910280140276155", "Independent analysis"],
  ["Arbiscan: Arbitrum Security Council transaction", "https://arbiscan.io/tx/0xb69c81774f507d46ce776aeaed8b4d31df96dd66ce6fd05073481011835355d6", "On-chain record"],
  ["Binance: October 2026 Proof of Reserves", "https://www.binance.com/en/proof-of-reserves", "Exchange reserve records"],
  ["TRM Labs: ten-chain reconstruction and attribution", "https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history", "Blockchain intelligence; assessment as of Oct 30, 00:30 UTC"],
  ["Yi He on X: deposits operating, withdrawal work and 48-hour estimate", "https://x.com/heyibinance/status/2116021551262740985", "Primary service update; Oct 30, 04:17 UTC"],
  ["Binance on X: withdrawal revamp and investigation update", "https://x.com/binance/status/2116026356740034858", "Primary service update; Oct 30, 04:36 UTC"],
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
            Binance’s initial account linked unauthorized withdrawals to a
            possibly compromised DevOps engineer’s laptop and service
            container. It reported no evidence of a wallet private-key leak.
          </p>
        </div>

        <section className="incident-section" aria-labelledby="confirmed-title">
          <p className="incident-eyebrow">01 · Binance’s response</p>
          <h2 id="confirmed-title">Withdrawals remain paused during a security revamp</h2>
          <p>
            In a service update at 04:36 UTC on October 30, Binance said
            deposits were operating normally while withdrawals remained paused
            during a revamp of the withdrawal service and related addresses.
            It expected withdrawals to resume within 48 hours. Binance also
            said the incident involved multiple factors; the compromised
            computer may have been only the entry point. The full path is still
            under investigation. Binance says it revoked the affected
            authorization and will cover all losses with SAFU and company funds.
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
          <p>
            TRM’s cross-chain reconstruction says the other nine affected
            networks used ordinary signed transfers; EIP-7702 describes the
            Ethereum path only. TRM reads the wider pattern as evidence of a
            compromise to Binance’s hot-wallet signing infrastructure. That
            is TRM’s assessment, while Binance’s technical review remains open.
          </p>
          <p>
            Etherscan records 2,961.99 ETH arriving at Binance 14 at 23:55:47
            UTC, more than three hours after the authorization was created. It
            was an internal deposit consolidation while the delegation remained
            active. No outgoing transfer appears after it in the address record.
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
            Aave Risk says the attacker’s only position across its networks and
            versions holds $59.9 million USDT against debt of 19,762 WETH,
            valued at $43.8 million in its assessment. It says the position is
            over-collateralized, remains subject to ordinary liquidation and
            poses no risk to Aave suppliers. No attacker wallet had interacted
            with Aave since 21:01 UTC at the time of the report.
          </p>
          <p>
            Aave froze 175 V3 reserves across 16 networks and 117 V4 reserves
            across four. New supply and borrowing stopped; existing users could
            still repay or withdraw, and liquidations continued.
          </p>
          <p>
            TRM also traced $300 million USDT on Tron to a wallet that began
            supplying it to JustLend. Its report does not quantify a loan from
            that position. The documented Aave borrowing and the JustLend
            deposit are separate findings.
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
            itemizing whether this Arbitrum transfer is included, so the
            overlap remains unresolved and the amount is not added to Binance’s
            total.
          </p>
        </section>

        <section className="incident-section" aria-labelledby="trm-title">
          <p className="incident-eyebrow">06 · Cross-chain reconstruction · October 30, 2026</p>
          <h2 id="trm-title">TRM traces the attack across ten networks</h2>
          <p>
            TRM estimates that about $6.36 billion left Binance-attributed
            wallets across ten blockchains, mostly in roughly 20 minutes from
            20:05 UTC on October 29. Its estimate values transfers at the
            asset prices when they occurred; Binance separately reports an
            estimated impact of about $6.3 billion.
          </p>
          <p>
            TRM attributes the operation to TraderTraitor, a North Korean
            hacking group, with high confidence based on its on-chain and
            off-chain intelligence. Binance has not named an attacker. TRM’s
            report is an analyst attribution, not Binance’s finding.
          </p>
          <p>
            In its 00:30 UTC snapshot, TRM counted more than 420,000 ETH and
            18,270 BTC in attacker-controlled wallets, then valued at about
            $2.4 billion. This is a dated holdings estimate, not a final
            unrecovered-loss total.
          </p>
        </section>

        <section className="incident-section" aria-labelledby="unknown-final-title">
          <p className="incident-eyebrow">07 · What remains unknown</p>
          <h2 id="unknown-final-title">The final loss is not yet reconciled</h2>
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
            lists 35 source entries; repeated reports and overlapping freeze
            totals are not counted as independent evidence. The Oct 30 follow-up
            checked Binance’s service update and Aave Risk’s protocol report
            through Keenable and Gemini Web. Search results are not counted as
            separate confirmations. X posts were found through search, not a
            direct X API.
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
