import { useState } from "react";
import { api } from "../utils/api";
import ActionIcon from "../components/ActionIcon";

const fields = [
  ["name", "Course name"],
  ["code", "Course code"],
  ["category", "Category"],
  ["duration", "Duration"],
  ["annualFee", "Annual fee"],
  ["eligibility", "Eligibility summary"],
];

const detailFields = [
  ["eligibilityDetails", "Detailed eligibility criteria"],
  ["courseStructure", "Course structure (one year or term per line)"],
  ["placementDetails", "Placement information and career paths"],
];

function structureText(value) {
  return Array.isArray(value) ? value.join("\n") : value || "";
}

export default function CourseManagement({ courses, coursePage, coursePages, courseTotal, search, setSearch, statusFilter, setStatusFilter, page, setPage, loadCourses, permissions, setFeedback }) {
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  function open(mode, course = {}) {
    setDraft({
      name: "", code: "", category: "", duration: "", annualFee: "",
      eligibility: "", eligibilityDetails: "", courseStructure: "",
      placementDetails: "", description: "", ...course,
      courseStructure: structureText(course.courseStructure),
    });
    setModal(mode);
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    const editing = modal === "edit";
    const body = {
      ...draft,
      annualFee: Number(draft.annualFee),
      courseStructure: structureText(draft.courseStructure)
        .split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
    };
    try {
      await api(editing ? `/courses/${draft._id}` : "/courses", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }, true);
      setModal(null);
      setFeedback(editing ? "Course updated." : "Course created.");
      await loadCourses();
    } catch (error) {
      setFeedback(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggle(course) {
    try {
      await api(`/courses/${course._id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !course.isActive }),
      }, true);
      await loadCourses();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  async function remove(course) {
    if (!window.confirm(`Delete ${course.name}? It will be archived and hidden from applicants.`)) return;
    try {
      await api(`/courses/${course._id}`, { method: "DELETE" }, true);
      setFeedback("Course deleted.");
      await loadCourses();
    } catch (error) {
      setFeedback(error.message);
    }
  }

  function displayValue(key) {
    if (key === "annualFee") return `₹${Number(draft[key]).toLocaleString("en-IN")}`;
    if (key === "courseStructure") return structureText(draft[key]);
    return draft[key] || "—";
  }

  return <>
    <div className="course-toolbar">
      <form className="course-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); loadCourses(1); }}>
        <label>Course name<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search courses" /></label>
        <label>Status<select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        <button className="button outline">Search</button>
      </form>
      {permissions.includes("courses.create") && <button className="button dark" onClick={() => open("create")}>+ Add course</button>}
    </div>

    <div className="table-scroll course-table">
      <table>
        <thead><tr><th>Course</th><th>Code</th><th>Category</th><th>Duration</th><th>Annual fee</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{courses.map((course) => <tr key={course._id}>
          <td><strong>{course.name}</strong><small>{course.description}</small></td>
          <td>{course.code || "—"}</td><td>{course.category}</td><td>{course.duration}</td>
          <td>₹{Number(course.annualFee).toLocaleString("en-IN")}</td>
          <td><button type="button" role="switch" aria-checked={course.isActive} disabled={!permissions.includes("courses.edit")} onClick={() => toggle(course)} className={`switch ${course.isActive ? "on" : ""}`}><span />{course.isActive ? "Active" : "Inactive"}</button></td>
          <td className="course-row-actions"><ActionIcon action="view" label={`View ${course.name}`} onClick={() => open("view", course)} />{permissions.includes("courses.edit") && <ActionIcon action="edit" label={`Edit ${course.name}`} onClick={() => open("edit", course)} />}{permissions.includes("courses.delete") && <ActionIcon action="delete" label={`Delete ${course.name}`} onClick={() => remove(course)} />}</td>
        </tr>)}</tbody>
      </table>
      {!courses.length && <p className="empty-state">No courses match these filters.</p>}
    </div>

    <div className="pagination">
      <span>{courseTotal ? `Showing ${(coursePage - 1) * 10 + 1}–${Math.min(coursePage * 10, courseTotal)} of ${courseTotal}` : "No courses"}</span>
      <div><button className="small-button" disabled={coursePage <= 1} onClick={() => { setPage(coursePage - 1); loadCourses(coursePage - 1); }}>Previous</button><span>Page {coursePage} of {Math.max(1, coursePages)}</span><button className="small-button" disabled={coursePage >= coursePages} onClick={() => { setPage(coursePage + 1); loadCourses(coursePage + 1); }}>Next</button></div>
    </div>

    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}>
      <section className="detail-modal course-modal" role="dialog" aria-modal="true" aria-labelledby="course-modal-title">
        <button className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button>
        <div className="eyebrow">COURSE MANAGEMENT</div>
        <h2 id="course-modal-title">{modal === "create" ? "Add a course" : modal === "edit" ? "Edit course" : "Course details"}</h2>
        {modal === "view" ? <dl>{[...fields, ["description", "Description"], ...detailFields].map(([key, label]) => <div key={key}><dt>{label}</dt><dd className="course-modal-detail-value">{displayValue(key)}</dd></div>)}</dl> : <form onSubmit={save}>
          <div className="editor-grid">
            {fields.map(([key, label]) => <label key={key}>{label}<input required={key !== "code"} type={key === "annualFee" ? "number" : "text"} min={key === "annualFee" ? "0" : undefined} value={draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
            <label className="editor-wide">Short description<textarea required maxLength="2000" value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
            {detailFields.map(([key, label]) => <label className="editor-wide" key={key}>{label}<textarea rows={key === "courseStructure" ? 5 : 4} maxLength="4000" value={key === "courseStructure" ? structureText(draft[key]) : draft[key] ?? ""} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />{key === "placementDetails" && <small>Use verified placement information. Avoid promising or inventing placement outcomes.</small>}</label>)}
          </div>
          <div className="editor-actions"><button type="button" className="button outline" onClick={() => setModal(null)}>Cancel</button><button className="button dark" disabled={saving}>{saving ? "Saving…" : modal === "create" ? "Create course" : "Save changes"}</button></div>
        </form>}
      </section>
    </div>}
  </>;
}
