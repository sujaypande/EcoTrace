import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let database;

function getDatabase() {
  if (database) {
    return database;
  }

  const connectionString = process.env.DATABASE_URL || process.env.DATABSE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add it to your environment before using database actions."
    );
  }

  const sql = neon(connectionString);
  database = drizzle(sql, { schema });
  return database;
}

export const db = new Proxy(
  {},
  {
    get(_target, prop) {
      return getDatabase()[prop];
    },
  }
);
