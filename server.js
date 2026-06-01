const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE LA BASE DE DATOS ---
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://futbol_db_jmdg_user:l8MQbPnBbkaeSs3zWEdvKg62vJ7AYqC4@dpg-d8ecshk2m8qs738pcjf0-a.oregon-postgres.render.com/futbol_db_jmdg";

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Requerido para conexiones seguras en Render
    }
});

// --- CONFIGURACIÓN DE SWAGGER ---
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API Final de Fútbol con PostgreSQL',
            version: '1.0.0',
            description: 'API totalmente funcional conectada a una base de datos real.',
        },
        servers: [
            {
                url: `http://localhost:${PORT}`,
                description: 'Servidor Local'
            },
            {
                url: 'https://tu-api-desplegada.onrender.com', 
                description: 'Servidor de Producción'
            }
        ],
    },
    apis: ['./server.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/doc', swaggerUi.serve, swaggerUi.setup(swaggerDocs));


// --- ENDPOINTS CON CONSULTAS REALES (POSTGRESQL) ---

/**
 * @openapi
 * /api/equipos:
 *   get:
 *     summary: Obtiene la lista de todos los equipos desde la base de datos
 *     responses:
 *       200:
 *         description: Lista de equipos devuelta con éxito.
 */
app.get('/api/equipos', async (req, res) => {
    try {
        const query = 'SELECT * FROM equipos ORDER BY id ASC';
        const resultado = await pool.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener los equipos de la base de datos" });
    }
});

/**
 * @openapi
 * /api/equipos/{id}:
 *   get:
 *     summary: Obtiene un equipo por su ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Equipo encontrado.
 *       404:
 *         description: Equipo no encontrado.
 */
app.get('/api/equipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM equipos WHERE id = $1';
        const resultado = await pool.query(query, [id]);
        
        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: "Equipo no encontrado" });
        }
        res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error en el servidor" });
    }
});

/**
 * @openapi
 * /api/equipos:
 *   post:
 *     summary: Agrega un nuevo equipo a la base de datos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nombre
 *               - pais
 *             properties:
 *               nombre:
 *                 type: string
 *               pais:
 *                 type: string
 *               campeonatosUCL:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Equipo creado exitosamente.
 */
app.post('/api/equipos', async (req, res) => {
    try {
        const { nombre, pais, campeonatosUCL } = req.body;
        const query = 'INSERT INTO equipos (nombre, pais, campeonatos_ucl) VALUES ($1, $2, $3) RETURNING *';
        const valores = [nombre, pais, campeonatosUCL || 0];
        
        const resultado = await pool.query(query, valores);
        res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al insertar el equipo" });
    }
});

/**
 * @openapi
 * /api/jugadores:
 *   get:
 *     summary: Obtiene la lista de todos los jugadores junto con el nombre de su equipo
 *     responses:
 *       200:
 *         description: Lista de jugadores devuelta con éxito.
 */
app.get('/api/jugadores', async (req, res) => {
    try {
        const query = `
            SELECT j.id, j.nombre, j.posicion, e.nombre AS nombre_equipo 
            FROM jugadores j 
            LEFT JOIN equipos e ON j.equipo_id = e.id 
            ORDER BY j.id ASC
        `;
        const resultado = await pool.query(query);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ mensaje: "Error al obtener los jugadores" });
    }
});

app.get('/', (req, res) => {
    res.send('⚽ ¡API de Fútbol Conectada a PostgreSQL! Visita <a href="/doc">/doc</a> para interactuar con la base de datos.');
});

app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
    console.log(`Documentación disponible en http://localhost:${PORT}/doc`);
});