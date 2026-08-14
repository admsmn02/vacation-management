import bcrypt from "bcryptjs";

import { AppDataSource } from "../config/data-source";
import { User } from "../entities/user.entity";
import { UserRole } from "../enums/user-role.enum";

const DEMO_PASSWORD = "Password123!";
const PASSWORD_SALT_ROUNDS = 10;

const demoUsers: Array<Pick<User, "name" | "email" | "role">> = [
  {
    name: "Demo Requester",
    email: "requester@example.com",
    role: UserRole.REQUESTER,
  },
  {
    name: "Demo Validator",
    email: "validator@example.com",
    role: UserRole.VALIDATOR,
  },
];

const seedDemoUsers = async (): Promise<void> => {
  await AppDataSource.initialize();

  try {
    const userRepository = AppDataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash(
      DEMO_PASSWORD,
      PASSWORD_SALT_ROUNDS,
    );

    for (const demoUser of demoUsers) {
      const existingUser = await userRepository.findOne({
        where: { email: demoUser.email },
      });

      if (existingUser) {
        continue;
      }

      const user = userRepository.create({
        name: demoUser.name,
        email: demoUser.email,
        password: hashedPassword,
        role: demoUser.role,
      });

      await userRepository.save(user);
    }

    console.log("Demo users seed completed");
  } finally {
    await AppDataSource.destroy();
  }
};

void seedDemoUsers();
