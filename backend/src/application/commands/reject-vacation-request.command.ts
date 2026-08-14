export class RejectVacationRequestCommand {
  constructor(
    public readonly vacationRequestId: string,
    public readonly comments: string,
  ) {}
}
