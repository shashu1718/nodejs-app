require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const db = require('./database/db'); // Import the database module
const app = express();
const port = 3000;


const otpStorage = {};


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// File upload setup with multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } }); // Max 2MB file size

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/login.html');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/views/register.html');
});

app.post('/register', upload.single('image'), async (req, res) => {
  const { name, email, password, company, age, dob } = req.body;

  // Validate email and password
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(email)) {
    return res.send('Invalid email format');
  }

  if (password.length < 6) {
    return res.send('Password must be at least 6 characters');
  }

  try {
    // Check if email already exists
    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length > 0) {
      return res.send('Email is already in use');
    }

    // Ensure image is valid
    if (!req.file || (req.file.mimetype !== 'image/jpeg' && req.file.mimetype !== 'image/png')) {
      return res.send('Please upload a valid image (PNG or JPG)');
    }

    const imagePath = req.file.filename;

    // Save user data
    const query = 'INSERT INTO users (name, email, password, company, age, dob, image) VALUES (?, ?, ?, ?, ?, ?, ?)';
    await db.query(query, [name, email, password, company, age, dob, imagePath]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const [results] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);
    if (results.length === 0) {
      return res.redirect('/error');
    }

    // Generate OTP and store it
    const otp = generateOtp();
    otpStorage[email] = { otp, timestamp: Date.now() };

    // Send OTP
    await sendOtpEmail(email, otp);
    res.redirect(`/verify?email=${email}`);
  } catch (err) {
    console.error(err);
    res.send('Database error');
  }
});

app.get('/verify', (req, res) => {
  const { email } = req.query;
  res.render('verify', { email });
});

app.post('/verify', (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.redirect('/error');
  }

  const otpData = otpStorage[email];
  if (otpData && otpData.otp === otp && Date.now() - otpData.timestamp < 600000) {
    delete otpStorage[email];
    res.redirect(`/thankyou?email=${email}`);
  } else {
    res.redirect('/error');
  }
});

app.get('/thankyou', async (req, res) => {
  const { email } = req.query;

  try {
    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length === 0) {
      return res.redirect('/error');
    }

    const user = results[0];
    res.render('thankyou', { name: user.name, email: user.email, image: user.image });
  } catch (err) {
    console.error(err);
    res.redirect('/error');
  }
});

app.get('/error', (req, res) => {
  res.sendFile(__dirname + '/views/error.html');
});

app.post('/delete-account', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.redirect('/error');
  }

  try {
    await db.query('DELETE FROM users WHERE email = ?', [email]);
    res.redirect('/account-deleted');
  } catch (err) {
    console.error(err);
    res.redirect('/error');
  }
});

app.get('/account-deleted', (req, res) => {
  res.send('<h2>Your account has been successfully deleted.</h2><a href="/">Go back to login page</a>');
});

// Utility Functions
function generateOtp() {
  return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 6);
}

async function sendOtpEmail(email, otp) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your OTP for Login',
    text: `Your OTP is: ${otp}. It is valid for 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
