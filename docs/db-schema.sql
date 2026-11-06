CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin','mesero','cliente')),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);
CREATE TABLE IF NOT EXISTS dishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL CHECK(price >= 0),
    available INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    table_number INTEGER,
    status TEXT NOT NULL DEFAULT 'pendiente'
        CHECK(status IN ('pendiente','en_preparacion','listo','entregado','pagado','cancelado')),
    total REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_id INTEGER NOT NULL REFERENCES dishes(id),
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    customer_name TEXT NOT NULL,
    phone TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    people INTEGER NOT NULL CHECK(people > 0),
    status TEXT NOT NULL DEFAULT 'activa' CHECK(status IN ('activa','cancelada','cumplida')),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS cash_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opened_by INTEGER REFERENCES users(id),
    opened_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    closed_by INTEGER REFERENCES users(id),
    closed_at TEXT,
    opening_amount REAL NOT NULL DEFAULT 0,
    closing_amount REAL,
    status TEXT NOT NULL DEFAULT 'abierta' CHECK(status IN ('abierta','cerrada'))
);
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    cash_session_id INTEGER REFERENCES cash_sessions(id),
    amount REAL NOT NULL,
    method TEXT NOT NULL DEFAULT 'efectivo'
        CHECK(method IN ('efectivo','tarjeta','transferencia')),
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);