export type UserRole = "REQUESTER" | "VALIDATOR";

export type JwtPayload = {
  id: string;
  role: UserRole;
  exp?: number;
  iat?: number;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
};
