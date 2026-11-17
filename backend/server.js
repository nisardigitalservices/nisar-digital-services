const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const catalog = require('./services.json');

const app = express();

// Basic configuration
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// PostgreSQL database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

pool.on('error', (error) => {
  console.error('Unexpected database error:', error.message);
});

// Existing recharge data file
const DATA = path.join(__dirname, 'recharge-data.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA, 'utf8'));
  } catch (error) {
    return {
      requests: [],
      wallets: {},
      history: []
    };
  }
}

function save(data) {
  fs.writeFileSync(DATA, JSON.stringify(data, null, 2));
}

// Admin PIN authentication
function admin(req, res, next) {
  const pin = req.get('x-admin-pin');
  const expected = process.env.ADMIN_PIN;

  if (!expected) {
    return res.status(503).json({
      message: 'ADMIN_PIN is not configured.'
    });
  }

  if (pin !== expected) {
    return res.status(401).json({
      message: 'Invalid admin PIN.'
    });
  }

  next();
}

// Serve website files
app.use(express.static(path.join(__dirname, '../website')));

// Home route
app.get('/', (req, res) => {
  res.send('NISAR DIGITAL SERVICES API is running successfully!');
});

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    app: 'NISAR DIGITAL SERVICES',
    banking: false,
    categories: catalog.categories.length,
    services: catalog.services.length
  });
});

// PostgreSQL database health check
app.get('/api/db-health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');

    res.json({
      ok: true,
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (error) {
    console.error('Database connection failed:', error.message);

    res.status(500).json({
      ok: false,
      database: 'disconnected',
      message: 'Database connection failed.'
    });
  }
});

// Get all categories
app.get('/api/categories', (req, res) => {
  res.json(catalog.categories);
});

// Search and get services
app.get('/api/services', (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const category = req.query.category;

  const items = catalog.services.filter((service) => {
    const matchesSearch =
      !q ||
      service.name.toLowerCase().includes(q) ||
      service.category.toLowerCase().includes(q);

    const matchesCategory =
      !category || service.category === category;

    return matchesSearch && matchesCategory;
  });

  res.json({
    total: items.length,
    services: items
  });
});

// Get wallet balance and history
app.get('/api/wallet/:mobile', (req, res) => {
  const mobile = String(req.params.mobile || '');

  if (!/^\d{10}$/.test(mobile)) {
    return res.status(400).json({
      message: 'Enter a valid 10-digit mobile number.'
    });
  }

  const data = load();

  res.json({
    mobile,
    balance: data.wallets[mobile] || 0,
    history: data.history
      .filter((item) => item.mobile === mobile)
      .slice(-20)
      .reverse()
  });
});

// Submit wallet recharge request
app.post('/api/recharge/submit', (req, res) => {
  const {
    name,
    mobile,
    role,
    amount,
    bank,
    utr
  } = req.body || {};

  const rechargeAmount = Number(amount);

  const validBanks = [
    'Paytm QR - Andhra Pradesh Bank',
    'Airtel Payments Bank QR'
  ];

  if (
    !name ||
    !/^\d{10}$/.test(String(mobile || '')) ||
    !['Retailer', 'Distributor'].includes(role) ||
    !Number.isInteger(rechargeAmount) ||
    rechargeAmount < 100 ||
    rechargeAmount > 3000 ||
    !validBanks.includes(bank) ||
    !String(utr || '').trim()
  ) {
    return res.status(400).json({
      message: 'Enter valid details. Recharge must be ₹100–₹3,000 and UTR is required.'
    });
  }

  const data = load();

  const id = 'NDS' + Date.now().toString();

  data.requests.push({
    id,
    name: String(name).slice(0, 80),
    mobile: String(mobile),
    role,
    amount: rechargeAmount,
    bank,
    utr: String(utr).trim().slice(0, 80),
    status: 'Pending',
    createdAt: new Date().toISOString()
  });

  save(data);

  res.status(201).json({
    message: 'Recharge request submitted. Wallet credit is pending admin verification.',
    id
  });
});

// Admin: Get pending recharge requests
app.get('/api/admin/recharges', admin, (req, res) => {
  const data = load();

  res.json({
    requests: data.requests.filter(
      (item) => item.status === 'Pending'
    )
  });
});

// Admin: Approve recharge
app.post('/api/admin/recharges/:id/approve', admin, (req, res) => {
  const data = load();

  const item = data.requests.find(
    (request) => request.id === req.params.id
  );

  if (!item) {
    return res.status(404).json({
      message: 'Recharge request not found.'
    });
  }

  if (item.status !== 'Pending') {
    return res.status(409).json({
      message: 'Request is already processed.'
    });
  }

  item.status = 'Approved';
  item.approvedAt = new Date().toISOString();

  data.wallets[item.mobile] =
    (data.wallets[item.mobile] || 0) + item.amount;

  data.history.push({
    id: item.id,
    mobile: item.mobile,
    role: item.role,
    amount: item.amount,
    bank: item.bank,
    utr: item.utr,
    status: 'Credited',
    createdAt: item.createdAt,
    approvedAt: item.approvedAt
  });

  save(data);

  res.json({
    message: 'Recharge approved and wallet credited.',
    balance: data.wallets[item.mobile]
  });
});

// Admin: Reject recharge
app.post('/api/admin/recharges/:id/reject', admin, (req, res) => {
  const data = load();

  const item = data.requests.find(
    (request) => request.id === req.params.id
  );

  if (!item) {
    return res.status(404).json({
      message: 'Recharge request not found.'
    });
  }

  if (item.status !== 'Pending') {
    return res.status(409).json({
      message: 'Request is already processed.'
    });
  }

  item.status = 'Rejected';
  item.rejectedAt = new Date().toISOString();

  save(data);

  res.json({
    message: 'Recharge request rejected.'
  });
});

// Enquiries endpoint - not enabled yet
app.post('/api/enquiries', (req, res) => {
  res.status(501).json({
    message: 'Secure enquiry storage is not enabled yet.'
  });
});

// Handle unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    message: 'API route not found.'
  });
});

// General error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error.message);

  res.status(500).json({
    message: 'Internal server error.'
  });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
 console.log(NISAR API running on port $DIL1);
