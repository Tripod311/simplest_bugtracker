### Overview
This project is my vision of very simple bugtracker/taskmanager. It works well for small teams with small amount of tasks.

### Installation
`server/configuration.json` is pretty straightforward.

```json
{
	"port": 8080,
	"db_path": "./",
	"db_name": "db.sqlite",
	"cookie_secret": "secret",
	"jwt_secret": "jwt_secret",
  "certificates": {
    "cert": "path-to-crt",
    "key": "path-to-key",
    "ca": "path-to-ca"
  }
}
```

In case you don't want to use https, just remove `certificates` field.

### Docker
The easiest way to run the application. Just execute
```bash
docker build -t <image name> .
```

In root directory. Then:
```bash
docker run -d -p <mapped port>:<app port> <image name>
```
