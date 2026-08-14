import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

import { VacationRequestStatus } from "../enums/vacation-request-status.enum";
import { User } from "./user.entity";

@Entity({ name: "vacation_requests" })
export class VacationRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  userId!: string;

  @ManyToOne(() => User, (user) => user.vacationRequests, { nullable: false })
  @JoinColumn({ name: "userId" })
  user!: User;

  @Column({ type: "date" })
  startDate!: string;

  @Column({ type: "date" })
  endDate!: string;

  @Column({ type: "text" })
  reason!: string;

  @Column({
    type: "enum",
    enum: VacationRequestStatus,
    default: VacationRequestStatus.PENDING,
  })
  status!: VacationRequestStatus;

  @Column({ type: "text", nullable: true })
  comments!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
