PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE posts (
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
            expires_at DATETIME, pickup_date TEXT, lat REAL, lng REAL,
            FOREIGN KEY (cook_id) REFERENCES users(id)
        );
INSERT INTO "posts" VALUES(7,2,'μακαρόνια με κιμά','','','Εστία Α','17:40',2,2,'','active','2026-06-09 19:20:29','2026-06-11 19:20:29','2026-06-21',NULL,NULL);
INSERT INTO "posts" VALUES(11,4,'Vegan Pad Thai με φιστίκια','','','Εστία Β','17:11',4,4,'Περιέχει φιστίκια (peanuts) και σόγια (soy sauce)','active','2026-06-11 14:18:57','2026-06-13 14:18:57','2026-06-25',NULL,NULL);
INSERT INTO "posts" VALUES(12,5,'σάντουιτς με τονοσαλάτα','Είπα να κάνω κάτι με θαλασσινά σήμερα','https://www.tratagreece.gr/wp-content/uploads/2023/01/583A6040_sm-500x500-1.jpg','Εστία Γ','18:00',2,2,'ψάρι (τόνος), αυγό (από τη μαγιονέζα), γλουτένη','active','2026-06-11 14:27:34','2026-06-13 14:27:34','2026-06-15',NULL,NULL);
INSERT INTO "posts" VALUES(13,6,'κρητικό πιλάφι','εγγυημένη γευσάρα..','https://kyriakopoulos.store/kritiko-pilafi/','Εστία Δ','16:20',3,3,'','deleted','2026-06-11 14:50:20','2026-06-11 14:53:42','2026-06-13',NULL,NULL);
INSERT INTO "posts" VALUES(14,6,'κρητικό πιλάφι','νόστιμο!!','https://kyriakopoulos.store/kritiko-pilafi/','Εστία Δ','04:13',3,3,'','deleted','2026-06-11 14:55:30','2026-06-11 14:56:30','2026-06-13',NULL,NULL);
INSERT INTO "posts" VALUES(15,6,'κρητικό πιλάφι','','https://kyriakopoulos.store/kyriakopoulos_lpu/2018/08/pilafi.jpeg','Εστία Δ','15:15',3,3,'','deleted','2026-06-11 14:58:01','2026-06-11 14:58:16','2026-06-28',NULL,NULL);
INSERT INTO "posts" VALUES(16,6,'κρητικό πιλάφι','νόστιμο!!','https://kyriakopoulos.store/kyriakopoulos_lpu/2018/08/pilafi.jpeg','Εστία Δ','04:10',3,3,'','deleted','2026-06-11 15:00:59','2026-06-11 15:01:27','2026-06-13',NULL,NULL);
INSERT INTO "posts" VALUES(17,6,'κρητικό πιλάφι','πεντανόστιμο!..','https://kyriakopoulos.store/kyriakopoulos_lpu/2018/08/pilafi.jpeg','Εστία Δ','16:10',3,3,'','deleted','2026-06-11 15:03:06','2026-06-11 15:04:51','2026-06-14',NULL,NULL);
INSERT INTO "posts" VALUES(18,6,'κρητικό πιλάφι','πεντανόστιμο!','https://kyriakopoulos.store/kyriakopoulos_lpu/2018/08/pilafi.jpeg','Εστία Δ','16:15',3,1,'','active','2026-06-11 15:06:08','2026-06-13 15:06:08','2026-06-14',NULL,NULL);
INSERT INTO "posts" VALUES(19,6,'ψαρόσουπα','','','Εστία Α','21:15',1,1,'','deleted','2026-06-11 18:04:03','2026-06-11 18:06:28','2026-06-09',NULL,NULL);
INSERT INTO "posts" VALUES(20,6,'ψαρόσουπα','','','Εστία Α','21:12',1,1,'','active','2026-06-11 18:09:27','2026-06-13 18:09:27','2026-06-09',NULL,NULL);
INSERT INTO "posts" VALUES(23,7,'κρητικό πιλάφι','yummy','https://kyriakopoulos.store/kyriakopoulos_lpu/2018/08/pilafi.jpeg','Συρογιάννη Ρίο','12:54',3,2,'','active','2026-09-09 09:57:02','2026-09-11 09:57:02','2026-09-25',3.829402398927661011e+01,2.178229667861669227e+01);
INSERT INTO "posts" VALUES(24,7,'ψαρόσουπα','','','Πανεπιστημίου Δημοτική Ενότητα Πατρέων','13:23',1,1,'Ψάρια','active','2026-09-09 10:04:45','2026-09-11 10:04:45','2026-09-12',3.82839372983123738e+01,2.177252287473773861e+01);
CREATE TABLE requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            consumer_id INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (consumer_id) REFERENCES users(id)
        );
INSERT INTO "requests" VALUES(1,11,2,'pending','2026-06-11 15:24:51');
INSERT INTO "requests" VALUES(2,18,5,'approved','2026-06-11 15:41:02');
INSERT INTO "requests" VALUES(3,18,2,'approved','2026-06-11 15:50:39');
INSERT INTO "requests" VALUES(6,23,11,'approved','2026-09-09 10:13:30');
CREATE TABLE credit_ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            delta INTEGER NOT NULL,
            reason TEXT NOT NULL,
            ref_type TEXT,
            ref_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
INSERT INTO "credit_ledger" VALUES(2,2,5,'registration_bonus',NULL,NULL,'2026-06-11 13:24:52');
INSERT INTO "credit_ledger" VALUES(3,4,5,'registration_bonus',NULL,NULL,'2026-06-11 14:16:25');
INSERT INTO "credit_ledger" VALUES(4,5,5,'registration_bonus',NULL,NULL,'2026-06-11 14:22:21');
INSERT INTO "credit_ledger" VALUES(5,6,5,'registration_bonus',NULL,NULL,'2026-06-11 14:42:48');
INSERT INTO "credit_ledger" VALUES(6,2,-1,'portion_request','request',1,'2026-06-11 15:24:51');
INSERT INTO "credit_ledger" VALUES(7,5,-1,'portion_request','request',2,'2026-06-11 15:41:02');
INSERT INTO "credit_ledger" VALUES(8,6,1,'delivery_completed','delivery',1,'2026-06-11 15:47:02');
INSERT INTO "credit_ledger" VALUES(9,2,-1,'portion_request','request',3,'2026-06-11 15:50:39');
INSERT INTO "credit_ledger" VALUES(10,2,-1,'no_show_penalty','delivery',2,'2026-06-11 16:00:54');
INSERT INTO "credit_ledger" VALUES(11,6,1,'high_rating_bonus','rating',1,'2026-06-11 17:46:57');
INSERT INTO "credit_ledger" VALUES(12,7,5,'registration_bonus',NULL,NULL,'2026-09-05 20:02:14');
INSERT INTO "credit_ledger" VALUES(13,8,5,'registration_bonus',NULL,NULL,'2026-09-07 14:42:04');
INSERT INTO "credit_ledger" VALUES(14,9,5,'registration_bonus',NULL,NULL,'2026-09-07 14:45:18');
INSERT INTO "credit_ledger" VALUES(15,9,-1,'portion_request','request',4,'2026-09-07 14:45:27');
INSERT INTO "credit_ledger" VALUES(16,9,-1,'portion_request','request',5,'2026-09-07 14:45:33');
INSERT INTO "credit_ledger" VALUES(17,8,1,'delivery_completed','delivery',3,'2026-09-07 14:46:34');
INSERT INTO "credit_ledger" VALUES(18,8,1,'delivery_completed','delivery',4,'2026-09-07 14:46:35');
INSERT INTO "credit_ledger" VALUES(19,10,5,'registration_bonus',NULL,NULL,'2026-09-08 13:49:32');
INSERT INTO "credit_ledger" VALUES(20,11,5,'registration_bonus',NULL,NULL,'2026-09-09 10:07:15');
INSERT INTO "credit_ledger" VALUES(21,11,-1,'portion_request','request',6,'2026-09-09 10:13:30');
INSERT INTO "credit_ledger" VALUES(22,7,1,'delivery_completed','delivery',5,'2026-09-09 10:19:16');
INSERT INTO "credit_ledger" VALUES(23,7,1,'high_rating_bonus','rating',2,'2026-09-09 10:22:51');
CREATE TABLE "users" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            credits INTEGER DEFAULT 5 CHECK (credits >= 0),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
INSERT INTO "users" VALUES(2,'Μαρία','maria@gmail.com','$2b$10$0JC29oTkiyCoGVCEK4y15u/QwPfk218NK7itYB60l6zDAb4AQ95dy','student',2,'2026-06-11 13:24:52');
INSERT INTO "users" VALUES(3,'Admin','admin@unibite.gr','$2b$10$FmFybHiD/jWHl8b6GT6bQulR3iphleKm6cX6uJnwzjcPBNEQEV6rq','admin',0,'2026-06-11 13:33:03');
INSERT INTO "users" VALUES(4,'Νίκος','nikos@gmail.com','$2b$10$T5r/Ho92/V2CbzoS8NVQ0uInRb9ngDrq4Q3E9L/dXYtc6pICSjHOG','student',5,'2026-06-11 14:16:25');
INSERT INTO "users" VALUES(5,'Κώστας','kostas@gmail.com','$2b$10$DYvSioUpjGZ0TaX6ZsKTXu0/U8Cwy88/Il4t4sCKeAxxRKksOclw2','student',4,'2026-06-11 14:22:21');
INSERT INTO "users" VALUES(6,'Γιάννης ','up1059599@ac.upatras.gr','$2b$10$3xRGxsEITJUdoOJvBEE0Z.nZFXTRZSFMYQ/.xhbnq4MOCbg6RvU42','student',7,'2026-06-11 14:42:48');
INSERT INTO "users" VALUES(7,'Κάποιος','kapoios@gmail.com','$2b$10$KV2n0a3EGZzZvm7uIKxNA.0Me4DY24Z7rG/NzDo25eBPN7Nku47Py','student',7,'2026-09-05 20:02:14');
INSERT INTO "users" VALUES(8,'κάποιος','kapoios1@gmail.com','$2b$10$wzS9aLGoi7pWr1SxJEEOXeCenFC1kD84omd4gIy6UM19h.LYJNas2','student',7,'2026-09-07 14:42:04');
INSERT INTO "users" VALUES(9,'φαγάνας','faganas@gmail.com','$2b$10$JEa5itg9YFrTs.7q5pok2O/Cn0Th2VzFWPkOp6JyHh5Dpb5iqCJ7C','student',3,'2026-09-07 14:45:18');
INSERT INTO "users" VALUES(10,'όμορφη','omorfh@gmail.com','$2b$10$ZOigYwvSDWMXBIhaNvCefu8RfpgMqmZwnmkpNt6eO0mJSoMGfRCW2','student',5,'2026-09-08 13:49:32');
INSERT INTO "users" VALUES(11,'Κάποιος Άλλος','kapoiosallos@gmail.com','$2b$10$rhB9i44SB09UKwYV4Q1zDuqBztj74YfIztnpnhkMpK8YGeCSUH3Su','student',4,'2026-09-09 10:07:15');
CREATE TABLE "deliveries" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL UNIQUE,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (request_id) REFERENCES requests(id)
        );
INSERT INTO "deliveries" VALUES(1,2,'completed','2026-06-11 15:47:02');
INSERT INTO "deliveries" VALUES(2,3,'failed','2026-06-11 16:00:43');
INSERT INTO "deliveries" VALUES(5,6,'completed','2026-09-09 10:19:16');
CREATE TABLE "ratings" (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            delivery_id INTEGER NOT NULL UNIQUE,
            rater_id INTEGER NOT NULL,
            score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5),
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
            FOREIGN KEY (rater_id) REFERENCES users(id)
        );
INSERT INTO "ratings" VALUES(1,1,5,5,NULL,'2026-06-11 17:46:57');
INSERT INTO "ratings" VALUES(2,5,11,5,NULL,'2026-09-09 10:22:51');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" VALUES('credit_ledger',23);
INSERT INTO "sqlite_sequence" VALUES('posts',24);
INSERT INTO "sqlite_sequence" VALUES('requests',6);
INSERT INTO "sqlite_sequence" VALUES('users',11);
INSERT INTO "sqlite_sequence" VALUES('deliveries',5);
INSERT INTO "sqlite_sequence" VALUES('ratings',2);
COMMIT;
