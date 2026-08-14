import bcrypt from "bcryptjs";

import { AppDataSource } from "../config/data-source";
import { User } from "../entities/user.entity";
import { VacationRequest } from "../entities/vacation-request.entity";
import { UserRole } from "../enums/user-role.enum";
import { VacationRequestStatus } from "../enums/vacation-request-status.enum";

const PASSWORD_SALT_ROUNDS = 10;
const DEMO_PASSWORD = "Password123!";

const DEMO_USERS: Array<Pick<User, "name" | "email" | "role">> = [
  {
    name: "Demo Requester",
    email: "requester@example.com",
    role: UserRole.REQUESTER,
  },
  {
    name: "Demo Validator",
    email: "validator@example.com",
    role: UserRole.VALIDATOR,
  },
];

const FIRST_NAMES = [
  "Alex",
  "Jordan",
  "Taylor",
  "Morgan",
  "Casey",
  "Riley",
  "Avery",
  "Parker",
  "Skyler",
  "Quinn",
  "Harper",
  "Rowan",
  "Hayden",
  "Logan",
  "Cameron",
  "Elliot",
  "Reese",
  "Finley",
  "Dakota",
  "Blake",
  "Sawyer",
  "Jamie",
  "Emerson",
  "Kendall",
  "Sage",
];

const LAST_NAMES = [
  "Adams",
  "Bennett",
  "Carter",
  "Dawson",
  "Ellis",
  "Foster",
  "Garrett",
  "Hayes",
  "Iverson",
  "Jennings",
  "Keller",
  "Lawson",
  "Miller",
  "Norris",
  "Owens",
  "Perry",
  "Quincy",
  "Reynolds",
  "Spencer",
  "Turner",
  "Underwood",
  "Vaughn",
  "Walker",
  "Young",
  "Zimmer",
];

const REQUEST_REASONS = [
  "Family trip planned in advance",
  "Attending a close friend's wedding",
  "School holiday travel with family",
  "Rest and recovery break",
  "Home relocation support",
  "Long weekend extension",
  "Personal appointments and errands",
  "Visiting relatives out of town",
  "Celebrating an important family event",
  "Short international city break",
];

const REJECTION_COMMENTS = [
  "Team coverage is too limited for those dates.",
  "Another critical release is scheduled that week.",
  "Please pick dates outside the quarter-end period.",
  "The overlap with existing approvals is too high.",
  "Current support staffing cannot accommodate this window.",
  "Please submit an alternative week with lower team load.",
  "The request conflicts with mandatory on-site activities.",
  "Please coordinate with your team lead and resubmit.",
];

type RequestDraft = {
  userId: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: VacationRequestStatus;
  comments: string | null;
};

const toIsoDate = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const buildRequestDates = (
  userIndex: number,
): Array<{ startDate: string; endDate: string }> => {
  const now = new Date();

  const firstStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + ((userIndex % 7) - 2),
      3 + ((userIndex * 2) % 18),
    ),
  );
  const firstDurationDays = 3 + (userIndex % 4);
  const firstEnd = new Date(firstStart);
  firstEnd.setUTCDate(firstEnd.getUTCDate() + firstDurationDays);

  const secondStart = new Date(firstStart);
  secondStart.setUTCDate(secondStart.getUTCDate() + 24 + (userIndex % 5));
  const secondDurationDays = 2 + ((userIndex + 1) % 4);
  const secondEnd = new Date(secondStart);
  secondEnd.setUTCDate(secondEnd.getUTCDate() + secondDurationDays);

  return [
    { startDate: toIsoDate(firstStart), endDate: toIsoDate(firstEnd) },
    { startDate: toIsoDate(secondStart), endDate: toIsoDate(secondEnd) },
  ];
};

const getStatusForRequestIndex = (index: number): VacationRequestStatus => {
  const statusSlot = index % 10;
  if (statusSlot <= 4) {
    return VacationRequestStatus.APPROVED;
  }
  if (statusSlot <= 7) {
    return VacationRequestStatus.PENDING;
  }
  return VacationRequestStatus.REJECTED;
};

const seedMockData = async (): Promise<void> => {
  await AppDataSource.initialize();

  try {
    const userRepository = AppDataSource.getRepository(User);
    const vacationRequestRepository =
      AppDataSource.getRepository(VacationRequest);
    const hashedPassword = await bcrypt.hash(
      DEMO_PASSWORD,
      PASSWORD_SALT_ROUNDS,
    );

    for (const demoUser of DEMO_USERS) {
      const existingUser = await userRepository.findOne({
        where: { email: demoUser.email },
      });

      if (existingUser) {
        continue;
      }

      const user = userRepository.create({
        name: demoUser.name,
        email: demoUser.email,
        password: hashedPassword,
        role: demoUser.role,
      });
      await userRepository.save(user);
    }

    for (let i = 0; i < 25; i += 1) {
      const firstName = FIRST_NAMES[i];
      const lastName = LAST_NAMES[i];
      const email = `mock.requester.${String(i + 1).padStart(2, "0")}@example.test`;

      const existingUser = await userRepository.findOne({ where: { email } });
      if (existingUser) {
        continue;
      }

      const user = userRepository.create({
        name: `${firstName} ${lastName}`,
        email,
        password: hashedPassword,
        role: UserRole.REQUESTER,
      });
      await userRepository.save(user);
    }

    const mockRequesters = await userRepository.find({
      where: { role: UserRole.REQUESTER },
      order: { email: "ASC" },
    });

    const selectedMockRequesters = mockRequesters.filter((user) =>
      user.email.endsWith("@example.test"),
    );

    const existingRequests = await vacationRequestRepository.find({
      where: selectedMockRequesters.map((user) => ({ userId: user.id })),
    });
    const existingRequestKeys = new Set(
      existingRequests.map(
        (request) =>
          `${request.userId}|${request.startDate}|${request.endDate}`,
      ),
    );

    const drafts: RequestDraft[] = [];

    selectedMockRequesters.forEach((user, userIndex) => {
      const datePairs = buildRequestDates(userIndex);
      datePairs.forEach((dates, requestOffset) => {
        const globalIndex = userIndex * 2 + requestOffset;
        const status = getStatusForRequestIndex(globalIndex);
        const reason = REQUEST_REASONS[globalIndex % REQUEST_REASONS.length];
        const comments =
          status === VacationRequestStatus.REJECTED
            ? REJECTION_COMMENTS[globalIndex % REJECTION_COMMENTS.length]
            : null;

        drafts.push({
          userId: user.id,
          startDate: dates.startDate,
          endDate: dates.endDate,
          reason,
          status,
          comments,
        });
      });
    });

    let createdCount = 0;
    for (const draft of drafts) {
      const key = `${draft.userId}|${draft.startDate}|${draft.endDate}`;
      if (existingRequestKeys.has(key)) {
        continue;
      }

      const vacationRequest = vacationRequestRepository.create({
        userId: draft.userId,
        startDate: draft.startDate,
        endDate: draft.endDate,
        reason: draft.reason,
        status: draft.status,
        comments: draft.comments,
      });
      await vacationRequestRepository.save(vacationRequest);
      existingRequestKeys.add(key);
      createdCount += 1;
    }

    console.log("Mock data seed completed");
    console.log(
      `Mock requester users targeted: ${selectedMockRequesters.length}`,
    );
    console.log(`Mock vacation requests created in this run: ${createdCount}`);
    console.log(`Default password for demo and mock users: ${DEMO_PASSWORD}`);
  } finally {
    await AppDataSource.destroy();
  }
};

void seedMockData();
