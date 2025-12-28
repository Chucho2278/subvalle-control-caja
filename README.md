# Sistema de Control de Caja – Subvalle

## 📄 Descripción del proyecto

El **Sistema de Control de Caja Subvalle** es una aplicación web desarrollada para el registro, control y auditoría de operaciones de caja en restaurantes.  
El sistema permite gestionar registros diarios de caja, usuarios, sucursales, convenios, auditorías y reportes, garantizando trazabilidad y control financiero.

Este proyecto fue desarrollado como parte del proceso formativo del **SENA – Tecnología en Análisis y Desarrollo de Software**, y está diseñado para operar inicialmente en un entorno local, dejando abierta la posibilidad de implementación futura en producción.

---

## Objetivo del sistema

- Registrar operaciones diarias de caja por turno y sucursal.
- Controlar diferencias de caja (caja corta o pasada).
- Gestionar usuarios con roles (Administrador / Cajero).
- Generar reportes y exportación de información.
- Mantener auditoría de acciones realizadas en el sistema.

---

## Arquitectura del proyecto

El proyecto se encuentra dividido en dos capas principales:

subvalle-control-caja/
│
├── backend/ # API REST desarrollada en Node.js + Express
│ ├── src/
│ ├── controllers/
│ ├── services/
│ ├── routes/
│ ├── utils/
│ └── server.ts
│
├── frontend/ # Aplicación web desarrollada en React + TypeScript
│ ├── src/
│ ├── pages/
│ ├── components/
│ ├── services/
│ └── main.tsx
│
├── .gitignore
└── README.md


---

## 🛠️ Tecnologías utilizadas

### Backend
- Node.js
- Express.js
- TypeScript
- MySQL
- JWT (autenticación)
- bcrypt (hash de contraseñas)

### Frontend
- React
- TypeScript
- Vite
- Bootstrap
- Axios

---

## Instalación y ejecución (entorno local)

### Requisitos previos
- Node.js (v18 o superior)
- MySQL
- Git

---

### Backend

```bash
cd backend
npm install
npm run dev

El backend se ejecuta en: http://localhost:3000

### Frontend

cd frontend
npm install
npm run dev

El frontend se ejecuta: http://localhost:5173
