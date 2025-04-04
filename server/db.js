const fs = require("fs");
const sqlite = require("sqlite3");
const uuid = require("uuid");
const bcrypt = require("bcrypt");

const bcrypt_salt_rounds = 10;

const Task_states = {
	CREATED: 0,
	IN_PROCESS: 1,
	COMPLETED: 2
};

class DB {
	constructor(db_path, db_name) {
		const filePath = db_path + db_name;

		const initialize = !fs.existsSync(filePath);
		this.sqlite = new sqlite.Database(filePath);
		
		if (initialize) {
			this.sqlite.serialize(() => {
				this.sqlite.run("PRAGMA foreign_keys = ON");

				this.sqlite.run(`CREATE TABLE IF NOT EXISTS users (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					name TEXT NOT NULL,
					password_hash BLOB NOT NULL
				);`);

				this.sqlite.run(`CREATE TABLE IF NOT EXISTS tasks (
					id BLOB(16) PRIMARY KEY,
					title TEXT NOT NULL,
					description TEXT,
					tags TEXT,
					state INTEGER NOT NULL DEFAULT 0,
					created_by INTEGER,
					FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
				);`);

				bcrypt.hash("root", bcrypt_salt_rounds, (err, hash) => {
					if (err) throw err;
					this.sqlite.run(
						`INSERT INTO users (name, password_hash) VALUES (?, ?)`,
						["root", hash]
					);
				});
			});
		}
	}

	addUser(name, password) {
		return new Promise((resolve, reject) => {
			bcrypt.hash(password, bcrypt_salt_rounds, (err, hash) => {
				if (err) return reject(err);

				this.sqlite.run(
					`INSERT INTO users (name, password_hash) VALUES (?, ?)`,
					[name, hash],
					function (err) {
						if (err) return reject(err);
						resolve(this.lastID); // возвращает id добавленного пользователя
					}
				);
			});
		});
	}

	deleteUser(id) {
		return new Promise((resolve, reject) => {
			this.sqlite.run(
				`DELETE FROM users WHERE id = ?`,
				[id],
				function (err) {
					if (err) return reject(err);
					resolve(this.changes); // кол-во удалённых строк
				}
			);
		});
	}

	setPassword (id, password) {
		return new Promise((resolve, reject) => {
			bcrypt.hash(password, bcrypt_salt_rounds, (err, hash) => {
				if (err) return reject(err);

				this.sqlite.run(
					`UPDATE users SET password_hash = ? WHERE id = ?`,
					[hash, id],
					function (err) {
						if (err) return reject(err);
						resolve();
					}
				);
			});
		});
	}

	addTask({ title, description, tags, created_by }) {
		return new Promise((resolve, reject) => {
			const id = Buffer.from(uuid.v4().replace(/-/g, ""), "hex");
			this.sqlite.run(
				`INSERT INTO tasks (id, title, description, tags, created_by) VALUES (?, ?, ?, ?, ?)`,
				[id, title, description || null, tags || null, created_by || null],
				function (err) {
					if (err) return reject(err);
					resolve(id); // возвращает UUID как Buffer
				}
			);
		});
	}

	deleteTask(idBuffer) {
		return new Promise((resolve, reject) => {
			this.sqlite.run(
				`DELETE FROM tasks WHERE id = ?`,
				[idBuffer],
				function (err) {
					if (err) return reject(err);
					resolve(this.changes);
				}
			);
		});
	}

	updateTask(idBuffer, fields) {
		const allowed = ["title", "description", "tags", "state"];
		const keys = Object.keys(fields).filter(k => allowed.includes(k));

		if (keys.length === 0) {
			return Promise.resolve(0); // ничего не обновляем
		}

		const sets = keys.map(k => `${k} = ?`).join(", ");
		const values = keys.map(k => fields[k]);

		return new Promise((resolve, reject) => {
			this.sqlite.run(
				`UPDATE tasks SET ${sets} WHERE id = ?`,
				[...values, idBuffer],
				function (err) {
					if (err) return reject(err);
					resolve(this.changes); // сколько задач обновилось
				}
			);
		});
	}

	getTasks({ username, state, tag, last_task_id, limit = 20 } = {}) {
		return new Promise((resolve, reject) => {
			const conditions = [];
			const params = [];

			let query = `
				SELECT 
					tasks.id AS id,
					tasks.title AS title,
					tasks.description AS description,
					tasks.tags AS tags,
					tasks.state AS state,
					tasks.created_by AS created_by,
					users.name AS creator_name
				FROM tasks
				LEFT JOIN users ON tasks.created_by = users.id
			`;

			// if (username) {
			// 	conditions.push(`users.name = ?`);
			// 	params.push(username);
			// }

			if (typeof state === "number") {
				conditions.push(`tasks.state = ?`);
				params.push(state);
			}

			if (tag) {
				conditions.push(`tasks.tags LIKE ?`);
				params.push(`%${tag}%`);
			}

			if (last_task_id) {
				conditions.push(`tasks.id < ?`);
				params.push(last_task_id); // должен быть Buffer (16 байт UUID)
			}

			if (conditions.length > 0) {
				query += " WHERE " + conditions.join(" AND ");
			}

			query += " ORDER BY tasks.id DESC LIMIT ?"; // keyset-пагинация
			params.push(limit);

			this.sqlite.all(query, params, (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
	}

	fetchTask(id) {
		return new Promise((resolve, reject) => {
			const converted = id.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
			const binaryId = Buffer.from(uuid.parse(converted)); // ← преобразуем строку UUID в Buffer(16)

			this.sqlite.get(
				`SELECT 
					tasks.id AS id,
					tasks.title AS title,
					tasks.description AS description,
					tasks.tags AS tags,
					tasks.state AS state,
					tasks.created_by AS created_by,
					users.name AS creator_name
				FROM tasks
				LEFT JOIN users ON tasks.created_by = users.id
				WHERE tasks.id = ?`,
				[binaryId],
				(err, row) => {
					if (err) return reject(err);
					if (!row) return reject("Task not found");

					resolve(row);
				}
			);
		});
	}

	checkUserPassword(username, plainPassword) {
		return new Promise((resolve, reject) => {
			this.sqlite.get(
				`SELECT id, password_hash FROM users WHERE name = ?`,
				[username],
				(err, row) => {
					if (err) return reject(err);
					if (!row) return resolve(false);

					bcrypt.compare(plainPassword, row.password_hash, (err, result) => {
						if (err) return reject(err);
						if (result) {
							resolve({ success: true, userId: row.id });
						} else {
							resolve({ success: false });
						}
					});
				}
			);
		});
	}

	getUsers() {
		return new Promise((resolve, reject) => {
			this.sqlite.all(
				`SELECT id, name FROM users ORDER BY id ASC`,
				(err, rows) => {
					if (err) return reject(err);
					resolve(rows);
				}
			);
		});
	}
}

module.exports = DB;