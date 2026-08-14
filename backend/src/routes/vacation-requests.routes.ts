import { Router } from "express";

import { AppDataSource } from "../config/data-source";
import { VacationRequest } from "../entities/vacation-request.entity";
import { VacationRequestStatus } from "../enums/vacation-request-status.enum";
import { UserRole } from "../enums/user-role.enum";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const vacationRequestsRouter = Router();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateString = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().startsWith(value)
  );
};

const getTodayDateString = (): string => {
  return new Date().toISOString().slice(0, 10);
};

vacationRequestsRouter.post(
  "/",
  requireAuth,
  requireRole(UserRole.REQUESTER),
  async (req, res) => {
    const { startDate, endDate, reason } = req.body as {
      startDate?: unknown;
      endDate?: unknown;
      reason?: unknown;
    };

    if (typeof startDate !== "string" || typeof endDate !== "string") {
      res.status(400).json({ message: "startDate and endDate are required" });
      return;
    }

    if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
      res
        .status(400)
        .json({
          message: "startDate and endDate must be valid YYYY-MM-DD dates",
        });
      return;
    }

    if (endDate <= startDate) {
      res.status(400).json({ message: "endDate must be after startDate" });
      return;
    }

    if (startDate < getTodayDateString()) {
      res.status(400).json({ message: "Requests in the past are not allowed" });
      return;
    }

    if (reason !== undefined && typeof reason !== "string") {
      res
        .status(400)
        .json({ message: "reason must be a string when provided" });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Missing or invalid token" });
      return;
    }

    const vacationRequestRepository =
      AppDataSource.getRepository(VacationRequest);

    const overlappingRequest = await vacationRequestRepository
      .createQueryBuilder("vacationRequest")
      .where("vacationRequest.userId = :userId", { userId })
      .andWhere("vacationRequest.startDate <= :endDate", { endDate })
      .andWhere("vacationRequest.endDate >= :startDate", { startDate })
      .getOne();

    if (overlappingRequest) {
      res
        .status(400)
        .json({ message: "Vacation request overlaps an existing request" });
      return;
    }

    const vacationRequest = vacationRequestRepository.create({
      userId,
      startDate,
      endDate,
      reason: reason?.trim() || "",
      status: VacationRequestStatus.PENDING,
      comments: null,
    });

    const savedVacationRequest =
      await vacationRequestRepository.save(vacationRequest);
    res.status(201).json(savedVacationRequest);
  },
);

vacationRequestsRouter.get(
  "/me",
  requireAuth,
  requireRole(UserRole.REQUESTER),
  async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Missing or invalid token" });
      return;
    }

    const vacationRequestRepository =
      AppDataSource.getRepository(VacationRequest);
    const vacationRequests = await vacationRequestRepository.find({
      where: { userId },
      order: {
        createdAt: "DESC",
      },
    });

    res.status(200).json(vacationRequests);
  },
);

export default vacationRequestsRouter;
