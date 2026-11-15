-- DropForeignKey
ALTER TABLE "book_copies" DROP CONSTRAINT "book_copies_bookId_fkey";
ALTER TABLE "book_copies" DROP CONSTRAINT "book_copies_schoolId_fkey";
ALTER TABLE "book_issues" DROP CONSTRAINT "book_issues_copyId_fkey";
ALTER TABLE "book_renewals" DROP CONSTRAINT "book_renewals_issueId_fkey";
ALTER TABLE "book_renewals" DROP CONSTRAINT "book_renewals_schoolId_fkey";
ALTER TABLE "book_requests" DROP CONSTRAINT "book_requests_bookId_fkey";
ALTER TABLE "book_requests" DROP CONSTRAINT "book_requests_schoolId_fkey";
ALTER TABLE "book_requests" DROP CONSTRAINT "book_requests_studentId_fkey";
ALTER TABLE "borrowing_policies" DROP CONSTRAINT "borrowing_policies_schoolId_fkey";
ALTER TABLE "facility_requests" DROP CONSTRAINT "facility_requests_schoolId_fkey";
ALTER TABLE "facility_requests" DROP CONSTRAINT "facility_requests_studentId_fkey";
ALTER TABLE "library_audit_events" DROP CONSTRAINT "library_audit_events_schoolId_fkey";
ALTER TABLE "school_shifts" DROP CONSTRAINT "school_shifts_schoolId_fkey";
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_classId_fkey";
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_schoolId_fkey";
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_sectionId_fkey";
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_sessionId_fkey";
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_shiftId_fkey";
ALTER TABLE "student_enrollments" DROP CONSTRAINT "student_enrollments_studentId_fkey";
ALTER TABLE "student_guardians" DROP CONSTRAINT "student_guardians_guardianId_fkey";
ALTER TABLE "student_guardians" DROP CONSTRAINT "student_guardians_schoolId_fkey";
ALTER TABLE "student_guardians" DROP CONSTRAINT "student_guardians_studentId_fkey";

-- AlterTable
ALTER TABLE "book_copies" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "book_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "borrowing_policies" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "facility_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "school_shift_classes" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "school_shifts" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "student_enrollments" ALTER COLUMN "updatedAt" DROP DEFAULT;
ALTER TABLE "student_guardians" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "borrowing_policies" ADD CONSTRAINT "borrowing_policies_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_requests" ADD CONSTRAINT "book_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_issues" ADD CONSTRAINT "book_issues_copyId_fkey" FOREIGN KEY ("copyId") REFERENCES "book_copies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "book_renewals" ADD CONSTRAINT "book_renewals_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "book_issues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "book_renewals" ADD CONSTRAINT "book_renewals_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "library_audit_events" ADD CONSTRAINT "library_audit_events_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "guardians"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "school_shifts" ADD CONSTRAINT "school_shifts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "academic_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "student_enrollments" ADD CONSTRAINT "student_enrollments_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "school_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facility_requests" ADD CONSTRAINT "facility_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
