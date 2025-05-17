import express from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());
app.use(cors({ 
  origin: ['http://localhost:3000', 'http://localhost:5173'], 
  credentials: true 
}));

// Supabase setup
const supabase = createClient(
  'https://evbhcfznkstyqnxxsckl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2YmhjZnpua3N0eXFueHhzY2tsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzQ3OTg0MSwiZXhwIjoyMDYzMDU1ODQxfQ._xkC6DzNjUCGoghFTj7mdRDE-1J6GPeoq6XcKt1drM8'
);

// Session setup
app.use(session({
  secret: 'your_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport strategies
passport.use('student', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    const valid = await bcrypt.compare(password, data.password);
    if (!valid) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    return done(null, { id: data.id, role: 'student', email: data.email });
  } catch (error) {
    return done(error);
  }
}));

passport.use('admin', new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    const valid = await bcrypt.compare(password, data.password);
    if (!valid) {
      return done(null, false, { message: 'Invalid email or password' });
    }
    
    return done(null, { id: data.id, role: 'admin', email: data.email });
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Auth routes
app.post('/api/signup/student', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('students')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new student
    const { data, error } = await supabase
      .from('students')
      .insert([{ email, password: hashedPassword, name }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({ 
      success: true, 
      user: { id: data.id, email: data.email, role: 'student' } 
    });
  } catch (error) {
    console.error('Student signup error:', error);
    res.status(500).json({ error: 'Error creating student account' });
  }
});

app.post('/api/signup/admin', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    // Check if admin already exists
    const { data: existingAdmin } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single();
    
    if (existingAdmin) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new admin
    const { data, error } = await supabase
      .from('admins')
      .insert([{ email, password: hashedPassword, name }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({ 
      success: true, 
      user: { id: data.id, email: data.email, role: 'admin' } 
    });
  } catch (error) {
    console.error('Admin signup error:', error);
    res.status(500).json({ error: 'Error creating admin account' });
  }
});

app.post('/api/login/student', (req, res, next) => {
  passport.authenticate('student', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info.message || 'Authentication failed' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ success: true, user });
    });
  })(req, res, next);
});

app.post('/api/login/admin', (req, res, next) => {
  passport.authenticate('admin', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ error: info.message || 'Authentication failed' });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ success: true, user });
    });
  })(req, res, next);
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Error logging out' });
    }
    res.json({ success: true });
  });
});

app.get('/api/me', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ user: null });
  }
});

// Protected endpoints
app.get('/api/protected/student', (req, res) => {
  if (req.isAuthenticated() && req.user.role === 'student') {
    res.json({ allowed: true });
  } else {
    res.status(401).json({ allowed: false });
  }
});

app.get('/api/protected/admin', (req, res) => {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    res.json({ allowed: true });
  } else {
    res.status(401).json({ allowed: false });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`)); 