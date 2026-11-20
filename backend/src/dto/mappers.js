export function toSlotDto(row) {
  return {
    id: row.id,
    professorId: row.professor_id,
    ...(row.professor_name ? { professorName: row.professor_name } : {}),
    startTime: row.start_time.toISOString(),
    endTime: row.end_time.toISOString(),
    capacity: row.capacity,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

export function toSupportRequestDto(row) {
  return {
    id: row.id,
    slotId: row.slot_id,
    studentId: row.student_id,
    ...(row.student_name ? { studentName: row.student_name } : {}),
    ...(row.professor_id ? { professorId: row.professor_id } : {}),
    ...(row.professor_name ? { professorName: row.professor_name } : {}),
    topic: row.topic,
    status: row.status,
    ...(row.start_time ? { startTime: row.start_time.toISOString() } : {}),
    ...(row.end_time ? { endTime: row.end_time.toISOString() } : {}),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toGradeVersionDto(row) {
  return {
    id: row.id,
    assessmentId: row.assessment_id,
    studentId: row.student_id,
    versionNo: row.version_no,
    score: Number(row.score),
    reason: row.reason ?? null,
    supersedesId: row.supersedes_id ?? null,
    recordedBy: row.recorded_by,
    effectiveAt: row.effective_at.toISOString(),
    recordedAt: row.recorded_at.toISOString(),
  };
}

export function toHistoryEventDto(row) {
  return {
    seq: Number(row.seq),
    id: row.id,
    actorId: row.actor_id,
    actorName: row.actor_name ?? null,
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    payload: row.payload,
    recordedAt: row.recorded_at.toISOString(),
  };
}