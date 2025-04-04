const fs = require("fs");
const Application = require("./application.js");

const config = JSON.parse(fs.readFileSync("./configuration.json"));

app = new Application(config);