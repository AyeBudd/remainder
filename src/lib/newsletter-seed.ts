import type { NewsletterIssue } from "@/lib/newsletter";

export const SEED_ISSUE: NewsletterIssue = {
  slug: "2026-08-20-tester",
  title: "Remaindr brief — 20 Aug 2026",
  lede: "Tester issue. Facts only: a U.S. SEC proposal on crypto offerings, one large scheduled token unlock that already occurred, and Ethereum developers scoping the next upgrade. No forecasts.",
  tester: true,
  publishedAt: "2026-08-20T13:00:00.000Z",
  items: [
    {
      category: "regulation",
      headline: "SEC proposes Regulation Crypto Assets",
      body: "On 18 August 2026 the U.S. Securities and Exchange Commission proposed Regulation Crypto Assets. The proposal includes two exemptions from Securities Act registration: a one-time exemption for offerings up to $5 million over a four-year period, and an exemption for offerings up to $75 million in each 12-month period. Issuers using either exemption would make principles-based narrative disclosures. Issuers using the $75 million exemption would also provide financial statements and ongoing reports. The proposal includes a conditional safe harbor from the term “investment contract” in the Securities Act and Exchange Act definitions of “security,” if stated conditions are met. Offers and sales under the exemptions would preempt specified state registration and qualification requirements, including certain secondary-market transactions. The rules are proposed, not adopted. Comments are due 60 days after Federal Register publication. Commissioners issued accompanying statements the same day.",
      assets: ["BTC", "ETH"],
      source: "U.S. SEC press release 2026-76",
      sourceUrl: "https://www.sec.gov/newsroom/press-releases/2026-76-sec-proposes-new-regulation-crypto-assets",
    },
    {
      category: "unlock",
      headline: "Arbitrum scheduled unlock dated 16 August 2026",
      body: "Arbitrum’s vesting calendar listed a supply event on 16 August 2026. Public reports cited about 92.65 million ARB becoming transferable under the existing multi-year schedule. Transferability is not the same as a sale. This brief records the scheduled event; it does not describe later market response.",
      assets: ["ARB"],
      source: "Project vesting schedule, as reported 12 August 2026",
      sourceUrl:
        "https://bitcoinfoundation.org/news/altcoins/arbitrum-warning-arb-token-unlock-could-trigger-another-sell-off-is-a-crash-coming/",
    },
    {
      category: "project",
      headline: "Ethereum Hegotá upgrade: 66 proposals on the table",
      body: "On 17 August 2026 CoinDesk reported that Ethereum developers are scoping the Hegotá upgrade (targeted for 2027). The deadline for new proposals passed on 6 August. Sixty-six proposals are under review, including Frame Transactions, which would change how wallets approve, execute, and pay for transactions, and a privacy-related package. Core developers will narrow the list in upcoming calls before implementation, devnets, and testnets. Inclusion in Hegotá is not decided.",
      assets: ["ETH"],
      source: "CoinDesk, 17 August 2026",
      sourceUrl:
        "https://www.coindesk.com/tech/2026/08/17/ethereum-s-next-big-upgrade-has-66-proposals-including-a-major-privacy-fix",
    },
    {
      category: "macro",
      headline: "Spot bitcoin briefly printed $70,000 this week",
      body: "CoinDesk’s 17 August 2026 report noted that bitcoin briefly traded at $70,000 during the week of the Ethereum proposal coverage. That is an observed print, not a target. Prices move; this issue does not track later prints.",
      assets: ["BTC"],
      source: "CoinDesk, 17 August 2026",
      sourceUrl:
        "https://www.coindesk.com/tech/2026/08/17/ethereum-s-next-big-upgrade-has-66-proposals-including-a-major-privacy-fix",
    },
  ],
};
