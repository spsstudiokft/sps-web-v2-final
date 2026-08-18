import { createServer } from "http";
import app from "./api/index.ts";

const server = createServer(app);
server.listen(3001, () => {
    console.log("Listening on 3001");
});
