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
import { supabase } from "./services/supabase/client";

const port = process.env.PORT || 8000;

seed()
  .then(() => {
    console.log("Values Loaded on Database");
    const app = new Elysia()
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
      .ws("/ws", {
        async open(ws) {
          const token = ws.data.query.token;
          if (!token) {
            ws.send({
              type: "ERROR",
              message: "Unauthorized: No token provided",
            });
            ws.close();
            return;
          }

          const {
            data: { user },
            error,
          } = await supabase.auth.getUser(token);
          if (error || !user) {
            ws.send({ type: "ERROR", message: "Unauthorized: Invalid token" });
            ws.close();
            return;
          }

          // User authenticated
          (ws.data as any).user = user;
          ws.send({ type: "AUTH_SUCCESS", message: "Authenticated" });
          console.log(`WS: User ${user.id} connected`);
        },
        message(ws, message: any) {
          const user = (ws.data as any).user;
          if (!user) return;

          if (message.type === "SUBSCRIBE_MATCH") {
            const matchId = message.matchId;
            ws.subscribe(`match:${matchId}`);
            ws.send({ type: "SUBSCRIBED", matchId });
            console.log(`WS: User ${user.id} subscribed to match:${matchId}`);
          }

          if (message.type === "SUBSCRIBE_TOURNAMENT") {
            const tournamentId = message.tournamentId;
            ws.subscribe(`tournament:${tournamentId}`);
            ws.send({ type: "SUBSCRIBED_TOURNAMENT", tournamentId });
            console.log(
              `WS: User ${user.id} subscribed to tournament:${tournamentId}`,
            );
          }
        },
      })
      .onStart(({ server }) => console.log(`Server started on ${server?.url}`))
      .listen(port);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
