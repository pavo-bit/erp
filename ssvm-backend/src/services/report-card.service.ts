import prisma from "../lib/prisma";
import handlebars from "handlebars";
import { calculateExamSummary, SubjectMarkDetail, ExamSummary } from "./gradebook.service";

export interface ReportCardStudentInfo {
  id: string;
  name: string;
  rollNo: string;
  admissionNo?: string | null;
  className: string;
  sectionName: string;
}

export interface ReportCardSchoolInfo {
  id: string;
  name: string;
  code: string;
  address?: string;
  logo?: string;
}

export interface ReportCardAttendanceSummary {
  totalWorkingDays: number;
  presentDays: number;
  absentDays: number;
  attendancePercentage: string;
}

export interface CompiledReportCard {
  school: ReportCardSchoolInfo;
  student: ReportCardStudentInfo;
  examName: string;
  academicSession: string;
  attendance: ReportCardAttendanceSummary;
  summary: ExamSummary;
  generatedAt: string;
}

export const reportCardTemplateHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Academic Report Card - {{student.name}}</title>
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
    .header { text-align: center; border-bottom: 3px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; }
    .school-name { font-size: 26px; font-weight: bold; color: #312e81; margin-bottom: 4px; }
    .school-address { font-size: 13px; color: #64748b; margin-bottom: 8px; }
    .title { font-size: 18px; color: #4338ca; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; }
    .session-title { font-size: 14px; color: #475569; margin-top: 4px; }
    
    .student-info { background: #f8fafc; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px; border: 1px solid #e2e8f0; }
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; font-size: 14px; }
    .info-item strong { color: #475569; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #4f46e5; color: white; text-align: left; padding: 10px 14px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
    .row-alt { background: #f8fafc; }
    
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #eef2ff; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
    .summary-item { text-align: center; }
    .summary-label { font-size: 12px; text-transform: uppercase; color: #4338ca; font-weight: 600; margin-bottom: 4px; }
    .summary-val { font-size: 20px; font-weight: bold; color: #1e1b4b; }
    
    .status-badge { display: inline-block; padding: 3px 10px; border-radius: 9999px; font-weight: bold; font-size: 12px; }
    .status-passed { background: #dcfce7; color: #15803d; }
    .status-failed { background: #fee2e2; color: #b91c1c; }
    
    .remarks { margin-top: 20px; padding: 14px; border: 1px dashed #cbd5e1; border-radius: 8px; font-size: 13px; background: #fafafa; }
    .remarks strong { color: #334155; }
    
    .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding: 0 20px; }
    .sig-line { border-top: 1px solid #94a3b8; width: 180px; text-align: center; padding-top: 8px; font-size: 12px; font-weight: bold; color: #475569; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-name">{{school.name}}</div>
    {{#if school.address}}<div class="school-address">{{school.address}}</div>{{/if}}
    <div class="title">Academic Performance Report</div>
    <div class="session-title">{{examName}} &bull; Session {{academicSession}}</div>
  </div>
  
  <div class="student-info">
    <div class="info-grid">
      <div class="info-item"><strong>Student Name:</strong> {{student.name}}</div>
      <div class="info-item"><strong>Admission No:</strong> {{student.admissionNo}}</div>
      <div class="info-item"><strong>Roll Number:</strong> {{student.rollNo}}</div>
      <div class="info-item"><strong>Class:</strong> {{student.className}}</div>
      <div class="info-item"><strong>Section:</strong> {{student.sectionName}}</div>
      <div class="info-item"><strong>Attendance:</strong> {{attendance.attendancePercentage}}% ({{attendance.presentDays}}/{{attendance.totalWorkingDays}} Days)</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th style="text-align: center;">Max Marks</th>
        <th style="text-align: center;">Pass Marks</th>
        <th style="text-align: center;">Marks Obtained</th>
        <th style="text-align: center;">Grade</th>
        <th style="text-align: center;">Grade Point</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      {{#each summary.subjectResults}}
      <tr class="{{#if @odd}}row-alt{{/if}}">
        <td><strong>{{subjectName}}</strong> {{#if subjectCode}}<span style="color:#64748b; font-size:11px;">({{subjectCode}})</span>{{/if}}</td>
        <td style="text-align: center;">{{maxMarks}}</td>
        <td style="text-align: center;">{{passMarks}}</td>
        <td style="text-align: center;">{{marksObtained}}</td>
        <td style="text-align: center;"><strong>{{grade}}</strong></td>
        <td style="text-align: center;">{{gradePoint}}</td>
        <td style="text-align: center;">
          {{#if passed}}
            <span class="status-badge status-passed">PASS</span>
          {{else}}
            <span class="status-badge status-failed">FAIL</span>
          {{/if}}
        </td>
      </tr>
      {{/each}}
    </tbody>
  </table>

  <div class="summary-grid">
    <div class="summary-item">
      <div class="summary-label">Total Marks</div>
      <div class="summary-val">{{summary.totalMarksObtained}} / {{summary.totalMaxMarks}}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Percentage</div>
      <div class="summary-val">{{summary.percentage}}%</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">GPA (10-Pt)</div>
      <div class="summary-val">{{summary.gpa}}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Overall Result</div>
      <div class="summary-val">
        {{#if summary.passed}}
          <span style="color: #15803d;">PASSED ({{summary.overallGrade}})</span>
        {{else}}
          <span style="color: #b91c1c;">NEEDS IMPROVEMENT</span>
        {{/if}}
      </div>
    </div>
  </div>

  <div class="remarks">
    <strong>Remarks:</strong> {{summary.overallRemarks}}
  </div>

  <div class="signatures">
    <div class="sig-line">Class Teacher</div>
    <div class="sig-line">Principal</div>
    <div class="sig-line">Parent / Guardian</div>
  </div>
</body>
</html>
`;

/**
 * Fetch and compile all real data required to produce an official report card.
 */
export async function compileReportCardData(
  schoolId: string,
  studentId: string,
  examId: string
): Promise<CompiledReportCard> {
  // 1. Fetch Student with section and class details
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: {
      sectionRef: {
        include: {
          class: {
            include: { session: true }
          }
        }
      },
      school: true
    }
  });

  if (!student) {
    const err = new Error("Student not found or access denied.") as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  // 2. Fetch Exam with subjects and class
  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId },
    include: {
      classRef: { include: { session: true } },
      examSubjects: {
        include: { subject: true }
      }
    }
  });

  if (!exam) {
    const err = new Error("Exam not found or access denied.") as Error & { status?: number };
    err.status = 404;
    throw err;
  }

  // 3. Fetch real student marks for this exam
  const marks = await prisma.studentMark.findMany({
    where: {
      studentId,
      examSubject: { examId }
    },
    include: {
      examSubject: { include: { subject: true } }
    }
  });

  // Map exam subjects and marks
  const subjectMarkMap = new Map<string, typeof marks[0]>();
  for (const m of marks) {
    subjectMarkMap.set(m.examSubjectId, m);
  }

  const subjectDetails: SubjectMarkDetail[] = exam.examSubjects.map(es => {
    const recorded = subjectMarkMap.get(es.id);
    return {
      subjectId: es.subjectId,
      subjectName: es.subject?.name || "Subject",
      subjectCode: es.subject?.code,
      maxMarks: es.maxMarks,
      passMarks: es.passMarks,
      theoryMaxMarks: es.theoryMaxMarks,
      theoryPassMarks: es.theoryPassMarks,
      practicalMaxMarks: es.practicalMaxMarks,
      practicalPassMarks: es.practicalPassMarks,
      theoryMarksObtained: recorded?.theoryMarksObtained,
      practicalMarksObtained: recorded?.practicalMarksObtained,
      marksObtained: recorded?.marksObtained ?? 0,
      grade: recorded?.grade
    };
  });

  // 4. Calculate Exam Summary via Gradebook Service
  const examSummary = calculateExamSummary(subjectDetails);

  // 5. Aggregate Real Student Attendance
  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      schoolId,
      studentId,
      ...(exam.startDate ? { date: { lte: exam.endDate || new Date() } } : {})
    }
  });

  const totalWorkingDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter(
    a => a.status === "PRESENT" || a.status === "LATE"
  ).length;
  const absentDays = totalWorkingDays - presentDays;
  const attendancePercentage = totalWorkingDays > 0
    ? ((presentDays / totalWorkingDays) * 100).toFixed(1)
    : "100.0";

  const sessionName = exam.classRef?.session?.name || student.sectionRef?.class?.session?.name || "2026-2027";

  return {
    school: {
      id: student.school.id,
      name: student.school.name,
      code: student.school.code,
      address: "SSVM College Square Campus"
    },
    student: {
      id: student.id,
      name: student.name,
      rollNo: student.rollNo,
      admissionNo: student.admissionNo,
      className: student.sectionRef?.class?.name || "Class",
      sectionName: student.sectionRef?.name || "Section"
    },
    examName: exam.name,
    academicSession: sessionName,
    attendance: {
      totalWorkingDays,
      presentDays,
      absentDays,
      attendancePercentage
    },
    summary: examSummary,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Render compiled report card data into full HTML document
 */
export function renderReportCardHtml(data: CompiledReportCard): string {
  const template = handlebars.compile(reportCardTemplateHtml);
  return template(data);
}
