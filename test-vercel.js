import { createServer } from "http";
import app from "./api/index.js"; // In commonjs or ES, you can import this

const server = createServer(app);
server.listen(3000, () => {
  console.log("Listening on 3000");
});
