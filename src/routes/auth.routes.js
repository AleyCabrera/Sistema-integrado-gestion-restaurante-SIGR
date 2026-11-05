const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { auth, SECRET } = require('../middleware/auth');

router.post('/register', auth('admin'), (req, res) => {
    const { name, email, password, role = 'cliente' } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email y password son obligatorios' });
    if (!['admin', 'mesero', 'cliente'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
        return res.status(409).json({ error: 'Email ya registrado' });
    }
    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO users (name,email,password_hash,role) VALUES (?,?,?,?)')
        .run(name, email, hash, role);
    res.status(201).json({ id: info.lastInsertRowid, name, email, role });
});

router.post('/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Credenciales incompletas' });
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', auth(), (req, res) => {
    res.json(db.prepare('SELECT id,name,email,role FROM users WHERE id = ?').get(req.user.id));
});

module.exports = router;