const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

const STATUS_FLOW = ['pendiente', 'en_preparacion', 'listo', 'entregado', 'pagado'];

router.get('/', auth('admin', 'mesero'), (req, res) => {
    const { status } = req.query;
    let sql = 'SELECT o.*, u.name AS waiter FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND o.status = ?'; params.push(status); }
    sql += ' ORDER BY o.created_at DESC';
    const orders = db.prepare(sql).all(...params);
    const itemsStmt = db.prepare(
        'SELECT oi.*, d.name AS dish FROM order_items oi JOIN dishes d ON d.id = oi.dish_id WHERE oi.order_id = ?'
    );
    res.json(orders.map(o => ({ ...o, items: itemsStmt.all(o.id) })));
});

router.get('/:id', auth('admin', 'mesero'), (req, res) => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    order.items = db.prepare(
        'SELECT oi.*, d.name AS dish FROM order_items oi JOIN dishes d ON d.id = oi.dish_id WHERE oi.order_id = ?'
    ).all(order.id);
    res.json(order);
});

router.post('/', auth('admin', 'mesero'), (req, res) => {
    const { table_number = null, items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Debe incluir al menos un ítem' });
    }
    const tx = db.transaction(() => {
        const orderId = db.prepare('INSERT INTO orders (user_id, table_number) VALUES (?,?)')
        .run(req.user.id, table_number).lastInsertRowid;
        const insertItem = db.prepare(
        'INSERT INTO order_items (order_id,dish_id,quantity,unit_price,subtotal) VALUES (?,?,?,?,?)'
        );
        let total = 0;
        for (const it of items) {
        const dish = db.prepare('SELECT * FROM dishes WHERE id = ? AND available = 1').get(it.dish_id);
        if (!dish) throw new Error(`Plato ${it.dish_id} no disponible`);
        const qty = Number(it.quantity);
        if (!Number.isInteger(qty) || qty <= 0) throw new Error('Cantidad inválida');
        const subtotal = +(dish.price * qty).toFixed(2);
        insertItem.run(orderId, dish.id, qty, dish.price, subtotal);
        total += subtotal;
        }
        db.prepare('UPDATE orders SET total = ? WHERE id = ?').run(+total.toFixed(2), orderId);
        return orderId;
    });
    try {
        res.status(201).json({ id: tx(), status: 'pendiente' });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.patch('/:id/status', auth('admin', 'mesero'), (req, res) => {
    const { status } = req.body || {};
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    const allowed = [...STATUS_FLOW, 'cancelado'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Estado inválido' });
    if (order.status === 'pagado') return res.status(400).json({ error: 'Pedido ya pagado' });
    if (status !== 'cancelado' && STATUS_FLOW.indexOf(status) !== STATUS_FLOW.indexOf(order.status) + 1) {
        return res.status(400).json({ error: `Transición inválida: ${order.status} -> ${status}` });
    }
    db.prepare("UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?")
        .run(status, order.id);
    res.json({ id: order.id, status });
});

router.delete('/:id', auth('admin'), (req, res) => {
    const info = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.status(204).end();
});

module.exports = router;