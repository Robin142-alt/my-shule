import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { getCurrentSchoolId, publishSchoolOperationalEvent } from "@/lib/school/school-operational-store";
import type { DashboardEventBus } from "@/lib/dashboard-communication/dashboard-communication-system";
import type { Student } from "@/types/shared";

interface StudentFilters {
  class_id?: string;
  stream_id?: string;
  status?: string;
  search?: string;
}

export class StudentDataService {
  constructor(private eventBus?: DashboardEventBus) {}

  private emitEvent(type: any, payload: any, title: string, body: string, module = "students") {
    // 1. Emit to modern DashboardEventBus
    if (this.eventBus) {
      this.eventBus.emit({
        id: crypto.randomUUID(),
        type,
        tenantId: getCurrentSchoolId(),
        sourceModule: module,
        entityId: payload.id || "unknown",
        occurredAt: new Date().toISOString(),
        payload,
      });
    }

    // 2. Emit to legacy school-operational-store
    publishSchoolOperationalEvent({
      type,
      module,
      actorRole: "system", // Would ideally be the current user's role
      title,
      body,
      entityId: payload.id,
      payload,
    });
  }

  async admitStudent(data: Partial<Student>) {
    const student = await requestDashboardApi<Student>("/students", {
      method: "POST",
      body: data,
    });

    this.emitEvent(
      "STUDENT_ADMITTED",
      student,
      "New Student Admitted",
      `Student ${student.first_name} ${student.last_name} has been admitted.`
    );

    return student;
  }

  async updateStudent(studentId: string, data: Partial<Student>) {
    const student = await requestDashboardApi<Student>(`/students/${studentId}`, {
      method: "PATCH",
      body: data,
    });

    this.emitEvent(
      "STUDENT_UPDATED",
      student,
      "Student Record Updated",
      `Student record for ${student.first_name} ${student.last_name} has been updated.`
    );

    return student;
  }

  async enrollStudent(studentId: string) {
    const student = await requestDashboardApi<Student>(`/students/lifecycle/${studentId}/enroll`, {
      method: "POST",
    });

    this.emitEvent(
      "STUDENT_ENROLLED",
      student,
      "Student Enrolled",
      `Student ${student.first_name} ${student.last_name} has been enrolled.`
    );

    return student;
  }

  async placeInClass(studentId: string, classId: string, streamId?: string) {
    const student = await requestDashboardApi<Student>(`/students/lifecycle/${studentId}/place-in-class`, {
      method: "POST",
      body: { classId, streamId },
    });

    this.emitEvent(
      "STUDENT_CLASS_PLACED",
      student,
      "Student Placed in Class",
      `Student ${student.first_name} ${student.last_name} has been placed in a new class.`
    );

    return student;
  }

  async getStudents(filters?: StudentFilters) {
    const queryParams = filters
      ? "?" + new URLSearchParams(filters as Record<string, string>).toString()
      : "";
    return requestDashboardApi<Student[]>(`/students${queryParams}`);
  }

  async getStudentProfile(studentId: string) {
    return requestDashboardApi<Student>(`/students/${studentId}`);
  }
}

export const staticStudentDataService = new StudentDataService();
