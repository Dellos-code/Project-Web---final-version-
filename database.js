const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Singleton σύνδεση SQLite — κοινή για όλα τα modules μέσω του require cache
const dbPath = path.resolve(__dirname, 'unibite.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Σφάλμα κατά τη σύνδεση με τη βάση SQLite:', err.message);
    } else {
        console.log('Επιτυχής σύνδεση με τη βάση δεδομένων SQLite.');
        initializeDB();
    }
});

// Idempotent δημιουργία σχήματος (CREATE TABLE IF NOT EXISTS) — ασφαλής σε κάθε εκκίνηση
function initializeDB() {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            credits INTEGER DEFAULT 5 CHECK (credits >= 0),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cook_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            notes TEXT,
            photo_url TEXT,
            pickup_location TEXT NOT NULL,
            pickup_time TEXT NOT NULL,
            portions_total INTEGER NOT NULL,
            portions_available INTEGER NOT NULL,
            allergens TEXT,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME,
            lat REAL,
            lng REAL,
            FOREIGN KEY (cook_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            consumer_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (consumer_id) REFERENCES users(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS deliveries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES requests(id)
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            delivery_id INTEGER NOT NULL UNIQUE,
            rater_id INTEGER NOT NULL,
            score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
            FOREIGN KEY (rater_id) REFERENCES users(id)
        )`);

        // Append-only ημερολόγιο πόντων (auditability): κάθε μεταβολή credits παράγει μία εγγραφή εδώ
        db.run(`CREATE TABLE IF NOT EXISTS credit_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            delta INTEGER NOT NULL,
            reason TEXT NOT NULL,
            ref_type TEXT,
            ref_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
        
        // Ελαφριά migration: προσθήκη στηλών μόνο αν λείπουν (introspection με PRAGMA table_info) — χωρίς απώλεια δεδομένων
        db.all(`PRAGMA table_info(posts)`, (err, columns) => {
            if (err || !columns) return;
            if (!columns.some(c => c.name === 'pickup_date')) {
                db.run(`ALTER TABLE posts ADD COLUMN pickup_date TEXT`);
            }
            // Πραγματικές συντεταγμένες παραλαβής (επιλογή του μάγειρα στον χάρτη)
            if (!columns.some(c => c.name === 'lat')) {
                db.run(`ALTER TABLE posts ADD COLUMN lat REAL`);
            }
            if (!columns.some(c => c.name === 'lng')) {
                db.run(`ALTER TABLE posts ADD COLUMN lng REAL`);
            }
        });

        console.log('Οι πίνακες της βάσης δεδομένων ελέγχθηκαν/δημιουργήθηκαν με επιτυχία.');
    });
}

module.exports = db;
