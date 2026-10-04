const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./database'); // Το require ανοίγει τη σύνδεση SQLite και δημιουργεί το σχήμα στο startup
const startCronJobs = require('./cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Εκκίνηση του ωριαίου scheduled job (ποινή μη αξιολόγησης εντός 48h — κανόνας Γ3)
startCronJobs();

// Middleware pipeline: CORS → JSON body parsing → static hosting του SPA (φάκελος public)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Modular routing: μία λειτουργική ενότητα ανά αρχείο (auth / posts / business / admin)
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const businessRoutes = require('./routes/business');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/admin', adminRoutes);

// Health check — γρήγορη επιβεβαίωση ότι ο server αποκρίνεται
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Ο διακομιστής UniBite λειτουργεί τέλεια!' });
});

app.listen(PORT, () => {
    console.log(`Ο διακομιστής ξεκίνησε στο http://localhost:${PORT}`);
});
