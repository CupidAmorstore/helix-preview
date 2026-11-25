# 18 — Commercial and launch readiness

## Strongest genuine selling points (implemented and verified)
1. Paper trading against the live Coinbase order book with fees to the cent (reconciled in 10).
2. A trading bot that publishes every failed test and holds cash when nothing qualifies (199/0).
3. Small-account honesty (capital tiers $20–$1,000).
4. No account, no server, no tracking; encrypted self-custody vault with sending disabled.

## Readiness checklist
| Item | State | Blocks public launch? |
|---|---|---|
| Brand identity | coherent dark "Ledger" system, logo, consistent nav | no |
| Onboarding | none beyond Home paper-account opener; wallet vs paper vs watched addresses not introduced | **yes (P1 for public)** |
| Core value proposition stated on first screen | "Practise trading without risking money" — clear for paper; bot/wallet not introduced | partial |
| Reasons to return daily | live prices, watchlist, paper positions; alerts work only while open | weak |
| Support | GitHub issues link only; no contact, no SLA | yes |
| Privacy policy / Terms | placeholders with visible TODO | **yes** |
| Risk disclosures | "Simulated results are not earnings" present; no full risk disclosure page | yes |
| Store listing / screenshots | none | yes (store) |
| APK integrity | debug build, public key, sideload from GitHub | **yes** |
| French version (Quebec) | English only | **yes for Quebec distribution** (see below) |
| Human usability testing | none (only simulated personas) | yes |

## Regulatory research notes (not legal advice; qualified review required)
- **Securities (Canada / CSA, AMF Québec):** platforms that facilitate trading in crypto assets must be registered
  (CSA Staff Notice 21-329; typically as restricted dealers). HELIX places no real orders, holds no assets and
  sending is disabled — a paper-trading and research app *may* fall outside that regime, but this could not be
  confirmed from public sources and must be confirmed by counsel before any real-money feature or promotion as an
  investment tool. Sources: [CSA crypto platforms](https://www.securities-administrators.ca/?p=9775),
  [AMF news](https://lautorite.qc.ca/en/general-public/media-centre/news/fiche-dactualites/canadian-securities-regulators-expect-commitments-from-crypto-trading-platforms-pursuing-registration),
  [OSC crypto businesses](https://www.osc.ca/en/industry/registration-and-compliance/crypto-businesses).
- **Privacy (Québec Law 25):** an organization collecting personal information through technology must publish a
  plain-language privacy policy and the contact details of the person responsible for personal information;
  privacy toggles default to off. HELIX collects almost nothing, but API keys, watched addresses and IP exposure to
  third parties still need to be described. Sources: [CFIB](https://cfib-fcei.ca/quebec-law-25),
  [McCarthy Tétrault](https://mccarthy.ca/en/insights/blogs/techlex/sweeping-privacy-reform-comes-force-quebec).
- **Language (Charter of the French language / Bill 96):** software made available in Québec must be available
  in French on terms at least as favourable. HELIX is English-only. Sources:
  [McCarthy Tétrault](https://mccarthy.ca/en/dbic-language), [DLA Piper](https://knowledge.dlapiper.com/dlapiperknowledge/globalemploymentlatestdevelopments/canada-quebecs-bill-96-modified-the-charter-of-the-french-language-five-things-you-need-to-know).
Secondary sources were used; verify against the official texts.

## Ethical growth mechanisms (only those supported by real features)
Share a paper-trade receipt (no P&L bragging by default); share "why the bot refused to trade" research cards;
public research changelog; referral-free. Rejected: fake testimonials, ROI leaderboards, urgency notifications.

## Verdict
Technical readiness for owner QA: yes. Commercial readiness for a public launch: **no** (legal pages, signing,
onboarding, French, support, human testing).
