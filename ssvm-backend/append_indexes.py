import re

indexes = {
    "Attendance": [
        "@@index([schoolId, date])",
        "@@index([studentId, date])",
        "@@index([sectionId, date, status])",
        "@@index([schoolId, date, status])"
    ],
    "Student": [
        "@@index([schoolId, sectionId])",
        "@@index([schoolId, isActive])",
        "@@index([guardianId])",
        "@@index([schoolId, admissionNo])"
    ],
    "Invoice": [
        "@@index([schoolId, status])",
        "@@index([schoolId, dueDate, status])",
        "@@index([studentId, status])",
        "@@index([schoolId, type, status])"
    ],
    "PaymentTransaction": [
        "@@index([invoiceId])",
        "@@index([transactionId])",
        "@@unique([transactionId])"
    ],
    "TeacherAttendance": [
        "@@index([teacherId, date])",
        "@@index([schoolId, date])"
    ],
    "StudentMark": [
        "@@index([studentId, examSubjectId])",
        "@@index([examSubjectId])"
    ],
    "Notification": [
        "@@index([schoolId, status])",
        "@@index([schoolId, createdAt])"
    ],
    "AuditLog": [
        "@@index([schoolId, createdAt])",
        "@@index([userId, createdAt])",
        "@@index([entity, entityId])"
    ],
    "ActivityLog": [
        "@@index([schoolId, createdAt])",
        "@@index([schoolId, type])"
    ],
    "Assignment": [
        "@@index([schoolId, classId, subjectId])",
        "@@index([teacherId, schoolId])"
    ],
    "AssignmentSubmission": [
        "@@index([assignmentId, studentId])",
        "@@index([assignmentId, status])"
    ],
    "LeaveRequest": [
        "@@index([requesterId, status])",
        "@@index([schoolId, status])"
    ],
    "TimetableSlot": [
        "@@index([timetableId])",
        "@@index([teacherSubjectAssignmentId])"
    ],
    "Notice": [
        "@@index([schoolId, status, createdAt])",
        "@@index([schoolId, category])"
    ],
    "Event": [
        "@@index([schoolId, date, status])"
    ]
}

with open("prisma/schema.prisma", "r", encoding="utf-8") as f:
    content = f.read()

for model, new_indexes in indexes.items():
    # Find the model block
    pattern = r'(model\s+' + model + r'\s+\{.*?)(^\})'
    
    def repl(m):
        # check if indexes already exist to avoid duplicate
        block = m.group(1)
        for idx in new_indexes:
            if idx not in block:
                block += "  " + idx + "\n"
        return block + "}"

    content = re.sub(pattern, repl, content, flags=re.MULTILINE | re.DOTALL)

with open("prisma/schema.prisma", "w", encoding="utf-8") as f:
    f.write(content)
print("Updated schema.prisma with composite indexes")
