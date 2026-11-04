# SIGR — Sistema Integral de Gestión de Restaurante

**Línea base:** v1.0.0-linea-base
**Licencia:** MIT

Aplicación web para la gestión operativa de un restaurante: autenticación por roles, menú digital, pedidos, reservas, caja, pagos y reportes de ventas diarios.

## Módulos incluidos
- Autenticación (admin, mesero, cliente) — JWT + bcrypt
- Menú digital — CRUD de categorías y platos
- Pedidos — registro, ítems y flujo de estados (pendiente → en_preparación → listo → entregado → pagado)
- Reservas — por fecha y hora, con estados
- Caja y reportes — apertura, cobros, cierre y reporte diario

## Requisitos
- Node.js >= 18
- npm >= 9

## Instalación y ejecución
```bash
git clone https://github.com/equipoX/sigr.git
cd sigr
npm install
npm run seed
npm start          # http://localhost:3000
npm test           # pruebas de integración