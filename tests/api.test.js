const request = require('supertest');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const TEST_DB = path.join(__dirname, '..', 'data', 'test.db');
if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
process.env.DB_PATH = TEST_DB;

const app = require('../src/app');
const db = require('../src/config/db');

let adminToken, meseroToken;

beforeAll(async () => {
    db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
        .run('Admin', 'admin@test.local', bcrypt.hashSync('admin123', 10), 'admin');
    db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
        .run('Mesero', 'mesero@test.local', bcrypt.hashSync('mesero123', 10), 'mesero');

    adminToken = (await request(app).post('/api/auth/login').send({ email: 'admin@test.local', password: 'admin123' })).body.token;
    meseroToken = (await request(app).post('/api/auth/login').send({ email: 'mesero@test.local', password: 'mesero123' })).body.token;
});

afterAll(() => db.close());

test('health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
});

test('login rechaza credenciales inválidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@y.z', password: 'bad' });
    expect(res.status).toBe(401);
});

test('CRUD de menú (admin)', async () => {
    const cat = await request(app).post('/api/menu/categories')
        .set('Authorization', `Bearer ${adminToken}`).send({ name: 'Bebidas' });
    expect(cat.status).toBe(201);
    const dish = await request(app).post('/api/menu/dishes')
        .set('Authorization', `Bearer ${adminToken}`).send({ name: 'Agua', price: 1.5, category_id: cat.body.id });
    expect(dish.status).toBe(201);
    const list = await request(app).get('/api/menu/dishes');
    expect(list.body.length).toBeGreaterThan(0);
});

test('flujo pedido → pago → reporte → cierre de caja', async () => {
    const cat = db.prepare('SELECT id FROM categories LIMIT 1').get();
    const dish = await request(app).post('/api/menu/dishes')
        .set('Authorization', `Bearer ${adminToken}`).send({ name: 'Plato Test', price: 10, category_id: cat.id });

    const open = await request(app).post('/api/cash/open')
        .set('Authorization', `Bearer ${adminToken}`).send({ opening_amount: 50 });
    expect(open.status).toBe(201);

    const order = await request(app).post('/api/orders')
        .set('Authorization', `Bearer ${meseroToken}`)
        .send({ table_number: 1, items: [{ dish_id: dish.body.id, quantity: 2 }] });
    expect(order.status).toBe(201);

    const pay = await request(app).post('/api/cash/pay')
        .set('Authorization', `Bearer ${meseroToken}`).send({ order_id: order.body.id, method: 'efectivo' });
    expect(pay.status).toBe(201);

    const report = await request(app).get('/api/cash/report/daily').set('Authorization', `Bearer ${adminToken}`);
    expect(report.body.total_sales).toBeGreaterThan(0);

    const close = await request(app).post('/api/cash/close')
        .set('Authorization', `Bearer ${adminToken}`).send({ closing_amount: 100 });
    expect(close.status).toBe(200);
});

test('reservas: crear y listar', async () => {
    const r = await request(app).post('/api/reservations')
        .set('Authorization', `Bearer ${meseroToken}`)
        .send({ customer_name: 'Cliente Demo', date: '2026-01-15', time: '19:30', people: 4 });
    expect(r.status).toBe(201);
    const list = await request(app).get('/api/reservations').set('Authorization', `Bearer ${meseroToken}`);
    expect(list.body.some(x => x.customer_name === 'Cliente Demo')).toBe(true);
});