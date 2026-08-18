const jwt = require("jsonwebtoken");
const token = jwt.sign({ id: "admin", email: "spsstudiokft@gmail.com", role: "admin" }, "supersecretjwtstring", { expiresIn: "1d" });
console.log(token);
