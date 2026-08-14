import { Repository } from "typeorm";

import { ApproveVacationRequestCommand } from "../commands/approve-vacation-request.command";
import { EventDispatcher } from "../event-dispatcher/event-dispatcher";
import { VacationRequestApprovedEvent } from "../events/vacation-request-approved.event";
import { ApplicationError } from "../errors/application-error";
import { VacationRequest } from "../../entities/vacation-request.entity";
import { VacationRequestStatus } from "../../enums/vacation-request-status.enum";

export class ApproveVacationRequestHandler {
  constructor(
    private readonly vacationRequestRepository: Repository<VacationRequest>,
    private readonly eventDispatcher: EventDispatcher,
  ) {}

  async execute(
    command: ApproveVacationRequestCommand,
  ): Promise<VacationRequest> {
    const vacationRequest = await this.vacationRequestRepository.findOne({
      where: { id: command.vacationRequestId },
    });

    if (!vacationRequest) {
      throw new ApplicationError(404, "Vacation request not found");
    }

    if (vacationRequest.status !== VacationRequestStatus.PENDING) {
      throw new ApplicationError(400, "Only pending requests can be approved");
    }

    vacationRequest.status = VacationRequestStatus.APPROVED;
    const savedVacationRequest =
      await this.vacationRequestRepository.save(vacationRequest);

    await this.eventDispatcher.publish(
      new VacationRequestApprovedEvent(savedVacationRequest.id),
    );

    return savedVacationRequest;
  }
}
