export default {
  dialect: "postgresql",
  schema: "<source />utils/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.DATABSE_URL,
    connectionString: process.env.DATABASE_URL || process.env.DATABSE_URL,
  },
};
