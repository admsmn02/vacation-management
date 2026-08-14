import { Router } from "express";

import { ApproveVacationRequestCommand } from "../application/commands/approve-vacation-request.command";
import { CreateVacationRequestCommand } from "../application/commands/create-vacation-request.command";
import { RejectVacationRequestCommand } from "../application/commands/reject-vacation-request.command";
import { InMemoryEventDispatcher } from "../application/event-dispatcher/in-memory-event-dispatcher";
import { ApplicationError } from "../application/errors/application-error";
import { ApproveVacationRequestHandler } from "../application/handlers/approve-vacation-request.handler";
import { CreateVacationRequestHandler } from "../application/handlers/create-vacation-request.handler";
import { RejectVacationRequestHandler } from "../application/handlers/reject-vacation-request.handler";
import { AppDataSource } from "../config/data-source";
import { VacationRequest } from "../entities/vacation-request.entity";
import { VacationRequestStatus } from "../enums/vacation-request-status.enum";
import { UserRole } from "../enums/user-role.enum";
import { requireAuth, requireRole } from "../middleware/auth.middleware";

const vacationRequestsRouter = Router();

const eventDispatcher = new InMemoryEventDispatcher();
const vacationRequestRepository = AppDataSource.getRepository(VacationRequest);

const createVacationRequestHandler = new CreateVacationRequestHandler(
  vacationRequestRepository,
  eventDispatcher,
);
const approveVacationRequestHandler = new ApproveVacationRequestHandler(
  vacationRequestRepository,
  eventDispatcher,
);
const rejectVacationRequestHandler = new RejectVacationRequestHandler(
  vacationRequestRepository,
  eventDispatcher,
);

const handleApplicationError = (
  error: unknown,
  fallbackMessage: string,
): { statusCode: number; message: string } => {
  if (error instanceof ApplicationError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    message: fallbackMessage,
  };
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

    try {
      const command = new CreateVacationRequestCommand(
        userId,
        startDate,
        endDate,
        reason?.trim() || "",
      );
      const savedVacationRequest =
        await createVacationRequestHandler.execute(command);

      res.status(201).json(savedVacationRequest);
    } catch (error) {
      const handled = handleApplicationError(
        error,
        "Failed to create vacation request",
      );
      res.status(handled.statusCode).json({ message: handled.message });
    }
  },
);

vacationRequestsRouter.get("/team-planning", requireAuth, async (_req, res) => {
  const vacationRequestRepository =
    AppDataSource.getRepository(VacationRequest);

  const teamVacationRequests = await vacationRequestRepository
    .createQueryBuilder("vacationRequest")
    .leftJoinAndSelect("vacationRequest.user", "user")
    .select([
      "vacationRequest.id",
      "vacationRequest.startDate",
      "vacationRequest.endDate",
      "vacationRequest.status",
      "user.id",
      "user.name",
    ])
    .where("vacationRequest.status = :status", {
      status: VacationRequestStatus.APPROVED,
    })
    .orderBy("vacationRequest.startDate", "ASC")
    .getMany();

  res.status(200).json(teamVacationRequests);
});

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

    try {
      const command = new ApproveVacationRequestCommand(id);
      const savedVacationRequest =
        await approveVacationRequestHandler.execute(command);

      res.status(200).json(savedVacationRequest);
    } catch (error) {
      const handled = handleApplicationError(
        error,
        "Failed to approve vacation request",
      );
      res.status(handled.statusCode).json({ message: handled.message });
    }
  },
);

vacationRequestsRouter.patch(
  "/:id/reject",
  requireAuth,
  requireRole(UserRole.VALIDATOR),
  async (req, res) => {
    const { id } = req.params;
    const { comments } = req.body as { comments?: unknown };

    if (typeof comments !== "string") {
      res
        .status(400)
        .json({ message: "comments is required and cannot be empty" });
      return;
    }

    try {
      const command = new RejectVacationRequestCommand(id, comments);
      const savedVacationRequest =
        await rejectVacationRequestHandler.execute(command);

      res.status(200).json(savedVacationRequest);
    } catch (error) {
      const handled = handleApplicationError(
        error,
        "Failed to reject vacation request",
      );
      res.status(handled.statusCode).json({ message: handled.message });
    }
  },
);

export default vacationRequestsRouter;
