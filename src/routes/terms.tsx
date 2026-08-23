import { Link, createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/terms")({ component: TermsPage });

function TermsPage() {
  return (
    <LegalDoc title="Terms of use" updated="23 August 2026">
      <p>
        These terms govern your use of Remaindr at remaindr.xyz (the “service”). By using the
        service or creating an account, you agree to them. If you do not agree, do not use Remaindr.
      </p>

      <h2>What Remaindr is</h2>
      <p>
        Remaindr is a planning tool. You set target holdings, track what you already hold, estimate
        remaining capital, sketch a dollar-cost-average path, and run what-if prices. It is not a
        broker, dealer, exchange, custodian, investment adviser, tax preparer, or bank. We do not
        execute trades, hold assets, or give personalized investment advice.
      </p>
      <p>
        Nothing on Remaindr is an offer to buy or sell any security, token, or other instrument.
        Figures such as remaining USD, estimated P/L, DCA cadence, ETAs, and what-if values are
        estimates. They can be wrong. You are solely responsible for your decisions.
      </p>

      <h2>Eligibility</h2>
      <p>
        You must be at least 18 years old and legally able to enter a contract. Do not use the
        service if doing so would violate law that applies to you.
      </p>

      <h2>Accounts</h2>
      <p>
        You may use Remaindr as a guest (data stays in that browser) or sign in with email and
        password, Google, or X. You are responsible for the account and for keeping credentials
        safe. Tell us if you think the account was used without your permission. We may refuse,
        suspend, or close accounts that we believe are abused, automated, or unlawful.
      </p>
      <p>
        You can delete your account and associated server data from{" "}
        <Link to="/account">Account settings</Link>. Guest data is cleared by clearing this
        browser’s storage.
      </p>

      <h2>Your data and wallets</h2>
      <p>
        Holdings, targets, cost basis, DCA plans, and optional wallet addresses are information you
        provide. Public blockchain balances for addresses you add are read through public RPC
        endpoints in order to fill amounts. Remaindr never asks for a seed phrase, private key, or
        the ability to move funds. Do not paste secrets into the service.
      </p>

      <h2>Market data</h2>
      <p>
        Prices, market caps, charts, and related figures come from third parties (including
        CoinGecko and other market venues). Data may be delayed, incomplete, or incorrect. Remaindr
        does not guarantee any quote. Auto-refresh may pause on idle tabs.
      </p>

      <h2>Newsletter and alerts</h2>
      <p>
        The brief and DCA emails, if you opt in, are optional summaries of public information or of
        your own saved plan. They are not recommendations. Delivery is not guaranteed.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not try to break, overload, or scrape the service in a way that harms other users.</li>
        <li>Do not use Remaindr to conceal illegal activity or to impersonate someone else.</li>
        <li>Do not reverse-engineer the service except as allowed by law.</li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        Remaindr, the remaindr.xyz site, and the product design are owned by the operator of the
        service. You keep rights in the holdings data you enter. You grant us a limited license to
        host that data solely to run Remaindr for you.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided “as is.” We do not warrant that it will be uninterrupted, secure, or
        error-free, or that remaining capital, P/L, or any other figure is accurate. To the fullest
        extent permitted by law, we disclaim implied warranties of merchantability, fitness for a
        particular purpose, and non-infringement.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, the operator of Remaindr is not liable for any
        indirect, incidental, special, consequential, or punitive damages, or for any loss of
        profits, data, or digital assets, arising from your use of the service — including reliance
        on prices, DCA paths, what-if scenarios, or the newsletter. Our total liability for any
        claim relating to the service is limited to the greater of (a) the amount you paid us for
        Remaindr in the twelve months before the claim or (b) twenty-five U.S. dollars. Some places
        do not allow these limits; in those places they apply only as far as the law allows.
      </p>

      <h2>Changes</h2>
      <p>
        We may change the service or these terms. Continued use after a change posted on this page
        means you accept the new terms. If you do not, stop using Remaindr and delete your account.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the United States, without regard to conflict-of-law
        rules. If a dispute cannot be resolved informally, courts of competent jurisdiction in the
        United States may hear it, except where applicable law requires otherwise.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:hello@remaindr.xyz">hello@remaindr.xyz</a> or the{" "}
        <Link to="/contact">contact page</Link>. Privacy details are in the{" "}
        <Link to="/privacy">Privacy policy</Link>.
      </p>
    </LegalDoc>
  );
}
