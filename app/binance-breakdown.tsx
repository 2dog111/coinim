const sources = [
  ["Binance: Security Incident Update", "https://www.binance.com/en-GB/support/announcement/security-incident-update-2026-10-30-c5a8729a97ac486d963784d96c5642d7", "Primary statement"],
  ["Binance: Security Incident Update #2", "https://www.binance.com/en-GB/support/announcement/security-incident-update-2-2026-10-30-d3306d9dca5243548c813b605e1d1751", "Primary statement"],
  ["Binance: Recovery Update #3", "https://www.binance.bh/en-GB/support/announcement/security-incident-recovery-update-3-90-of-stolen-assets-replenished-proof-of-reserves-snapshot-provided-2026-10-31-1fdf1f61559c401da0435895ffcccb62", "Primary statement"],
  ["Binance on X: incident response and loss coverage", "https://x.com/binance/status/2115960292115124558", "Primary statement"],
  ["Yi He on X: user funds and temporary suspension", "https://x.com/heyibinance/status/2115958049244631357", "Primary statement"],
  ["Changpeng Zhao on X: initial assessment", "https://x.com/cz_binance/status/2115915423174853077", "First-hand statement"],
  ["Circle CEO Jeremy Allaire on X: USDC freeze", "https://x.com/jerallaire/status/2115916207463481846", "Issuer statement"],
  ["Binance TH: separate custody and precautionary pause", "https://www.binance.th/en/announcement/crypto-deposit-%7C-withdrawal/d596e0d30341443aa477056a126e712a", "Primary statement"],
  ["Blockaid: transaction-level incident reconstruction", "https://blockaid.io/blog/binance-55b-hack-using-advanced-ai-models-blockaid-detects-the-biggest-theft-in-crypto-history", "Security vendor analysis"],
  ["Ethereum EIP-7702 specification", "https://eips.ethereum.org/EIPS/eip-7702", "Protocol specification"],
  ["Etherscan: Binance 14", "https://etherscan.io/address/0x28C6c06298d514Db089934071355E5743bf21d60", "On-chain record"],
  ["Etherscan: authorization transaction", "https://etherscan.io/tx/0xad99264d5532ae0dd04b2004eebda05f25657e70dacb764f7ac8d4ccd051298b", "On-chain record"],
  ["Etherscan: first sweep transaction", "https://etherscan.io/tx/0x53bd38b816c23e74134786c29a8c18d792777998a3b9326047b583100e88e2f3", "On-chain record"],
  ["Etherscan: later 2,961.99 ETH transfer into Binance 14", "https://etherscan.io/tx/0xc1f0fdb94fb909e3f12aa345e81c05d4adb0ea2d3243e844920d62a2936f4ae0", "On-chain record"],
  ["Etherscan: 780M USDC transfer", "https://etherscan.io/tx/0xdc102dd89dded5a83f1008906883ffb7c81ff3b7d7965d8c7277d170b5e17481", "On-chain record"],
  ["Etherscan: collection address", "https://etherscan.io/address/0x5227f603C1eE34CE3C06eFe6477003BDfCCB2f8c", "On-chain record"],
  ["Aave Risk: attacker position and staged market reopening", "https://governance.aave.com/t/binance-hot-wallet-exploit-aaves-response/25954", "Protocol risk update"],
  ["Reuters: first public frozen-asset count", "https://www.reuters.com/legal/transactional/tether-circle-freeze-238-billion-after-binance-reports-security-incident-2026-10-29/", "Wire report"],
  ["Associated Press: initial Binance investigation", "https://apnews.com/article/39cda8ceb8095e036334a18549d3d20d", "Wire report"],
  ["Associated Press: FBI attribution to TraderTraitor", "https://apnews.com/article/binance-crypto-hack-north-korea-fbi-883f18140c1e21ce0c38781e72cbe315", "Wire report on law enforcement statement"],
  ["CoinDesk: reserve data and Binance 14", "https://www.coindesk.com/business/2026/10/30/binance-hack-drained-wallets-backing-customer-assets-reserve-data-shows", "Independent reserve analysis"],
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
  ["Binance: Proof of Reserves", "https://www.binance.com/en/proof-of-reserves", "Exchange reserve records"],
  ["TRM Labs: ten-chain reconstruction and attribution", "https://www.trmlabs.com/resources/blog/north-korea-steals-usd-6-36-billion-from-binance-in-the-largest-hack-in-history", "Blockchain intelligence assessment"],
  ["Yi He on X: deposits operating and withdrawal work", "https://x.com/heyibinance/status/2116021551262740985", "Primary service update"],
  ["Binance on X: withdrawal revamp and investigation update", "https://x.com/binance/status/2116026356740034858", "Primary service update"],
] as const;

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
        <h1 id="incident-title">How Binance’s hot wallets were drained</h1>
        <p className="incident-deck">
          One valid Ethereum authorization became a standing drain. Nine other
          networks used ordinary signed transfers. Binance has replaced most of
          the affected backing, but replacement is not recovery and the final
          net loss is still unknown.
        </p>
        <div className="incident-meta">
          <time dateTime="2026-11-01">Updated November 1, 2026</time>
          <span>Transactions, company statements and dated analysis</span>
          <a href="#incident-sources">Open the evidence register</a>
        </div>

        <div className="incident-lede">
          <p>
            At 20:24:23 UTC on October 29, Binance 14 transferred 167,464 ETH,
            1.615 billion USDT and 63 other tokens to a newly active address.
            Binance 16 transferred another 28,005.6 ETH moments later.
          </p>
          <p>
            Binance first pointed to a compromised DevOps laptop and service
            container. Its next update said investigators had found additional
            points of breach. The company still reports no evidence of a wallet
            private-key leak.
          </p>
        </div>

        <ol className="incident-sections">
          <li>
            <section className="incident-section" aria-labelledby="response-title">
              <h2 id="response-title">The service path remains under investigation</h2>
              <p>
                Binance says it contained the compromised infrastructure,
                revoked affected authorizations and added controls. Deposits
                remained available while withdrawals were paused. On October 31
                the company still described November 1 as a target for reopening
                withdrawals; we found no later official confirmation that the
                service had reopened when this report was updated.
              </p>
              <p>
                The distinction matters. A laptop can be the entry point without
                being the whole mechanism. The unanswered question is how the
                attacker reached systems able to authorize withdrawals across
                ten networks.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="mechanics-title">
              <h2 id="mechanics-title">A valid authorization became a standing drain</h2>
              <p>
                Blockaid traced test wallets and a contract deployed before the
                attack. At 20:20:59 UTC, one transaction carried 50 EIP-7702
                authorizations signed with Binance 14’s key. One matched the
                wallet’s live nonce. Three minutes later, the contract swept the
                wallet’s ETH and tokens.
              </p>
              <p>
                EIP-7702 lets an externally owned account delegate execution to
                contract code. The authorization remained useful until Binance
                revoked it, so later deposits could also be moved. Etherscan
                records 2,961.99 ETH arriving at Binance 14 more than three hours
                after the authorization was created. No later outgoing transfer
                appears in the address record.
              </p>
              <p>
                A signing service can produce a valid signature without exposing
                the raw key. That can reconcile the on-chain authorization with
                Binance’s statement that it found no key leak, but it is still an
                inference, not a published root cause.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="chains-title">
              <h2 id="chains-title">Ethereum explains one path, not the whole theft</h2>
              <p>
                TRM estimates that about $6.36 billion left Binance-attributed
                wallets across ten blockchains, mostly in roughly 20 minutes from
                20:05 UTC. It says the nine non-Ethereum networks used ordinary
                signed transfers. The coordinated pattern points beyond a single
                smart-contract trick and toward Binance’s wider signing
                infrastructure. Binance’s technical post-mortem is still pending.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="accounting-title">
              <h2 id="accounting-title">A freeze, a replenishment and a recovery are different events</h2>
              <div className="incident-numbers">
                <div>
                  <strong>~$6.3B</strong>
                  <span>Binance’s estimated incident impact</span>
                </div>
                <div>
                  <strong>~$3B</strong>
                  <span>Assets Binance reported frozen on-chain</span>
                </div>
                <div>
                  <strong>90%</strong>
                  <span>Affected asset backing Binance said it had replenished</span>
                </div>
              </div>
              <p>
                Issuers can block tokens such as USDT and USDC at named
                addresses. ETH and BTC have no equivalent issuer freeze. A frozen
                balance is inaccessible at its current address; it has not been
                returned to Binance.
              </p>
              <p>
                On October 30 Binance said it had set aside more than $6.34
                billion and already held $5 billion in the exact affected token
                assets. On October 31 it said the replenishment ratio had reached
                90%, with BTC, ETH, USDT, BNB, SOL, USDC, XRP, USD1, RLUSD and ZEC
                fully backed. The last 10% consisted of less liquid tokens it was
                still buying through market and over-the-counter channels.
              </p>
              <p>
                Binance says the replacement assets come from SAFU, excess from
                Futures Insurance Funds and its corporate treasury. It took a new
                Proof of Reserves snapshot at 00:00 UTC on October 31. The company
                said the full zero-knowledge proof would take 40 to 50 hours and
                expected it by November 3. That is progress on customer backing,
                not a reconciliation of money recovered from the attacker.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="defi-title">
              <h2 id="defi-title">Aave reopened markets with the attacker assets constrained</h2>
              <p>
                Aave Risk reported one attacker position: $59.9 million USDT
                collateral against 19,762 WETH debt, valued at $43.8 million in
                its assessment. The position was over-collateralized and subject
                to ordinary liquidation.
              </p>
              <p>
                Aave initially froze 175 V3 reserves across 16 networks and 117
                V4 reserves across four. Its staged rollback reopened reserves
                while keeping selected assets found in the attacker cluster at
                zero loan-to-value or zero collateral factor for new borrowing.
                Risk stewards also removed roughly $3.7 billion of unused V3
                borrow capacity and $130 million on V4 before reopening. This was
                a containment change inside Aave, not a recovery by Binance.
              </p>
              <p>
                TRM separately traced $300 million USDT on Tron to a wallet that
                began supplying it to JustLend. Its report does not quantify a
                loan from that position, so it is not combined with Aave’s debt.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="arbitrum-title">
              <h2 id="arbitrum-title">Arbitrum moved related assets to a frozen wallet</h2>
              <p>
                Arbitrum’s Security Council moved 74,559,805 ARB and 8,425 ETH
                linked to the incident into an intermediate frozen wallet. The
                assets can move only through another Council action or a DAO vote.
                The transfer confirms intervention, not a return to Binance.
              </p>
              <p>
                The transfer was valued at about $30.5 million. Binance did not
                itemize whether it was already included in the company’s roughly
                $3 billion frozen total, so this report does not add it again.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="attribution-title">
              <h2 id="attribution-title">The FBI joined the TraderTraitor attribution</h2>
              <p>
                TRM attributed the operation to North Korea’s TraderTraitor group
                with high confidence based on on-chain and off-chain intelligence.
                On October 31, the Associated Press reported that the FBI also
                attributed the theft to TraderTraitor and asked exchanges and
                analytics firms to block transactions linked to named addresses.
              </p>
              <p>
                The FBI attribution raises the claim from a private intelligence
                assessment to a law-enforcement finding. It does not yet explain
                Binance’s internal breach sequence or turn frozen balances into
                recovered funds.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="holdings-title">
              <h2 id="holdings-title">The attacker’s dated holdings are not the net loss</h2>
              <p>
                In its October 30 00:30 UTC snapshot, TRM counted more than
                420,000 ETH and 18,270 BTC in attacker-controlled wallets, then
                valued at about $2.4 billion. This is a dated holdings estimate.
                It excludes other accounting movements and should not be treated
                as the final unrecovered amount.
              </p>
            </section>
          </li>

          <li>
            <section className="incident-section" aria-labelledby="unknown-title">
              <h2 id="unknown-title">The last number still does not exist</h2>
              <p>
                Binance has not published the forensic chain from initial access
                to each wallet signature. It has not reconciled the gross outflow
                against frozen, returned, replaced and still attacker-controlled
                assets. The withdrawal reopening, full zero-knowledge reserve
                proof and technical post-mortem also remained unconfirmed when
                this report was updated.
              </p>
            </section>
          </li>
        </ol>

        <section id="incident-sources" className="incident-sources" aria-labelledby="sources-title">
          <h2 id="sources-title">Sources and method</h2>
          <p>
            Market Scan was asked first for updates after October 30. One
            independent pass returned no usable evidence and the official-source
            pass remained in progress, so neither was treated as confirmation.
            The November 1 additions were then checked against Binance’s dated
            updates, the Aave risk thread and an Associated Press report of the
            FBI statement. Company replenishment claims stay labelled as company
            claims; transaction records, freezes and recovery are not merged.
          </p>
          <details>
            <summary>Open 38 source entries</summary>
            <ol className="incident-source-list">
              {sources.map((source, index) => (
                <SourceLink key={`${source[1]}-${index}`} source={source} />
              ))}
            </ol>
          </details>
        </section>
      </div>
    </article>
  );
}
