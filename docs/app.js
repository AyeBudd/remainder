const ASSETS = [
  { symbol:"BTC", name:"Bitcoin", id:"bitcoin", decimals:8, pair:"BTC-USD" },
  { symbol:"ETH", name:"Ethereum", id:"ethereum", decimals:6, pair:"ETH-USD", eth:"native" },
  { symbol:"SOL", name:"Solana", id:"solana", decimals:4, pair:"SOL-USD" },
  { symbol:"BNB", name:"BNB", id:"binancecoin", decimals:4 },
  { symbol:"XRP", name:"XRP", id:"ripple", decimals:2, pair:"XRP-USD" },
  { symbol:"ADA", name:"Cardano", id:"cardano", decimals:2, pair:"ADA-USD" },
  { symbol:"DOGE", name:"Dogecoin", id:"dogecoin", decimals:0, pair:"DOGE-USD" },
  { symbol:"AVAX", name:"Avalanche", id:"avalanche-2", decimals:3, pair:"AVAX-USD" },
  { symbol:"LINK", name:"Chainlink", id:"chainlink", decimals:3, pair:"LINK-USD", eth:"0x514910771AF9Ca656af840dff83E8264EcF986CA" },
  { symbol:"UNI", name:"Uniswap", id:"uniswap", decimals:3, pair:"UNI-USD", eth:"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
  { symbol:"AAVE", name:"Aave", id:"aave", decimals:3, pair:"AAVE-USD", eth:"0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9" },
  { symbol:"SUI", name:"Sui", id:"sui", decimals:2, pair:"SUI-USD" },
  { symbol:"TON", name:"Toncoin", id:"the-open-network", decimals:2 },
  { symbol:"ATOM", name:"Cosmos", id:"cosmos", decimals:3, pair:"ATOM-USD" },
  { symbol:"NEAR", name:"NEAR", id:"near", decimals:2, pair:"NEAR-USD" },
  { symbol:"APT", name:"Aptos", id:"aptos", decimals:3, pair:"APT-USD" },
  { symbol:"LTC", name:"Litecoin", id:"litecoin", decimals:4, pair:"LTC-USD" },
  { symbol:"BCH", name:"Bitcoin Cash", id:"bitcoin-cash", decimals:4, pair:"BCH-USD" },
  { symbol:"DOT", name:"Polkadot", id:"polkadot", decimals:3, pair:"DOT-USD" },
  { symbol:"USDC", name:"USD Coin", id:"usd-coin", decimals:2, pair:"USDC-USD", eth:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", dec:6 },
  { symbol:"USDT", name:"Tether", id:"tether", decimals:2, eth:"0xdAC17F958D2ee523a2206206994597C13D831ec7", dec:6 },
];
const TOKENS = [
  { symbol:"ETH", name:"Ethereum", maps:"ETH", address:"native", decimals:18 },
  { symbol:"WBTC", name:"Wrapped Bitcoin", maps:"BTC", address:"0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", decimals:8 },
  { symbol:"WETH", name:"Wrapped Ether", maps:"ETH", address:"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", decimals:18 },
  { symbol:"USDC", name:"USD Coin", maps:"USDC", address:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals:6 },
  { symbol:"USDT", name:"Tether", maps:"USDT", address:"0xdAC17F958D2ee523a2206206994597C13D831ec7", decimals:6 },
  { symbol:"LINK", name:"Chainlink", maps:"LINK", address:"0x514910771AF9Ca656af840dff83E8264EcF986CA", decimals:18 },
  { symbol:"UNI", name:"Uniswap", maps:"UNI", address:"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", decimals:18 },
];
const KEY = "remainder.v1";
const FREQS = [["daily","Daily"],["weekly","Weekly"],["biweekly","Biweekly"],["monthly","Monthly"]];
const I = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5v14"/></svg>',
  wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/><path d="M3 9h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="13" r="1"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
};

const usd0 = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0});
const usd2 = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2});
const usdC = new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:1});

function formatUsd(n, opts={}) {
  if (!Number.isFinite(n)) return "—";
  if (opts.compact && Math.abs(n) >= 10000) return usdC.format(n);
  if (opts.precise || Math.abs(n) < 100) return usd2.format(n);
  return usd0.format(n);
}
function assetOf(sym){ return ASSETS.find(a => a.symbol === sym); }
function formatCoins(n, sym){
  if (!Number.isFinite(n)) return "—";
  const d = assetOf(sym)?.decimals ?? 4;
  return new Intl.NumberFormat("en-US",{maximumFractionDigits:d}).format(n);
}
function formatPct(r){ if (!Number.isFinite(r)) return "—"; const p=r*100; return `${p.toFixed(p>=10?0:1)}%`; }
function remain(c,t){ return Math.max(0, t-c); }
function parseAmt(raw){ const n = Number(String(raw).replace(/,/g,"").trim()); return Number.isFinite(n) && n>=0 ? n : null; }
function uid(){ return crypto.randomUUID(); }
function iso(d){ return d.toISOString().slice(0,10); }
function sampleDate(){ const n=new Date(); return iso(new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth()+6, 19))); }
function makeSample(){
  const targetDate = sampleDate();
  return {
    holdings: [
      { id:"sample-btc", symbol:"BTC", name:"Bitcoin", idg:"bitcoin", target:1, current:0.37, source:"manual", wallet:null },
      { id:"sample-eth", symbol:"ETH", name:"Ethereum", idg:"ethereum", target:16, current:8.4, source:"manual", wallet:null },
      { id:"sample-sol", symbol:"SOL", name:"Solana", idg:"solana", target:250, current:64, source:"manual", wallet:null },
    ],
    plans: [{ id:"sample-dca-btc", holdingId:"sample-btc", targetDate, frequency:"weekly", assumed:null }],
  };
}
function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return makeSample();
    const p = JSON.parse(raw);
    if (!Array.isArray(p.holdings) || !Array.isArray(p.plans)) return makeSample();
    return p;
  } catch { return makeSample(); }
}
function save(state){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

const state = {
  ...load(),
  prices: {},
  priceOk: false,
  menu: null,
  dialog: null,
  dcaId: null,
  form: {},
  wallet: { address:null, bals:[], selected:{}, busy:false, err:null },
};

function persist(){ save({ holdings: state.holdings, plans: state.plans }); }

async function loadPrices(){
  const ids = [...new Set(ASSETS.map(a=>a.id))].join(",");
  try {
    const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
    if (res.ok) {
      const json = await res.json();
      const prices = {};
      for (const a of ASSETS) if (json[a.id]?.usd > 0) prices[a.id] = json[a.id].usd;
      if (Object.keys(prices).length >= 3) { state.prices = prices; state.priceOk = true; render(); return; }
    }
  } catch {}
  const prices = {};
  await Promise.all(ASSETS.filter(a=>a.pair).map(async a => {
    try {
      const res = await fetch(`https://api.coinbase.com/v2/prices/${a.pair}/spot`);
      if (!res.ok) return;
      const n = Number((await res.json()).data?.amount);
      if (n > 0) prices[a.id] = n;
    } catch {}
  }));
  if (!prices.tether) prices.tether = 1;
  if (!prices["usd-coin"]) prices["usd-coin"] = 1;
  state.prices = prices;
  state.priceOk = Object.keys(prices).length >= 3;
  render();
}

function addMonths(d,n){ const x=new Date(d); x.setMonth(x.getMonth()+n); return x; }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function countPeriods(from,to,freq){
  const days = Math.max(0, Math.round((startDay(to)-startDay(from))/86400000));
  if (days<=0) return 0;
  if (freq==="daily") return Math.max(1,days);
  if (freq==="weekly") return Math.max(1, Math.ceil(days/7));
  if (freq==="biweekly") return Math.max(1, Math.ceil(days/14));
  const m = (to.getFullYear()-from.getFullYear())*12 + (to.getMonth()-from.getMonth());
  return Math.max(1, m || 1);
}
function startDay(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
function step(from,freq,i){
  if (freq==="daily") return addDays(from,i);
  if (freq==="weekly") return addDays(from,i*7);
  if (freq==="biweekly") return addDays(from,i*14);
  return addMonths(from,i);
}
function quoteDca(h, plan){
  const rem = remain(h.current, h.target);
  const live = state.prices[h.idg];
  const price = plan.assumed > 0 ? plan.assumed : (Number.isFinite(live) ? live : null);
  const remUsd = price != null ? rem * price : null;
  const target = new Date(plan.targetDate+"T00:00:00");
  const now = new Date();
  const past = startDay(target) <= startDay(now);
  const met = rem <= 0;
  if (met || past) return { periods:0, rem, remUsd, coins:0, usd: rem===0?0:null, price, past, met, series:[{label:"Now", amount:h.current}] };
  const periods = countPeriods(now, target, plan.frequency);
  const coins = rem/periods;
  const usd = remUsd != null ? remUsd/periods : null;
  const series = [{label:"Now", amount:h.current}];
  for (let i=1;i<=periods;i++){
    const d = step(now, plan.frequency, i);
    series.push({ label: d.toLocaleDateString("en-US",{month:"short",day:"numeric"}), amount: Math.min(h.target, h.current + coins*i) });
  }
  return { periods, rem, remUsd, coins, usd, price, past, met, series };
}

function esc(s){
  return String(s).replace(/[&<>"']/g, function(c){
    if (c === "&") return "&" + "amp;";
    if (c === "<") return "&" + "lt;";
    if (c === ">") return "&" + "gt;";
    if (c === '"') return "&" + "quot;";
    return "&#39;";
  });
}

function totals(){
  let current=0, target=0, remainUsd=0, priced=0;
  const slices=[];
  for (const h of state.holdings){
    const p = state.prices[h.idg];
    if (p==null) continue;
    priced++;
    const gap = remain(h.current,h.target)*p;
    current += h.current*p;
    target += h.target*p;
    remainUsd += gap;
    if (gap>0) slices.push({id:h.id, symbol:h.symbol, remainUsd:gap});
  }
  return { current, target, remainUsd, priced, fill: target>0 ? current/target : 0, slices };
}

function openAdd(edit){
  state.dialog = { type:"add", edit: edit||null, query:"", asset: edit?ASSETS.find(a=>a.symbol===edit.symbol):null, custom:false, csym:"", cid:"", target: edit?String(edit.target):"", current: edit?String(edit.current):"", err:null, busy:false };
  render();
}
function openWallet(){
  state.wallet = { address:null, bals:[], selected:{}, busy:false, err:null };
  state.dialog = { type:"wallet" };
  render();
}
function openSignIn(){
  state.dialog = { type:"signin" };
  render();
}
function closeDialog(){ state.dialog=null; render(); }

function saveHolding(){
  const d = state.dialog;
  const t = parseAmt(d.target);
  const c = d.current.trim()==="" ? 0 : parseAmt(d.current);
  if (t==null || t<=0) { d.err="Enter a target amount greater than zero."; render(); return; }
  if (c==null) { d.err="Current holding must be a number."; render(); return; }
  let chosen = d.custom
    ? { symbol:d.csym.trim().toUpperCase(), name:d.csym.trim().toUpperCase(), idg:d.cid.trim().toLowerCase() }
    : d.asset ? { symbol:d.asset.symbol, name:d.asset.name, idg:d.asset.id } : null;
  if (!chosen || !chosen.symbol || !chosen.idg) { d.err="Choose an asset, or enter a symbol and CoinGecko id."; render(); return; }
  if (!d.edit && state.holdings.some(h=>h.symbol===chosen.symbol) && !d.custom) { d.err=`You already have a ${chosen.symbol} target.`; render(); return; }
  if (d.edit) {
    Object.assign(d.edit, { target:t, current:c, symbol:chosen.symbol, name:chosen.name, idg:chosen.idg });
  } else {
    state.holdings.push({ id:uid(), symbol:chosen.symbol, name:chosen.name, idg:chosen.idg, target:t, current:c, source:"manual", wallet:null });
  }
  persist(); closeDialog();
}

function removeHolding(id){
  state.holdings = state.holdings.filter(h=>h.id!==id);
  state.plans = state.plans.filter(p=>p.holdingId!==id);
  if (state.dcaId===id) state.dcaId=null;
  persist(); render();
}

function savePlan(){
  const h = currentDca();
  if (!h) return;
  const assumed = state.form.assumed?.trim() ? parseAmt(state.form.assumed) : null;
  if (state.form.assumed?.trim() && (assumed==null || assumed<=0)) { state.form.err="Assumed price must be a positive number, or left blank."; render(); return; }
  const existing = state.plans.find(p=>p.holdingId===h.id);
  const next = { id: existing?.id || uid(), holdingId:h.id, targetDate: state.form.date, frequency: state.form.freq, assumed };
  state.plans = [...state.plans.filter(p=>p.holdingId!==h.id), next];
  persist(); render();
}
function clearPlan(id){ state.plans = state.plans.filter(p=>p.id!==id); persist(); render(); }
function currentDca(){
  return state.holdings.find(h=>h.id===state.dcaId) || state.holdings[0] || null;
}
function syncForm(){
  const h = currentDca();
  const ex = h && state.plans.find(p=>p.holdingId===h.id);
  state.form = { date: ex?.targetDate || sampleDate(), freq: ex?.frequency || "weekly", assumed: ex?.assumed!=null ? String(ex.assumed) : "", err:null };
}

function getProvider(){
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers[0]) return eth.providers[0];
  return eth;
}
async function connectWallet(){
  const p = getProvider();
  const w = state.wallet;
  if (!p) { w.err="No browser wallet found. Use manual holdings, or open this in a browser with MetaMask or Rabby."; render(); return; }
  w.busy=true; w.err=null; render();
  try {
    const acc = await p.request({ method:"eth_requestAccounts" });
    const address = acc[0];
    if (!address) throw new Error("Wallet did not return an account.");
    try {
      const chain = await p.request({ method:"eth_chainId" });
      if (String(chain).toLowerCase() !== "0x1") await p.request({ method:"wallet_switchEthereumChain", params:[{chainId:"0x1"}] });
    } catch {}
    const bals = [];
    for (const tok of TOKENS) {
      try {
        let hex;
        if (tok.address==="native") hex = await p.request({ method:"eth_getBalance", params:[address,"latest"] });
        else {
          const data = "0x70a08231" + address.replace(/^0x/i,"").toLowerCase().padStart(64,"0");
          hex = await p.request({ method:"eth_call", params:[{to:tok.address, data},"latest"] });
        }
        const raw = BigInt(hex || "0x0");
        const base = 10n ** BigInt(tok.decimals);
        const amt = Number(raw)/Number(base);
        if (amt>0) bals.push({ ...tok, amount:amt });
      } catch {}
    }
    w.address = address; w.bals = bals;
    const selected = {};
    for (const b of bals) if (state.holdings.some(h=>h.symbol===b.maps || h.symbol===b.symbol)) selected[b.symbol]=true;
    w.selected = selected;
  } catch (e) { w.err = e.message || "Could not connect wallet"; }
  w.busy=false; render();
}
function applyWallet(){
  const w = state.wallet;
  if (!w.address) return;
  for (const b of w.bals) {
    if (!w.selected[b.symbol]) continue;
    const match = state.holdings.find(h=>h.symbol===b.maps) || state.holdings.find(h=>h.symbol===b.symbol);
    if (match) { match.current = b.amount; match.source="wallet"; match.wallet=w.address; }
    else {
      const a = ASSETS.find(x=>x.symbol===b.maps) || ASSETS.find(x=>x.symbol===b.symbol);
      if (!a) continue;
      state.holdings.push({ id:uid(), symbol:a.symbol, name:a.name, idg:a.id, target:b.amount, current:b.amount, source:"wallet", wallet:w.address });
    }
  }
  persist(); closeDialog();
}

function chartSvg(series){
  if (!series || series.length<2) return "";
  const w=640, h=200, pl=8, pr=8, pt=10, pb=24;
  const xs = series.map((_,i)=> pl + (i/(series.length-1))*(w-pl-pr));
  const ys = series.map(s=>s.amount);
  const min = Math.min(...ys), max = Math.max(...ys);
  const span = max-min || 1;
  const py = v => pt + (1-((v-min)/span))*(h-pt-pb);
  const line = xs.map((x,i)=> `${i?"L":"M"}${x.toFixed(1)},${py(ys[i]).toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length-1].toFixed(1)},${h-pb} L${xs[0].toFixed(1)},${h-pb} Z`;
  const ticks = [0, Math.floor((series.length-1)/2), series.length-1].filter((v,i,a)=>a.indexOf(v)===i);
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <path d="${area}" fill="var(--fg)" fill-opacity="0.16"/>
    <path d="${line}" fill="none" stroke="var(--fg)" stroke-width="1.6"/>
    ${ticks.map(i=>`<text x="${xs[i]}" y="${h-6}" fill="var(--muted)" font-size="11" text-anchor="${i===0?"start":i===series.length-1?"end":"middle"}">${esc(series[i].label)}</text>`).join("")}
  </svg>`;
}

function render(){
  const root = document.getElementById("app");
  const t = totals();
  const hDca = currentDca();
  const plan = hDca && state.plans.find(p=>p.holdingId===hDca.id);
  if (hDca && (!state.form.date || state.form._for !== hDca.id)) {
    state.form = { date: plan?.targetDate || sampleDate(), freq: plan?.frequency || "weekly", assumed: plan?.assumed!=null?String(plan.assumed):"", err:null, _for:hDca.id };
  }
  const q = hDca ? quoteDca(hDca, { targetDate:state.form.date, frequency:state.form.freq, assumed: parseAmt(state.form.assumed||"") }) : null;

  root.innerHTML = `
  <div class="wrap">
    <header class="top">
      <a class="brand" href="./">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><rect x="2" y="10" width="20" height="4" rx="2" fill="#3a3b38"/><rect x="2" y="10" width="13" height="4" rx="2" fill="#f0efe8"/></svg>
        <span>Remaindr</span>
      </a>
      <button class="btn btn-outline" data-act="signin">Sign in</button>
    </header>
    <p class="banner">This stack stays in this browser. <button type="button" data-act="signin">Sign in</button> to save it to your account — available when you host Remaindr with a database.</p>
    <section class="hero">
      <p class="kicker">Remaining to hit targets</p>
      <div class="hero-row">
        <h1>${t.priced>0 ? esc(formatUsd(t.remainUsd)) : "—"}</h1>
        <p class="fill">${esc(formatPct(t.fill))} filled</p>
      </div>
      <div class="stats">
        <div><p class="stat-label">Held</p><p class="stat-value">${t.priced>0?esc(formatUsd(t.current)):"—"}</p></div>
        <div><p class="stat-label">Target value</p><p class="stat-value">${t.priced>0?esc(formatUsd(t.target)):"—"}</p></div>
        <div><p class="stat-label">Assets</p><p class="stat-value">${state.holdings.length}</p></div>
      </div>
      ${t.slices.length ? `<div class="bar-wrap">
        <div class="bar">${t.slices.map(s=>`<div style="width:${Math.max(4,(s.remainUsd/t.remainUsd)*100)}%;opacity:${0.45+(s.remainUsd/t.remainUsd)*0.55}" title="${esc(s.symbol)} ${esc(formatUsd(s.remainUsd))}"></div>`).join("")}</div>
        <div class="slices">${t.slices.map(s=>`<span>${esc(s.symbol)} ${esc(formatUsd(s.remainUsd,{compact:true}))}</span>`).join("")}</div>
      </div>` : ""}
      ${!state.priceOk ? `<p class="held" style="margin-top:12px">Live prices are unavailable. Coin amounts and remaining units still update.</p>` : ""}
    </section>
    <section class="section">
      <div class="section-head">
        <h2>Holdings</h2>
        <div class="actions">
          <button class="btn btn-outline" data-act="wallet">${I.wallet} Wallet</button>
          <button class="btn btn-primary" data-act="add">${I.plus} Add target</button>
        </div>
      </div>
      ${state.holdings.length===0 ? `<div class="empty">
        <h3>Set the first mark</h3>
        <p>Name an asset, a target stack, and what you already hold — wallet or typed in. Remaindr shows the capital left, then a path to fill it.</p>
        <div class="actions">
          <button class="btn btn-primary" data-act="add">${I.plus} Add target</button>
          <button class="btn btn-outline" data-act="sample">Use sample stack</button>
        </div>
      </div>` : `<div class="grid">${state.holdings.map(cardHtml).join("")}</div>`}
    </section>
    <section class="card dca" id="dca">
      ${!hDca ? `<h2>DCA path</h2><p class="lead">Add a target first, then set a date to fill it.</p>` : `
      <div class="dca-head">
        <div>
          <h2>DCA path</h2>
          <p class="lead">Split the remaining stack across a schedule. Prices move — this is a plan, not a promise.</p>
        </div>
        ${state.holdings.length>1 ? `<label class="lbl" style="margin:0">Asset
          <select id="dca-asset">${state.holdings.map(h=>`<option value="${h.id}" ${h.id===hDca.id?"selected":""}>${esc(h.symbol)}</option>`).join("")}</select>
        </label>` : ""}
      </div>
      <div class="fields">
        <div><label class="lbl" for="dca-date">Hit target by</label><input id="dca-date" type="date" value="${esc(state.form.date)}" /></div>
        <div><label class="lbl" for="dca-price">Assumed price (optional)</label><input id="dca-price" inputmode="decimal" value="${esc(state.form.assumed||"")}" placeholder="${q?.price ? "Live "+formatUsd(q.price,{precise:true}) : "Live price"}" /></div>
        <div class="span2"><label class="lbl">Cadence</label>
          <div class="cadence">${FREQS.map(([id,lab])=>`<button type="button" class="chip ${state.form.freq===id?"on":""}" data-freq="${id}">${lab}</button>`).join("")}</div>
        </div>
      </div>
      ${q ? `<div class="quote">
        <div class="q"><p class="stat-label">Per ${state.form.freq==="biweekly"?"two weeks":state.form.freq.replace("ly","")}</p><p class="stat-value">${q.met?"Target met":q.past?"Pick a future date":q.usd!=null?esc(formatUsd(q.usd,{precise:true})):esc(formatCoins(q.coins,hDca.symbol)+" "+hDca.symbol)}</p>${!q.met&&!q.past?`<p class="held">${esc(formatCoins(q.coins,hDca.symbol))} ${esc(hDca.symbol)}</p>`:""}</div>
        <div class="q"><p class="stat-label">Buys remaining</p><p class="stat-value">${q.met||q.past?"—":q.periods}</p>${q.remUsd!=null?`<p class="held">${esc(formatUsd(q.remUsd))} left</p>`:""}</div>
        <div class="q"><p class="stat-label">Price used</p><p class="stat-value">${q.price!=null?esc(formatUsd(q.price,{precise:true})):"Unavailable"}</p><p class="held">${state.form.assumed?"Assumed":"Live"}</p></div>
      </div>` : ""}
      ${q && q.series.length>1 ? `<div class="chart">${chartSvg(q.series)}</div>` : ""}
      ${state.form.err ? `<p class="err">${esc(state.form.err)}</p>` : ""}
      <div class="actions" style="margin-top:1.25rem">
        <button class="btn btn-primary" data-act="save-plan">${plan?"Update plan":"Save plan"}</button>
        ${plan?`<button class="btn btn-ghost" data-act="clear-plan" data-id="${plan.id}">Clear plan</button>`:""}
      </div>`}
    </section>
  </div>
  ${dialogHtml()}`;
}

function cardHtml(h){
  const plan = state.plans.find(p=>p.holdingId===h.id);
  const price = state.prices[h.idg];
  const rem = remain(h.current,h.target);
  const ratio = h.target>0 ? h.current/h.target : 0;
  const remUsd = price!=null ? rem*price : null;
  const curUsd = price!=null ? h.current*price : null;
  const met = rem<=0;
  return `<article class="card">
    <div class="card-top">
      <div>
        <div class="sym"><h3>${esc(h.symbol)}</h3><span>${esc(h.name)}</span></div>
        <div class="badges">
          <span class="badge ${h.source==="wallet"?"badge-ok":""}">${h.source==="wallet"?"Wallet":"Manual"}</span>
          ${plan?`<span class="badge badge-out">DCA ${esc(plan.frequency)} to ${esc(plan.targetDate)}</span>`:""}
        </div>
      </div>
      <div class="menu">
        <button class="btn btn-ghost btn-icon" data-menu="${h.id}" aria-label="Actions for ${esc(h.symbol)}">${I.more}</button>
        ${state.menu===h.id ? `<div class="menu-list">
          <button data-edit="${h.id}">Edit amounts</button>
          <button data-plan="${h.id}">Plan DCA</button>
          <div class="sep"></div>
          <button class="danger" data-del="${h.id}">Remove</button>
        </div>` : ""}
      </div>
    </div>
    <p class="amt"><b>${esc(formatCoins(h.current,h.symbol))}</b> / ${esc(formatCoins(h.target,h.symbol))} ${esc(h.symbol)}</p>
    <div class="progress" role="progressbar" aria-valuenow="${Math.round(Math.min(100,ratio*100))}"><div style="width:${Math.min(100,ratio*100)}%"></div></div>
    <div class="row-between" style="margin-top:1rem">
      <div>
        <p class="remain-label">${met?"Surplus":"Capital remaining"}</p>
        <p class="remain-val">${remUsd!=null?esc(formatUsd(met?(curUsd||0)-h.target*(price||0):remUsd)):esc(formatCoins(rem,h.symbol)+" "+h.symbol)}</p>
        ${curUsd!=null?`<p class="held">${esc(formatUsd(curUsd,{precise:true}))} held${price!=null?` at ${esc(formatUsd(price,{precise:true}))}`:""}</p>`:""}
      </div>
      <button class="btn btn-outline btn-sm" data-plan="${h.id}">${I.route} Plan path</button>
    </div>
  </article>`;
}

function dialogHtml(){
  const d = state.dialog;
  if (!d) return "";
  if (d.type==="signin") return `<div class="overlay"><div class="dialog" role="dialog" aria-labelledby="si-title">
    <button class="x" data-close="1" aria-label="Close">${I.x}</button>
    <h2 id="si-title">Sign in</h2>
    <p class="desc">This public GitHub Pages build keeps your ledger in this browser. Google / X account save needs Remaindr hosted with a database (the full app in this repo).</p>
    <div class="actions" style="margin-top:1.25rem;justify-content:flex-end"><button class="btn btn-primary" data-close="1">Keep it local</button></div>
  </div></div>`;
  if (d.type==="wallet") {
    const w = state.wallet;
    const available = Boolean(getProvider());
    return `<div class="overlay"><div class="dialog" role="dialog" aria-labelledby="w-title">
      <button class="x" data-close="1" aria-label="Close">${I.x}</button>
      <h2 id="w-title">Connect a wallet</h2>
      <p class="desc">Read-only. Remaindr asks for your address and token balances on Ethereum — never a transaction, never your keys.</p>
      ${!available?`<p class="banner" style="margin-top:1rem">No injected wallet in this browser. Holdings on a CEX, a hardware wallet, or another chain can be typed in manually.</p>`:""}
      ${available && !w.address ? `<div style="margin-top:1rem"><button class="btn btn-primary" data-act="connect" ${w.busy?"disabled":""}>${I.wallet} ${w.busy?"Connecting…":"Connect Ethereum wallet"}</button></div>`:""}
      ${w.address ? `<div style="margin-top:1rem">
        <p class="held">Connected <span class="mono" style="color:var(--fg)">${esc(w.address.slice(0,6)+"…"+w.address.slice(-4))}</span></p>
        ${w.bals.length===0?`<p class="held" style="margin-top:8px">No catalog tokens found on this address. You can still enter holdings by hand.</p>`:`
        <ul class="bal" style="margin-top:8px">${w.bals.map(b=>{
          const maps = state.holdings.find(h=>h.symbol===b.maps)||state.holdings.find(h=>h.symbol===b.symbol);
          return `<li><label><input type="checkbox" data-tok="${esc(b.symbol)}" ${w.selected[b.symbol]?"checked":""}/><span style="flex:1;font-size:14px"><b>${esc(b.symbol)}</b> <span class="held">${esc(formatCoins(b.amount,b.symbol))}</span></span><span class="held">${maps?"→ "+maps.symbol+" target":"add as target"}</span></label></li>`;
        }).join("")}</ul>
        <div style="margin-top:12px"><button class="btn btn-primary" data-act="apply-wallet" ${w.busy?"disabled":""}>${w.busy?"Applying…":"Apply selected"}</button></div>`}
      </div>`:""}
      ${w.err?`<p class="err">${esc(w.err)}</p>`:""}
    </div></div>`;
  }
  const taken = new Set(state.holdings.map(h=>h.symbol));
  const q = (d.query||"").trim().toLowerCase();
  const matches = ASSETS.filter(a => !q || a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.id.includes(q)).slice(0,12);
  return `<div class="overlay"><div class="dialog" role="dialog" aria-labelledby="a-title">
    <button class="x" data-close="1" aria-label="Close">${I.x}</button>
    <h2 id="a-title">${d.edit?`Edit ${esc(d.edit.symbol)}`:"Add a target"}</h2>
    <p class="desc">Set how much you want to hold. Current amount can be typed in or filled from a wallet later.</p>
    ${!d.edit?`<div style="margin-top:1rem">
      <label class="lbl" for="asset-search">Asset</label>
      ${!d.custom?`<input id="asset-search" value="${esc(d.query||"")}" placeholder="Search Bitcoin, ETH, SOL…" autocomplete="off" />
      <div class="asset-grid" style="margin-top:8px">${matches.map(a=>{
        const on = d.asset?.symbol===a.symbol;
        return `<button type="button" class="asset ${on?"on":""}" data-pick="${a.symbol}" ${taken.has(a.symbol)?"disabled":""}><b>${esc(a.symbol)}</b><small>${taken.has(a.symbol)?"Added":esc(a.name)}</small></button>`;
      }).join("")}</div>`:`<div class="fields">
        <div><label class="lbl" for="csym">Symbol</label><input id="csym" value="${esc(d.csym)}" placeholder="HYPE"/></div>
        <div><label class="lbl" for="cid">CoinGecko id</label><input id="cid" value="${esc(d.cid)}" placeholder="hyperliquid"/></div>
      </div>`}
      <button type="button" class="linkish" style="margin-top:8px" data-act="toggle-custom">${d.custom?"Choose from the list":"Asset not listed? Add by CoinGecko id"}</button>
    </div>`:""}
    <div class="fields" style="margin-top:1rem">
      <div><label class="lbl" for="tamt">Target amount</label><input id="tamt" inputmode="decimal" value="${esc(d.target)}" placeholder="1.0"/></div>
      <div><label class="lbl" for="camt">Current holding</label><input id="camt" inputmode="decimal" value="${esc(d.current)}" placeholder="0"/></div>
    </div>
    ${d.err?`<p class="err">${esc(d.err)}</p>`:""}
    <div class="actions" style="margin-top:1rem;justify-content:flex-end">
      <button class="btn btn-ghost" data-close="1">Cancel</button>
      <button class="btn btn-primary" data-act="save-holding">${d.edit?"Save":"Add target"}</button>
    </div>
  </div></div>`;
}

document.getElementById("app").addEventListener("click", (e) => {
  if (e.target.classList.contains("overlay")) { closeDialog(); return; }
  const inside = e.target.closest(".dialog");
  const t = e.target.closest("[data-act],[data-menu],[data-edit],[data-plan],[data-del],[data-close],[data-freq],[data-pick]");
  if (inside && (!t || !inside.contains(t))) return;
  if (t?.hasAttribute("data-close")) { closeDialog(); return; }
  if (!t) { if (state.menu) { state.menu=null; render(); } return; }
  if (t.dataset.act==="signin") openSignIn();
  else if (t.dataset.act==="add") openAdd();
  else if (t.dataset.act==="wallet") openWallet();
  else if (t.dataset.act==="sample") { Object.assign(state, makeSample()); persist(); render(); }
  else if (t.dataset.act==="save-plan") savePlan();
  else if (t.dataset.act==="clear-plan") clearPlan(t.dataset.id);
  else if (t.dataset.act==="connect") connectWallet();
  else if (t.dataset.act==="apply-wallet") applyWallet();
  else if (t.dataset.act==="save-holding") saveHolding();
  else if (t.dataset.act==="toggle-custom") { state.dialog.custom=!state.dialog.custom; render(); }
  else if (t.dataset.menu) { state.menu = state.menu===t.dataset.menu ? null : t.dataset.menu; render(); }
  else if (t.dataset.edit) { const h=state.holdings.find(x=>x.id===t.dataset.edit); state.menu=null; openAdd(h); }
  else if (t.dataset.plan) { state.dcaId=t.dataset.plan; state.menu=null; render(); document.getElementById("dca")?.scrollIntoView({behavior:"smooth",block:"start"}); }
  else if (t.dataset.del) { removeHolding(t.dataset.del); }
  else if (t.dataset.freq) { state.form.freq=t.dataset.freq; render(); }
  else if (t.dataset.pick) { state.dialog.asset = ASSETS.find(a=>a.symbol===t.dataset.pick); render(); }
});
document.getElementById("app").addEventListener("change", (e) => {
  if (e.target.id==="dca-asset") { state.dcaId=e.target.value; render(); }
  if (e.target.dataset.tok) { state.wallet.selected[e.target.dataset.tok]=e.target.checked; }
});
document.getElementById("app").addEventListener("input", (e) => {
  const d = state.dialog;
  if (e.target.id==="dca-date") state.form.date=e.target.value;
  if (e.target.id==="dca-price") state.form.assumed=e.target.value;
  if (e.target.id==="asset-search") { d.query=e.target.value; render(); e.target.focus(); const el=document.getElementById("asset-search"); if(el){ el.value=d.query; el.focus(); el.setSelectionRange(d.query.length,d.query.length);} }
  if (e.target.id==="tamt") d.target=e.target.value;
  if (e.target.id==="camt") d.current=e.target.value;
  if (e.target.id==="csym") d.csym=e.target.value;
  if (e.target.id==="cid") d.cid=e.target.value;
  if (e.target.id==="dca-date" || e.target.id==="dca-price") {
    clearTimeout(window.__dcaT);
    window.__dcaT = setTimeout(render, 250);
  }
});

render();
loadPrices();
setInterval(loadPrices, 60000);
