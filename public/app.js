const API = "/api";

let token = localStorage.getItem("r6_token");
let currentUser = null;
let currentOrders = [];

const $ = (selector) => document.querySelector(selector);

const statusOrder = [
"received",
"paid",
"reviewing",
"in_progress",
"ready",
"completed"
];

const serviceNames = {
settings: "R6 Settings Recovery",
fps: "FPS Optimization",
full: "Full PC + R6 Recovery",
vod: "R6 VOD Review"
};

/* =========================
HELPERS
========================= */

function escapeHtml(value) {
return String(value ?? "").replace(
/[&<>"']/g,
(char) => ({
"&": "&",
"<": "<",
">": ">",
'"': """,
"'": "'"
})[char]
);
}

function showToast(message, error = false) {
const toast = $("#toast");

if (!toast) {
console.log(message);
return;
}

const item = document.createElement("div");

item.className = error
? "toast bad"
: "toast";

item.textContent = message;

toast.appendChild(item);

setTimeout(() => {
item.remove();
}, 4000);
}

function formatDate(dateValue) {
if (!dateValue) return "—";

const date = new Date(dateValue);

if (Number.isNaN(date.getTime())) {
return "—";
}

return date.toLocaleDateString();
}

function formatDateTime(dateValue) {
if (!dateValue) return "—";

const date = new Date(dateValue);

if (Number.isNaN(date.getTime())) {
return "—";
}

return date.toLocaleString();
}

/* =========================
API REQUEST
========================= */

async function api(path, options = {}) {
const headers = {
...(options.headers || {})
};

if (token) {
headers.Authorization = `Bearer ${token}`;
}

if (
options.body &&
!(options.body instanceof FormData)
) {
headers["Content-Type"] = "application/json";
}

const response = await fetch(
API + path,
{
...options,
headers
}
);

let data = {};

try {
data = await response.json();
} catch {
data = {};
}

if (!response.ok) {
throw new Error(
data.error ||
`Server error (${response.status})`
);
}

return data;
}

/* =========================
SECTION CONTROL
========================= */

function showSection(id) {
const sections = [
"auth",
"dashboard",
"admin"
];

sections.forEach((sectionId) => {
const element = $(`#${sectionId}`);

```
if (!element) return;

element.classList.add("hidden");
```

});

const target = $(`#${id}`);

if (target) {
target.classList.remove("hidden");
}
}

/* =========================
NAVIGATION
========================= */

function updateNav() {
const navAuth = $("#navAuth");

if (!navAuth) return;

if (!token || !currentUser) {
navAuth.innerHTML = `       <button
        class="btn btn-small"
        data-action="login"       >
        CREATE ACCOUNT       </button>
    `;

```
return;
```

}

navAuth.innerHTML = `     <button
      class="btn btn-small"
      data-action="dashboard"     >
      ${
        currentUser.role === "admin"
          ? "COMMAND CENTER"
          : "DASHBOARD"
      }     </button>
  `;
}

function openLogin() {
location.hash = "auth";

showSection("auth");

const login = $("#loginForm");
const register = $("#registerForm");

if (login) {
login.classList.remove("hidden");
}

if (register) {
register.classList.add("hidden");
}
}

function openRegister() {
location.hash = "auth";

showSection("auth");

const login = $("#loginForm");
const register = $("#registerForm");

if (login) {
login.classList.add("hidden");
}

if (register) {
register.classList.remove("hidden");
}
}

/* =========================
LOAD ACCOUNT
========================= */

async function loadMe() {
if (!token) {
updateNav();
return;
}

try {
console.log("[R6R] Loading /api/me...");

```
const data = await api("/me");

console.log("[R6R] /api/me response:", data);

if (!data.user) {
  throw new Error(
    "No user was returned by the server."
  );
}

currentUser = data.user;

currentOrders = Array.isArray(data.orders)
  ? data.orders
  : [];

console.log(
  "[R6R] Orders returned:",
  currentOrders
);

updateNav();

if (currentUser.role === "admin") {
  await loadAdmin();
  return;
}

renderDashboard();
```

} catch (error) {
console.error(
"[R6R] Dashboard error:",
error
);

```
if (
  error.message.toLowerCase().includes("token") ||
  error.message.toLowerCase().includes("unauthorized") ||
  error.message.includes("(401)")
) {
  token = null;
  currentUser = null;
  currentOrders = [];

  localStorage.removeItem("r6_token");

  updateNav();
  openLogin();

  showToast(
    "Your session expired. Please sign in again.",
    true
  );

  return;
}

showSection("dashboard");

const orders = $("#orders");

if (orders) {
  orders.innerHTML = `
    <div class="statusBox">
      <strong
        style="
          display:block;
          color:var(--white);
          margin-bottom:8px;
        "
      >
        DASHBOARD CONNECTION ERROR
      </strong>

      <p
        style="
          color:#697584;
          font-size:9px;
          line-height:1.6;
        "
      >
        ${escapeHtml(error.message)}
      </p>

      <button
        class="btn btn-hot"
        style="margin-top:14px"
        data-action="dashboard"
      >
        RETRY →
      </button>
    </div>
  `;
}

showToast(
  "Could not load your dashboard.",
  true
);
```

}
}

/* =========================
RENDER DASHBOARD
========================= */

function renderDashboard() {
showSection("dashboard");

const firstName =
currentUser?.name
?.trim()
?.split(/\s+/)[0] ||
"OPERATOR";

const dashName = $("#dashName");

if (dashName) {
dashName.textContent =
firstName.toUpperCase();
}

const orderCount = $("#orderCount");

if (orderCount) {
orderCount.textContent =
currentOrders.length;
}

renderProfile();
renderOrders();
renderStatus();
}

/* =========================
PROFILE
========================= */

function renderProfile() {
const profile = $("#profile");

if (!profile) return;

const completed =
currentOrders.filter(
(order) =>
order.status === "completed"
).length;

profile.innerHTML = ` <div class="profileCard">

```
  <div class="profileOrb"></div>

  <div>
    <h3>
      ${escapeHtml(
        currentUser?.name ||
        "Operator"
      )}
    </h3>

    <p>
      ${escapeHtml(
        currentUser?.email ||
        ""
      )}

      /

      CUSTOMER ID

      ${escapeHtml(
        String(
          currentUser?.id || ""
        ).padStart(4, "0")
      )}
    </p>
  </div>

  <div class="profileStats">

    <div>
      <strong>
        ${currentOrders.length}
      </strong>

      <span>
        ORDERS
      </span>
    </div>

    <div>
      <strong>
        ${completed}
      </strong>

      <span>
        COMPLETED
      </span>
    </div>

    <div>
      <strong>
        ONLINE
      </strong>

      <span>
        PROFILE
      </span>
    </div>

  </div>

</div>
```

`;
}

/* =========================
ORDERS
========================= */

function renderOrders() {
const container = $("#orders");

if (!container) {
console.error(
"[R6R] #orders element not found."
);

```
return;
```

}

if (currentOrders.length === 0) {
container.innerHTML = ` <div class="statusBox">

```
    <p
      style="
        color:#697584;
        font-size:9px;
        line-height:1.6;
      "
    >
      No orders yet.
      Choose an operation
      and launch your first recovery.
    </p>

    <a
      class="btn btn-hot"
      href="#services"
    >
      EXPLORE SERVICES →
    </a>

  </div>
`;

return;
```

}

container.innerHTML =
currentOrders
.map((order) => {
const status =
String(
order.status ||
"received"
)
.replaceAll("_", " ")
.toUpperCase();

```
    const payment =
      String(
        order.payment_status ||
        "unpaid"
      ).toUpperCase();

    return `
      <div
        class="orderRow"
        data-order-id="${escapeHtml(
          order.id
        )}"
      >

        <div class="orderTop">

          <strong>
            #${escapeHtml(
              order.id
            )}

            ·

            ${escapeHtml(
              serviceNames[
                order.service
              ] ||
              order.service ||
              "R6 Recovery"
            )}
          </strong>

          <span class="status">
            ${escapeHtml(status)}
          </span>

        </div>

        <div class="orderMeta">
          ${escapeHtml(payment)}
          /
          ${escapeHtml(
            order.platform ||
            "Unknown"
          )}
          /
          ${formatDate(
            order.created_at
          )}
        </div>

        ${
          order.r6_username
            ? `
              <div class="orderMeta">
                R6:
                ${escapeHtml(
                  order.r6_username
                )}
              </div>
            `
            : ""
        }

        ${
          order.discord_username
            ? `
              <div class="orderMeta">
                DISCORD:
                ${escapeHtml(
                  order.discord_username
                )}
              </div>
            `
            : ""
        }

        ${
          order.details
            ? `
              <div
                class="orderMeta"
                style="
                  margin-top:8px;
                  color:#8d98a6;
                "
              >
                ${escapeHtml(
                  order.details
                )}
              </div>
            `
            : ""
        }

        ${
          order.admin_note
            ? `
              <div
                class="orderMeta"
                style="
                  margin-top:8px;
                  color:var(--cyan);
                "
              >
                ADMIN:
                ${escapeHtml(
                  order.admin_note
                )}
              </div>
            `
            : ""
        }

      </div>
    `;
  })
  .join("");
```

}

/* =========================
STATUS PANEL
========================= */

function renderStatus() {
const panel =
$("#statusPanel");

if (!panel) return;

if (currentOrders.length === 0) {
panel.innerHTML = ` <div class="statusBox">

```
    <p
      style="
        color:#697584;
        font-size:9px;
        line-height:1.6;
      "
    >
      Your next recovery
      will appear here.
    </p>

  </div>
`;

return;
```

}

renderSelectedStatus(
currentOrders[0]
);
}

function renderSelectedStatus(order) {
const panel =
$("#statusPanel");

if (!panel) return;

const status =
order.status ||
"received";

const currentIndex =
statusOrder.indexOf(status);

const stages = statusOrder
.map((stage, index) => {

```
  let className = "";

  if (
    index < currentIndex
  ) {
    className = "done";
  }

  if (
    index === currentIndex
  ) {
    className = "current";
  }

  return `
    <div class="stage ${className}">
      ${
        index < currentIndex
          ? "✓ "
          : ""
      }
      ${escapeHtml(
        stage
          .replaceAll(
            "_",
            " "
          )
          .toUpperCase()
      )}
    </div>
  `;
})
.join("");
```

panel.innerHTML = ` <div class="statusBox">

```
  <div class="statusTrack">
    ${stages}
  </div>

  ${
    order.payment_status !== "paid"
      ? `
        <button
          class="btn btn-hot"
          style="
            width:100%;
            margin-top:18px;
          "
          data-pay="${escapeHtml(
            order.id
          )}"
        >
          PAY ORDER →
        </button>
      `
      : ""
  }

  <div
    style="
      margin-top:16px;
      font:500 7px DM Mono;
      color:#596675;
    "
  >
    ORDER #${escapeHtml(
      order.id
    )}

    /

    UPDATED

    ${formatDateTime(
      order.updated_at
    )}
  </div>

</div>
```

`;
}

/* =========================
ORDER MODAL
========================= */

function createOrder(service, serviceLabel = "") {
if (!token) {
showToast(
"Sign in first to create an order.",
true
);

```
openLogin();

return;
```

}

const existing =
$("#orderModal");

if (existing) {
existing.remove();
}

const modal =
document.createElement("div");

modal.id =
"orderModal";

modal.innerHTML = ` <div class="modalBack">

```
  <div class="modal">

    <button
      class="close"
      type="button"
    >
      ×
    </button>

    <div class="kicker">
      <i></i>
      NEW OPERATION
    </div>

    <h2>
      ${escapeHtml(
        serviceLabel ||
        serviceNames[service] ||
        "R6 Recovery"
      )}
    </h2>

    <label>
      PLATFORM

      <select id="oPlatform">
        <option value="PC">
          PC
        </option>

        <option value="PlayStation">
          PlayStation
        </option>

        <option value="Xbox">
          Xbox
        </option>
      </select>
    </label>

    <label>
      R6 USERNAME

      <input
        id="oR6"
        placeholder="Your in-game username"
      >
    </label>

    <label>
      DISCORD

      <input
        id="oDiscord"
        placeholder="username"
      >
    </label>

    <label>
      RECOVERY DETAILS

      <textarea
        id="oDetails"
        placeholder="Tell us what you need help with..."
      ></textarea>
    </label>

    <label
      style="
        display:flex;
        gap:8px;
        align-items:flex-start;
        margin-top:10px;
      "
    >

      <input
        id="oTerms"
        type="checkbox"
        style="width:auto;margin-top:2px"
      >

      <span
        style="
          font-size:9px;
          line-height:1.5;
        "
      >
        I agree to the

        <a
          href="/terms.html"
          target="_blank"
          style="
            color:var(--cyan);
            text-decoration:underline;
          "
        >
          Terms of Service
        </a>

        and

        <a
          href="/privacy.html"
          target="_blank"
          style="
            color:var(--cyan);
            text-decoration:underline;
          "
        >
          Privacy Policy
        </a>.

      </span>

    </label>

    <button
      class="btn btn-hot"
      id="createOrder"
      type="button"
    >
      LAUNCH OPERATION →
    </button>

  </div>

</div>
```

`;

document.body.appendChild(modal);

modal.querySelector(".close").onclick =
() => modal.remove();

modal.querySelector(".modalBack").onclick =
(event) => {
if (
event.target.classList.contains(
"modalBack"
)
) {
modal.remove();
}
};

$("#createOrder").onclick =
async () => {

```
  try {
    const details =
      $("#oDetails")
        ?.value
        ?.trim() || "";

    const accepted =
      $("#oTerms")
        ?.checked;

    if (!details) {
      showToast(
        "Please enter recovery details.",
        true
      );

      return;
    }

    if (!accepted) {
      showToast(
        "Please accept the Terms and Privacy Policy.",
        true
      );

      return;
    }

    const data =
      await api(
        "/orders",
        {
          method: "POST",

          body: JSON.stringify({
            service,
            platform:
              $("#oPlatform").value,
            r6_username:
              $("#oR6").value.trim(),
            discord_username:
              $("#oDiscord").value.trim(),
            details
          })
        }
      );

    modal.remove();

    showToast(
      `Order #${data.order.id} created.`
    );

    await loadMe();

    location.hash =
      "dashboard";

  } catch (error) {
    console.error(
      "[R6R] Create order error:",
      error
    );

    showToast(
      error.message,
      true
    );
  }
};
```

}

/* =========================
LOGIN
========================= */

async function login() {
try {
const email =
$("#loginEmail")
?.value
?.trim() || "";

```
const password =
  $("#loginPassword")
    ?.value || "";

if (!email || !password) {
  showToast(
    "Enter your email and password.",
    true
  );

  return;
}

const data =
  await api(
    "/auth/login",
    {
      method: "POST",

      body: JSON.stringify({
        email,
        password
      })
    }
  );

token = data.token;
currentUser = data.user;

localStorage.setItem(
  "r6_token",
  token
);

showToast(
  "Access granted."
);

await loadMe();

location.hash =
  currentUser.role === "admin"
    ? "admin"
    : "dashboard";
```

} catch (error) {
console.error(
"[R6R] Login error:",
error
);

```
showToast(
  error.message,
  true
);
```

}
}

/* =========================
REGISTER
========================= */

async function register() {
try {
const name =
$("#regName")
?.value
?.trim() || "";

```
const email =
  $("#regEmail")
    ?.value
    ?.trim() || "";

const password =
  $("#regPassword")
    ?.value || "";

if (!name || !email || !password) {
  showToast(
    "Please complete every field.",
    true
  );

  return;
}

const data =
  await api(
    "/auth/register",
    {
      method: "POST",

      body: JSON.stringify({
        name,
        email,
        password
      })
    }
  );

token = data.token;
currentUser = data.user;

localStorage.setItem(
  "r6_token",
  token
);

showToast(
  "Profile created."
);

await loadMe();

location.hash =
  "dashboard";
```

} catch (error) {
console.error(
"[R6R] Registration error:",
error
);

```
showToast(
  error.message,
  true
);
```

}
}

/* =========================
PAY
========================= */

async function pay(orderId) {
try {
showToast(
"Creating secure checkout..."
);

```
const data =
  await api(
    "/payments/checkout",
    {
      method: "POST",

      body: JSON.stringify({
        order_id:
          Number(orderId)
      })
    }
  );

if (data.demo) {
  showToast(
    "Demo payment completed."
  );

  await loadMe();

  return;
}

if (!data.url) {
  throw new Error(
    "Stripe checkout could not be created."
  );
}

window.location.href =
  data.url;
```

} catch (error) {
console.error(
"[R6R] Payment error:",
error
);

```
showToast(
  error.message,
  true
);
```

}
}

/* =========================
ADMIN
========================= */

async function loadAdmin() {
try {
const stats =
await api(
"/admin/stats"
);

```
const data =
  await api(
    "/admin/orders"
  );

showSection("admin");

const statsContainer =
  $("#adminStats");

if (statsContainer) {
  statsContainer.innerHTML = `
    <div class="adminStat">
      <strong>${escapeHtml(
        stats.total
      )}</strong>
      <span>TOTAL ORDERS</span>
    </div>

    <div class="adminStat">
      <strong>${escapeHtml(
        stats.active
      )}</strong>
      <span>ACTIVE OPERATIONS</span>
    </div>

    <div class="adminStat">
      <strong>${escapeHtml(
        stats.paid
      )}</strong>
      <span>PAID</span>
    </div>

    <div class="adminStat">
      <strong>${escapeHtml(
        stats.customers
      )}</strong>
      <span>CUSTOMERS</span>
    </div>
  `;
}

const orders =
  $("#adminOrders");

if (!orders) return;

if (
  !data.orders ||
  data.orders.length === 0
) {
  orders.innerHTML = `
    <div class="statusBox">
      No orders.
    </div>
  `;

  return;
}

orders.innerHTML =
  data.orders
    .map(
      (order) => `
        <div class="adminItem">

          <div>
            <strong>
              #${escapeHtml(order.id)}
              ·
              ${escapeHtml(
                serviceNames[
                  order.service
                ] ||
                order.service
              )}
            </strong>

            <small>
              ${escapeHtml(
                order.customer_name ||
                ""
              )}
              /
              ${escapeHtml(
                order.customer_email ||
                ""
              )}
            </small>
          </div>

          <div>
            <strong>
              ${escapeHtml(
                order.platform
              )}
            </strong>

            <small>
              ${escapeHtml(
                order.r6_username ||
                "No R6 username"
              )}
            </small>
          </div>

          <select
            data-status="${escapeHtml(
              order.id
            )}"
          >
            ${[
              "received",
              "paid",
              "reviewing",
              "in_progress",
              "ready",
              "completed",
              "cancelled"
            ]
              .map(
                (status) => `
                  <option
                    value="${status}"
                    ${
                      order.status ===
                      status
                        ? "selected"
                        : ""
                    }
                  >
                    ${status}
                  </option>
                `
              )
              .join("")}
          </select>

          <input
            data-note="${escapeHtml(
              order.id
            )}"
            value="${escapeHtml(
              order.admin_note ||
              ""
            )}"
            placeholder="Internal note"
          >

          <button
            class="btn btn-small"
            data-save="${escapeHtml(
              order.id
            )}"
            type="button"
          >
            SAVE
          </button>

        </div>
      `
    )
    .join("");
```

} catch (error) {
console.error(
"[R6R] Admin error:",
error
);

```
showToast(
  error.message,
  true
);
```

}
}

async function saveAdmin(orderId) {
try {
const status =
document.querySelector(
`[data-status="${orderId}"]`
)?.value || "received";

```
const note =
  document.querySelector(
    `[data-note="${orderId}"]`
  )?.value || "";

await api(
  `/admin/orders/${orderId}`,
  {
    method: "PATCH",

    body: JSON.stringify({
      status,
      admin_note: note
    })
  }
);

showToast(
  `Order #${orderId} updated.`
);

await loadAdmin();
```

} catch (error) {
console.error(
"[R6R] Admin update error:",
error
);

```
showToast(
  error.message,
  true
);
```

}
}

/* =========================
OPERATION CATALOG TABS
========================= */

function initCatalogTabs() {
const tabs =
document.querySelectorAll(".catalogTab");

const panels =
document.querySelectorAll(".catalogPanel");

if (!tabs.length || !panels.length) {
console.warn(
"[R6R] Catalog tabs or panels were not found."
);

```
return;
```

}

tabs.forEach((tab) => {
tab.addEventListener("click", () => {
const tabName =
tab.dataset.tab;

```
  tabs.forEach((button) => {
    button.classList.remove("active");
    button.setAttribute(
      "aria-selected",
      "false"
    );
  });

  panels.forEach((panel) => {
    panel.classList.remove("active");
  });

  tab.classList.add("active");
  tab.setAttribute(
    "aria-selected",
    "true"
  );

  const panel =
    document.querySelector(
      `.catalogPanel[data-panel="${tabName}"]`
    );

  if (panel) {
    panel.classList.add("active");
  } else {
    console.error(
      `[R6R] No catalog panel found for "${tabName}".`
    );
  }
});
```

});

console.log(
`[R6R] Catalog tabs initialized: ${tabs.length}`
);
}

/* =========================
CLICK HANDLER
========================= */

document.addEventListener(
"click",
async (event) => {

```
const action =
  event.target.closest(
    "[data-action]"
  );

if (action) {

  const type =
    action.dataset.action;

  if (type === "login") {
    openLogin();
    return;
  }

  if (type === "dashboard") {
    if (
      currentUser?.role ===
      "admin"
    ) {
      await loadAdmin();
    } else {
      await loadMe();
    }

    location.hash =
      currentUser?.role === "admin"
        ? "admin"
        : "dashboard";

    return;
  }

  if (type === "logout") {
    logout();
    return;
  }
}

const switchButton =
  event.target.closest(
    "[data-switch]"
  );

if (switchButton) {

  if (
    switchButton.dataset.switch ===
    "register"
  ) {
    openRegister();
  } else {
    openLogin();
  }

  return;
}

const submit =
  event.target.closest(
    "[data-submit]"
  );

if (submit) {

  if (
    submit.dataset.submit ===
    "login"
  ) {
    await login();
  }

  if (
    submit.dataset.submit ===
    "register"
  ) {
    await register();
  }

  return;
}

const service =
  event.target.closest(
    "[data-order]"
  );

if (service) {
  createOrder(
    service.dataset.order,
    service.dataset.serviceLabel || ""
  );

  return;
}

const payment =
  event.target.closest(
    "[data-pay]"
  );

if (payment) {
  await pay(
    payment.dataset.pay
  );

  return;
}

const order =
  event.target.closest(
    "[data-order-id]"
  );

if (order) {

  const id =
    String(
      order.dataset.orderId
    );

  const selected =
    currentOrders.find(
      (item) =>
        String(item.id) === id
    );

  if (selected) {
    renderSelectedStatus(
      selected
    );
  }

  return;
}

const save =
  event.target.closest(
    "[data-save]"
  );

if (save) {
  await saveAdmin(
    save.dataset.save
  );
}
```

}
);

/* =========================
LOGOUT
========================= */

function logout() {
token = null;
currentUser = null;
currentOrders = [];

localStorage.removeItem(
"r6_token"
);

updateNav();

location.hash = "home";

showToast(
"Signed out."
);
}

/* =========================
ADMIN REFRESH
========================= */

const refreshAdmin =
$("#refreshAdmin");

if (refreshAdmin) {
refreshAdmin.addEventListener(
"click",
loadAdmin
);
}

/* =========================
HASH ROUTING
========================= */

window.addEventListener(
"hashchange",
async () => {

```
const hash =
  location.hash;

if (
  hash === "#dashboard"
) {
  if (!token) {
    openLogin();
    return;
  }

  if (
    currentUser?.role ===
    "admin"
  ) {
    await loadAdmin();
  } else {
    await loadMe();
  }

  return;
}

if (
  hash === "#auth"
) {
  openLogin();
}
```

}
);

/* =========================
START
========================= */

console.log(
"[R6R] app.js loaded successfully."
);

if (token) {
loadMe();
} else {
updateNav();
}

/*
Initialize catalog tabs after
the page has loaded.
*/

if (
document.readyState === "loading"
) {
document.addEventListener(
"DOMContentLoaded",
initCatalogTabs
);
} else {
initCatalogTabs();
}
