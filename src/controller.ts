import cors from "@elysiajs/cors";
import Elysia from "elysia";
import { supabase } from "./services/supabase/client";
import { db } from "./services/db/client";
import { logger } from "@rasla/logify";

const baseApi = new Elysia()
  .use(logger())
  .use(cors())
  .decorate("supabase", supabase)
  .decorate("db", db);

export const publicApi = new Elysia()
  .use(logger())
  .use(cors())
  .decorate("supabase", supabase)
  .decorate("db", db);

export const protectedApi = baseApi
  .derive(async ({ request, supabase, status }) => {
    console.log("here");
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return status(401, "Unauthorized");
    }

    const token = authHeader.split(" ")[1];
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) return status(401, "Unauthorized");

    return { user };
  })
  .as("global");
