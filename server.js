import express from 'express';
import session from 'express-session';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import Razorpay from 'razorpay';
import pg from 'pg';

const { Pool } = pg;
const ROOT = process.cwd();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(ROOT, 'wellness_data.json');

const DATABASE_URL = process.env.SUPABASE_DATABASE_URL
  || 'postgresql://postgres:makhana%40%2312345@db.rpyibuyljbbtxyqaxnlt.supabase.co:5432/postgres';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function initDb() {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database successfully.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        log_date VARCHAR(20) NOT NULL,
        calories NUMERIC DEFAULT 0,
        water_glasses NUMERIC DEFAULT 0,
        sleep_hours NUMERIC DEFAULT 0,
        steps NUMERIC DEFAULT 0,
        score INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT unique_user_log_date UNIQUE (user_id, log_date)
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        razorpay_order_id VARCHAR(255),
        payment_id VARCHAR(255),
        amount_paise BIGINT DEFAULT 0,
        items JSONB,
        status VARCHAR(50) DEFAULT 'paid',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS monthly_winners (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        month VARCHAR(10) NOT NULL UNIQUE,
        total_score NUMERIC DEFAULT 0,
        avg_score NUMERIC DEFAULT 0,
        coupon_eligible INTEGER DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price NUMERIC NOT NULL,
        mood VARCHAR(100),
        mood_bg VARCHAR(50),
        mood_color VARCHAR(50),
        img TEXT,
        description TEXT,
        aroma TEXT,
        time_slot TEXT,
        pairing TEXT,
        ingredients TEXT,
        in_stock BOOLEAN DEFAULT true,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed default products if empty
    const prodRes = await client.query('SELECT COUNT(*) FROM products');
    if (parseInt(prodRes.rows[0].count, 10) === 0) {
      console.log('Seeding default makhana products...');
      const defaultProducts = [
        {
          id: 'himalayan',
          name: 'Himalayan Salt & Pepper',
          price: 160,
          mood: 'BALANCED',
          mood_bg: '#f0e8dc',
          mood_color: '#7a5030',
          img: '/attached_assets/0_WhatsApp_Image_2026-07-24_at_10.40.59_AM_1784966442210.jpeg',
          description: 'Hand-harvested lotus seeds slow-roasted in cold-pressed coconut oil, seasoned with mineral-rich pink Himalayan salt and crushed Malabar black pepper. A timeless, subtle crunch that balances body and mind.',
          aroma: 'Subtle notes of crushed Malabar peppercorns and warm earthy minerals.',
          time_slot: 'Mid-morning focus sessions or post-yoga mindful snacking.',
          pairing: 'Pairs exceptionally well with Tender Coconut Water or Lemongrass Tea.',
          ingredients: 'Lotus Seeds (Makhana), Cold Pressed Oil, Pink Himalayan Salt, Malabar Black Pepper, Rock Salt.'
        },
        {
          id: 'pudina',
          name: 'Pudina (Garden Mint)',
          price: 160,
          mood: 'REFRESHED',
          mood_bg: '#e0f0e8',
          mood_color: '#2d6a4f',
          img: '/attached_assets/0_WhatsApp_Image_2026-07-24_at_10.40.59_AM_(1)_1784966453462.jpeg',
          description: 'Infused with organic garden mint, tangy dry mango powder, and subtle roasted cumin. Refreshingly zesty with an invigorating aroma that sharpens focus and soothes digestion.',
          aroma: 'Cooling garden mint aroma with a bright, citrusy mango undertone.',
          time_slot: '3:00 PM Afternoon Slump or post-lunch mental refresh.',
          pairing: 'Pairs beautifully with Iced Green Tea or Mint Lemonade.',
          ingredients: 'Lotus Seeds (Makhana), Cold Pressed Oil, Dried Mint Powder, Amchur (Dry Mango), Cumin, Black Salt.'
        },
        {
          id: 'cheese',
          name: 'Tangy Cheese',
          price: 160,
          mood: 'INDULGENT',
          mood_bg: '#fef0e0',
          mood_color: '#c46820',
          img: '/attached_assets/0_WhatsApp_Image_2026-07-24_at_10.41.00_AM_1784966461889.jpeg',
          description: 'Savory cheddar cheese notes harmonized with tangy tomatoes and a hint of smoked paprika. An indulgent, guilt-free craving solution packed with plant protein.',
          aroma: 'Rich savory cheddar with a smoky tomato warmth.',
          time_slot: 'Evening unwind, movie rituals, or late-night study marathons.',
          pairing: 'Pairs perfectly with Cold Brew Coffee or Sparkling Water.',
          ingredients: 'Lotus Seeds (Makhana), Edible Oil, Cheese Powder, Tomato Powder, Smoked Paprika, Garlic, Salt.'
        },
        {
          id: 'periperi',
          name: 'Peri Peri (African Chili)',
          price: 160,
          mood: 'ENERGISED',
          mood_bg: '#fde8e8',
          mood_color: '#b82020',
          img: '/attached_assets/0_WhatsApp_Image_2026-07-24_at_10.41.00_AM_(1)_1784966469555.jpeg',
          description: 'Fiery African Bird’s Eye chili blended with garlic, onion, and tangy herbs. A bold, fiery bite engineered to ignite your metabolism and lift mid-afternoon energy.',
          aroma: 'Fiery chili aroma balanced with sweet roasted garlic and lemon zest.',
          time_slot: 'Pre-workout boost or high-intensity focus sprints.',
          pairing: 'Pairs well with Coconut Water or Fresh Kombucha.',
          ingredients: 'Lotus Seeds (Makhana), Edible Oil, African Bird’s Eye Chili, Roasted Garlic, Onion Powder, Oregano, Salt.'
        }
      ];

      for (const p of defaultProducts) {
        await client.query(
          `INSERT INTO products (id, name, price, mood, mood_bg, mood_color, img, description, aroma, time_slot, pairing, ingredients)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
          [p.id, p.name, p.price, p.mood, p.mood_bg, p.mood_color, p.img, p.description, p.aroma, p.time_slot, p.pairing, p.ingredients]
        );
      }
    }

    // Check if users exist in DB; if not, import from wellness_data.json if present
    const userRes = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userRes.rows[0].count, 10) === 0 && fs.existsSync(DB_FILE)) {
      try {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const jsonDb = JSON.parse(fileContent);
        if (jsonDb.users && jsonDb.users.length > 0) {
          console.log(`Migrating ${jsonDb.users.length} existing users from JSON to PostgreSQL...`);
          for (const u of jsonDb.users) {
            await client.query(
              'INSERT INTO users (id, name, email, password, created_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO NOTHING',
              [u.id, u.name, u.email, u.password, u.created_at || new Date().toISOString()]
            );
          }
          await client.query(`SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))`);
        }
        if (jsonDb.daily_logs && jsonDb.daily_logs.length > 0) {
          for (const l of jsonDb.daily_logs) {
            await client.query(
              `INSERT INTO daily_logs (user_id, log_date, calories, water_glasses, sleep_hours, steps, score, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (user_id, log_date) DO NOTHING`,
              [l.user_id, l.log_date, l.calories, l.water_glasses, l.sleep_hours, l.steps, l.score, l.created_at || new Date().toISOString()]
            );
          }
        }
        if (jsonDb.orders && jsonDb.orders.length > 0) {
          for (const o of jsonDb.orders) {
            await client.query(
              `INSERT INTO orders (user_id, razorpay_order_id, payment_id, amount_paise, items, status, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [o.user_id, o.razorpay_order_id, o.payment_id, o.amount_paise, JSON.stringify(o.items || []), o.status || 'paid', o.created_at || new Date().toISOString()]
            );
          }
        }
      } catch (mErr) {
        console.warn('Data migration warning:', mErr.message);
      }
    }

    client.release();
  } catch (err) {
    console.error('PostgreSQL init error:', err.message);
  }
}

initDb();

// ── RAZORPAY CLIENT ──
const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

let rzp = null;
if (razorpayKeyId && razorpayKeySecret) {
  try {
    rzp = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret
    });
  } catch (err) {
    console.warn('Razorpay init warning:', err.message);
  }
}

// ── SCORE CALCULATOR ──
function calcScore(calories, water, sleep, steps) {
  const calScore = Math.max(0, 25 - (Math.abs(calories - 2000) / 2000 * 25));
  const waterScore = Math.min(water / 8, 1) * 25;
  const sleepScore = Math.max(0, 25 - (Math.abs(sleep - 8) / 8 * 25));
  const stepsScore = Math.min(steps / 10000, 1) * 25;
  return Math.round(calScore + waterScore + sleepScore + stepsScore);
}

// ── CLOSE LAST MONTH ──
async function closeLastMonth() {
  try {
    const now = new Date();
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthEnd = new Date(firstThisMonth.getTime() - 86400000);
    const monthStr = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}`;

    const check = await pool.query('SELECT id FROM monthly_winners WHERE month = $1', [monthStr]);
    if (check.rows.length > 0) return;

    const topRes = await pool.query(
      `SELECT user_id, SUM(score) as total_score, COUNT(*) as days_count
       FROM daily_logs WHERE log_date LIKE $1
       GROUP BY user_id ORDER BY total_score DESC LIMIT 1`,
      [`${monthStr}%`]
    );

    if (topRes.rows.length > 0) {
      const top = topRes.rows[0];
      const avg = Number(top.total_score) / Number(top.days_count);
      await pool.query(
        `INSERT INTO monthly_winners (user_id, month, total_score, avg_score, coupon_eligible)
         VALUES ($1, $2, $3, $4, 1) ON CONFLICT (month) DO NOTHING`,
        [top.user_id, monthStr, top.total_score, avg]
      );
    }
  } catch (err) {
    console.warn('closeLastMonth error:', err.message);
  }
}

// ── EXPRESS APP SETUP ──
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  })
);

// Middleware: loginRequired
function loginRequired(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// ── AUTH ROUTES ──
app.post('/api/auth/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const pwd = req.body.password || '';

    if (!name || !email || !pwd) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (pwd.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const check = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(pwd, 10);
    const insertRes = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    const newUser = insertRes.rows[0];

    req.session.userId = newUser.id;
    req.session.userName = newUser.name;

    await new Promise((resolve, reject) =>
      req.session.save(err => err ? reject(err) : resolve())
    );

    return res.json({ id: newUser.id, name: newUser.name, email: newUser.email });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create account. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const pwd = req.body.password || '';

    if (!email || !pwd) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];
    const match = await bcrypt.compare(pwd, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    req.session.userId = user.id;
    req.session.userName = user.name;

    return res.json({ id: user.id, name: user.name, email: user.email });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to sign in. Please try again.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.userId) {
    return res.json({ user: null });
  }
  res.json({
    user: {
      id: req.session.userId,
      name: req.session.userName
    }
  });
});

// ── WELLNESS ROUTES ──
app.get('/api/wellness/log', loginRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logRes = await pool.query(
      'SELECT * FROM daily_logs WHERE user_id = $1 AND log_date = $2',
      [req.session.userId, today]
    );
    return res.json(logRes.rows[0] || null);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch log' });
  }
});

app.post('/api/wellness/log', loginRequired, async (req, res) => {
  try {
    const calories = parseFloat(req.body.calories);
    const water = parseFloat(req.body.water);
    const sleep = parseFloat(req.body.sleep);
    const steps = parseFloat(req.body.steps);

    if (isNaN(calories) || isNaN(water) || isNaN(sleep) || isNaN(steps)) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const score = calcScore(calories, water, sleep, steps);
    const today = new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `INSERT INTO daily_logs (user_id, log_date, calories, water_glasses, sleep_hours, steps, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, log_date)
       DO UPDATE SET calories = EXCLUDED.calories, water_glasses = EXCLUDED.water_glasses,
                     sleep_hours = EXCLUDED.sleep_hours, steps = EXCLUDED.steps, score = EXCLUDED.score
       RETURNING *`,
      [req.session.userId, today, calories, water, sleep, steps, score]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Log save error:', err);
    return res.status(500).json({ error: 'Failed to save daily log' });
  }
});

app.get('/api/wellness/chart', loginRequired, async (req, res) => {
  try {
    const chartRes = await pool.query(
      'SELECT log_date AS date, score FROM daily_logs WHERE user_id = $1 ORDER BY log_date DESC LIMIT 7',
      [req.session.userId]
    );
    const data = chartRes.rows.reverse();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

app.get('/api/wellness/stats', loginRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const monthStr = today.substring(0, 7) + '%';

    const todayRes = await pool.query(
      'SELECT score FROM daily_logs WHERE user_id = $1 AND log_date = $2',
      [req.session.userId, today]
    );

    const monthRes = await pool.query(
      'SELECT score FROM daily_logs WHERE user_id = $1 AND log_date LIKE $2',
      [req.session.userId, monthStr]
    );

    const monthLogs = monthRes.rows;
    let monthAvg = null;
    if (monthLogs.length > 0) {
      const sum = monthLogs.reduce((acc, l) => acc + Number(l.score), 0);
      monthAvg = Number((sum / monthLogs.length).toFixed(1));
    }

    res.json({
      today_score: todayRes.rows[0] ? todayRes.rows[0].score : null,
      month_avg: monthAvg,
      days_logged: monthLogs.length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

app.get('/api/wellness/leaderboard', loginRequired, async (req, res) => {
  try {
    await closeLastMonth();
    const monthStr = new Date().toISOString().substring(0, 7) + '%';

    const lbRes = await pool.query(
      `SELECT d.user_id, u.name, SUM(d.score) as total_score,
              ROUND(AVG(d.score)::numeric, 1) as avg_score, COUNT(d.id) as days_logged
       FROM daily_logs d
       JOIN users u ON d.user_id = u.id
       WHERE d.log_date LIKE $1
       GROUP BY d.user_id, u.name
       ORDER BY total_score DESC`,
      [monthStr]
    );

    const list = lbRes.rows.map((row, index) => ({
      user_id: Number(row.user_id),
      name: row.name,
      total_score: Math.round(Number(row.total_score)),
      avg_score: Number(row.avg_score),
      days_logged: Number(row.days_logged),
      is_me: Number(row.user_id) === req.session.userId,
      rank: index + 1
    }));

    res.json(list);
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

app.get('/api/wellness/last-winner', async (req, res) => {
  try {
    await closeLastMonth();
    const now = new Date();
    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthEnd = new Date(firstThisMonth.getTime() - 86400000);
    const monthStr = `${lastMonthEnd.getFullYear()}-${String(lastMonthEnd.getMonth() + 1).padStart(2, '0')}`;

    const winRes = await pool.query(
      `SELECT w.month, w.total_score, w.avg_score, w.coupon_eligible, u.name
       FROM monthly_winners w
       JOIN users u ON w.user_id = u.id
       WHERE w.month = $1`,
      [monthStr]
    );

    if (winRes.rows.length === 0) {
      return res.json(null);
    }

    const row = winRes.rows[0];
    res.json({
      month: row.month,
      total_score: row.total_score,
      avg_score: row.avg_score,
      coupon_eligible: row.coupon_eligible,
      name: row.name || 'Unknown'
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch last winner' });
  }
});

// ── RAZORPAY / ORDERS ROUTES ──
app.get('/api/config', (req, res) => {
  res.json({ razorpay_key_id: razorpayKeyId });
});

app.post('/api/orders/create', async (req, res) => {
  const amountPaise = parseInt(req.body.amount, 10);
  if (isNaN(amountPaise) || amountPaise <= 0) {
    return res.status(400).json({ error: 'Amount must be positive' });
  }

  const receipt = `rcpt_${Math.floor(Date.now() / 1000)}`;

  if (rzp) {
    try {
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: 1
      });
      return res.json(order);
    } catch (err) {
      console.warn('Razorpay order creation failed, falling back to mock:', err.message);
    }
  }

  // Mock order fallback if Razorpay API keys aren't set or fail
  const mockOrder = {
    id: `order_mock_${Date.now()}`,
    entity: 'order',
    amount: amountPaise,
    amount_paid: 0,
    amount_due: amountPaise,
    currency: 'INR',
    receipt,
    status: 'created',
    attempts: 0,
    notes: [],
    created_at: Math.floor(Date.now() / 1000)
  };
  return res.json(mockOrder);
});

app.post('/api/orders/verify', async (req, res) => {
  try {
    const orderId = req.body.razorpay_order_id || '';
    const paymentId = req.body.razorpay_payment_id || '';
    const signature = req.body.razorpay_signature || '';
    const items = req.body.items || [];
    const amount = req.body.amount || 0;

    if (razorpayKeySecret && !orderId.startsWith('order_mock_')) {
      const expected = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (expected !== signature) {
        return res.status(400).json({ error: 'Signature mismatch — payment not verified' });
      }
    }

    const userId = req.session ? req.session.userId || null : null;
    const itemsJson = typeof items === 'string' ? items : JSON.stringify(items);

    await pool.query(
      `INSERT INTO orders (user_id, razorpay_order_id, payment_id, amount_paise, items, status)
       VALUES ($1, $2, $3, $4, $5, 'paid')`,
      [userId, orderId, paymentId, parseInt(amount, 10), itemsJson]
    );

    return res.json({ success: true, payment_id: paymentId });
  } catch (err) {
    console.error('Order verify error:', err);
    return res.status(500).json({ error: 'Failed to verify order' });
  }
});

app.get('/api/orders', loginRequired, async (req, res) => {
  try {
    const ordersRes = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.session.userId]
    );
    res.json(ordersRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/profile', loginRequired, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, name, email, created_at FROM users WHERE id = $1', [req.session.userId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    const statsRes = await pool.query(
      `SELECT COUNT(*) as order_count, COALESCE(SUM(amount_paise), 0) as total_spent
       FROM orders WHERE user_id = $1 AND status = 'paid'`,
      [req.session.userId]
    );

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      order_count: parseInt(statsRes.rows[0].order_count, 10),
      total_spent: parseInt(statsRes.rows[0].total_spent, 10)
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PUBLIC PRODUCTS API ──
app.get('/api/products', async (req, res) => {
  try {
    const prodRes = await pool.query('SELECT * FROM products ORDER BY name ASC');
    res.json(prodRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const prodRes = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (prodRes.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(prodRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// ── ADMIN AUTH & MIDDLEWARE ──
function adminRequired(req, res, next) {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
}

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (username === 'makhana' && password === 'makhana') {
      req.session.isAdmin = true;
      await new Promise((resolve, reject) =>
        req.session.save(err => err ? reject(err) : resolve())
      );
      return res.json({ success: true, username: 'makhana' });
    }
    return res.status(401).json({ error: 'Invalid admin username or password' });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

app.get('/api/admin/me', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

app.post('/api/admin/logout', (req, res) => {
  if (req.session) req.session.isAdmin = false;
  res.json({ success: true });
});

// ── ADMIN DATA ENDPOINTS ──

// 1. Customer Login Details
app.get('/api/admin/customers', adminRequired, async (req, res) => {
  try {
    const usersRes = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
             COUNT(o.id) as total_orders,
             COALESCE(SUM(o.amount_paise), 0) as total_spent_paise
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id AND o.status = 'paid'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    const customers = usersRes.rows.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      created_at: c.created_at,
      total_orders: parseInt(c.total_orders, 10),
      total_spent: Math.round(parseInt(c.total_spent_paise, 10) / 100)
    }));
    res.json(customers);
  } catch (err) {
    console.error('Admin customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// 2. Orders List
app.get('/api/admin/orders', adminRequired, async (req, res) => {
  try {
    const ordersRes = await pool.query(`
      SELECT o.id, o.user_id, o.razorpay_order_id, o.payment_id, o.amount_paise, o.items, o.status, o.created_at,
             u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    const orders = ordersRes.rows.map(o => ({
      id: o.id,
      user_id: o.user_id,
      customer_name: o.customer_name || 'Guest / Unregistered',
      customer_email: o.customer_email || 'N/A',
      razorpay_order_id: o.razorpay_order_id,
      payment_id: o.payment_id,
      amount: Math.round(parseInt(o.amount_paise, 10) / 100),
      items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      status: o.status,
      created_at: o.created_at
    }));
    res.json(orders);
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to fetch admin orders' });
  }
});

// 3. Monthly Sales Analytics
app.get('/api/admin/sales', adminRequired, async (req, res) => {
  try {
    const salesRes = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month,
             COUNT(id) as order_count,
             COALESCE(SUM(amount_paise), 0) as total_revenue_paise
      FROM orders
      WHERE status = 'paid'
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
    `);

    const months = salesRes.rows.map(s => ({
      month: s.month,
      order_count: parseInt(s.order_count, 10),
      revenue: Math.round(parseInt(s.total_revenue_paise, 10) / 100)
    }));

    // Calculate totals
    const totalOrders = months.reduce((acc, m) => acc + m.order_count, 0);
    const totalRevenue = months.reduce((acc, m) => acc + m.revenue, 0);

    res.json({
      months,
      total_orders: totalOrders,
      total_revenue: totalRevenue
    });
  } catch (err) {
    console.error('Admin sales error:', err);
    res.status(500).json({ error: 'Failed to fetch sales report' });
  }
});

// 4. Products Management (Edit/Add/Stock)
app.put('/api/admin/products/:id', adminRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, mood, mood_bg, mood_color, img, description, aroma, time_slot, pairing, ingredients, in_stock } = req.body;

    const result = await pool.query(`
      UPDATE products
      SET name = COALESCE($1, name),
          price = COALESCE($2, price),
          mood = COALESCE($3, mood),
          mood_bg = COALESCE($4, mood_bg),
          mood_color = COALESCE($5, mood_color),
          img = COALESCE($6, img),
          description = COALESCE($7, description),
          aroma = COALESCE($8, aroma),
          time_slot = COALESCE($9, time_slot),
          pairing = COALESCE($10, pairing),
          ingredients = COALESCE($11, ingredients),
          in_stock = COALESCE($12, in_stock),
          updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [name, price, mood, mood_bg, mood_color, img, description, aroma, time_slot, pairing, ingredients, in_stock, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin product edit error:', err);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.post('/api/admin/products', adminRequired, async (req, res) => {
  try {
    const { id, name, price, mood, mood_bg, mood_color, img, description, aroma, time_slot, pairing, ingredients, in_stock } = req.body;
    if (!id || !name || price === undefined) {
      return res.status(400).json({ error: 'Product ID, name, and price are required' });
    }

    const result = await pool.query(`
      INSERT INTO products (id, name, price, mood, mood_bg, mood_color, img, description, aroma, time_slot, pairing, ingredients, in_stock)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        mood = EXCLUDED.mood,
        mood_bg = EXCLUDED.mood_bg,
        mood_color = EXCLUDED.mood_color,
        img = EXCLUDED.img,
        description = EXCLUDED.description,
        aroma = EXCLUDED.aroma,
        time_slot = EXCLUDED.time_slot,
        pairing = EXCLUDED.pairing,
        ingredients = EXCLUDED.ingredients,
        in_stock = EXCLUDED.in_stock,
        updated_at = NOW()
      RETURNING *
    `, [id, name, price, mood || 'FRESH', mood_bg || '#f0e8dc', mood_color || '#7a5030', img || '', description || '', aroma || '', time_slot || '', pairing || '', ingredients || '', in_stock !== false]);

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Admin product add error:', err);
    res.status(500).json({ error: 'Failed to save product' });
  }
});

// ── STATIC FILE SERVING ──
app.use(express.static(ROOT, { extensions: ['html'] }));

app.get('*', (req, res) => {
  const reqPath = req.path;
  const fullPath = path.join(ROOT, reqPath);

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return res.sendFile(fullPath);
  }

  const indexPath = path.join(fullPath, 'index.html');
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return res.sendFile(indexPath);
  }

  const htmlPath = fullPath + '.html';
  if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
    return res.sendFile(htmlPath);
  }

  res.sendFile(path.join(ROOT, 'index.html'));
});

// ── LISTEN ON PORT 3000 & 0.0.0.0 ──
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
