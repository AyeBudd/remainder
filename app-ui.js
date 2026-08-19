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
        <span>Remainder</span>
      </a>
      <button class="btn btn-outline" data-act="signin">Sign in</button>
    </header>
    <p class="banner">This stack stays in this browser. <button type="button" data-act="signin">Sign in</button> to save it to your account — available when you host Remainder with a database.</p>
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
        <p>Name an asset, a target stack, and what you already hold — wallet or typed in. Remainder shows the capital left, then a path to fill it.</p>
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
    <p class="desc">This public GitHub Pages build keeps your ledger in this browser. Google / X account save needs Remainder hosted with a database (the full app in this repo).</p>
    <div class="actions" style="margin-top:1.25rem;justify-content:flex-end"><button class="btn btn-primary" data-close="1">Keep it local</button></div>
  </div></div>`;
  if (d.type==="wallet") {
    const w = state.wallet;
    const available = Boolean(getProvider());
    return `<div class="overlay"><div class="dialog" role="dialog" aria-labelledby="w-title">
      <button class="x" data-close="1" aria-label="Close">${I.x}</button>
      <h2 id="w-title">Connect a wallet</h2>
      <p class="desc">Read-only. Remainder asks for your address and token balances on Ethereum — never a transaction, never your keys.</p>
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
