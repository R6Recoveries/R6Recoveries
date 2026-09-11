const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const API = "/api";

let token = localStorage.getItem("r6_token");
let me = null;

const statuses = [
  "received",
  "paid",
  "reviewing",
  "in_progress",
  "ready",
  "completed"
];

const serviceNames = {
  settings: "R6 Settings Recovery — $10",
  fps: "FPS Optimization — $15",
  full: "Full PC + R6 Recovery — $25",
  vod: "R6 VOD Review — $10"
};

/* =========================
   UTILITIES
========================= */

function toast(msg, bad = false) {
  const container = $("#toast");

  if (!container) {
    alert(msg);
    return;
  }

  const x = document.createElement("div");

  x.className = "toast" + (bad ? " bad" : "");
  x.textContent = msg;

  container.appendChild(x);

  setTimeout(() => {
    x.remove();
  }, 3800);
}

async function api(path, opts = {}) {
  opts.headers = {
    ...(opts.headers || {}),
    ...(token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {})
  };

  if (
    opts.body &&
    !(opts.body instanceof FormData)
  ) {
    opts.headers["Content-Type"] =
      "application/json";
  }

  const response = await fetch(API + path, opts);

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.error || "Something went wrong."
    );
  }

  return data;
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (match) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[match]
  );
}

/* =========================
   NAVIGATION
========================= */

function nav() {
  const navAuth = $("#navAuth");

  if (!navAuth) return;

  if (token) {
    navAuth.innerHTML = `
      <button
        class="btn btn-small"
        data-action="dashboard"
      >
        ${
          me?.role === "admin"
            ? "COMMAND CENTER"
            : "DASHBOARD"
        }
      </button>
    `;
  } else {
    navAuth.innerHTML = `
      <button
        class="btn btn-small"
        data-action="login"
      >
        SIGN IN
      </button>
    `;
  }
}

function showOnly(id) {
  ["auth", "dashboard", "admin"].forEach(
    (section) => {
      const element = $("#" + section);

      if (element) {
        element.classList.add("hidden");
      }
    }
  );

  if (id) {
    const element = $("#" + id);

    if (element) {
      element.classList.remove("hidden");
    }
  }
}

function showAuth(mode = "login") {
  location.hash = "auth";

  showOnly("auth");

  const loginForm = $("#loginForm");
  const registerForm = $("#registerForm");

  if (loginForm) {
    loginForm.classList.toggle(
      "hidden",
      mode !== "login"
    );
  }

  if (registerForm) {
    registerForm.classList.toggle(
      "hidden",
      mode !== "register"
    );
  }
}

/* =========================
   ACCOUNT
========================= */

async function loadMe() {
  if (!token) {
    nav();
    return;
  }

  try {
    const data = await api("/me");

    me = data.user;

    renderDashboard(data);

    nav();
  } catch {
    token = null;
    me = null;

    localStorage.removeItem("r6_token");

    nav();

    showOnly(null);
  }
}

function renderDashboard(data) {
  showOnly("dashboard");

  const firstName =
    (data.user.name || "OPERATOR")
      .split(" ")[0]
      .toUpperCase();

  if ($("#dashName")) {
    $("#dashName").textContent = firstName;
  }

  if ($("#orderCount")) {
    $("#orderCount").textContent =
      data.orders.length;
  }

  if ($("#profile")) {
    $("#profile").innerHTML = `
      <div class="profileCard">

        <div class="profileOrb"></div>

        <div>
          <h3>
            ${esc(data.user.name)}
          </h3>

          <p>
            ${esc(data.user.email)}
            /
            CUSTOMER ID
            ${String(data.user.id).padStart(4, "0")}
          </p>
        </div>

        <div class="profileStats">

          <div>
            <strong>
              ${data.orders.length}
            </strong>
            <span>ORDERS</span>
          </div>

          <div>
            <strong>
              ${
                data.orders.filter(
                  (order) =>
                    order.status ===
                    "completed"
                ).length
              }
            </strong>
            <span>COMPLETED</span>
          </div>

          <div>
            <strong>ONLINE</strong>
            <span>PROFILE</span>
          </div>

        </div>

      </div>
    `;
  }

  window.__orders = data.orders;

  if ($("#orders")) {
    $("#orders").innerHTML =
      data.orders.length
        ? data.orders
            .map(
              (order) => `
                <div
                  class="orderRow"
                  data-order-id="${order.id}"
                >

                  <div class="orderTop">

                    <strong>
                      #${order.id}
                      ·
                      ${esc(order.service)}
                    </strong>

                    <span class="status">
                      ${order.status
                        .toUpperCase()
                        .replaceAll(
                          "_",
                          " "
                        )}
                    </span>

                  </div>

                  <div class="orderMeta">
                    ${order.payment_status.toUpperCase()}
                    /
                    ${esc(order.platform)}
                    /
                    ${new Date(
                      order.created_at + "Z"
                    ).toLocaleDateString()}
                  </div>

                  ${
                    order.admin_note
                      ? `
                        <div
                          class="orderMeta"
                          style="color:var(--cyan)"
                        >
                          ${esc(
                            order.admin_note
                          )}
                        </div>
                      `
                      : ""
                  }

                </div>
              `
            )
            .join("")
        : `
          <div class="statusBox">

            <p
              style="
                color:#697584;
                font-size:9px
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
  }

  const current = data.orders[0];

  if ($("#statusPanel")) {
    $("#statusPanel").innerHTML =
      current
        ? statusHTML(current)
        : `
          <div class="statusBox">

            <p
              style="
                color:#697584;
                font-size:9px
              "
            >
              Your next recovery
              will appear here.
            </p>

          </div>
        `;
  }
}

/* =========================
   ORDER STATUS
========================= */

function statusHTML(order) {
  const index = statuses.indexOf(
    order.status
  );

  if (order.status === "cancelled") {
    return `
      <div class="statusBox">
        <div class="stage current">
          ORDER CANCELLED
        </div>
      </div>
    `;
  }

  return `
    <div class="statusBox">

      <div class="statusTrack">

        ${statuses
          .map(
            (status, i) => `
              <div
                class="
                  stage
                  ${
                    i < index
                      ? "done"
                      : i === index
                      ? "current"
                      : ""
                  }
                "
              >
                ${
                  i < index
                    ? "✓ "
                    : ""
                }

                ${status
                  .replace(
                    "_",
                    " "
                  )
                  .toUpperCase()}
              </div>
            `
          )
          .join("")}

      </div>

      ${
        order.payment_status !== "paid"
          ? `
            <button
              class="btn btn-hot"
              style="
                width:100%;
                margin-top:18px
              "
              data-pay="${order.id}"
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
          color:#596675
        "
      >
        ORDER #${order.id}
        /
        UPDATED
        ${
          order.updated_at
            ? new Date(
                order.updated_at + "Z"
              ).toLocaleString()
            : "—"
        }
      </div>

    </div>
  `;
}

/* =========================
   LOGOUT
========================= */

function logout() {
  token = null;
  me = null;

  localStorage.removeItem(
    "r6_token"
  );

  showOnly(null);

  nav();

  location.hash = "home";

  toast("Signed out.");
}

/* =========================
   LOGIN
========================= */

async function login() {
  try {
    const data = await api(
      "/auth/login",
      {
        method: "POST",

        body: JSON.stringify({
          email: $(
            "#loginEmail"
          ).value,

          password: $(
            "#loginPassword"
          ).value
        })
      }
    );

    token = data.token;

    localStorage.setItem(
      "r6_token",
      token
    );

    me = data.user;

    toast("Access granted.");

    if (me.role === "admin") {
      loadAdmin();
    } else {
      loadMe();
    }
  } catch (error) {
    toast(
      error.message,
      true
    );
  }
}

/* =========================
   REGISTER
========================= */

async function register() {
  try {
    const data = await api(
      "/auth/register",
      {
        method: "POST",

        body: JSON.stringify({
          name: $(
            "#regName"
          ).value,

          email: $(
            "#regEmail"
          ).value,

          password: $(
            "#regPassword"
          ).value
        })
      }
    );

    token = data.token;

    localStorage.setItem(
      "r6_token",
      token
    );

    me = data.user;

    toast("Profile created.");

    loadMe();
  } catch (error) {
    toast(
      error.message,
      true
    );
  }
}

/* =========================
   CREATE ORDER
========================= */

function createOrder(service) {
  if (!token) {
    toast(
      "Sign in first to create an order.",
      true
    );

    showAuth("login");

    return;
  }

  $("#orderModal")?.remove();

  const modal = document.createElement(
    "div"
  );

  modal.id = "orderModal";

  modal.innerHTML = `
    <div class="modalBack">

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
          ${esc(
            serviceNames[service] ||
              "R6 Recovery"
          )}
        </h2>

        <label>
          PLATFORM

          <select id="oPlatform">
            <option>PC</option>
            <option>PlayStation</option>
            <option>Xbox</option>
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
            required
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
            style="
              width:auto;
              margin-top:2px;
            "
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
              rel="noopener"
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
              rel="noopener"
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
  `;

  document.body.appendChild(
    modal
  );

  modal.querySelector(
    ".close"
  ).onclick = () => {
    modal.remove();
  };

  modal.querySelector(
    ".modalBack"
  ).onclick = (event) => {
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
      try {
        const details = $(
          "#oDetails"
        ).value.trim();

        const terms = $(
          "#oTerms"
        ).checked;

        if (!details) {
          toast(
            "Please describe what you need help with.",
            true
          );

          return;
        }

        if (!terms) {
          toast(
            "Please agree to the Terms of Service and Privacy Policy.",
            true
          );

          return;
        }

        const data = await api(
          "/orders",
          {
            method: "POST",

            body: JSON.stringify({
              service,

              platform: $(
                "#oPlatform"
              ).value,

              r6_username: $(
                "#oR6"
              ).value,

              discord_username: $(
                "#oDiscord"
              ).value,

              details
            })
          }
        );

        modal.remove();

        toast(
          `Operation #${data.order.id} launched.`
        );

        await loadMe();

        location.hash =
          "dashboard";
      } catch (error) {
        toast(
          error.message,
          true
        );
      }
    };
}

/* =========================
   STRIPE PAYMENT
========================= */

async function pay(id) {
  try {
    toast(
      "Creating secure checkout..."
    );

    const data = await api(
      "/payments/checkout",
      {
        method: "POST",

        body: JSON.stringify({
          order_id: Number(id)
        })
      }
    );

    if (data.demo) {
      toast(
        "Demo payment complete."
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
  } catch (error) {
    toast(
      error.message,
      true
    );
  }
}

/* =========================
   ADMIN
========================= */

async function loadAdmin() {
  if (!token) {
    showAuth("login");
    return;
  }

  try {
    const stats = await api(
      "/admin/stats"
    );

    const data = await api(
      "/admin/orders"
    );

    showOnly("admin");

    if ($("#adminStats")) {
      $("#adminStats").innerHTML = [
        [
          "" + stats.total,
          "TOTAL ORDERS"
        ],
        [
          "" + stats.active,
          "ACTIVE OPERATIONS"
        ],
        [
          "" + stats.paid,
          "PAID"
        ],
        [
          "" + stats.customers,
          "CUSTOMERS"
        ]
      ]
        .map(
          (item) => `
            <div class="adminStat">

              <strong>
                ${esc(item[0])}
              </strong>

              <span>
                ${esc(item[1])}
              </span>

            </div>
          `
        )
        .join("");
    }

    if ($("#adminOrders")) {
      $("#adminOrders").innerHTML =
        data.orders.length
          ? data.orders
              .map(
                (order) => `
                  <div class="adminItem">

                    <div>
                      <strong>
                        #${order.id}
                        ·
                        ${esc(
                          order.service
                        )}
                      </strong>

                      <small>
                        ${esc(
                          order.customer_name
                        )}
                        /
                        ${esc(
                          order.customer_email
                        )}
                      </small>
                    </div>

                    <div>
                      <strong>
                        ${esc(
                          order.platform
                        )}
                      </strong>

                      <small>
                        ${esc(
                          order.r6_username ||
                            "No R6 username"
                        )}
                      </small>
                    </div>

                    <select
                      data-status="${order.id}"
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
                              ${
                                status ===
                                order.status
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
                      data-note="${order.id}"
                      value="${esc(
                        order.admin_note || ""
                      )}"
                      placeholder="Internal note"
                    >

                    <button
                      class="btn btn-small"
                      data-save="${order.id}"
                      type="button"
                    >
                      SAVE
                    </button>

                  </div>
                `
              )
              .join("")
          : `
            <div class="statusBox">
              No orders.
            </div>
          `;
    }
  } catch (error) {
    toast(
      error.message,
      true
    );
  }
}

async function saveAdmin(id) {
  try {
    const statusElement =
      $(`[data-status="${id}"]`);

    const noteElement =
      $(`[data-note="${id}"]`);

    const status =
      statusElement?.value || "";

    const note =
      noteElement?.value || "";

    await api(
      `/admin/orders/${id}`,
      {
        method: "PATCH",

        body: JSON.stringify({
          status,
          admin_note: note
        })
      }
    );

    toast(
      `Order #${id} updated.`
    );

    loadAdmin();
  } catch (error) {
    toast(
      error.message,
      true
    );
  }
}

/* =========================
   CATALOG TABS
========================= */

function selectCatalogTab(tab) {
  $$(".catalogTab").forEach(
    (button) => {
      button.classList.toggle(
        "active",
        button.dataset.tab === tab
      );
    }
  );

  $$(".catalogPanel").forEach(
    (panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset.panel === tab
      );
    }
  );
}

/* =========================
   CLICK HANDLER
========================= */

document.addEventListener(
  "click",
  (event) => {

    /* Main actions */

    const actionElement =
      event.target.closest(
        "[data-action]"
      );

    const action =
      actionElement?.dataset.action;

    if (action === "login") {
      showAuth("login");
    }

    if (action === "dashboard") {
      if (me?.role === "admin") {
        loadAdmin();
      } else {
        loadMe();
      }
    }

    if (action === "logout") {
      logout();
    }

    /* Service ordering */

    const serviceButton =
      event.target.closest(
        "[data-order]"
      );

    if (serviceButton) {
      createOrder(
        serviceButton.dataset.order
      );
    }

    /* Payment */

    const payButton =
      event.target.closest(
        "[data-pay]"
      );

    if (payButton) {
      pay(
        payButton.dataset.pay
      );
    }

    /* Login/register switching */

    const switchButton =
      event.target.closest(
        "[data-switch]"
      );

    if (switchButton) {
      showAuth(
        switchButton.dataset.switch
      );
    }

    /* Form submissions */

    const submitButton =
      event.target.closest(
        "[data-submit]"
      );

    if (submitButton) {
      const submitType =
        submitButton.dataset.submit;

      if (
        submitType === "login"
      ) {
        login();
      }

      if (
        submitType === "register"
      ) {
        register();
      }
    }

    /* Admin save */

    const saveButton =
      event.target.closest(
        "[data-save]"
      );

    if (saveButton) {
      saveAdmin(
        saveButton.dataset.save
      );
    }

    /* Catalog tabs */

    const tabButton =
      event.target.closest(
        "[data-tab]"
      );

    if (tabButton) {
      selectCatalogTab(
        tabButton.dataset.tab
      );
    }

    /* Order selection */

    const orderElement =
      event.target.closest(
        "[data-order-id]"
      );

    if (orderElement) {
      const orderId =
        orderElement.dataset.orderId;

      const order = (
        window.__orders || []
      ).find(
        (item) =>
          String(item.id) ===
          String(orderId)
      );

      if (
        order &&
        $("#statusPanel")
      ) {
        $("#statusPanel").innerHTML =
          statusHTML(order);
      }
    }
  }
);

/* =========================
   ADMIN REFRESH
========================= */

if ($("#refreshAdmin")) {
  $("#refreshAdmin").onclick =
    loadAdmin;
}

/* =========================
   HASH ROUTING
========================= */

window.addEventListener(
  "hashchange",
  () => {
    const hash =
      location.hash;

    if (
      hash === "#dashboard"
    ) {
      if (me?.role === "admin") {
        loadAdmin();
      } else {
        loadMe();
      }
    }

    if (
      hash === "#auth"
    ) {
      showAuth("login");
    }
  }
);

/* =========================
   PAYMENT RETURN HANDLING
========================= */

function handlePaymentReturn() {
  const params =
    new URLSearchParams(
      location.search
    );

  const payment =
    params.get("payment");

  if (payment === "success") {
    toast(
      "Payment completed successfully."
    );

    params.delete("payment");

    const cleanUrl =
      location.pathname +
      (params.toString()
        ? "?" + params.toString()
        : "") +
      "#dashboard";

    window.history.replaceState(
      {},
      document.title,
      cleanUrl
    );
  }

  if (payment === "cancelled") {
    toast(
      "Payment cancelled.",
      true
    );

    params.delete("payment");

    const cleanUrl =
      location.pathname +
      (params.toString()
        ? "?" + params.toString()
        : "") +
      "#dashboard";

    window.history.replaceState(
      {},
      document.title,
      cleanUrl
    );
  }
}

/* =========================
   START
========================= */

handlePaymentReturn();

loadMe();
