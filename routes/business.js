const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /request — κράτηση μερίδας (C2): guards για πόντους/απόθεμα — επιτρέπονται πολλαπλά αιτήματα ανά χρήστη ανά αγγελία
router.post('/request', (req, res) => {
    const { post_id, consumer_id } = req.body;
    db.get(`SELECT credits FROM users WHERE id = ?`, [consumer_id], (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Σφάλμα χρήστη.' });
        if (user.credits < 1) return res.status(403).json({ error: 'Δεν έχεις αρκετούς πόντους.' });

        db.get(`SELECT portions_available FROM posts WHERE id = ?`, [post_id], (err, post) => {
            if (err || !post) return res.status(404).json({ error: 'Αγγελία δεν βρέθηκε.' });
            if (post.portions_available <= 0) return res.status(400).json({ error: 'Οι μερίδες έχουν εξαντληθεί.' });

            // Transaction Boundary (Atomicity): εγγραφή αιτήματος + χρέωση -1 + ledger ως αδιαίρετη πράξη
            db.serialize(() => {
                db.run('BEGIN TRANSACTION');
                db.run(`INSERT INTO requests (post_id, consumer_id) VALUES (?, ?)`, [post_id, consumer_id], function(err) {
                    if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα αιτήματος.' }); }
                    const requestId = this.lastID;
                    db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [consumer_id]);
                    db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, -1, 'portion_request', 'request', ?)`, [consumer_id, requestId], function(err) {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα πόντων.' }); }
                        db.run('COMMIT');
                        res.status(201).json({ message: 'Το αίτημα στάλθηκε στον μάγειρα!' });
                    });
                });
            });
        });
    });
});

// GET /cook-requests/:cook_id — εισερχόμενα αιτήματα μάγειρα· LEFT JOIN στην παράδοση ώστε να φαίνονται και όσα δεν έχουν εγκριθεί ακόμα
router.get('/cook-requests/:cook_id', (req, res) => {
    const query = `
        SELECT r.id as request_id, r.post_id, r.status, p.title, p.cook_id, u.id as consumer_id, u.name as consumer_name, d.status as delivery_status, d.id as delivery_id
        FROM requests r
        JOIN posts p ON r.post_id = p.id
        JOIN users u ON r.consumer_id = u.id
        LEFT JOIN deliveries d ON d.request_id = r.id
        WHERE p.cook_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(query, [req.params.cook_id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα ανάκτησης αιτημάτων.' });
        res.json(rows);
    });
});

// POST /approve — έγκριση αιτήματος (B2). Δέχεται και status 'rejected' (επανέγκριση μετά από αλλαγή γνώμης).
// Όλα τα IDs (post, consumer) αντλούνται από τη βάση — ποτέ από τον client.
router.post('/approve', (req, res) => {
    const { request_id } = req.body;
    db.get(`SELECT id, status, post_id, consumer_id FROM requests WHERE id = ?`, [request_id], (err, reqRow) => {
        if (err || !reqRow) return res.status(404).json({ error: 'Δεν βρέθηκε.' });
        if (reqRow.status !== 'pending' && reqRow.status !== 'rejected') {
            return res.status(400).json({ error: 'Μόνο εκκρεμή ή απορριφθέντα αιτήματα μπορούν να εγκριθούν.' });
        }
        // Επανέγκριση: στο reject το credit είχε επιστραφεί, άρα εδώ πρέπει να ξαναχρεωθεί
        const isReApproval = (reqRow.status === 'rejected');

        db.get(`SELECT portions_available FROM posts WHERE id = ?`, [reqRow.post_id], (err, post) => {
            if (err || !post) return res.status(404).json({ error: 'Σφάλμα.' });
            if (post.portions_available <= 0) return res.status(400).json({ error: 'Δεν υπάρχουν άλλες μερίδες!' });

            db.get(`SELECT credits FROM users WHERE id = ?`, [reqRow.consumer_id], (err, consumer) => {
                if (err || !consumer) return res.status(404).json({ error: 'Ο χρήστης δεν βρέθηκε.' });
                // Guard επαναχρέωσης (C2): χωρίς διαθέσιμο πόντο η επανέγκριση απορρίπτεται
                if (isReApproval && consumer.credits < 1) {
                    return res.status(400).json({ error: 'Ο χρήστης δεν έχει διαθέσιμους πόντους για επανέγκριση.' });
                }

                // Transaction Boundary (Atomicity): status + απόθεμα + τυχόν επαναχρέωση + δημιουργία παράδοσης
                db.serialize(() => {
                    db.run("BEGIN TRANSACTION");
                    db.run(`UPDATE requests SET status = 'approved' WHERE id = ?`, [request_id]);
                    db.run(`UPDATE posts SET portions_available = portions_available - 1 WHERE id = ?`, [reqRow.post_id]);
                    if (isReApproval) {
                        db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [reqRow.consumer_id]);
                        db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, -1, 're_approval_charge', 'request', ?)`, [reqRow.consumer_id, request_id]);
                    }
                    db.run(`INSERT INTO deliveries (request_id) VALUES (?)`, [request_id], function(err) {
                        if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: 'Σφάλμα.' }); }
                        db.run("COMMIT");
                        res.json({ message: isReApproval ? 'Το αίτημα εγκρίθηκε ξανά (χρεώθηκε 1 πόντος στον καταναλωτή).' : 'Το αίτημα εγκρίθηκε.' });
                    });
                });
            });
        });
    });
});

// POST /reject — απόρριψη αιτήματος: το δεσμευμένο credit ΕΠΙΣΤΡΕΦΕΤΑΙ στον καταναλωτή (refund)
router.post('/reject', (req, res) => {
    const { request_id } = req.body;
    db.get(`SELECT consumer_id, status FROM requests WHERE id = ?`, [request_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Αίτημα δεν βρέθηκε.' });
        if (row.status !== 'pending') return res.status(400).json({ error: 'Μόνο εκκρεμή αιτήματα μπορούν να απορριφθούν.' });

        // Transaction Boundary (Atomicity): αλλαγή status + επιστροφή πόντου + εγγραφή ledger
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run(`UPDATE requests SET status = 'rejected' WHERE id = ?`, [request_id]);
            db.run(`UPDATE users SET credits = credits + 1 WHERE id = ?`, [row.consumer_id]);
            db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, 1, 'request_rejected_refund', 'request', ?)`, [row.consumer_id, request_id], function(err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα.' }); }
                db.run('COMMIT');
                res.json({ message: 'Το αίτημα απορρίφθηκε.' });
            });
        });
    });
});

// POST /complete-delivery — επιβεβαίωση παραλαβής από τον μάγειρα: +1 credit αμοιβή
router.post('/complete-delivery', (req, res) => {
    const { delivery_id } = req.body;
    db.get(
        `SELECT d.status, p.cook_id FROM deliveries d JOIN requests r ON d.request_id = r.id JOIN posts p ON r.post_id = p.id WHERE d.id = ?`,
        [delivery_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Δεν βρέθηκε.' });
        if (row.status !== 'pending') return res.status(400).json({ error: 'Η παράδοση έχει ήδη ολοκληρωθεί ή ακυρωθεί.' });

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            // Το created_at «πατάει» στη στιγμή παραλαβής — από εκεί μετράει το 48ωρο αξιολόγησης του cron
            db.run(`UPDATE deliveries SET status = 'completed', created_at = CURRENT_TIMESTAMP WHERE id = ?`, [delivery_id]);
            db.run(`UPDATE users SET credits = credits + 1 WHERE id = ?`, [row.cook_id]);
            db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, 1, 'delivery_completed', 'delivery', ?)`,
                [row.cook_id, delivery_id], function(err) {
                if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα.' }); }
                db.run('COMMIT');
                res.json({ message: 'Η παράδοση ολοκληρώθηκε επιτυχώς.' });
            });
        });
    });
});

// POST /noshow — μη εμφάνιση καταναλωτή (B3): ποινή -1 credit
router.post('/noshow', (req, res) => {
    const { delivery_id } = req.body;
    // Ο consumer_id αντλείται server-side — ο client δεν είναι έμπιστος για μεταβολές πόντων
    db.get(`SELECT d.status, r.consumer_id FROM deliveries d JOIN requests r ON d.request_id = r.id WHERE d.id = ?`, [delivery_id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Δεν βρέθηκε.' });
        if (row.status !== 'pending') return res.status(400).json({ error: 'Η παράδοση έχει ήδη ολοκληρωθεί ή ακυρωθεί.' });

        const consumer_id = row.consumer_id;

        // Transaction Boundary (Atomicity): αποτυχία παράδοσης + ποινή + ledger μαζί ή καθόλου
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run(`UPDATE deliveries SET status = 'failed' WHERE id = ?`, [delivery_id]);
            db.run(`UPDATE users SET credits = credits - 1 WHERE id = ?`, [consumer_id]);
            db.run(`INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, -1, 'no_show_penalty', 'delivery', ?)`, [consumer_id, delivery_id], function(err) {
                if (err) { db.run("ROLLBACK"); return res.status(500).json({ error: 'Σφάλμα.' }); }
                db.run("COMMIT");
                res.json({ message: 'Καταγράφηκε ως No-Show. Αφαιρέθηκε 1 πόντος από τον χρήστη.' });
            });
        });
    });
});

// GET /consumer-history/:user_id — ιστορικό με LEFT JOIN, ώστε να εμφανίζονται και αιτήματα χωρίς παράδοση/αξιολόγηση
router.get('/consumer-history/:user_id', (req, res) => {
    const query = `
        SELECT r.id as request_id, r.status as req_status, p.title, p.cook_id, u.name as cook_name, d.id as delivery_id, d.status as del_status, rt.score
        FROM requests r
        JOIN posts p ON r.post_id = p.id
        JOIN users u ON p.cook_id = u.id
        LEFT JOIN deliveries d ON d.request_id = r.id
        LEFT JOIN ratings rt ON rt.delivery_id = d.id AND rt.rater_id = r.consumer_id
        WHERE r.consumer_id = ?
        ORDER BY r.created_at DESC
    `;
    db.all(query, [req.params.user_id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα.' });
        res.json(rows);
    });
});

// POST /rate — αξιολόγηση 1..5 (B4): score ≥ 4 δίνει +1 bonus credit στον μάγειρα
router.post('/rate', (req, res) => {
    const { delivery_id, rater_id, score, comment } = req.body;
    const parsedScore = parseInt(score, 10);
    if (isNaN(parsedScore) || parsedScore < 1 || parsedScore > 5) {
        return res.status(400).json({ error: 'Η βαθμολογία πρέπει να είναι μεταξύ 1 και 5.' });
    }

    db.get(`SELECT id FROM ratings WHERE delivery_id = ?`, [delivery_id], (err, existing) => {
        if (err) return res.status(500).json({ error: 'Σφάλμα βάσης.' });
        if (existing) return res.status(400).json({ error: 'Έχετε ήδη βαθμολογήσει αυτή την παραγγελία.' });

        if (parsedScore >= 4) {
            // Ο cook_id προκύπτει από την αλυσίδα delivery → request → post — όχι από τον client
            db.get(
                `SELECT p.cook_id FROM deliveries d JOIN requests r ON d.request_id = r.id JOIN posts p ON r.post_id = p.id WHERE d.id = ?`,
                [delivery_id], (err, cookRow) => {
                if (err || !cookRow) return res.status(404).json({ error: 'Δεν βρέθηκε η παράδοση.' });

                // Transaction Boundary (Atomicity): αξιολόγηση + bonus μάγειρα + ledger
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    db.run(
                        `INSERT INTO ratings (delivery_id, rater_id, score, comment) VALUES (?, ?, ?, ?)`,
                        [delivery_id, rater_id, parsedScore, comment], function(err) {
                        if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα καταχώρησης βαθμολογίας.' }); }
                        const ratingId = this.lastID;
                        db.run(`UPDATE users SET credits = credits + 1 WHERE id = ?`, [cookRow.cook_id]);
                        db.run(
                            `INSERT INTO credit_ledger (user_id, delta, reason, ref_type, ref_id) VALUES (?, 1, 'high_rating_bonus', 'rating', ?)`,
                            [cookRow.cook_id, ratingId], function(err) {
                            if (err) { db.run('ROLLBACK'); return res.status(500).json({ error: 'Σφάλμα πόντων.' }); }
                            db.run('COMMIT');
                            res.json({ message: 'Η βαθμολογία καταχωρήθηκε! Ο μάγειρας έλαβε bonus πόντο!', bonusAwarded: true });
                        });
                    });
                });
            });
        } else {
            db.run(
                `INSERT INTO ratings (delivery_id, rater_id, score, comment) VALUES (?, ?, ?, ?)`,
                [delivery_id, rater_id, parsedScore, comment], function(err) {
                if (err) return res.status(500).json({ error: 'Σφάλμα καταχώρησης βαθμολογίας.' });
                res.json({ message: 'Η βαθμολογία καταχωρήθηκε!', bonusAwarded: false });
            });
        }
    });
});

module.exports = router;
