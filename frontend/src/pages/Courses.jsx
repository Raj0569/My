import { useEffect, useState } from "react";
import { api } from "../utils/api";
import { SiteShell } from "../components/SiteLayout";
import CourseCards from "../components/CourseCards";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [query, setQuery] = useState("");
  useEffect(() => {
    api("/courses")
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);
  const results = courses.filter((course) =>
    `${course.name} ${course.category}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <SiteShell>
      <main className="inner-hero">
        <div className="eyebrow">FIND YOUR DIRECTION</div>
        <h1>
          Study what <em>moves you.</em>
        </h1>
        <p>Explore our programs and find a subject that feels like yours.</p>
        <input
          className="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search courses"
        />
        <div className="section courses-preview">
          <CourseCards courses={results} />
        </div>
      </main>
    </SiteShell>
  );
}
