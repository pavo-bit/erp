import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "./prisma";

export interface StudentAccountInput {
  schoolId: string;
  email: string;
  passwordHash: string;
  name: string;
  student: Prisma.StudentCreateWithoutUserInput;
}

export class StudentAccountConflictError extends Error {
  constructor() {
    super("A student account already uses this email address");
    this.name = "StudentAccountConflictError";
  }
}

export function isStudentAccountConflict(error: unknown): error is StudentAccountConflictError {
  return error instanceof StudentAccountConflictError;
}

export function isValidStudentEmail(email: unknown): email is string {
  return typeof email === "string" && z.string().email().safeParse(email.trim()).success;
}

/** Create the login identity and student profile atomically under one school. */
export async function createStudentAccount(input: StudentAccountInput) {
  const email = input.email.trim().toLowerCase();
  if (!isValidStudentEmail(email)) {
    throw new Error("A valid student email is required to create a student account");
  }
  if (input.student.schoolId !== input.schoolId) {
    throw new Error("Student account and profile must belong to the same school");
  }
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new StudentAccountConflictError();
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: input.passwordHash,
      name: input.name,
      role: "STUDENT",
      schoolId: input.schoolId,
      student: { create: input.student },
    },
    include: { student: true },
  }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target : [target];
      if (fields.some((field) => typeof field === "string" && field.toLowerCase().includes("email"))) {
        throw new StudentAccountConflictError();
      }
    }
    throw error;
  });
  if (!user.student) {
    throw new Error("Student profile was not created with its login identity");
  }
  return { user, student: user.student };
}
