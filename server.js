const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");

const app = express();
const PORT = process.env.PORT || 3000;
const db = new Database("ecommerce.db");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  image TEXT NOT NULL,
  description TEXT DEFAULT '',
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT NOT NULL,
  total REAL NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  price REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);
`);

const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO products (name, category, price, image, description, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const seed = [
    ["Wireless Headphones", "Electronics", 1499, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=80", "Comfortable wireless headphones with rich sound.", 25],
    ["Smart Watch", "Electronics", 2299, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=700&q=80", "Modern smartwatch for everyday activity tracking.", 18],
    ["Running Shoes", "Fashion", 1899, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=80", "Lightweight running shoes for daily workouts.", 30],
    ["Backpack", "Fashion", 999, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=80", "Durable backpack for college and travel.", 20],
    ["Coffee Mug", "Home", 399, "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=700&q=80", "Ceramic coffee mug with a simple design.", 40],
    ["Desk Lamp", "Home", 799, "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=80", "Minimal LED desk lamp for study and work.", 15]
  ];
  const tx = db.transaction(() => seed.forEach(p => insert.run(...p)));
  tx();
}

app.get("/api/products", (req, res) => {
  const q = (req.query.q || "").trim();
  const category = (req.query.category || "").trim();
  let sql = "SELECT * FROM products WHERE 1=1";
  const params = [];
  if (q) { sql += " AND (name LIKE ? OR description LIKE ? OR category LIKE ?)"; const s = `%${q}%`; params.push(s, s, s); }
  if (category) { sql += " AND category = ?"; params.push(category); }
  sql += " ORDER BY id DESC";
  res.json(db.prepare(sql).all(...params));
});

app.post("/api/products", (req, res) => {
  const { name, category, price, image, description = "", stock } = req.body;
  if (!name || !category || !image || Number(price) < 0 || Number(stock) < 0) {
    return res.status(400).json({ error: "Valid name, category, image, price and stock are required." });
  }
  const result = db.prepare(`
    INSERT INTO products (name, category, price, image, description, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name.trim(), category.trim(), Number(price), image.trim(), description.trim(), Number(stock));
  res.status(201).json({ id: result.lastInsertRowid });
});

app.put("/api/products/:id", (req, res) => {
  const { name, category, price, image, description = "", stock } = req.body;
  if (!name || !category || !image || Number(price) < 0 || Number(stock) < 0) {
    return res.status(400).json({ error: "Invalid product data." });
  }
  const result = db.prepare(`
    UPDATE products SET name=?, category=?, price=?, image=?, description=?, stock=?
    WHERE id=?
  `).run(name.trim(), category.trim(), Number(price), image.trim(), description.trim(), Number(stock), req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Product not found." });
  res.json({ message: "Product updated." });
});

app.delete("/api/products/:id", (req, res) => {
  const result = db.prepare("DELETE FROM products WHERE id=?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Product not found." });
  res.json({ message: "Product deleted." });
});

app.post("/api/orders", (req, res) => {
  const { customer_name, email, address, items } = req.body;
  if (!customer_name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "") || !address?.trim() || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Please provide valid customer details and at least one item." });
  }

  const getProduct = db.prepare("SELECT * FROM products WHERE id=?");
  const insertOrder = db.prepare("INSERT INTO orders (customer_name,email,address,total) VALUES (?,?,?,?)");
  const insertItem = db.prepare("INSERT INTO order_items (order_id,product_id,quantity,price) VALUES (?,?,?,?)");
  const updateStock = db.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock>=?");

  try {
    let total = 0;
    const checked = items.map(item => {
      const p = getProduct.get(item.product_id);
      const qty = Number(item.quantity);
      if (!p || !Number.isInteger(qty) || qty < 1 || p.stock < qty) throw new Error(`Invalid stock for product ${item.product_id}`);
      total += p.price * qty;
      return { p, qty };
    });

    const createOrder = db.transaction(() => {
      const order = insertOrder.run(customer_name.trim(), email.trim(), address.trim(), total);
      checked.forEach(({p, qty}) => {
        insertItem.run(order.lastInsertRowid, p.id, qty, p.price);
        const updated = updateStock.run(qty, p.id, qty);
        if (!updated.changes) throw new Error("Stock changed. Please try again.");
      });
      return order.lastInsertRowid;
    });

    const orderId = createOrder();
    res.status(201).json({ message: "Order placed successfully.", orderId, total });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/orders", (req, res) => {
  res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all());
});

app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => console.log(`E-Commerce website running at http://localhost:${PORT}`));
