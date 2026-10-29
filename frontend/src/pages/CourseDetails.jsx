import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { SiteShell } from "../components/SiteLayout";
import "./course-details.css";

export default function CourseDetails() {
  const courseId = window.location.pathname.slice("/courses/".length);
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/courses/${encodeURIComponent(courseId)}`)
      .then(setCourse)
      .catch((requestError) => setError(requestError.message));
  }, [courseId]);

  if (!course && !error) {
    return <SiteShell><main className="inner-hero course-detail-page"><p>Loading course details…</p></main></SiteShell>;
  }

  if (error) {
    return <SiteShell><main className="inner-hero course-detail-page"><a className="text-link" href="/courses">← Back to courses</a><h1>Course details unavailable</h1><p className="muted">{error}</p></main></SiteShell>;
  }

  const structure = Array.isArray(course.courseStructure)
    ? course.courseStructure
    : String(course.courseStructure || "").split(/\r?\n/).filter(Boolean);
  const learningOutcomes = Array.isArray(course.learningOutcomes) ? course.learningOutcomes : [];
  const requiredDocuments = Array.isArray(course.requiredDocuments) ? course.requiredDocuments : [];

  return (
    <SiteShell>
      <main className="course-detail-page">
        <a className="text-link course-back-link" href="/courses">← All courses</a>
        <header className="course-detail-hero">
          <div className="eyebrow">{course.category}{course.code ? ` · ${course.code}` : ""}</div>
          <h1>{course.name}</h1>
          <p>{course.description}</p>
          <div className="course-detail-facts">
            <div><span>Duration</span><strong>{course.duration}</strong></div>
            <div><span>Annual fee</span><strong>₹{Number(course.annualFee).toLocaleString("en-IN")}</strong></div>
            <div><span>Eligibility</span><strong>{course.eligibility}</strong></div>
          </div>
          <a className="button dark" href={`/apply?course=${course._id}&register=1`}>Register now · ₹5,000 ↗</a>
          <p className="course-booking-note">₹5,000 non-refundable slot-booking fee. Your details are checked against this course’s criteria before payment. Admission remains subject to college review.</p>
        </header>

        <div className="course-detail-sections">
          <section className="course-detail-section">
            <div className="eyebrow">ADMISSION REQUIREMENTS</div>
            <h2>Eligibility criteria</h2>
            <p>{course.eligibilityDetails || course.eligibility}</p>
            {course.eligibleQualifications?.length > 0 && <p><strong>Accepted qualifications:</strong> {course.eligibleQualifications.join(", ")}</p>}
            {course.eligibleStreams?.length > 0 && <p><strong>Accepted streams:</strong> {course.eligibleStreams.join(", ")}</p>}
            {course.requiredSubjects?.length > 0 && <p><strong>Required subjects:</strong> {course.requiredSubjects.join(", ")}</p>}
            {course.minimumPercentage != null && <p><strong>Minimum percentage:</strong> {course.minimumPercentage}%</p>}
          </section>

          <section className="course-detail-section">
            <div className="eyebrow">WHAT YOU’LL STUDY</div>
            <h2>Course structure</h2>
            {structure.length ? (
              <ol className="course-structure-list">
                {structure.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
              </ol>
            ) : <p>Course structure details will be announced by the college.</p>}
            <p className="course-detail-note">Indicative outline; the approved syllabus may change.</p>
          </section>

          <section className="course-detail-section">
            <div className="eyebrow">CAREER OUTLOOK</div>
            <h2>Placement &amp; career paths</h2>
            <p>{course.placementDetails || "Contact the admissions office for current placement support and verified outcomes for this course."}</p>
          </section>

          {learningOutcomes.length > 0 && <section className="course-detail-section"><div className="eyebrow">SKILLS &amp; OUTCOMES</div><h2>What you’ll learn</h2><ul className="course-detail-list">{learningOutcomes.map((item) => <li key={item}>{item}</li>)}</ul></section>}
          <section className="course-detail-section"><div className="eyebrow">APPLICATION CHECKLIST</div><h2>Documents to prepare</h2>{requiredDocuments.length > 0 ? <ul className="course-detail-list">{requiredDocuments.map((item) => <li key={item}>{item}</li>)}</ul> : <p>Check the latest admissions notice for the required documents.</p>}</section>
        </div>
      </main>
    </SiteShell>
  );
}
