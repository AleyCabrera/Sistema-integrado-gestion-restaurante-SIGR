const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

function reportFor(sessionId) {
    const session = db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(sessionId);
    const payments = db.prepare('SELECT * FROM payments WHERE cash_session_id = ?').all(sessionId);
    const byMethod = {};
    let total = 0;
    for (const p of payments) {
        byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
        total += p.amount;
    }
    return {
        session,
        payments_count: payments.length,
        totals_by_method: byMethod,
        total_sales: +total.toFixed(2)
    };
}

router.post('/open', auth('admin', 'mesero'), (req, res) => {
    const open = db.prepare("SELECT * FROM cash_sessions WHERE status = 'abierta'").get();
    if (open) return res.status(409).json({ error: 'Ya existe una caja abierta', id: open.id });
    const { opening_amount = 0 } = req.body || {};
    const info = db.prepare('INSERT INTO cash_sessions (opened_by, opening_amount) VALUES (?,?)')
        .run(req.user.id, opening_amount);
    res.status(201).json(db.prepare('SELECT * FROM cash_sessions WHERE id = ?').get(info.lastInsertRowid));
});

router.post('/pay', auth('admin', 'mesero'), (req, res) => {
    const { order_id, method = 'efectivo' } = req.body || {};
    if (!['efectivo', 'tarjeta', 'transferencia'].includes(method)) {
        return res.status(400).json({ error: 'Método de pago inválido' });
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id);
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
    if (order.status === 'pagado') return res.status(400).json({ error: 'Pedido ya pagado' });
    if (order.status === 'cancelado') return res.status(400).json({ error: 'Pedido cancelado' });
    const session = db.prepare("SELECT * FROM cash_sessions WHERE status = 'abierta'").get();
    if (!session) return res.status(409).json({ error: 'No hay caja abierta' });
    db.transaction(() => {
        db.prepare('INSERT INTO payments (order_id, cash_session_id, amount, method) VALUES (?,?,?,?)')
        .run(order.id, session.id, order.total, method);
        db.prepare("UPDATE orders SET status = 'pagado', updated_at = datetime('now','localtime') WHERE id = ?")
        .run(order.id);
    })();
    res.status(201).json({ order_id: order.id, amount: order.total, method });
});

router.post('/close', auth('admin'), (req, res) => {
    const session = db.prepare("SELECT * FROM cash_sessions WHERE status = 'abierta'").get();
    if (!session) return res.status(409).json({ error: 'No hay caja abierta' });
    const { closing_amount } = req.body || {};
    if (closing_amount === undefined) return res.status(400).json({ error: 'closing_amount es obligatorio' });
    db.prepare(`UPDATE cash_sessions
        SET status = 'cerrada', closed_by = ?, closed_at = datetime('now','localtime'), closing_amount = ?
        WHERE id = ?`).run(req.user.id, closing_amount, session.id);
    res.json(reportFor(session.id));
});

router.get('/current', auth('admin', 'mesero'), (req, res) => {
    const session = db.prepare("SELECT * FROM cash_sessions WHERE status = 'abierta'").get();
    res.json(session ? reportFor(session.id) : null);
});

router.get('/report/daily', auth('admin'), (req, res) => {
    const d = new Date();
    const localDay = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const day = req.query.date || localDay;

    const payments = db.prepare('SELECT * FROM payments WHERE date(created_at) = ?').all(day);
    const byMethod = {};
    let total = 0;
    for (const p of payments) {
        byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
        total += p.amount;
    }
    const topDishes = db.prepare(`
        SELECT d.name AS dish, SUM(oi.quantity) AS qty, SUM(oi.subtotal) AS revenue
        FROM order_items oi
        JOIN dishes d ON d.id = oi.dish_id
        JOIN orders o ON o.id = oi.order_id
        WHERE date(o.created_at) = ? AND o.status = 'pagado'
        GROUP BY d.id ORDER BY qty DESC LIMIT 10`).all(day);

    res.json({
        date: day,
        payments_count: payments.length,
        totals_by_method: byMethod,
        total_sales: +total.toFixed(2),
        top_dishes: topDishes
    });
});

module.exports = router;