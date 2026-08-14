import bcrypt from "bcryptjs";
import { Router } from "express";
import jwt from "jsonwebtoken";

import { AppDataSource } from "../config/data-source";
import { env } from "../config/env";
import { User } from "../entities/user.entity";

const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: unknown;
    password?: unknown;
  };

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !password) {
    res.status(400).json({ message: "Invalid input" });
    return;
  }

  const userRepository = AppDataSource.getRepository(User);
  const user = await userRepository.findOne({ where: { email: trimmedEmail } });

  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
    },
    env.jwtSecret,
    {
      expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
    },
  );

  res.status(200).json({ token });
});

export default authRouter;
