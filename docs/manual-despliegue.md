# SIGR - Sistema Integral de Gestión de Restaurante

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/Database-SQLite3-blue.svg)](https://www.sqlite.org/)
[![Tests](https://img.shields.io/badge/Tests-Jest%20%26%20Supertest-orange.svg)](https://jestjs.io/)

Sistema backend y frontend para la gestión de restaurantes, diseñado con principios de **seguridad por diseño**, integridad de datos y arquitectura escalable.

## 🛡️ Características de Seguridad Implementadas
- **Autenticación JWT** con validación de sesión y expiración.
- **Prevención de Inyección SQL** mediante consultas parametrizadas en todas las operaciones.
- **Hashing de contraseñas** con `bcrypt` (cost factor 10) usando operaciones asíncronas.
- **Protección contra Race Conditions** en transacciones de caja y pagos (atomicidad garantizada).
- **Content Security Policy (CSP)** y prevención de XSS en el frontend.
- **Validación estricta** de tipos, formatos y límites de payload (prevención de DoS).

---

## 🚀 Guía de Despliegue

### 1. Despliegue Local (Desarrollo)

**Requisitos:** Node.js >= 18 y npm >= 9.

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd sigr

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# ⚠️ IMPORTANTE: Genera un JWT_SECRET fuerte. Ejemplo en Node:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. Inicializar la base de datos con datos de prueba (Seed)
npm run seed

# 5. Iniciar el servidor
npm start

La aplicación estará disponible en: http://localhost:3000
2. Ejecución de Pruebas
El proyecto incluye una suite de pruebas de integración para validar flujos críticos (auth, caja, pedidos).

npm test

Nota: Las pruebas utilizan una base de datos SQLite aislada (test.db) que se crea y destruye automáticamente para garantizar la idempotencia.

⚙️ Variables de Entorno
Crea un archivo .env en la raíz del proyecto basado en .env.example.
Variable
Descripción
Ejemplo / Requerimiento
PORT
Puerto en el que escuchará el servidor HTTP
3000
NODE_ENV
Entorno de ejecución (development o production)
production
JWT_SECRET
OBLIGATORIO. Clave secreta para firmar tokens JWT.
Cadena aleatoria de 64+ caracteres
DB_PATH
Ruta donde se almacenará la base de datos SQLite
./data/sigr.db

🐳 Despliegue con Docker
El proyecto incluye un Dockerfile optimizado para producción.

# 1. Construir la imagen
docker build -t sigr-app .

# 2. Ejecutar el contenedor (mapeando el volumen para persistencia de SQLite)
docker run -d \
  --name sigr-container \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  sigr-app

  📂 Estructura del Proyecto

  ├── src/
│   ├── config/         # Configuración de BD y variables
│   ├── middleware/     # Auth, validaciones y manejo de errores
│   ├── routes/         # Controladores y endpoints de la API
│   └── app.js          # Configuración principal de Express
├── public/             # Frontend (HTML, CSS, JS Vanilla)
├── scripts/            # Scripts de utilidad (ej. seed.js)
├── tests/              # Pruebas de integración con Jest
├── .env.example        # Plantilla de variables de entorno
├── .gitignore          # Archivos ignorados por Git
└── package.json        # Dependencias y scripts


Nota de Seguridad: Nunca subas el archivo .env ni la carpeta data/ (que contiene sigr.db) a un repositorio público. Ambos están protegidos por .gitignore.


---

## 📋 Archivos Adicionales que DEBES crear en esta rama

Para que esta documentación sea real y funcional, debes crear estos dos archivos en la misma rama `docs/readme-and-deployment`:

### 1. Archivo `.env.example` (Obligatorio)
```env
# Entorno (development o production)
NODE_ENV=development

# Puerto del servidor
PORT=3000

# SECRETO JWT: Genera uno nuevo con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# ¡NUNCA uses el valor de abajo en producción!
JWT_SECRET=change_this_to_a_secure_random_string_minimum_64_chars

# Ruta de la base de datos SQLite
DB_PATH=./data/sigr.db

2. Verificar tu .gitignore
Asegúrate de que tu archivo .gitignore tenga esto (es vital para la seguridad):

# Dependencias
node_modules/

# Variables de entorno (¡CRÍTICO!)
.env
.env.local
.env.production

# Base de datos SQLite (¡CRÍTICO!)
data/
*.db
*.sqlite

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*