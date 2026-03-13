import Elysia from "elysia";
import { userRoutes } from "./routes/userRoutes";
import { orgRoutes } from "./routes/orgRoutes";
import { storageRoutes } from "./routes/storageRoutes";

new Elysia()
  .get("/", () => "Hello World")
  .use(userRoutes)
  .use(orgRoutes)
  .use(storageRoutes)
  .onStart(() => console.log("Server started on http://localhost:8000"))
  .listen(8000);
