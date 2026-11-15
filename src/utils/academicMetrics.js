/** Calculate credit-weighted GPA for a supplied set of courses. */
export function calculateWeightedGPA(courses) {
  const gradedCourses = courses.filter(course => course.academic?.gradePoints !== null && course.academic?.gradePoints !== undefined && course.academic.credits > 0);
  if (!gradedCourses.length) return null;
  const totalCredits = gradedCourses.reduce((total, course) => total + course.academic.credits, 0);
  if (totalCredits <= 0) return null;
  const weightedPoints = gradedCourses.reduce((total, course) => total + course.academic.credits * course.academic.gradePoints, 0);
  return Number((weightedPoints / totalCredits).toFixed(2));
}
