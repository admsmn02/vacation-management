import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

import { UserRole } from "../enums/user-role.enum";
import { env } from "../config/env";
import { AuthenticatedUser } from "../types/auth.types";

const isUserRole = (value: unknown): value is UserRole => {
  return value === UserRole.REQUESTER || value === UserRole.VALIDATOR;
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Missing or invalid token" });
    return;
  }

  const token = authHeader.slice("Bearer ".length).trim();

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;

    if (typeof payload?.id !== "string" || !isUserRole(payload?.role)) {
      res.status(401).json({ message: "Missing or invalid token" });
      return;
    }

    req.user = {
      id: payload.id,
      role: payload.role,
    } as AuthenticatedUser;

    next();
  } catch {
    res.status(401).json({ message: "Missing or invalid token" });
  }
};

export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Missing or invalid token" });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({ message: "Insufficient permissions" });
      return;
    }

    next();
  };
};
