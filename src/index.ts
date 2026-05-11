import Elysia from "elysia";
import { userRoutes } from "@/routes/userRoutes";
import { orgRoutes } from "@/routes/orgRoutes";
import { storageRoutes } from "@/routes/storageRoutes";
import { optionsRoutes } from "@/routes/optionsRoutes";
import { seed } from "@/services/db/seed";
import { tournamentRoutes } from "./routes/tournamentRoutes";
import { eventRoutes } from "./routes/eventRoutes";
import { teamRoutes } from "./routes/teamRoutes";
import { matchRoutes } from "./routes/matchRoutes";
import { inviteRoutes } from "./routes/inviteRoutes";
import {
  publicTestingRoutes,
  protectedTestingRoutes,
} from "./routes/testRoutes";

seed()
  .then(() => {
    console.log("Values Loaded on Database");
    new Elysia()
      .get("/", () => "Hello World")
      .use(publicTestingRoutes)
      .use(userRoutes)
      .use(orgRoutes)
      .use(tournamentRoutes)
      .use(eventRoutes)
      .use(teamRoutes)
      .use(matchRoutes)
      .use(inviteRoutes)
      .use(storageRoutes)
      .use(optionsRoutes)
      .use(protectedTestingRoutes)
      .onStart(({ server }) => console.log(`Server started on ${server?.url}`))
      .listen(8000);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
