-- Wallet linking is removed. Typed current amounts stay; any wallet-sourced
-- amount was already stored in current_amount.
update holdings
set
  source = 'manual',
  manual_amount = current_amount,
  wallet_amount = 0,
  wallet_address = null
where source <> 'manual'
   or coalesce(wallet_amount, 0) <> 0
   or wallet_address is not null;

drop table if exists user_wallets;
