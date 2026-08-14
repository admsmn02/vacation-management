import { Repository } from "typeorm";

import { CreateVacationRequestCommand } from "../commands/create-vacation-request.command";
import { EventDispatcher } from "../event-dispatcher/event-dispatcher";
import { VacationRequestCreatedEvent } from "../events/vacation-request-created.event";
import { ApplicationError } from "../errors/application-error";
import { VacationRequest } from "../../entities/vacation-request.entity";
import { VacationRequestStatus } from "../../enums/vacation-request-status.enum";

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

export class CreateVacationRequestHandler {
  constructor(
    private readonly vacationRequestRepository: Repository<VacationRequest>,
    private readonly eventDispatcher: EventDispatcher,
  ) {}

  async execute(
    command: CreateVacationRequestCommand,
  ): Promise<VacationRequest> {
    if (
      !isValidDateString(command.startDate) ||
      !isValidDateString(command.endDate)
    ) {
      throw new ApplicationError(
        400,
        "startDate and endDate must be valid YYYY-MM-DD dates",
      );
    }

    if (command.endDate <= command.startDate) {
      throw new ApplicationError(400, "endDate must be after startDate");
    }

    if (command.startDate < getTodayDateString()) {
      throw new ApplicationError(400, "Requests in the past are not allowed");
    }

    const overlappingRequest = await this.vacationRequestRepository
      .createQueryBuilder("vacationRequest")
      .where("vacationRequest.userId = :userId", { userId: command.userId })
      .andWhere("vacationRequest.startDate <= :endDate", {
        endDate: command.endDate,
      })
      .andWhere("vacationRequest.endDate >= :startDate", {
        startDate: command.startDate,
      })
      .getOne();

    if (overlappingRequest) {
      throw new ApplicationError(
        400,
        "Vacation request overlaps an existing request",
      );
    }

    const vacationRequest = this.vacationRequestRepository.create({
      userId: command.userId,
      startDate: command.startDate,
      endDate: command.endDate,
      reason: command.reason,
      status: VacationRequestStatus.PENDING,
      comments: null,
    });

    const savedVacationRequest =
      await this.vacationRequestRepository.save(vacationRequest);

    await this.eventDispatcher.publish(
      new VacationRequestCreatedEvent(savedVacationRequest.id),
    );

    return savedVacationRequest;
  }
}
