import Elysia from "elysia";
import { userRoutes } from "./routes/userRoutes";

new Elysia()
  .get("/", () => "Hello World")
  .use(userRoutes)
  .onStart(() => console.log("Server started on http://localhost:8000"))
  .listen(8000);
