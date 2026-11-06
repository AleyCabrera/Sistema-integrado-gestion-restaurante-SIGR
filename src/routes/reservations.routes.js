const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

router.get('/', auth('admin', 'mesero'), (req, res) => {
    const { date } = req.query;
    let sql = 'SELECT * FROM reservations WHERE 1=1';
    const params = [];
    if (date) { sql += ' AND date = ?'; params.push(date); }
    sql += ' ORDER BY date, time';
    res.json(db.prepare(sql).all(...params));
});

router.post('/', auth('admin', 'mesero', 'cliente'), (req, res) => {
    const { customer_name, phone = null, date, time, people } = req.body || {};
    if (!customer_name || !date || !time || !people) {
        return res.status(400).json({ error: 'customer_name, date, time y people son obligatorios' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Fecha inválida (YYYY-MM-DD)' });
    if (!/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: 'Hora inválida (HH:MM)' });
    if (!Number.isInteger(people) || people <= 0) return res.status(400).json({ error: 'people inválido' });
    const info = db.prepare(
        'INSERT INTO reservations (user_id,customer_name,phone,date,time,people) VALUES (?,?,?,?,?,?)'
    ).run(req.user.id, customer_name, phone, date, time, people);
    res.status(201).json(db.prepare('SELECT * FROM reservations WHERE id = ?').get(info.lastInsertRowid));
});

router.patch('/:id/status', auth('admin', 'mesero'), (req, res) => {
    const { status } = req.body || {};
    if (!['activa', 'cancelada', 'cumplida'].includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
    }
    const info = db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'Reserva no encontrada' });
    res.json({ id: Number(req.params.id), status });
});

module.exports = router;