import Elysia from "elysia";
import { userRoutes } from "@/routes/userRoutes";
import { orgRoutes } from "@/routes/orgRoutes";
import { storageRoutes } from "@/routes/storageRoutes";
import { optionsRoutes } from "@/routes/optionsRoutes";
import { seed } from "@/services/db/seed";
import { tournamentRoutes } from "./routes/tournamentRoutes";

seed()
  .then(() => {
    console.log("Values Loaded on Database");
    new Elysia()
      .get("/", () => "Hello World")
      .use(userRoutes)
      .use(orgRoutes)
      .use(tournamentRoutes)
      .use(storageRoutes)
      .use(optionsRoutes)
      .onStart(({ server }) => console.log(`Server started on ${server?.url}`))
      .listen(8000);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
