import { Repository } from "typeorm";

import { RejectVacationRequestCommand } from "../commands/reject-vacation-request.command";
import { EventDispatcher } from "../event-dispatcher/event-dispatcher";
import { VacationRequestRejectedEvent } from "../events/vacation-request-rejected.event";
import { ApplicationError } from "../errors/application-error";
import { VacationRequest } from "../../entities/vacation-request.entity";
import { VacationRequestStatus } from "../../enums/vacation-request-status.enum";

export class RejectVacationRequestHandler {
  constructor(
    private readonly vacationRequestRepository: Repository<VacationRequest>,
    private readonly eventDispatcher: EventDispatcher,
  ) {}

  async execute(
    command: RejectVacationRequestCommand,
  ): Promise<VacationRequest> {
    const trimmedComments = command.comments.trim();
    if (!trimmedComments) {
      throw new ApplicationError(
        400,
        "comments is required and cannot be empty",
      );
    }

    const vacationRequest = await this.vacationRequestRepository.findOne({
      where: { id: command.vacationRequestId },
    });

    if (!vacationRequest) {
      throw new ApplicationError(404, "Vacation request not found");
    }

    if (vacationRequest.status !== VacationRequestStatus.PENDING) {
      throw new ApplicationError(400, "Only pending requests can be rejected");
    }

    vacationRequest.status = VacationRequestStatus.REJECTED;
    vacationRequest.comments = trimmedComments;
    const savedVacationRequest =
      await this.vacationRequestRepository.save(vacationRequest);

    await this.eventDispatcher.publish(
      new VacationRequestRejectedEvent(savedVacationRequest.id),
    );

    return savedVacationRequest;
  }
}
