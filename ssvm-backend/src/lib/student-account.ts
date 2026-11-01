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

/** Create the login identity and student profile atomically under one school. */
export async function createStudentAccount(input: StudentAccountInput) {
  const email = input.email.trim().toLowerCase();
  if (!z.string().email().safeParse(email).success) {
    throw new Error("A valid student email is required to create a student account");
  }
  if (input.student.schoolId !== input.schoolId) {
    throw new Error("Student account and profile must belong to the same school");
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
  });
  if (!user.student) {
    throw new Error("Student profile was not created with its login identity");
  }
  return { user, student: user.student };
}
