import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import Stripe from "stripe";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add your Neon connection string to Render.");
  process.exit(1);
}

/*
  NEON / POSTGRESQL
*/
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/*
  DATABASE SETUP
*/
async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      avatar TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      service TEXT NOT NULL,
      platform TEXT NOT NULL,
      r6_username TEXT,
      discord_username TEXT,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'received',
      payment_status TEXT NOT NULL DEFAULT 'unpaid',
      stripe_session_id TEXT,
      admin_note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS recovery_files (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
  `);

  console.log("Neon database initialized.");
}

/*
  ADMIN SEED
*/
async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";

  if (!email || !password) return;

  const existing = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      `
      INSERT INTO users (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      `,
      ["R6 Recoveries Admin", email, hash, "admin"]
    );

    console.log(`Seeded admin account: ${email}`);
  }
}

/*
  DATABASE HELPERS
*/
async function dbGet(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows[0] || null;
}

async function dbAll(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/*
  UPLOADS
*/
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

/*
  MIDDLEWARE
*/
app.use(helmet({
  crossOriginResourcePolicy: false
}));

app.use(morgan("tiny"));

app.use(express.json({
  limit: "1mb",
  verify: (req, res, buf) => {
    if (req.originalUrl === "/api/payments/webhook") {
      req.rawBody = Buffer.from(buf);
    }
  }
}));

app.use(express.urlencoded({
  extended: true
}));

app.use(express.static(path.join(__dirname, "public")));

/*
  SERVICES
*/
const SERVICES = {
  settings: {
    name: "R6 Settings Recovery",
    price: 1000
  },
  fps: {
    name: "FPS Optimization",
    price: 1500
  },
  full: {
    name: "Full PC + R6 Recovery",
    price: 2500
  },
  vod: {
    name: "R6 VOD Review",
    price: 1000
  }
};

/*
  AUTH
*/
function signUser(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

function auth(req, res, next) {
  try {
    const raw = req.headers.authorization || "";
    const token = raw.startsWith("Bearer ")
      ? raw.slice(7)
      : "";

    if (!token) {
      return res.status(401).json({
        error: "Authentication required."
      });
    }

    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({
      error: "Session expired. Please log in again."
    });
  }
}

function admin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      error: "Admin access required."
    });
  }

  next();
}

/*
  SAFE USER RESPONSE
*/
function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar,
    created_at: user.created_at
  };
}

/*
  PUBLIC ORDER RESPONSE
*/
function publicOrder(row) {
  return {
    id: row.id,
    service: row.service,
    platform: row.platform,
    r6_username: row.r6_username,
    discord_username: row.discord_username,
    details: row.details,
    status: row.status,
    payment_status: row.payment_status,
    admin_note: row.admin_note,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/*
  REGISTER
*/
app.post("/api/auth/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (
      name.length < 2 ||
      !email.includes("@") ||
      password.length < 8
    ) {
      return res.status(400).json({
        error: "Use a name, valid email, and password of at least 8 characters."
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [name, email, hash]
    );

    const user = result.rows[0];

    res.json({
      token: signUser(user),
      user: safeUser(user)
    });
  } catch (e) {
    console.error("Registration error:", e);

    if (
      e.code === "23505" ||
      String(e.message).includes("duplicate key")
    ) {
      return res.status(409).json({
        error: "An account with that email already exists."
      });
    }

    res.status(500).json({
      error: "Could not create account."
    });
  }
});

/*
  LOGIN
*/
app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    const password = String(req.body.password || "");

    const user = await dbGet(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        error: "Invalid email or password."
      });
    }

    res.json({
      token: signUser(user),
      user: safeUser(user)
    });
  } catch (e) {
    console.error("Login error:", e);

    res.status(500).json({
      error: "Could not log in."
    });
  }
});

/*
  CURRENT USER + ORDERS
*/
app.get("/api/me", auth, async (req, res) => {
  try {
    const user = await dbGet(
      "SELECT * FROM users WHERE id = $1",
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({
        error: "Account not found."
      });
    }

    const orders = await dbAll(
      `
      SELECT *
      FROM orders
      WHERE user_id = $1
      ORDER BY id DESC
      `,
      [user.id]
    );

    res.json({
      user: safeUser(user),
      orders: orders.map(publicOrder)
    });
  } catch (e) {
    console.error("Get user error:", e);

    res.status(500).json({
      error: "Could not load account."
    });
  }
});

/*
  CREATE ORDER
*/
app.post("/api/orders", auth, async (req, res) => {
  try {
    const {
      service,
      platform,
      r6_username,
      discord_username,
      details
    } = req.body;

    if (
      !SERVICES[service] ||
      !platform ||
      !String(details || "").trim()
    ) {
      return res.status(400).json({
        error: "Choose a service/platform and describe what you need."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO orders (
        user_id,
        service,
        platform,
        r6_username,
        discord_username,
        details
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        req.user.id,
        SERVICES[service].name,
        platform,
        r6_username || "",
        discord_username || "",
        details.trim()
      ]
    );

    const order = result.rows[0];

    /*
      FORMSPREE
    */
    try {
      await fetch("https://formspree.io/f/xaeyazlr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          service: SERVICES[service].name,
          platform,
          r6_username: r6_username || "",
          discord_username: discord_username || "",
          details: details.trim(),
          order_id: order.id
        })
      });
    } catch (e) {
      console.error(
        "Formspree notification failed:",
        e.message
      );
    }

    /*
      DISCORD
    */
    if (process.env.DISCORD_WEBHOOK_URL) {
      try {
        await fetch(process.env.DISCORD_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            embeds: [
              {
                title: "🚨 NEW RECOVERY ORDER",
                description: "A new operation has been submitted.",
                fields: [
                  {
                    name: "Service",
                    value: SERVICES[service].name,
                    inline: false
                  },
                  {
                    name: "Platform",
                    value: platform,
                    inline: true
                  },
                  {
                    name: "R6 Username",
                    value: r6_username || "Not provided",
                    inline: true
                  },
                  {
                    name: "Discord",
                    value: discord_username || "Not provided",
                    inline: true
                  },
                  {
                    name: "Details",
                    value: details.trim().slice(0, 1024),
                    inline: false
                  }
                ],
                footer: {
                  text: `R6 Recoveries • Order #${order.id}`
                }
              }
            ]
          })
        });
      } catch (e) {
        console.error(
          "Discord notification failed:",
          e.message
        );
      }
    }

    res.status(201).json({
      order: publicOrder(order),
      payment_available: Boolean(
        process.env.STRIPE_SECRET_KEY
      )
    });
  } catch (e) {
    console.error("Create order error:", e);

    res.status(500).json({
      error: "Could not create order."
    });
  }
});

/*
  STRIPE CHECKOUT
*/
app.post("/api/payments/checkout", auth, async (req, res) => {
  try {
    const orderId = Number(req.body.order_id);

    const order = await dbGet(
      `
      SELECT *
      FROM orders
      WHERE id = $1
        AND user_id = $2
      `,
      [orderId, req.user.id]
    );

    if (!order) {
      return res.status(404).json({
        error: "Order not found."
      });
    }

    if (order.payment_status === "paid") {
      return res.json({
        url: `${PUBLIC_URL}/#dashboard`
      });
    }

    const service = Object.values(SERVICES).find(
      s => s.name === order.service
    );

    if (!service) {
      return res.status(400).json({
        error: "Unknown service."
      });
    }

    /*
      DEMO MODE IF STRIPE IS NOT CONFIGURED
    */
    if (!process.env.STRIPE_SECRET_KEY) {
      await pool.query(
        `
        UPDATE orders
        SET
          payment_status = 'paid',
          status = CASE
            WHEN status = 'received' THEN 'paid'
            ELSE status
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [order.id]
      );

      return res.json({
        demo: true,
        url: `${PUBLIC_URL}/#dashboard`
      });
    }

    const stripe = new Stripe(
      process.env.STRIPE_SECRET_KEY
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: order.service,
              description: `R6 Recoveries order #${order.id}`
            },
            unit_amount: service.price
          },
          quantity: 1
        }
      ],

      metadata: {
        order_id: String(order.id)
      },

      customer_email: req.user.email,

      success_url:
        `${PUBLIC_URL}/?payment=success#dashboard`,

      cancel_url:
        `${PUBLIC_URL}/?payment=cancelled#dashboard`
    });

    await pool.query(
      `
      UPDATE orders
      SET
        stripe_session_id = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [session.id, order.id]
    );

    res.json({
      url: session.url
    });
  } catch (e) {
    console.error(
      "Stripe checkout error:",
      e
    );

    res.status(500).json({
      error:
        e.message ||
        "Stripe checkout could not be created."
    });
  }
});

/*
  STRIPE WEBHOOK
*/
app.post(
  "/api/payments/webhook",
  express.raw({
    type: "application/json"
  }),
  async (req, res) => {
    if (
      !process.env.STRIPE_SECRET_KEY ||
      !process.env.STRIPE_WEBHOOK_SECRET
    ) {
      return res.status(200).send("Webhook disabled.");
    }

    try {
      const stripe = new Stripe(
        process.env.STRIPE_SECRET_KEY
      );

      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );

      if (
        event.type === "checkout.session.completed"
      ) {
        const session = event.data.object;

        const orderId = Number(
          session.metadata?.order_id
        );

        if (orderId) {
          await pool.query(
            `
            UPDATE orders
            SET
              payment_status = 'paid',
              status = CASE
                WHEN status = 'received' THEN 'paid'
                ELSE status
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            `,
            [orderId]
          );
        }
      }

      res.json({
        received: true
      });
    } catch (e) {
      console.error(
        "Stripe webhook error:",
        e
      );

      res.status(400).send(
        `Webhook Error: ${e.message}`
      );
    }
  }
);

/*
  UPLOAD ORDER FILE
*/
app.post(
  "/api/orders/:id/files",
  auth,
  upload.single("file"),
  async (req, res) => {
    try {
      const orderId = Number(req.params.id);

      const order = await dbGet(
        "SELECT * FROM orders WHERE id = $1",
        [orderId]
      );

      if (
        !order ||
        (
          order.user_id !== req.user.id &&
          req.user.role !== "admin"
        )
      ) {
        return res.status(404).json({
          error: "Order not found."
        });
      }

      if (!req.file) {
        return res.status(400).json({
          error: "No file uploaded."
        });
      }

      await pool.query(
        `
        INSERT INTO recovery_files (
          order_id,
          filename,
          stored_name
        )
        VALUES ($1, $2, $3)
        `,
        [
          orderId,
          req.file.originalname,
          req.file.filename
        ]
      );

      res.json({
        ok: true,
        filename: req.file.originalname
      });
    } catch (e) {
      console.error(
        "File upload error:",
        e
      );

      res.status(500).json({
        error: "Could not save uploaded file."
      });
    }
  }
);

/*
  ADMIN ORDERS
*/
app.get(
  "/api/admin/orders",
  auth,
  admin,
  async (req, res) => {
    try {
      const rows = await dbAll(`
        SELECT
          o.*,
          u.name AS customer_name,
          u.email AS customer_email
        FROM orders o
        JOIN users u
          ON u.id = o.user_id
        ORDER BY o.id DESC
      `);

      res.json({
        orders: rows
      });
    } catch (e) {
      console.error(
        "Admin orders error:",
        e
      );

      res.status(500).json({
        error: "Could not load orders."
      });
    }
  }
);

/*
  ADMIN UPDATE ORDER
*/
app.patch(
  "/api/admin/orders/:id",
  auth,
  admin,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      const allowed = [
        "received",
        "paid",
        "reviewing",
        "in_progress",
        "ready",
        "completed",
        "cancelled"
      ];

      const status = String(
        req.body.status || ""
      );

      const note = String(
        req.body.admin_note || ""
      );

      if (!allowed.includes(status)) {
        return res.status(400).json({
          error: "Invalid status."
        });
      }

      await pool.query(
        `
        UPDATE orders
        SET
          status = $1,
          admin_note = $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
        [status, note, id]
      );

      const order = await dbGet(
        "SELECT * FROM orders WHERE id = $1",
        [id]
      );

      res.json({
        order: publicOrder(order)
      });
    } catch (e) {
      console.error(
        "Admin update error:",
        e
      );

      res.status(500).json({
        error: "Could not update order."
      });
    }
  }
);

/*
  ADMIN STATS
*/
app.get(
  "/api/admin/stats",
  auth,
  admin,
  async (req, res) => {
    try {
      const totalResult = await pool.query(
        "SELECT COUNT(*)::int AS c FROM orders"
      );

      const paidResult = await pool.query(
        `
        SELECT COUNT(*)::int AS c
        FROM orders
        WHERE payment_status = 'paid'
        `
      );

      const activeResult = await pool.query(
        `
        SELECT COUNT(*)::int AS c
        FROM orders
        WHERE status IN (
          'paid',
          'reviewing',
          'in_progress',
          'ready'
        )
        `
      );

      const customersResult = await pool.query(
        `
        SELECT COUNT(*)::int AS c
        FROM users
        WHERE role = 'customer'
        `
      );

      res.json({
        total: totalResult.rows[0].c,
        paid: paidResult.rows[0].c,
        active: activeResult.rows[0].c,
        customers: customersResult.rows[0].c
      });
    } catch (e) {
      console.error(
        "Admin stats error:",
        e
      );

      res.status(500).json({
        error: "Could not load statistics."
      });
    }
  }
);

/*
  FRONTEND FALLBACK
*/
app.use((req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

/*
  START SERVER
*/
async function startServer() {
  try {
    await initDatabase();
    await seedAdmin();

    app.listen(PORT, () => {
      console.log(
        `R6 Recoveries running at ${PUBLIC_URL}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();
