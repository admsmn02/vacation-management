import app from "./app";
import { AppDataSource } from "./config/data-source";
import { env } from "./config/env";

const startServer = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    console.log("Database connection initialized");

    app.listen(env.port, () => {
      console.log(`Backend running on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start backend", error);
    process.exit(1);
  }
};

void startServer();
