const express = require('express');
const router = express.Router();
const db = require('../database');

// Τύπος Haversine: ορθόδρομη απόσταση δύο γεωγραφικών σημείων σε km
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Κανονικοποίηση συντεταγμένης: αριθμός ή NULL (αν ο μάγειρας δεν επέλεξε σημείο στον χάρτη)
function toCoord(value) {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
}

// POST / — δημιουργία αγγελίας (Β1) με TTL 48 ωρών (expires_at)
router.post('/', (req, res) => {
    const { cook_id, title, notes, photo_url, pickup_location, pickup_date, pickup_time, portions, allergens, lat, lng } = req.body;
    if (!cook_id || !title || !pickup_location || !pickup_date || !pickup_time || !portions) return res.status(400).json({ error: 'Λείπουν υποχρεωτικά πεδία.' });
    if (portions <= 0) return res.status(400).json({ error: 'Οι μερίδες πρέπει να είναι τουλάχιστον 1.' });

    const query = `
        INSERT INTO posts
        (cook_id, title, notes, photo_url, pickup_location, pickup_date, pickup_time, portions_total, portions_available, allergens, lat, lng, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+48 hours'))
    `;
    const params = [cook_id, title, notes, photo_url, pickup_location, pickup_date, pickup_time, portions, portions, allergens, toCoord(lat), toCoord(lng)];

    db.run(query, params, function(err) {
        if (err) return res.status(500).json({ error: 'Σφάλμα κατά τη δημιουργία αγγελίας.' });
        res.status(201).json({ message: 'Η αγγελία δημιουργήθηκε.', postId: this.lastID });
    });
});

// GET / — ενεργό feed (μη ληγμένα & μη διαγραμμένα)· προαιρετική ταξινόμηση κατά απόσταση (?lat&lng) και όριο (?limit)
router.get('/', (req, res) => {
    const { lat, lng, limit } = req.query;
    const query = `
        SELECT p.*, u.name as cook_name
        FROM posts p
        JOIN users u ON p.cook_id = u.id
        WHERE p.expires_at > datetime('now') AND p.status != 'deleted'
        ORDER BY p.created_at DESC
    `;
    db.all(query, [], (err, posts) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα ανάκτησης.' });

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);

        if (lat && lng && !isNaN(userLat) && !isNaN(userLng)) {
            posts.forEach(post => {
                // Πραγματικές συντεταγμένες της αγγελίας· παλιές αγγελίες χωρίς σημείο στον χάρτη δεν παίρνουν απόσταση
                if (post.lat !== null && post.lng !== null) {
                    post.distance = haversineKm(userLat, userLng, post.lat, post.lng);
                }
            });
            posts.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
        }

        const limitNum = limit ? parseInt(limit, 10) : null;
        res.json((limitNum && limitNum > 0) ? posts.slice(0, limitNum) : posts);
    });
});

// GET /cook/:id — οι αγγελίες ενός μάγειρα για το dashboard του
router.get('/cook/:id', (req, res) => {
    const query = `SELECT * FROM posts WHERE cook_id = ? AND status != 'deleted' ORDER BY created_at DESC`;
    db.all(query, [req.params.id], (err, posts) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα ανάκτησης.' });
        res.json(posts);
    });
});

// PUT /:id — επεξεργασία αγγελίας (Β1) με έλεγχο ιδιοκτησίας (403 σε ξένη αγγελία)
router.put('/:id', (req, res) => {
    const { cook_id, title, notes, photo_url, pickup_location, pickup_date, pickup_time, portions, allergens, lat, lng } = req.body;

    const checkQuery = `SELECT cook_id, portions_total, portions_available FROM posts WHERE id = ?`;
    db.get(checkQuery, [req.params.id], (err, post) => {
        if (err || !post) return res.status(404).json({ error: 'Η αγγελία δεν βρέθηκε.' });

        if (post.cook_id !== cook_id) return res.status(403).json({ error: 'Μη εξουσιοδοτημένη ενέργεια.' });

        if (portions <= 0) return res.status(400).json({ error: 'Οι μερίδες πρέπει να είναι τουλάχιστον 1.' });
        // Invariant: οι ήδη δεσμευμένες μερίδες (total - available) δεν επιτρέπεται να «κοπούν»
        const reserved = post.portions_total - post.portions_available;
        if (portions < reserved) {
            return res.status(400).json({ error: `Δεν μπορείτε να μειώσετε τις μερίδες κάτω από ${reserved} (έχουν ήδη κρατηθεί).` });
        }

        const newAvailable = portions - reserved;

        const query = `
            UPDATE posts
            SET title = ?, notes = ?, photo_url = ?, pickup_location = ?, pickup_date = ?, pickup_time = ?, portions_total = ?, portions_available = ?, allergens = ?, lat = ?, lng = ?
            WHERE id = ?
        `;
        const params = [title, notes, photo_url, pickup_location, pickup_date, pickup_time, portions, newAvailable, allergens, toCoord(lat), toCoord(lng), req.params.id];

        db.run(query, params, function(err) {
            if (err) return res.status(500).json({ error: 'Σφάλμα ενημέρωσης.' });
            res.json({ message: 'Η αγγελία ενημερώθηκε.' });
        });
    });
});

// DELETE /:id — Soft delete: μαρκάρισμα 'deleted' + άμεση λήξη, ώστε να διατηρείται το ιστορικό (ledger/αιτήματα)
router.delete('/:id', (req, res) => {
    const { cook_id } = req.body || {};
    if (!cook_id) return res.status(401).json({ error: 'Απαιτείται ταυτοποίηση.' });

    db.get(`SELECT cook_id FROM posts WHERE id = ?`, [req.params.id], (err, post) => {
        if (err || !post) return res.status(404).json({ error: 'Αγγελία δεν βρέθηκε.' });
        if (post.cook_id !== cook_id) return res.status(403).json({ error: 'Μη εξουσιοδοτημένη ενέργεια.' });

        db.run(`UPDATE posts SET status = 'deleted', expires_at = datetime('now', '-1 second') WHERE id = ?`, [req.params.id], function(err) {
            if (err) return res.status(500).json({ error: 'Σφάλμα διαγραφής.' });
            res.json({ message: 'Η αγγελία διαγράφηκε.' });
        });
    });
});

module.exports = router;
