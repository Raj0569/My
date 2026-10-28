import { useEffect, useState } from "react";
import { api, STUDENT_TOKEN, STUDENT_USER } from "../utils/api";
import { SiteShell } from "../components/SiteLayout";

export default function Apply() {
  const [courses, setCourses] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState("");
  const user = JSON.parse(localStorage.getItem(STUDENT_USER) || "null");
  useEffect(() => {
    api("/courses")
      .then(setCourses)
      .catch((error) => setFeedback(error.message));
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (!localStorage.getItem(STUDENT_TOKEN)) {
      location.href = "/account";
      return;
    }
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const result = await api("/applications", {
        method: "POST",
        body: JSON.stringify({
          courseId: values.courseId,
          personalDetails: {
            name: values.name,
            dateOfBirth: values.dateOfBirth,
            address: values.address,
            pinCode: values.pinCode,
            city: values.city,
            state: values.state,
          },
          academicDetails: {
            qualification: values.qualification,
            passingYear: Number(values.passingYear),
          },
        }),
      });
      setDone(result.applicationNumber);
    } catch (error) {
      setFeedback(error.message);
    }
  }
  return (
    <SiteShell>
      <main className="inner-hero">
        <div className="eyebrow">APPLICATION · 2026–27</div>
        <h1>
          Your next step,
          <br />
          <em>right here.</em>
        </h1>
        <p>
          Complete your details to submit an application. You’ll need an applicant account first.
        </p>
        {done ? (
          <section className="success-card">
            <div className="eyebrow">APPLICATION RECEIVED</div>
            <h2>
              You’ve taken the <em>first step.</em>
            </h2>
            <p>Your application number</p>
            <strong>{done}</strong>
            <p>Save this number to track your application.</p>
            <a className="button dark" href="/portal">
              Go to student portal ↗
            </a>
          </section>
        ) : (
          <form className="form-card application-form" onSubmit={submit}>
            <h2>Admission application</h2>
            {user && (
              <p>
                Signed in as {user.name} · {user.email}
              </p>
            )}
            <label>
              Full name
              <input
                name="name"
                defaultValue={user?.name || ""}
                required
                minLength="2"
              />
            </label>
            <label>
              Date of birth
              <input name="dateOfBirth" type="date" required />
            </label>
            <label className="application-wide">
              Address
              <input name="address" required minLength="5" />
            </label>
            <label>
              PIN code
              <input name="pinCode" inputMode="numeric" pattern="[0-9]{6}" minLength="6" maxLength="6" required title="Enter a 6-digit PIN code" />
            </label>
            <label>
              City
              <input name="city" required maxLength="100" />
            </label>
            <label>
              State
              <input name="state" required maxLength="100" />
            </label>
            <label>
              Highest qualification
              <select name="qualification" required defaultValue="">
                <option value="" disabled>
                  Select qualification
                </option>
                <option>Class 12 / Senior Secondary</option>
                <option>Diploma</option>
                <option>Undergraduate degree</option>
              </select>
            </label>
            <label>
              Passing year
              <input
                name="passingYear"
                type="number"
                min="2000"
                max="2035"
                required
              />
            </label>
            <label className="application-wide">
              Course applying for
              <select
                name="courseId"
                required
                defaultValue={
                  new URLSearchParams(location.search).get("course") || ""
                }
              >
                <option value="" disabled>
                  Choose a course
                </option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="button dark">Submit application ↗</button>
            <p className="feedback">{feedback}</p>
          </form>
        )}
      </main>
    </SiteShell>
  );
}
