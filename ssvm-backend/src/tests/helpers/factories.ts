import { Role, InvoiceStatus } from '@prisma/client';

let counter = Math.floor(Math.random() * 1000000);

export const UserFactory = {
  build: (overrides?: any) => {
    counter++;
    return {
      email: `user${counter}@example.com`,
      passwordHash: 'hashed_pw',
      name: `User ${counter}`,
      role: Role.TEACHER,
      isActive: true,
      ...overrides
    };
  }
};

export const StudentFactory = {
  build: (overrides?: any) => {
    counter++;
    return {
      admissionNo: `ADM-${1000 + counter}`,
      rollNo: `${counter}`,
      name: `Student ${counter}`,
      dob: new Date('2010-01-01'),
      gender: 'MALE',
      isActive: true,
      ...overrides
    };
  }
};

export const SchoolFactory = {
  build: (overrides?: any) => {
    counter++;
    return {
      name: `School ${counter}`,
      code: `SCHOOL-${counter}`,
      address: `${counter} Main St`,
      email: `contact${counter}@school.com`,
      phone: `123456789${counter % 10}`,
      isActive: true,
      ...overrides
    };
  }
};

export const InvoiceFactory = {
  build: (overrides?: any) => {
    counter++;
    return {
      amount: 1000,
      type: 'MONTHLY',
      status: InvoiceStatus.UNPAID,
      dueDate: new Date(Date.now() + 86400000), // Tomorrow
      ...overrides
    };
  }
};
