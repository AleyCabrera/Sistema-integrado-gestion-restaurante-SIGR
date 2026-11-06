const bcrypt = require('bcryptjs');
const db = require('./config/db');

if (db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0) {
    console.log('Seed omitido: ya existen usuarios');
    process.exit(0);
}

db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Administrador', 'admin@sigr.local', bcrypt.hashSync('admin123', 10), 'admin');
db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
    .run('Mesero Demo', 'mesero@sigr.local', bcrypt.hashSync('mesero123', 10), 'mesero');

const cats = [
    ['Entradas', 'Platos para iniciar'],
    ['Platos fuertes', 'Especialidades de la casa'],
    ['Postres', 'Dulces y postres'],
    ['Bebidas', 'Bebidas frías y calientes']
];
const insertCat = db.prepare('INSERT INTO categories (name,description) VALUES (?,?)');
const ids = {};
for (const [n, d] of cats) ids[n] = insertCat.run(n, d).lastInsertRowid;

const dishes = [
    [ids['Entradas'], 'Ensalada César', 'Lechuga romana, pollo y aderezo', 6.5],
    [ids['Entradas'], 'Sopa del día', 'Preparación diaria', 5.0],
    [ids['Platos fuertes'], 'Hamburguesa clásica', 'Con papas y queso', 9.5],
    [ids['Platos fuertes'], 'Pasta Alfredo', 'Fetuccini en salsa cremosa', 8.0],
    [ids['Postres'], 'Cheesecake', 'Porción individual', 4.5],
    [ids['Bebidas'], 'Limonada', 'Natural 16 oz', 2.5]
];
const insertDish = db.prepare('INSERT INTO dishes (category_id,name,description,price) VALUES (?,?,?,?)');
for (const d of dishes) insertDish.run(...d);

console.log('Seed OK · admin@sigr.local / admin123 · mesero@sigr.local / mesero123');