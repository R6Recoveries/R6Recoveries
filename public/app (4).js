const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const API="/api"; let token=localStorage.getItem("r6_token"), me=null;
const statuses=["received","paid","reviewing","in_progress","ready","completed"];

const catalogData = {
  "tab-r6": [
    { id: "r6_config", name: "R6 Config Calibration", price: "$10", desc: "Precision adjustment of ADS scaling, FOV balance, and aspect ratio overrides tailored specifically to display hardware and optical preferences.", items: ["FOV & Aspect Pacing Optimization", "ADS Sensitivity Multiplier Calibration", "Audio Dynamic Range & Night Mode Audit", "Custom Control & Keybind Pacing Checklist"] },
    { id: "vod_review", name: "Tactical VOD Analysis", price: "$15", desc: "Frame-by-frame review of decision-making patterns, positioning vulnerabilities, and crosshair placement habits under high-pressure competitive scenarios.", items: ["Positioning & Utility Efficiency Analysis", "Crosshair Placement & Pre-aim Audit", "Rotational Timing & Drone Usage Notes", "Custom Actionable Improvement Roadmap"] },
    { id: "crosshair_align", name: "Sight Alignment & Visual Clarity", price: "$12", desc: "Eliminate visual noise, optimize reticle contrast, and balance aspect ratio settings to improve target acquisition speed across all magnification optics.", items: ["Reticle Color & Opacity Calibration", "Display Aspect Ratio vs FOV Scaling", "Shadow & Peripheral Distraction Reduction", "Optical Clarity Benchmark Test"] }
  ],
  "tab-perf": [
    { id: "siege_frame", name: "Siege Frame Pacing Engine", price: "$15", desc: "Elimination of engine-level micro-stuttering, GPU render queue bottlenecks, and frametime variance for ultra-consistent frame delivery.", items: ["Engine Thread Allocation Optimization", "Shader Cache Pre-compilation Setup", "Display Render Buffer & Reflex Configuration", "In-Game Graphics vs Latency Tradeoff Audit"] },
    { id: "audio_lat", name: "R6 Audio & Spatial Isolation", price: "$12", desc: "Configuration of spatial audio pipelines and Windows sound settings to enhance footsteps, wall-breach cues, and vertical audio accuracy.", items: ["Spatial Sound & Equalizer Balance", "Windows Audio Sample Rate Matching", "Background Noise Suppression Audit", "Vertical Audio Cue Isolation Setup"] },
    { id: "input_pacing", name: "Input Latency & Raw Input Calibration", price: "$15", desc: "Eliminate mouse delay and smoothing within Siege by aligning raw input protocols with display refresh rates and polling frequencies.", items: ["Raw Input Buffering Optimization", "Polling Rate Stability Benchmark", "Mouse Acceleration Kernel Bypass", "FPS Limiter vs G-Sync Latency Pacing"] }
  ],
  "tab-tweaks": [
    { id: "os_strip", name: "OS Latency & Telemetry Stripping", price: "$20", desc: "Deep Windows optimization designed to strip background telemetry, non-essential services, and kernel interrupt overhead.", items: ["Kernel Interrupt & DPC Latency Tuning", "Power Delivery Profile Optimization", "Background Service & Telemetry Removal", "Game Mode & GPU Scheduling Configuration"] },
    { id: "gpu_driver", name: "GPU Driver Latency Overhaul", price: "$18", desc: "Custom low-latency GPU driver deployment with trimmed background bloat, optimized control panel settings, and custom resolution utility setups.", items: ["Bloat-Free Clean GPU Driver Flash", "NVIDIA / AMD Low Latency Mode Calibration", "Custom Resolution Utility (CRU) Timings", "Power State Management Override"] },
    { id: "network_pacing", name: "Network Packet & Routing Pacing", price: "$15", desc: "Optimization of Windows network stack settings, TCP/UDP packet buffering, and DNS response times to reduce hit-registration delay.", items: ["TCP/IP Stack Latency Tuning", "Nagle Algorithm Kernel Bypass", "Custom DNS & Routing Protocol Setup", "Network Adapter Power Management Removal"] }
  ],
  "tab-full": [
    { id: "full_suite", name: "Full Competitive Recovery Suite", price: "$35", desc: "The ultimate operational package: complete end-to-end system diagnostic, deep OS latency stripdown, target calibration, and Siege engine tuning.", items: ["Full Hardware & System Diagnostic Matrix", "Complete Windows & Kernel Latency Tune", "Siege Graphics & Sensitivity Overhaul", "Network Pacing & Audio Isolation Setup", "Post-Tune Benchmarking & Handoff Report"] },
    { id: "duo_boot", name: "Dedicated Competitive OS Profile", price: "$45", desc: "Setup of a secondary dual-boot, stripped-down Windows installation dedicated exclusively to Rainbow Six Siege for absolute zero background overhead.", items: ["Isolated Minimal OS Partition Setup", "Strict Zero-Background Service State", "Maximum Power & Latency Kernel Profile", "Direct Launch & Single-Game Environment"] }
  ]
};

function toast(msg,bad=false){const x=document.createElement("div");x.className="toast"+(bad?" bad":"");x.textContent=msg;$("#toast").appendChild(x);setTimeout(()=>x.remove(),3800)}
async function api(path,opts={}){opts.headers={...(opts.headers||{}),...(token?{Authorization:`Bearer ${token}`}:{})};if(opts.body&&!(opts.body instanceof FormData))opts.headers["Content-Type"]="application/json";const r=await fetch(API+path,opts);let d={};try{d=await r.json()}catch{}if(!r.ok)throw Error(d.error||"Something went wrong.");return d}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function nav(){const n=$("#navAuth");n.innerHTML=token?`<button class="btn btn-small" data-action="dashboard">${me?.role==="admin"?"COMMAND CENTER":"DASHBOARD"}</button>`:`<button class="btn btn-small" data-action="register">SIGN IN</button>`}
function showOnly(id){["auth","dashboard","admin"].forEach(x=>$("#"+x).classList.add("hidden"));if(id)$("#"+id).classList.remove("hidden")}
function showAuth(mode="register"){location.hash="auth";showOnly("auth");$("#loginForm").classList.toggle("hidden",mode!=="login");$("#registerForm").classList.toggle("hidden",mode!=="register")}
async function loadMe(){if(!token){nav();return}try{const d=await api("/me");me=d.user;renderDashboard(d);nav()}catch{token=null;me=null;localStorage.removeItem("r6_token");nav()}}
function renderDashboard(d){
  showOnly("dashboard");$("#dashName").textContent=(d.user.name||"OPERATOR").split(" ")[0].toUpperCase();$("#orderCount").textContent=d.orders.length;
  $("#profile").innerHTML=`<div class="profileCard"><div class="profileOrb"></div><div><h3>${esc(d.user.name)}</h3><p>${esc(d.user.email)} / CUSTOMER ID ${String(d.user.id).padStart(4,"0")}</p></div><div class="profileStats"><div><strong>${d.orders.length}</strong><span>ORDERS</span></div><div><strong>${d.orders.filter(o=>o.status==="completed").length}</strong><span>COMPLETED</span></div><div><strong>ONLINE</strong><span>PROFILE</span></div></div></div>`;
  $("#orders").innerHTML=d.orders.length?d.orders.map(o=>`<div class="orderRow" data-order-id="${o.id}"><div class="orderTop"><strong>#${o.id} · ${esc(o.service)}</strong><span class="status">${o.status.toUpperCase().replaceAll("_"," ")}</span></div><div class="orderMeta">${o.payment_status.toUpperCase()} / ${esc(o.platform)} / ${new Date(o.created_at+"Z").toLocaleDateString()}</div>${o.admin_note?`<div class="orderMeta" style="color:var(--blue-glow)">${esc(o.admin_note)}</div>`:""}</div>`).join(""):`<div class="statusBox"><p>No orders yet. Choose an operation from the catalog and launch your first recovery.</p><a class="btn btn-hot" href="#services">EXPLORE CATALOG →</a></div>`;
  const current=d.orders[0];$("#statusPanel").innerHTML=current?statusHTML(current):`<div class="statusBox"><p>Your next operation status will appear here.</p></div>`;
}
function statusHTML(o){let idx=statuses.indexOf(o.status);if(o.status==="cancelled")return`<div class="statusBox"><div class="stage current">OPERATION CANCELLED</div></div>`;return`<div class="statusBox"><div class="statusTrack">${statuses.map((s,i)=>`<div class="stage ${i<idx?"done":i===idx?"current":""}">${i<idx?"✓ ":""}${s.replace("_"," ").toUpperCase()}</div>`).join("")}</div>${o.payment_status!=="paid"?`<button class="btn btn-hot" style="width:100%;margin-top:18px" data-pay="${o.id}">PAY ORDER →</button>`:""}<div style="margin-top:16px;font:500 8px 'DM Mono';color:var(--muted)">OPERATION #${o.id} / UPDATED ${new Date(o.updated_at+"Z").toLocaleString()}</div></div>`}
function logout(){token=null;me=null;localStorage.removeItem("r6_token");showOnly(null);nav();location.hash="home";toast("Signed out.")}
async function login(){try{const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:$("#loginEmail").value,password:$("#loginPassword").value})});token=d.token;localStorage.setItem("r6_token",token);me=d.user;toast("Access granted.");me.role==="admin"?loadAdmin():loadMe()}catch(e){toast(e.message,true)}}
async function register(){try{const d=await api("/auth/register",{method:"POST",body:JSON.stringify({name:$("#regName").value,email:$("#regEmail").value,password:$("#regPassword").value})});token=d.token;localStorage.setItem("r6_token",token);me=d.user;toast("Profile created.");loadMe()}catch(e){toast(e.message,true)}}

function createOrder(service){
  if(!token){toast("Please sign in or create an account to launch an operation.",true);return showAuth("register")}
  $("#orderModal")?.remove();
  const m=document.createElement("div");m.id="orderModal";
  m.innerHTML=`<div class="modalBack"><div class="modal"><button class="close">×</button><div class="kicker"><i></i> OPERATION INTAKE PROTOCOL</div><h2>${esc(service)}</h2><label>PLATFORM & REFRESH RATE<select id="oPlatform"><option>PC (144Hz - 240Hz)</option><option>PC (360Hz+ High Refresh)</option><option>PC (60Hz - 120Hz Standard)</option><option>PlayStation 5</option><option>Xbox Series X/S</option></select></label><label>HARDWARE SPECIFICATIONS<input id="oHardware" placeholder="e.g. RTX 3080, i7-12700K, 32GB RAM" required></label><label>PRIMARY OPERATIONAL BOTTLENECK<select id="oIssue"><option>Input Delay / Mouse Smoothing</option><option>FPS Stuttering & Micro-freezes</option><option>Poor Target Acquisition & Visibility</option><option>Audio Footstep Clarity & Spatial Balance</option><option>Comprehensive System & Game Overhaul</option></select></label><label>R6 USERNAME / UBISOFT ID<input id="oR6" placeholder="Your in-game username"></label><label>DISCORD HANDLE<input id="oDiscord" placeholder="username#0000 or handle"></label><label>SENSITIVITY & TARGET GOALS<textarea id="oDetails" placeholder="List your current DPI, in-game sens, or specific performance goals..." required></textarea></label><button class="btn btn-hot" id="createOrder">DEPLOY OPERATION →</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector(".close").onclick=()=>m.remove();
  m.querySelector(".modalBack").onclick=e=>{if(e.target.classList.contains("modalBack"))m.remove()};
  $("#createOrder").onclick=async()=>{
    try{
      const fullDetails = `Hardware: ${$("#oHardware").value} | Main Issue: ${$("#oIssue").value} | Notes: ${$("#oDetails").value}`;
      const d=await api("/orders",{method:"POST",body:JSON.stringify({service,platform:$("#oPlatform").value,r6_username:$("#oR6").value,discord_username:$("#oDiscord").value,details:fullDetails})});
      m.remove();toast(`Operation #${d.order.id} launched.`);await loadMe();location.hash="dashboard";
    }catch(e){toast(e.message,true)}
  }
}

async function pay(id){try{const d=await api("/payments/checkout",{method:"POST",body:JSON.stringify({order_id:id})});if(d.demo)toast("Demo payment complete.");else location.href=d.url;await loadMe()}catch(e){toast(e.message,true)}}
async function loadAdmin(){if(!token)return showAuth("register");try{const s=await api("/admin/stats"),d=await api("/admin/orders");showOnly("admin");$("#adminStats").innerHTML=[[""+s.total,"TOTAL ORDERS"],[""+s.active,"ACTIVE OPERATIONS"],[""+s.paid,"PAID"],[""+s.customers,"CUSTOMERS"]].map(x=>`<div class="adminStat"><strong>${x[0]}</strong><span>${x[1]}</span></div>`).join("");$("#adminOrders").innerHTML=d.orders.length?d.orders.map(o=>`<div class="adminItem"><div><strong>#${o.id} · ${esc(o.service)}</strong><small>${esc(o.customer_name)} / ${esc(o.customer_email)}</small></div><div><strong>${esc(o.platform)}</strong><small>${esc(o.r6_username||"No R6 username")}</small></div><select data-status="${o.id}">${["received","paid","reviewing","in_progress","ready","completed","cancelled"].map(s=>`<option ${s===o.status?"selected":""}>${s}</option>`).join("")}</select><input data-note="${o.id}" value="${esc(o.admin_note||"")}" placeholder="Internal note"><button class="btn btn-small" data-save="${o.id}">SAVE</button></div>`).join(""):`<div class="statusBox">No active orders found.</div>`}catch(e){toast(e.message,true)}}
async function saveAdmin(id){try{const status=$(`[data-status="${id}"]`).value,note=$(`[data-note="${id}"]`).value;await api(`/admin/orders/${id}`,{method:"PATCH",body:JSON.stringify({status,admin_note:note})});toast(`Order #${id} updated.`);loadAdmin()}catch(e){toast(e.message,true)}}

function renderCatalogTab(tabKey) {
  const items = catalogData[tabKey] || [];
  const container = $("#catalogContent");
  if(!container) return;
  container.innerHTML = items.map(item => `
    <article class="serviceCard">
      <div class="cardTop"><span>TACTICAL PROTOCOL</span><b>${item.price}</b></div>
      <h3>${item.name}</h3>
      <p>${item.desc}</p>
      <ul>${item.items.map(i => `<li>${i}</li>`).join("")}</ul>
      <button class="arrowBtn" data-order="${item.name}">SELECT OPERATION <span>→</span></button>
    </article>
  `).join("");
}

document.addEventListener("click",e=>{
  const action=e.target.closest("[data-action]")?.dataset.action;
  if(action==="login")showAuth("login");
  if(action==="register")showAuth("register");
  if(action==="dashboard")me?.role==="admin"?loadAdmin():loadMe();
  if(action==="logout")logout();

  const tabBtn=e.target.closest("[data-tab]")?.dataset.tab;
  if(tabBtn){
    $$(".tabBtn").forEach(b=>b.classList.remove("active"));
    e.target.closest("[data-tab]").classList.add("active");
    renderCatalogTab(tabBtn);
  }

  const service=e.target.closest("[data-order]")?.dataset.order;if(service)createOrder(service);
  const payId=e.target.closest("[data-pay]")?.dataset.pay;if(payId)pay(payId);
  const sw=e.target.closest("[data-switch]")?.dataset.switch;if(sw)showAuth(sw);
  const sub=e.target.closest("[data-submit]")?.dataset.submit;if(sub==="login")login();if(sub==="register")register();
  const save=e.target.closest("[data-save]")?.dataset.save;if(save)saveAdmin(save);
  const orderId=e.target.closest("[data-order-id]")?.dataset.orderId;if(orderId){const o=(window.__orders||[]).find(x=>String(x.id)===String(orderId));if(o)$("#statusPanel").innerHTML=statusHTML(o)}
});

if($("#refreshAdmin")) $("#refreshAdmin").onclick=loadAdmin;
window.addEventListener("hashchange",()=>{if(location.hash==="#dashboard")me?.role==="admin"?loadAdmin():loadMe();if(location.hash==="#auth")showAuth("register")});
const oldRender=renderDashboard;
renderDashboard=function(d){window.__orders=d.orders;oldRender(d)}

renderCatalogTab("tab-r6");
loadMe();
