export type StudentStatus =
  | 'APPLICANT'
  | 'ACCEPTED'
  | 'ENROLLED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'ON_LEAVE'
  | 'TRANSFERRED_OUT'
  | 'WITHDRAWN'
  | 'GRADUATED'
  | 'ALUMNI'
  | 'ARCHIVED';

export async function enrollStudent(studentId: string): Promise<any> {
  const response = await fetch(`/api/students/lifecycle/${studentId}/enroll`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Failed to enroll student');
  return response.json();
}

export async function placeInClass(studentId: string, payload: { classId: string; academicYearId: string; academicLevelId: string; streamId?: string }): Promise<any> {
  const response = await fetch(`/api/students/lifecycle/${studentId}/place-in-class`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Failed to place student in class');
  return response.json();
}

export async function promoteStudent(studentId: string, payload: { newClassId: string; academicYearId: string; academicLevelId: string; streamId?: string }): Promise<any> {
  const response = await fetch(`/api/students/lifecycle/${studentId}/promote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = body && typeof body === 'object' && 'message' in body ? body.message : null;
    throw new Error(typeof message === 'string' ? message : 'Failed to promote student');
  }
  return response.json();
}

export async function suspendStudent(studentId: string, reason: string): Promise<any> {
  const response = await fetch(`/api/students/lifecycle/${studentId}/suspend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Failed to suspend student');
  return response.json();
}

export async function initiateClearance(studentId: string): Promise<any> {
  const response = await fetch(`/api/students/lifecycle/${studentId}/initiate-clearance`, {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Failed to initiate clearance');
  return response.json();
}

export async function exitStudent(studentId: string, payload: { exitReason: string; exitStatus: StudentStatus; clearanceId?: string }): Promise<any> {
  const response = await fetch(`/api/students/lifecycle/${studentId}/exit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Failed to exit student');
  return response.json();
}

export async function archiveStudent(studentId: string): Promise<any> {
  const response = await fetch(`/api/students/lifecycle/${studentId}/archive`, {
    method: 'PATCH',
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error('Failed to archive student');
  return response.json();
}
