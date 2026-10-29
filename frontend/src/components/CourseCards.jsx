export default function CourseCards({ courses }) {
  if (!courses.length)
    return (
      <p className="muted">
        Course listings will appear here when the API is connected.
      </p>
    );
  return (
    <div className="course-grid">
      {courses.map((course) => (
        <article className="course-card" key={course._id}>
          <div className="course-category">{course.category}</div>
          <h3>{course.name}</h3>
          <p>{course.description}</p>
          <div className="course-meta">
            {course.duration}
            <span>{course.eligibility}</span>
          </div>
          <a className="text-link course-details-link" href={`/courses/${course._id}`}>
            View course details ↗
          </a>
          <a className="text-link" href={`/apply?course=${course._id}`}>
            Apply for this course ↗
          </a>
        </article>
      ))}
    </div>
  );
}
