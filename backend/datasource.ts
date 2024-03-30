import { DataSource } from "typeorm";
import { DataSourceOptions } from "typeorm/browser";
import { env } from "./env";

import "reflect-metadata";
import { Module } from "./entities/module.entity";
import { Semester } from "./entities/semester.entity";
import { SemesterModule } from "./entities/semesterModule.entity";
import { User } from "./entities/user.entity";

const dataSourceOptions: DataSourceOptions = {
  type: "postgres",
  host: env.db.host,
  port: env.db.port,
  username: env.db.username,
  password: env.db.password,
  database: env.db.name,
  synchronize: env.isDevelopment,
  logging: true,
  entities: [Module, Semester, SemesterModule, User],
  subscribers: [],
  migrations: [],
};

console.log("before source");

export const AppDataSource = new DataSource(dataSourceOptions);

console.log("after source");

export const connectToDatabase = async () => {
  if (AppDataSource.isInitialized) return;

  try {
    const now = Date.now();
    await AppDataSource.initialize();
    console.info("[connectToDatabase] connected in", Date.now() - now + "ms");
  } catch (err) {
    console.error("[connectToDatabase] failed:", err, dataSourceOptions);
  }
};
