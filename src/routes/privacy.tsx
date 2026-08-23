import { Link, createFileRoute } from "@tanstack/react-router";
import { LegalDoc } from "@/components/legal-doc";

export const Route = createFileRoute("/privacy")({ component: PrivacyPage });

function PrivacyPage() {
  return (
    <LegalDoc title="Privacy policy" updated="23 August 2026">
      <p>
        This policy describes how Remaindr (remaindr.xyz) handles information when you use the
        ledger, sign in, or opt into email. It is written for this product as it exists today. We
        do not sell your personal information.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong className="text-foreground">Account.</strong> If you sign in: display name, email
        address, password hash (if you set a password), and identifiers from Google or X if you use
        those providers. Profile images come from the provider when they send one.
      </p>
      <p>
        <strong className="text-foreground">Ledger.</strong> Holdings you add (symbol, amounts,
        targets, cost basis, source), DCA plans, and Ethereum addresses you choose to link. We store
        these on the server only when you are signed in.
      </p>
      <p>
        <strong className="text-foreground">Preferences.</strong> Newsletter and DCA-alert toggles,
        if you set them.
      </p>
      <p>
        <strong className="text-foreground">On this device.</strong> If you use Remaindr as a guest,
        the stack stays in this browser (local storage). Hide-amounts, sort order, What-if prices,
        and similar UI flags also live in the browser. We do not receive those unless you sign in
        and save equivalent data.
      </p>
      <p>
        <strong className="text-foreground">Usage.</strong> Our host (Vercel) and database (Neon)
        automatically receive standard request logs: IP address, time, URL, user agent. We use this
        to run and secure the service, not to build advertising profiles.
      </p>

      <h2>What we do not collect</h2>
      <ul>
        <li>Seed phrases, private keys, or exchange passwords.</li>
        <li>Payment cards (Remaindr does not take payment on these pages today).</li>
        <li>Precise location. Any location inferred from IP is a side effect of hosting, not a feature.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To show your remainder, cards, charts, and settings.</li>
        <li>To sign you in and keep the session.</li>
        <li>To email the Friday brief or DCA-off-pace notices, only if you opt in.</li>
        <li>To generate the newsletter from public sources with the help of an AI model.</li>
        <li>To fix bugs, prevent abuse, and keep the service up.</li>
      </ul>

      <h2>Who else sees data</h2>
      <p>Processors we use to operate Remaindr:</p>
      <ul>
        <li>Vercel — hosting and scheduled jobs.</li>
        <li>Neon — database for accounts and saved ledgers.</li>
        <li>Google and X — only if you choose those sign-in buttons.</li>
        <li>Resend — email delivery, only if you opt into mail.</li>
        <li>xAI — to draft the public newsletter from published headlines, not to train on your bags.</li>
        <li>
          Market-data sources (including CoinGecko and other public APIs) — we request prices and
          market stats; we do not send them your holdings.
        </li>
        <li>
          Public blockchain RPCs — if you add a wallet address, that address is queried for balances.
          Addresses you add are already public on-chain.
        </li>
      </ul>
      <p>We do not sell personal information or share it for cross-context advertising.</p>

      <h2>Cookies and local storage</h2>
      <p>
        Signed-in sessions use a cookie or similar token so you stay logged in. Guest ledgers and
        display preferences use local storage in your browser. You can clear them in the browser or
        by deleting your account.
      </p>

      <h2>Retention</h2>
      <p>
        Server data is kept while your account exists. Delete account in{" "}
        <Link to="/account">Account settings</Link> removes your user record, holdings, wallets, DCA
        plans, and settings from our database. Backups and logs may lag for a short period. Emails
        already sent are not unsent. Guest data lasts until you clear this browser.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Stay a guest — nothing is saved to an account.</li>
        <li>Leave newsletter and DCA alerts off.</li>
        <li>Hide amounts on this device (eye icon) — that only affects this browser.</li>
        <li>Export a CSV of your ledger, then delete the account.</li>
        <li>Request access or deletion using the email on the account.</li>
      </ul>

      <h2>Children</h2>
      <p>
        Remaindr is not directed at children under 18. We do not knowingly collect personal
        information from them. If you believe a child created an account, contact us so we can
        delete it.
      </p>

      <h2>International</h2>
      <p>
        The service is hosted in the United States. If you use Remaindr from elsewhere, you
        understand your information is processed in the U.S., where laws may differ from those
        where you live.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a material way, we will update the date on this page. Continued
        use after an update means you accept the revised policy.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions: use the email on your Remaindr account. Related terms are in{" "}
        <Link to="/terms">Terms of use</Link>.
      </p>
    </LegalDoc>
  );
}
