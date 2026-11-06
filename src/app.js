const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0-linea-base' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/menu', require('./routes/menu.routes'));
app.use('/api/orders', require('./routes/orders.routes'));
app.use('/api/reservations', require('./routes/reservations.routes'));
app.use('/api/cash', require('./routes/cash.routes'));

app.use((err, req, res, next) => {          // eslint-disable-line
    console.error(err);
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;