```javascript
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

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
   TOASTS
========================= */

function toast(message, bad = false) {
  const container = $("#toast");

  if (!container) {
    console.log(bad ? "ERROR:" : "INFO:", message);
    return;
  }

  const element = document.createElement("div");

  element.className =
    "toast" + (bad ? " bad" : "");

  element.textContent = message;

  container.appendChild(element);

  setTimeout(() => {
    element.remove();
  }, 3800);
}

/* =========================
   API
========================= */

async function api(path, options = {}) {
  const headers = {
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization =
      `Bearer ${token}`;
  }

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers["Content-Type"] =
      "application/json";
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
        `Request failed (${response.status}).`
    );
  }

  return data;
}

/* =========================
   HTML ESCAPE
========================= */

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

function showOnly(sectionId) {
  [
    "auth",
    "dashboard",
    "admin"
  ].forEach((id) => {
    const element = $("#" + id);

    if (element) {
      element.classList.add("hidden");
    }
  });

  if (sectionId) {
    const element =
      $("#" + sectionId);

    if (element) {
      element.classList.remove("hidden");
    }
  }
}

function showAuth(mode = "login") {
  location.hash = "auth";

  showOnly("auth");

  const loginForm =
    $("#loginForm");

  const registerForm =
    $("#registerForm");

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
   CURRENT USER
========================= */

async function loadMe() {
  if (!token) {
    nav();
    return;
  }

  try {
    const data =
      await api("/me");

    if (
      !data ||
      !data.user
    ) {
      throw new Error(
        "The server returned an invalid account response."
      );
    }

    me = data.user;

    /*
      Make absolutely sure orders is
      always an array.
    */
    if (!Array.isArray(data.orders)) {
      data.orders = [];
    }

    window.__orders =
      data.orders;

    renderDashboard(data);

    nav();

  } catch (error) {
    console.error(
      "Dashboard loading error:",
      error
    );

    /*
      IMPORTANT:
      Do NOT silently delete the token
      on a temporary server/database error.
    */

    if (
      error.message.includes(
        "401"
      ) ||
      error.message
        .toLowerCase()
        .includes("token") ||
      error.message
        .toLowerCase()
        .includes("unauthorized")
    ) {
      token = null;
      me = null;

      localStorage.removeItem(
        "r6_token"
      );

      nav();

      showAuth("login");

      toast(
        "Your session expired. Please sign in again.",
        true
      );

      return;
    }

    toast(
      "Could not load your dashboard: " +
        error.message,
      true
    );

    /*
      Show the dashboard even when
      the request failed, so the user
      can actually see the error.
    */

    showOnly("dashboard");

    const orders =
      $("#orders");

    if (orders) {
      orders.innerHTML = `
        <div class="statusBox">

          <strong
            style="
              display:block;
              margin-bottom:8px;
              color:var(--white);
            "
          >
            DASHBOARD ERROR
          </strong>

          <p
            style="
              color:#697584;
              font-size:9px;
              line-height:1.6;
            "
          >
            ${esc(error.message)}
          </p>

          <button
            class="btn btn-hot"
            style="margin-top:12px"
            data-action="dashboard"
          >
            RETRY →
          </button>

        </div>
      `;
    }
  }
}

/* =========================
   DASHBOARD
========================= */

function renderDashboard(data) {
  showOnly("dashboard");

  const user =
    data.user || {};

  const orders =
    Array.isArray(data.orders)
      ? data.orders
      : [];

  window.__orders = orders;

  const dashName =
    $("#dashName");

  if (dashName) {
    dashName.textContent =
      (
        user.name ||
        "OPERATOR"
      )
        .split(" ")[0]
        .toUpperCase();
  }

  const orderCount =
    $("#orderCount");

  if (orderCount) {
    orderCount.textContent =
      orders.length;
  }

  /* PROFILE */

  const profile =
    $("#profile");

  if (profile) {
    const completed =
      orders.filter(
        (order) =>
          order.status ===
          "completed"
      ).length;

    profile.innerHTML = `
      <div class="profileCard">

        <div class="profileOrb"></div>

        <div>

          <h3>
            ${esc(
              user.name ||
                "Operator"
            )}
          </h3>

          <p>
            ${esc(
              user.email ||
                ""
            )}

            /

            CUSTOMER ID

            ${String(
              user.id || ""
            ).padStart(4, "0")}
          </p>

        </div>

        <div class="profileStats">

          <div>
            <strong>
              ${orders.length}
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
    `;
  }

  /* ORDERS */

  const ordersContainer =
    $("#orders");

  if (ordersContainer) {
    if (orders.length === 0) {

      ordersContainer.innerHTML = `
        <div class="statusBox">

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

    } else {

      ordersContainer.innerHTML =
        orders
          .map(
            (order) =>
              `
                <div
                  class="orderRow"
                  data-order-id="${esc(
                    order.id
                  )}"
                >

                  <div class="orderTop">

                    <strong>
                      #${esc(order.id)}
                      ·
                      ${esc(
                        order.service
                      )}
                    </strong>

                    <span class="status">
                      ${esc(
                        String(
                          order.status ||
                            "received"
                        )
                          .toUpperCase()
                          .replaceAll(
                            "_",
                            " "
                          )
                      )}
                    </span>

                  </div>

                  <div class="orderMeta">

                    ${esc(
                      String(
                        order.payment_status ||
                          "unpaid"
                      ).toUpperCase()
                    )}

                    /

                    ${esc(
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
                          ${esc(
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
                          ${esc(
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
                          ${esc(
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
          .join("");
    }
  }

  /* STATUS PANEL */

  const statusPanel =
    $("#statusPanel");

  if (statusPanel) {
    const current =
      orders.length
        ? orders[0]
        : null;

    statusPanel.innerHTML =
      current
        ? statusHTML(current)
        : `
          <div class="statusBox">

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
  }
}

/* =========================
   DATE FORMAT
========================= */

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      String(value).endsWith("Z")
        ? value
        : value + "Z"
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleDateString();
}

/* =========================
   ORDER STATUS
========================= */

function statusHTML(order) {
  const status =
    order.status || "received";

  const index =
    statuses.indexOf(status);

  if (status === "cancelled") {
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
            (statusName, i) => `
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

                ${statusName
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
        order.payment_status !==
        "paid"
          ? `
            <button
              class="btn btn-hot"
              style="
                width:100%;
                margin-top:18px
              "
              data-pay="${esc(
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
        ORDER #${esc(order.id)}
        /
        UPDATED
        ${formatDateTime(
          order.updated_at
        )}
      </div>

    </div>
  `;
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      String(value).endsWith("Z")
        ? value
        : value + "Z"
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString();
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

  toast(
    "Signed out."
  );
}

/* =========================
   LOGIN
========================= */

async function login() {
  try {
    const email =
      $("#loginEmail")?.value
        ?.trim() || "";

    const password =
      $("#loginPassword")?.value ||
      "";

    if (!email || !password) {
      toast(
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

    me = data.user;

    localStorage.setItem(
      "r6_token",
      token
    );

    toast(
      "Access granted."
    );

    if (
      me?.role ===
      "admin"
    ) {
      await loadAdmin();
    } else {
      await loadMe();
    }

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

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
    const name =
      $("#regName")?.value
        ?.trim() || "";

    const email =
      $("#regEmail")?.value
        ?.trim() || "";

    const password =
      $("#regPassword")?.value ||
      "";

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

    me = data.user;

    localStorage.setItem(
      "r6_token",
      token
    );

    toast(
      "Profile created."
    );

    await loadMe();

  } catch (error) {
    console.error(
      "Registration error:",
      error
    );

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

  const modal =
    document.createElement(
      "div"
    );

  modal.id =
    "orderModal";

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
  ).onclick = () =>
    modal.remove();

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
        const details =
          $("#oDetails")
            ?.value
            ?.trim() || "";

        const accepted =
          $("#oTerms")
            ?.checked;

        if (!details) {
          toast(
            "Please describe what you need help with.",
            true
          );

          return;
        }

        if (!accepted) {
          toast(
            "Please agree to the Terms of Service and Privacy Policy.",
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
                  $("#oPlatform")
                    .value,

                r6_username:
                  $("#oR6")
                    .value
                    .trim(),

                discord_username:
                  $("#oDiscord")
                    .value
                    .trim(),

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
        console.error(
          "Order creation error:",
          error
        );

        toast(
          error.message,
          true
        );
      }
    };
}

/* =========================
   STRIPE CHECKOUT
========================= */

async function pay(id) {
  try {
    toast(
      "Creating secure checkout..."
    );

    const data =
      await api(
        "/payments/checkout",
        {
          method: "POST",

          body: JSON.stringify({
            order_id:
              Number(id)
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
    console.error(
      "Payment error:",
      error
    );

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
    const stats =
      await api(
        "/admin/stats"
      );

    const data =
      await api(
        "/admin/orders"
      );

    showOnly("admin");

    const adminStats =
      $("#adminStats");

    if (adminStats) {
      adminStats.innerHTML = [
        [
          stats.total,
          "TOTAL ORDERS"
        ],
        [
          stats.active,
          "ACTIVE OPERATIONS"
        ],
        [
          stats.paid,
          "PAID"
        ],
        [
          stats.customers,
          "CUSTOMERS"
        ]
      ]
        .map(
          ([number, label]) =>
            `
              <div class="adminStat">

                <strong>
                  ${esc(number)}
                </strong>

                <span>
                  ${esc(label)}
                </span>

              </div>
            `
        )
        .join("");
    }

    const adminOrders =
      $("#adminOrders");

    if (!adminOrders) {
      return;
    }

    if (
      !data.orders ||
      data.orders.length === 0
    ) {
      adminOrders.innerHTML = `
        <div class="statusBox">
          No orders.
        </div>
      `;

      return;
    }

    adminOrders.innerHTML =
      data.orders
        .map(
          (order) =>
            `
              <div class="adminItem">

                <div>
                  <strong>
                    #${esc(order.id)}
                    ·
                    ${esc(
                      order.service
                    )}
                  </strong>

                  <small>
                    ${esc(
                      order.customer_name ||
                        ""
                    )}
                    /
                    ${esc(
                      order.customer_email ||
                        ""
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
                  data-status="${esc(
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
                      (status) =>
                        `
                          <option
                            value="${status}"
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
                  data-note="${esc(
                    order.id
                  )}"
                  value="${esc(
                    order.admin_note ||
                      ""
                  )}"
                  placeholder="Internal note"
                >

                <button
                  class="btn btn-small"
                  data-save="${esc(
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

  } catch (error) {
    console.error(
      "Admin loading error:",
      error
    );

    toast(
      error.message,
      true
    );
  }
}

async function saveAdmin(id) {
  try {
    const statusElement =
      $(
        `[data-status="${id}"]`
      );

    const noteElement =
      $(
        `[data-note="${id}"]`
      );

    const status =
      statusElement?.value ||
      "received";

    const note =
      noteElement?.value ||
      "";

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

    await loadAdmin();

  } catch (error) {
    console.error(
      "Admin save error:",
      error
    );

    toast(
      error.message,
      true
    );
  }
}

/* =========================
   CLICK HANDLER
========================= */

document.addEventListener(
  "click",
  (event) => {

    const actionElement =
      event.target.closest(
        "[data-action]"
      );

    const action =
      actionElement?.dataset.action;

    if (action === "login") {
      showAuth("login");
      return;
    }

    if (action === "dashboard") {
      if (
        me?.role === "admin"
      ) {
        loadAdmin();
      } else {
        loadMe();
      }

      return;
    }

    if (action === "logout") {
      logout();
      return;
    }

    const serviceElement =
      event.target.closest(
        "[data-order]"
      );

    if (serviceElement) {
      createOrder(
        serviceElement.dataset.order
      );

      return;
    }

    const payElement =
      event.target.closest(
        "[data-pay]"
      );

    if (payElement) {
      pay(
        payElement.dataset.pay
      );

      return;
    }

    const switchElement =
      event.target.closest(
        "[data-switch]"
      );

    if (switchElement) {
      showAuth(
        switchElement.dataset.switch
      );

      return;
    }

    const submitElement =
      event.target.closest(
        "[data-submit]"
      );

    if (submitElement) {
      const type =
        submitElement.dataset.submit;

      if (type === "login") {
        login();
      }

      if (
        type === "register"
      ) {
        register();
      }

      return;
    }

    const saveElement =
      event.target.closest(
        "[data-save]"
      );

    if (saveElement) {
      saveAdmin(
        saveElement.dataset.save
      );

      return;
    }

    const orderElement =
      event.target.closest(
        "[data-order-id]"
      );

    if (orderElement) {
      const id =
        String(
          orderElement.dataset.orderId
        );

      const order =
        (
          window.__orders ||
          []
        ).find(
          (item) =>
            String(item.id) ===
            id
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

const refreshAdmin =
  $("#refreshAdmin");

if (refreshAdmin) {
  refreshAdmin.onclick =
    loadAdmin;
}

/* =========================
   HASH ROUTING
========================= */

window.addEventListener(
  "hashchange",
  () => {
    if (
      location.hash ===
      "#dashboard"
    ) {
      if (
        me?.role === "admin"
      ) {
        loadAdmin();
      } else {
        loadMe();
      }
    }

    if (
      location.hash ===
      "#auth"
    ) {
      showAuth("login");
    }
  }
);

/* =========================
   PAYMENT RETURN
========================= */

function handlePaymentReturn() {
  const params =
    new URLSearchParams(
      window.location.search
    );

  const payment =
    params.get("payment");

  if (
    payment === "success"
  ) {
    toast(
      "Payment completed successfully."
    );
  }

  if (
    payment === "cancelled"
  ) {
    toast(
      "Payment cancelled.",
      true
    );
  }

  if (payment) {
    params.delete(
      "payment"
    );

    const query =
      params.toString();

    const cleanUrl =
      window.location.pathname +
      (query
        ? "?" + query
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
   START APPLICATION
========================= */

handlePaymentReturn();

if (token) {
  loadMe();
} else {
  nav();
}
```
