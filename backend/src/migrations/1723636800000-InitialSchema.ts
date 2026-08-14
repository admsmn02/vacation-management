import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1723636800000 implements MigrationInterface {
  name = "InitialSchema1723636800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('REQUESTER', 'VALIDATOR')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'REQUESTER', "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `CREATE TYPE "public"."vacation_requests_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vacation_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "reason" text NOT NULL, "status" "public"."vacation_requests_status_enum" NOT NULL DEFAULT 'PENDING', "comments" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_270e87cc1f519ec05cf42f9ff57" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(
      `ALTER TABLE "vacation_requests" ADD CONSTRAINT "FK_f9fbc8b3ecea8e53d39ebee4d72" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vacation_requests" DROP CONSTRAINT "FK_f9fbc8b3ecea8e53d39ebee4d72"`,
    );
    await queryRunner.query(`DROP TABLE "vacation_requests"`);
    await queryRunner.query(
      `DROP TYPE "public"."vacation_requests_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
