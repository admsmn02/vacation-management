import "reflect-metadata";
import { DataSource } from "typeorm";

import { env } from "./env";
import { User } from "../entities/user.entity";
import { VacationRequest } from "../entities/vacation-request.entity";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: env.dbHost,
  port: env.dbPort,
  username: env.dbUser,
  password: env.dbPassword,
  database: env.dbName,
  synchronize: false,
  logging: false,
  entities: [User, VacationRequest],
  migrations: ["src/migrations/*.{ts,js}", "dist/migrations/*.{ts,js}"],
  subscribers: [],
});
