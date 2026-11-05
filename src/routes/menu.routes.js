const router = require('express').Router();
const db = require('../config/db');
const { auth } = require('../middleware/auth');

// ---------- Categorías ----------
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.post('/categories', auth('admin'), (req, res) => {
    const { name, description = null } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name es obligatorio' });
    try {
        const info = db.prepare('INSERT INTO categories (name,description) VALUES (?,?)').run(name, description);
        res.status(201).json(db.prepare('SELECT * FROM categories WHERE id = ?').get(info.lastInsertRowid));
    } catch {
        res.status(409).json({ error: 'Categoría duplicada' });
    }
});

router.put('/categories/:id', auth('admin'), (req, res) => {
    const { name = null, description = null } = req.body || {};
    const info = db.prepare(
        'UPDATE categories SET name = COALESCE(?,name), description = COALESCE(?,description) WHERE id = ?'
    ).run(name, description, req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'No encontrada' });
    res.json(db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id));
});

router.delete('/categories/:id', auth('admin'), (req, res) => {
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'No encontrada' });
    res.status(204).end();
});

// ---------- Platos ----------
router.get('/dishes', (req, res) => {
    const { category_id, available } = req.query;
    let sql = 'SELECT d.*, c.name AS category FROM dishes d LEFT JOIN categories c ON c.id = d.category_id WHERE 1=1';
    const params = [];
    if (category_id) { sql += ' AND d.category_id = ?'; params.push(category_id); }
    if (available !== undefined) { sql += ' AND d.available = ?'; params.push(available === 'true' ? 1 : 0); }
    sql += ' ORDER BY d.name';
    res.json(db.prepare(sql).all(...params));
});

router.post('/dishes', auth('admin'), (req, res) => {
    const { category_id = null, name, description = null, price, available = 1 } = req.body || {};
    if (!name || price === undefined) return res.status(400).json({ error: 'name y price son obligatorios' });
    const info = db.prepare('INSERT INTO dishes (category_id,name,description,price,available) VALUES (?,?,?,?,?)')
        .run(category_id, name, description, price, available ? 1 : 0);
    res.status(201).json(db.prepare('SELECT * FROM dishes WHERE id = ?').get(info.lastInsertRowid));
});

router.put('/dishes/:id', auth('admin'), (req, res) => {
    const d = req.body || {};
    const info = db.prepare(`UPDATE dishes SET
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        available = COALESCE(?, available)
        WHERE id = ?`).run(
        d.category_id ?? null, d.name ?? null, d.description ?? null, d.price ?? null,
        d.available === undefined ? null : (d.available ? 1 : 0), req.params.id
    );
    if (!info.changes) return res.status(404).json({ error: 'No encontrado' });
    res.json(db.prepare('SELECT * FROM dishes WHERE id = ?').get(req.params.id));
});

router.delete('/dishes/:id', auth('admin'), (req, res) => {
    const info = db.prepare('DELETE FROM dishes WHERE id = ?').run(req.params.id);
    if (!info.changes) return res.status(404).json({ error: 'No encontrado' });
    res.status(204).end();
});

module.exports = router;