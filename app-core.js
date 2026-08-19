let ASSETS = BAKED.slice();


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
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>',
  sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 16 4 4 4-4"/><path d="M7 20V4"/><path d="m21 8-4-4-4 4"/><path d="M17 4v16"/></svg>',
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
function formatUpdated(at){
  if (!at) return "not yet";
  const sec = Math.max(0, Math.round((Date.now()-at)/1000));
  if (sec < 15) return "just now";
  if (sec < 60) return sec+"s ago";
  const min = Math.round(sec/60);
  if (min < 60) return min+"m ago";
  return new Date(at).toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"});
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

const SORT_KEY = "remainder.sort";
const SORTS = [
  { id:"added", label:"Added order", group:"" },
  { id:"held-desc", label:"High to low", group:"Current value" },
  { id:"held-asc", label:"Low to high", group:"Current value" },
  { id:"pct-desc", label:"High to low", group:"% of target" },
  { id:"pct-asc", label:"Low to high", group:"% of target" },
  { id:"target-desc", label:"High to low", group:"Target value" },
  { id:"target-asc", label:"Low to high", group:"Target value" },
];
function loadSort(){
  try {
    const raw = localStorage.getItem(SORT_KEY);
    if (SORTS.some(s => s.id===raw)) return raw;
  } catch {}
  return "added";
}
function saveSort(id){ try { localStorage.setItem(SORT_KEY, id); } catch {} }

const state = {
  ...load(),
  prices: {},
  priceOk: false,
  priceAt: 0,
  priceBusy: false,
  sort: loadSort(),
  sortOpen: false,
  menu: null,
  dialog: null,
  dcaId: null,
  form: {},
  wallet: { address:null, bals:[], selected:{}, busy:false, err:null },
};

function persist(){ save({ holdings: state.holdings, plans: state.plans }); }
function metricOf(h, kind){
  if (kind==="pct") return h.target>0 ? h.current/h.target : (h.current>0?1:0);
  const p = state.prices[h.idg];
  if (p==null || !Number.isFinite(p)) return 0;
  return (kind==="held" ? h.current : h.target) * p;
}
function sortedHoldings(){
  const list = state.holdings;
  const sort = state.sort || "added";
  if (sort==="added" || list.length<2) return list;
  const dir = sort.endsWith("desc") ? -1 : 1;
  const kind = sort.startsWith("held") ? "held" : sort.startsWith("pct") ? "pct" : "target";
  return list.slice().sort((a,b) => {
    const va = metricOf(a, kind), vb = metricOf(b, kind);
    if (va===vb) return String(a.symbol).localeCompare(b.symbol);
    return (va-vb)*dir;
  });
}

function applyCatalog(rows){
  if (!Array.isArray(rows) || rows.length < 50) return false;
  const seen = new Set();
  const next = [];
  const prices = {};
  for (const row of rows) {
    const symbol = String(row.symbol || "").toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    const baked = BAKED.find(a => a.symbol === symbol);
    const id = baked?.id || String(row.nameid || row.id || symbol.toLowerCase());
    const price = Number(row.price_usd || row.price || row.quotes && row.quotes.USD && row.quotes.USD.price);
    const dec = baked?.decimals ?? (price >= 1000 ? 6 : price >= 10 ? 4 : price >= 0.1 ? 3 : price >= 0.01 ? 2 : 0);
    next.push({ symbol, name: row.name || baked?.name || symbol, id, decimals: dec, rank: Number(row.rank) || next.length + 1, pair: baked?.pair });
    if (price > 0) prices[id] = price;
  }
  if (next.length < 50) return false;
  ASSETS = next;
  if (Object.keys(prices).length >= 3) { state.prices = prices; state.priceOk = true; state.priceAt = Date.now(); }
  return true;
}

async function loadCatalog(){
  try {
    const res = await fetch("https://api.coinlore.net/api/tickers/?start=0&limit=100");
    if (res.ok) {
      const json = await res.json();
      if (applyCatalog(json.data || json)) { render(); return; }
    }
  } catch {}
  try {
    const res = await fetch("https://api.coinpaprika.com/v1/tickers?quotes=USD");
    if (res.ok) {
      const rows = (await res.json()).slice().sort((a,b)=>(a.rank||999)-(b.rank||999)).slice(0,100);
      if (applyCatalog(rows)) { render(); return; }
    }
  } catch {}
}

async function loadPrices(force){
  if (state.priceBusy) return;
  state.priceBusy = true;
  if (force) render();
  const bust = force ? "&t="+Date.now() : "";
  try {
    try {
      const res = await fetch("https://api.coinlore.net/api/tickers/?start=0&limit=100"+bust);
      if (res.ok) {
        const json = await res.json();
        if (applyCatalog(json.data || json) && state.priceOk) return;
      }
    } catch {}
    const prices = {};
    await Promise.all(ASSETS.filter(a=>a.pair).map(async a => {
      try {
        const res = await fetch("https://api.coinbase.com/v2/prices/"+a.pair+"/spot");
        if (!res.ok) return;
        const n = Number((await res.json()).data?.amount);
        if (n > 0) prices[a.id] = n;
      } catch {}
    }));
    if (!prices.tether) prices.tether = 1;
    if (!prices["usd-coin"]) prices["usd-coin"] = 1;
    if (Object.keys(prices).length >= 3) {
      state.prices = Object.assign({}, state.prices, prices);
      state.priceOk = true;
      state.priceAt = Date.now();
    }
  } finally {
    state.priceBusy = false;
    render();
  }
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
