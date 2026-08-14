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
      res.status(400).json({
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
  "/",
  requireAuth,
  requireRole(UserRole.VALIDATOR),
  async (req, res) => {
    const { status, userId, page, limit } = req.query as {
      status?: string;
      userId?: string;
      page?: string;
      limit?: string;
    };

    if (
      status !== undefined &&
      status !== VacationRequestStatus.PENDING &&
      status !== VacationRequestStatus.APPROVED &&
      status !== VacationRequestStatus.REJECTED
    ) {
      res.status(400).json({ message: "Invalid status filter" });
      return;
    }

    const parsedPage = page ? Number.parseInt(page, 10) : 1;
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 10;

    if (
      !Number.isInteger(parsedPage) ||
      !Number.isInteger(parsedLimit) ||
      parsedPage < 1 ||
      parsedLimit < 1
    ) {
      res
        .status(400)
        .json({ message: "page and limit must be positive integers" });
      return;
    }

    const vacationRequestRepository =
      AppDataSource.getRepository(VacationRequest);

    const queryBuilder = vacationRequestRepository
      .createQueryBuilder("vacationRequest")
      .leftJoinAndSelect("vacationRequest.user", "user")
      .select([
        "vacationRequest.id",
        "vacationRequest.userId",
        "vacationRequest.startDate",
        "vacationRequest.endDate",
        "vacationRequest.reason",
        "vacationRequest.status",
        "vacationRequest.comments",
        "vacationRequest.createdAt",
        "vacationRequest.updatedAt",
        "user.id",
        "user.name",
        "user.email",
        "user.role",
      ])
      .orderBy("vacationRequest.createdAt", "DESC");

    if (status) {
      queryBuilder.andWhere("vacationRequest.status = :status", { status });
    }

    if (userId) {
      queryBuilder.andWhere("vacationRequest.userId = :userId", { userId });
    }

    const total = await queryBuilder.getCount();
    const items = await queryBuilder
      .skip((parsedPage - 1) * parsedLimit)
      .take(parsedLimit)
      .getMany();

    res.status(200).json({
      items,
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages: Math.ceil(total / parsedLimit),
    });
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

vacationRequestsRouter.patch(
  "/:id/approve",
  requireAuth,
  requireRole(UserRole.VALIDATOR),
  async (req, res) => {
    const { id } = req.params;
    const vacationRequestRepository =
      AppDataSource.getRepository(VacationRequest);

    const vacationRequest = await vacationRequestRepository.findOne({
      where: { id },
    });

    if (!vacationRequest) {
      res.status(404).json({ message: "Vacation request not found" });
      return;
    }

    if (vacationRequest.status !== VacationRequestStatus.PENDING) {
      res
        .status(400)
        .json({ message: "Only pending requests can be approved" });
      return;
    }

    vacationRequest.status = VacationRequestStatus.APPROVED;
    const savedVacationRequest =
      await vacationRequestRepository.save(vacationRequest);

    res.status(200).json(savedVacationRequest);
  },
);

vacationRequestsRouter.patch(
  "/:id/reject",
  requireAuth,
  requireRole(UserRole.VALIDATOR),
  async (req, res) => {
    const { id } = req.params;
    const { comments } = req.body as { comments?: unknown };

    if (typeof comments !== "string" || !comments.trim()) {
      res
        .status(400)
        .json({ message: "comments is required and cannot be empty" });
      return;
    }

    const vacationRequestRepository =
      AppDataSource.getRepository(VacationRequest);

    const vacationRequest = await vacationRequestRepository.findOne({
      where: { id },
    });

    if (!vacationRequest) {
      res.status(404).json({ message: "Vacation request not found" });
      return;
    }

    if (vacationRequest.status !== VacationRequestStatus.PENDING) {
      res
        .status(400)
        .json({ message: "Only pending requests can be rejected" });
      return;
    }

    vacationRequest.status = VacationRequestStatus.REJECTED;
    vacationRequest.comments = comments.trim();
    const savedVacationRequest =
      await vacationRequestRepository.save(vacationRequest);

    res.status(200).json(savedVacationRequest);
  },
);

export default vacationRequestsRouter;
