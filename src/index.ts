import Elysia from "elysia";

new Elysia()
  .get("/", () => "Hello World")
  .onStart(() => console.log("Server started on http://localhost:3000"))
  .listen(3000);
