const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const DB = require("./db.js");
const uuid = require("uuid");

class Application {
	constructor(configuration) {
		this.jwt_secret = configuration.jwt_secret;
		this.db = new DB(configuration.db_path, configuration.db_name);

		this.app = express();
		this.app.use(express.json());
		this.app.use(cookieParser(configuration.cookie_secret));

		this.app.post("/api/auth", this.authorize.bind(this));
		this.app.post("/api/verify", this.verify.bind(this));
		this.app.post("/api/logout", this.logout.bind(this));

		this.app.get("/api/users", this.checkAuthorized.bind(this), this.getUsers.bind(this));
		this.app.post("/api/users", this.checkAuthorized.bind(this), this.addUser.bind(this));
		this.app.put("/api/users/:id", this.checkAuthorized.bind(this), this.setPassword.bind(this));
		this.app.delete("/api/users/:id", this.checkAuthorized.bind(this), this.deleteUser.bind(this));

		this.app.get("/api/tasks", this.checkAuthorized.bind(this), this.getTasks.bind(this));
		this.app.post("/api/tasks", this.checkAuthorized.bind(this), this.createTask.bind(this));
		this.app.put("/api/tasks/:id", this.checkAuthorized.bind(this), this.updateTask.bind(this));
		this.app.delete("/api/tasks/:id", this.checkAuthorized.bind(this), this.deleteTask.bind(this));
		this.app.get("/api/task/:id", this.checkAuthorized.bind(this), this.fetchTask.bind(this));

		this.app.use(express.static(path.resolve(__dirname, "../client/dist/")));
		this.app.use((req, res, next) => {
			res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
		});

		// this.app.listen(configuration.port);
		if (configuration.certificates) {
			const cert = fs.readFileSync(configuration.certificates.cert);
			const key = fs.readFileSync(configuration.certificates.key);
			const ca = fs.readFileSync(configuration.certificates.ca);

			https.createServer({cert, key, ca}, this.app).listen(configuration.port);
		} else {
			http.createServer(this.app).listen(configuration.port);
		}
	}

	destructor() {
		// на всякий случай можно закрыть базу, если нужно
		this.db.sqlite.close();
	}

	verify (req, res) {
		const token = req.signedCookies.token;
		if (!token) {
			return res.status(401).json({
				error: true,
				details: "Not authorized"
			});
		}

		try {
			const decoded = jwt.verify(token, this.jwt_secret);
			res.__userData = decoded;

			const now = Math.floor(Date.now() / 1000);
			const timeLeft = decoded.exp - now;

			if (timeLeft < 60 * 20) { // меньше 20 минут до истечения
				const newToken = jwt.sign(
					{ id: decoded.id, name: decoded.name },
					this.jwt_secret,
					{ expiresIn: "1h" }
				);
				res.cookie("token", newToken, {
					httpOnly: true,
					signed: true,
					secure: true,
					sameSite: "strict",
					maxAge: 3600000
				});
			}

			res.json({error: false});
		} catch (err) {
			return res.status(401).json({
				error: true,
				details: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token: " + err.message
			});
		}
	}

	checkAuthorized(req, res, next) {
		const token = req.signedCookies.token;
		if (!token) {
			return res.status(401).json({
				error: true,
				details: "Not authorized"
			});
		}

		try {
			const decoded = jwt.verify(token, this.jwt_secret);
			res.__userData = decoded;

			const now = Math.floor(Date.now() / 1000);
			const timeLeft = decoded.exp - now;

			if (timeLeft < 60 * 20) { // меньше 20 минут до истечения
				const newToken = jwt.sign(
					{ id: decoded.id, name: decoded.name },
					this.jwt_secret,
					{ expiresIn: "1h" }
				);
				res.cookie("token", newToken, {
					httpOnly: true,
					signed: true,
					secure: true,
					sameSite: "strict",
					maxAge: 3600000
				});
			}

			next();
		} catch (err) {
			return res.status(401).json({
				error: true,
				details: err.name === "TokenExpiredError" ? "Token expired" : "Invalid token: " + err.message
			});
		}
	}

	authorize(req, res) {
		this.db.checkUserPassword(req.body.login, req.body.password).then(result => {
			if (result.success) {
				const token = jwt.sign({ id: result.userId, name: req.body.login }, this.jwt_secret, { expiresIn: "1h" });
				res.cookie("token", token, {
					httpOnly: true,
					signed: true,
					secure: true,
					sameSite: 'strict',
					maxAge: 3600000
				});
				res.json({ error: false });
			} else {
				res.status(401).json({ error: true, details: "Login/password pair not found" });
			}
		});
	}

	getTasks(req, res) {
		const { tag, state, last_id } = req.query;

		let last_task_id = null;
		if (last_id && /^[0-9a-fA-F]{32}$/.test(last_id)) {
			last_task_id = Buffer.from(last_id, "hex");
		}

		this.db.getTasks({
			username: res.__userData.name,
			tag,
			state: state !== undefined ? parseInt(state) : undefined,
			last_task_id,
			limit: 20
		}).then(tasks => {
			// конвертируем UUID обратно в hex
			tasks.forEach(task => {
				task.id = task.id.toString("hex");
			});
			res.json({ error: false, tasks });
		}).catch(err => {
			res.status(500).json({ error: true, details: err.message });
		});
	}

	createTask(req, res) {
		const { title, description, tags } = req.body;
		if (!title) {
			return res.status(400).json({ error: true, details: "Title is required" });
		}

		this.db.addTask({
			title,
			description,
			tags,
			created_by: res.__userData.id
		}).then(id => {
			res.json({ error: false, id: id.toString("hex") });
		}).catch(err => {
			res.status(500).json({ error: true, details: err.message });
		});
	}

	updateTask(req, res) {
		const id = req.params.id;
		if (!/^[0-9a-fA-F]{32}$/.test(id)) {
			return res.status(400).json({ error: true, details: "Invalid task ID format" });
		}
		const bufferId = Buffer.from(id, "hex");

		const fields = {};
		if (req.body.title) fields.title = req.body.title;
		if (req.body.description) fields.description = req.body.description;
		if (req.body.tags) fields.tags = req.body.tags;
		if (req.body.state !== undefined) fields.state = parseInt(req.body.state);

		this.db.updateTask(bufferId, fields).then(changes => {
			res.json({ error: false, updated: changes });
		}).catch(err => {
			res.status(500).json({ error: true, details: err.message });
		});
	}

	deleteTask(req, res) {
		const id = req.params.id;
		if (!/^[0-9a-fA-F]{32}$/.test(id)) {
			return res.status(400).json({ error: true, details: "Invalid task ID format" });
		}
		const bufferId = Buffer.from(id, "hex");

		this.db.deleteTask(bufferId).then(changes => {
			res.json({ error: false, deleted: changes });
		}).catch(err => {
			res.status(500).json({ error: true, details: err.message });
		});
	}

	getUsers (req, res) {
		this.db.getUsers().then(rows => {
			res.json({error: false, rows: rows});
		});
	}

	addUser(req, res) {
		const { name, password } = req.body;
		if (!name || !password) {
			return res.status(400).json({ error: true, details: "Missing name or password" });
		}

		this.db.addUser(name, password).then(id => {
			res.json({ error: false, id });
		}).catch(err => {
			res.status(500).json({ error: true, details: err.message });
		});
	}

	deleteUser(req, res) {
		const id= parseInt(req.params.id);
		if (!id) {
			return res.status(400).json({ error: true, details: "Missing user id" });
		}

		this.db.deleteUser(id).then(changes => {
			res.json({ error: false, deleted: changes });
		}).catch(err => {
			res.status(500).json({ error: true, details: err.message });
		});
	}

	setPassword (req, res) {
		const id = parseInt(req.params.id);
		const password = req.body.password;

		if (!id || !password) {
			return res.status(400).json({ error: true, details: "Missing user id or password" });
		}

		this.db.setPassword(id, password).then(changes => {
			res.json({ error: false});
		}).catch(err => {
			res.status(500).json({ error: true, details: err.message });
		});
	}

	logout (req, res) {
		res.cookie("token", "", {
			httpOnly: true,
			signed: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 3600000
		});

		res.send("OK");
	}

	fetchTask (req, res) {
		this.db.fetchTask(req.params.id).then(task => {
			res.json({error: false, task: task});
		})
		.catch(err => {
			res.json({error: true, details: err.toString()});
		});
	}
}

module.exports = Application;
