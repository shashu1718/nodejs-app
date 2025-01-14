// // database/db.js
// require('dotenv').config();

// const mysql = require('mysql2');

// // Create a connection pool
// const pool = mysql.createPool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
// });


// const db = pool.promise();

// module.exports = db;


const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,       // e.g., my-db.clever-cloud.com
  user: process.env.DB_USER,       // Clever Cloud database username
  password: process.env.DB_PASSWORD, // Clever Cloud database password
  database: process.env.DB_NAME,   // Clever Cloud database name
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = db;

