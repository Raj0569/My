import { useEffect, useState } from "react";
import { api, ADMIN_TOKEN, ADMIN_USER } from "../utils/api";
import { Brand } from "../components/SiteLayout";
import CourseManagement from "./CourseManagement";
import { RolePermissionsPanel, StaffPanel } from "./AdminAccess";
import ApprovalInbox from "./ApprovalInbox";
import ActionIcon from "../components/ActionIcon";

const adminSections = new Set(["dashboard", "applications", "enquiries", "courses", "users", "roles", "staff"]);
const approvalPermissions = ["applications.approve.reviewer", "applications.approve.department_head", "applications.approve.principal", "applications.approve.director"];
function sectionFromPath() {
  const value = window.location.pathname.split("/")[2];
  return adminSections.has(value) ? value : "dashboard";
}

const approvalStages = [["reviewer", "Reviewer"], ["department_head", "Department Head"], ["principal", "Principal"], ["director", "Director"]];
function ApplicationTimeline({ application, onClose }) {
  if (!application) return null;
  const currentStage = application.approvalStage;
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="detail-modal approval-modal" role="dialog" aria-modal="true" aria-labelledby="timeline-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">APPLICATION TIMELINE</div><h2 id="timeline-title">{application.applicationNumber}</h2><p className="approval-subtitle">{application.applicant?.name || application.student?.name || application.personalDetails?.name} · {application.course?.name}</p><div className="approval-timeline">{approvalStages.map(([key, label]) => { const record = application.approvalHistory?.find((entry) => entry.stage === key); const pending = !record && (currentStage === key || currentStage === "enrollment_pending" && key === "director"); const upcoming = !record && !pending && !["complete", "rejected"].includes(currentStage); const status = record?.decision === "approved" ? "Approved" : record?.decision === "rejected" ? "Rejected" : pending ? "Pending" : upcoming || currentStage === "complete" ? "Waiting" : "Not reached"; return <article className={record ? record.decision === "approved" ? "done" : "rejected" : pending ? "current" : ""} key={key}><span className="timeline-mark">{record?.decision === "approved" ? "✓" : record?.decision === "rejected" ? "×" : pending ? "•" : ""}</span><div><strong>{label} · {status}</strong>{record ? <p>{record.changedBy?.name || "Approver"}{record.changedBy?.roleName ? ` (${record.changedBy.roleName})` : ""} · {new Date(record.changedAt).toLocaleString("en-IN")}<br /><b>Remark:</b> {record.note}</p> : pending ? <small>{currentStage === "enrollment_pending" ? "Director approval recorded; enrollment is finalizing." : "Waiting for this approver."}</small> : null}</div></article>;})}</div><p className="muted">Application status: <strong>{application.status}</strong></p></section></div>;
}

function StudentEditModal({ student, onClose, onSave }) {
  const [draft, setDraft] = useState({ name: student.name, email: student.email, phone: student.phone, address: student.personalDetails?.address || "", pinCode: student.personalDetails?.pinCode || "", city: student.personalDetails?.city || "", state: student.personalDetails?.state || "" });
  const [saving, setSaving] = useState(false);
  async function submit(event) {
    event.preventDefault(); setSaving(true);
    try { await onSave(student, draft); onClose(); } finally { setSaving(false); }
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="student-edit-title"><button className="modal-close" onClick={onClose} aria-label="Close">×</button><div className="eyebrow">STUDENT RECORD</div><h2 id="student-edit-title">Edit student</h2><form onSubmit={submit}><div className="editor-grid"><label>Name<input required minLength="2" maxLength="100" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Email<input required type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label>Phone<input required value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} /></label><label className="editor-wide">Address<input required minLength="5" value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} /></label><label>PIN code<input required inputMode="numeric" pattern="[0-9]{6}" maxLength="6" value={draft.pinCode} onChange={(event) => setDraft({ ...draft, pinCode: event.target.value })} /></label><label>City<input required value={draft.city} onChange={(event) => setDraft({ ...draft, city: event.target.value })} /></label><label>State<input required value={draft.state} onChange={(event) => setDraft({ ...draft, state: event.target.value })} /></label></div><div className="editor-actions"><button type="button" className="button outline" onClick={onClose}>Cancel</button><button className="button dark" disabled={saving}>{saving ? "Saving…" : "Save student"}</button></div></form></section></div>;
}
function csvCell(value) { const raw = String(value ?? ""); const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw; return `"${safe.replaceAll('"', '""')}"`; }

function CourseAdmin({ courses, reload, permissions }) {
  const blank = {
    name: "",
    code: "",
    category: "",
    description: "",
    duration: "",
    eligibility: "",
    annualFee: "",
  };
  const [draft, setDraft] = useState(blank);
  const [courseId, setCourseId] = useState("");
  const [feedback, setFeedback] = useState("");
  async function save(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    values.annualFee = Number(values.annualFee);
    try {
      await api(
        courseId ? `/courses/${courseId}` : "/courses",
        { method: courseId ? "PATCH" : "POST", body: JSON.stringify(values) },
        true,
      );
      setDraft(blank);
      setCourseId("");
      setFeedback("Course saved.");
      await reload();
    } catch (error) {
      setFeedback(error.message);
    }
  }
  function edit(course) {
    setCourseId(course._id);
    setDraft({ ...course, annualFee: course.annualFee ?? "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function archive(course) {
    if (!window.confirm(`Archive ${course.name}?`)) return;
    try {
      await api(`/courses/${course._id}`, { method: "DELETE" }, true);
      setFeedback("Course archived.");
      await reload();
    } catch (error) {
      setFeedback(error.message);
    }
  }
  return (
    <>
      {((!courseId && permissions.includes("courses.create")) || (courseId && permissions.includes("courses.edit"))) && <form className="course-editor" onSubmit={save}>
        <h2>{courseId ? "Edit course" : "Add a course"}</h2>
        <div className="editor-grid">
          <label>
            Course name
            <input
              name="name"
              required
              maxLength="100"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Course code
            <input
              name="code"
              maxLength="20"
              value={draft.code || ""}
              onChange={(e) => setDraft({ ...draft, code: e.target.value })}
            />
          </label>
          <label>
            Category
            <input
              name="category"
              required
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
          </label>
          <label>
            Duration
            <input
              name="duration"
              required
              value={draft.duration}
              onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
            />
          </label>
          <label>
            Annual fee
            <input
              name="annualFee"
              type="number"
              min="0"
              required
              value={draft.annualFee}
              onChange={(e) =>
                setDraft({ ...draft, annualFee: e.target.value })
              }
            />
          </label>
          <label>
            Eligibility
            <input
              name="eligibility"
              required
              value={draft.eligibility}
              onChange={(e) =>
                setDraft({ ...draft, eligibility: e.target.value })
              }
            />
          </label>
          <label className="editor-wide">
            Short description
            <textarea
              name="description"
              required
              maxLength="2000"
              value={draft.description}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
        </div>
        <div className="editor-actions">
          <span className="feedback">{feedback}</span>
          <button type="submit" className="button dark">
            {courseId ? "Save changes" : "Add course"}
          </button>
          {courseId && (
            <button
              type="button"
              className="button outline"
              onClick={() => {
                setCourseId("");
                setDraft(blank);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>}
      <div className="course-grid">
        {courses.map((course) => (
          <article className="course-card" key={course._id}>
            <div className="course-category">
              {course.category} Â· {course.code || "â€”"}
            </div>
            <h3>{course.name}</h3>
            <p>{course.description}</p>
            <div className="course-meta">
              {course.duration}
              <span>
                â‚¹{Number(course.annualFee).toLocaleString("en-IN")} / year
              </span>
            </div>
            <div className="course-actions">
              {course.isActive && permissions.includes("courses.edit") && <ActionIcon action="edit" label={`Edit ${course.name}`} onClick={() => edit(course)} />}
              {course.isActive && permissions.includes("courses.delete") && <ActionIcon action="delete" label={`Archive ${course.name}`} onClick={() => archive(course)} />}
              {!course.isActive && <span className="muted">Archived</span>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function Admin() {
  const [token, setToken] = useState(localStorage.getItem(ADMIN_TOKEN));
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem(ADMIN_USER) || "null"),
  );
  const [feedback, setFeedback] = useState("");
  const [section, setSection] = useState(sectionFromPath);
  const [applications, setApplications] = useState([]);
  const [applicationPage, setApplicationPage] = useState(1);
  const [applicationPages, setApplicationPages] = useState(1);
  const [applicationTotal, setApplicationTotal] = useState(0);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [enquiries, setEnquiries] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [timelineSelected, setTimelineSelected] = useState(null);
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userSearch, setUserSearch] = useState("");
  const [userStatus, setUserStatus] = useState("all");
  const [editingStudent, setEditingStudent] = useState(null);
  const [exportingStudents, setExportingStudents] = useState(false);
  const [coursePage, setCoursePage] = useState(1);
  const [coursePages, setCoursePages] = useState(1);
  const [courseTotal, setCourseTotal] = useState(0);
  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatus, setCourseStatus] = useState("all");
  const permissions = user?.role === "superadmin" ? ["courses.view", "courses.create", "courses.edit", "courses.delete", "students.view", "students.edit", "staff.manage", "applications.view", "enquiries.view", "enquiries.update"] : (user?.permissions || []);
  const canApprove = permissions.some((permission) => approvalPermissions.includes(permission));
  const menus = [["dashboard", "Dashboard", true], ["applications", canApprove ? "Approval Inbox" : "Applications", permissions.includes("applications.view") || canApprove], ["enquiries", "Enquiries", permissions.includes("enquiries.view")], ["courses", "Courses", permissions.includes("courses.view") || permissions.includes("courses.create")], ["users", "Students", permissions.includes("students.view") || permissions.includes("students.edit")], ["roles", "Roles & Permissions", permissions.includes("staff.manage")], ["staff", "Staff", permissions.includes("staff.manage")]].filter((item) => item[2]);
  function navigateSection(key) {
    setFeedback("");
    setSection(key);
    const nextPath = key === "dashboard" ? "/admin" : `/admin/${key}`;
    if (window.location.pathname !== nextPath) window.history.pushState({}, "", nextPath);
  }
  async function loadCourses(targetPage = coursePage) {
    if (!permissions.includes("courses.view")) return;
    try {
      const query = new URLSearchParams({ page: String(targetPage), limit: "10", search: courseSearch, status: courseStatus });
      const result = await api(`/courses/manage/list?${query}`, {}, true);
      setCourses(result.items); setCoursePage(result.page); setCoursePages(result.pages || 1); setCourseTotal(result.total);
    } catch (error) { setFeedback(error.message); }
  }
  async function loadApplications(targetPage = applicationPage, query = applicationSearch) {
    if (!permissions.includes("applications.view")) return;
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "10", q: query });
      const result = await api(`/applications?${params}`, {}, true);
      setApplications(result.items); setApplicationPage(result.page); setApplicationPages(result.pages || 1); setApplicationTotal(result.total);
    } catch (error) { setFeedback(error.message); }
  }
  async function loadUsers(targetPage = userPage, query = userSearch, status = userStatus) {
    if (!permissions.includes("students.view") && !permissions.includes("students.edit")) return;
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "10", q: query, status });
      const result = await api(`/admin/students?${params}`, {}, true);
      setUsers(result.items); setUserTotal(result.total); setUserPage(result.page); setUserPages(result.pages || 1);
    } catch (error) { setFeedback(error.message); }
  }
  async function updateStudent(student, changes) {
    try {
      await api(`/admin/students/${student._id}`, { method: "PATCH", body: JSON.stringify(changes) }, true);
      setFeedback("Student record updated."); await loadUsers();
    } catch (error) { setFeedback(error.message); throw error; }
  }
  async function updateStudentStatus(student, enrollmentStatus) { await updateStudent(student, { enrollmentStatus }); }
  async function exportStudents() {
    setExportingStudents(true);
    try {
      const params = new URLSearchParams({ q: userSearch, status: userStatus });
      const { items } = await api(`/admin/students/export?${params}`, {}, true);
      const columns = ["Admission date", "Application number", "Student name", "Email", "Phone", "Address", "PIN code", "City", "State", "Course", "Enrollment status"];
      const rows = items.map((student) => [new Date(student.admittedAt || student.createdAt).toLocaleDateString("en-IN"), student.applicationNumber, student.name, student.email, student.phone, student.personalDetails?.address, student.personalDetails?.pinCode, student.personalDetails?.city, student.personalDetails?.state, student.course?.name, student.enrollmentStatus || "in_process"]);
      const csv = `\uFEFF${[columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url; link.download = `students-${new Date().toISOString().slice(0, 10)}.csv`; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setFeedback(error.message); }
    finally { setExportingStudents(false); }
  }
  async function login(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const session = await api("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      localStorage.setItem(ADMIN_TOKEN, session.token);
      localStorage.setItem(ADMIN_USER, JSON.stringify(session.user));
      setToken(session.token);
      setUser(session.user);
      setFeedback("");
    } catch (error) {
      setFeedback(error.message);
    }
  }
  async function load() {
    try {
      const values = await Promise.all([
        permissions.includes("enquiries.view") ? api("/enquiries?limit=50", {}, true) : null,
      ]);
      const [enquiryPage] = values;
      if (enquiryPage) setEnquiries(enquiryPage.items);
    } catch (error) {
      setFeedback(error.message);
    }
  }
  useEffect(() => {
    if (token) load();
  }, [token]);
  useEffect(() => { if (token) loadApplications(1, applicationSearch); }, [token, applicationSearch]);
  useEffect(() => { if (token) loadApplications(applicationPage, applicationSearch); }, [applicationPage]);
  useEffect(() => { if (token) loadUsers(1, userSearch, userStatus); }, [token, userSearch, userStatus]);
  useEffect(() => { if (token) loadUsers(userPage, userSearch, userStatus); }, [userPage]);
  useEffect(() => {
    const syncRoute = () => setSection(sectionFromPath());
    window.addEventListener("popstate", syncRoute);
    return () => window.removeEventListener("popstate", syncRoute);
  }, []);
  useEffect(() => { if (token && section === "courses") loadCourses(1); }, [token, section, courseStatus]);
  async function updateEnquiry(item, state) {
    try {
      await api(
        `/enquiries/${item._id}/state`,
        { method: "PATCH", body: JSON.stringify({ state }) },
        true,
      );
      await load();
    } catch (error) {
      setFeedback(error.message);
    }
  }
  function logout() {
    localStorage.removeItem(ADMIN_TOKEN);
    localStorage.removeItem(ADMIN_USER);
    setToken(null);
    setUser(null);
  }
  if (!token)
    return (
      <main className="admin-login">
        <Brand admin />
        <section className="login-card">
          <div className="eyebrow">STAFF ACCESS</div>
          <h1>
            Good to have
            <br />
            <em>you back.</em>
          </h1>
          <p>Sign in to manage admissions, courses, and enquiries.</p>
          <form onSubmit={login}>
            <label>
              Admin email
              <input
                name="email"
                type="email"
                required
                placeholder="admin@college.edu"
              />
            </label>
            <label>
              Password
              <input name="password" type="password" required />
            </label>
            <button className="button dark">Sign in â†—</button>
            <p className="feedback">{feedback}</p>
          </form>
        </section>
      </main>
    );
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Brand admin />
        <div className="eyebrow">WORKSPACE</div>
        {menus.map(([key, label]) => (
          <button
            key={key}
            className={section === key ? "selected" : ""}
            onClick={() => navigateSection(key)}
          >
            {label}
          </button>
        ))}
        <button className="logout" onClick={logout}>
          Sign out
        </button>
      </aside>
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <small>NORTHFIELD COLLEGE</small>
            <strong>{section === "applications" && canApprove ? "Approval Inbox" : section === "users" ? "Students" : section[0].toUpperCase() + section.slice(1)}</strong>
          </div>
          <span>{user?.name || "Administrator"}</span>
        </header>
        <section className="admin-content">
          <div className="section-title">
            <div>
              <div className="eyebrow">{section === "courses" ? "COURSE CATALOGUE" : section === "applications" && canApprove ? "APPROVAL WORKFLOW" : section === "roles" ? "ACCESS CONTROL" : section === "staff" ? "STAFF MANAGEMENT" : "STUDENT RECORDS"}</div>
              <h1>
                {section === "dashboard"
                  ? "Dashboard"
                  : section === "applications"
                    ? canApprove ? "Approval Inbox" : "Applications"
                    : section === "enquiries"
                      ? "Enquiries"
                      : section === "courses" ? "Courses" : section === "users" ? "Students" : section === "roles" ? "Roles & Permissions" : "Staff"}
              </h1>
              <p>{section === "courses" ? "Create and manage the courses available to applicants." : section === "applications" && canApprove ? "Review applications at your assigned stage. Each decision needs a remark." : "Manage student information and admission progress."}</p>
            </div>
            <button className="button outline" onClick={() => { setFeedback(""); section === "courses" ? loadCourses(1) : section === "applications" ? loadApplications(applicationPage) : section === "users" ? loadUsers(userPage) : load(); }}>
              Refresh
            </button>
          </div>
          {feedback && <p className="notice">{feedback}</p>}
          {section === "dashboard" && (
            <div className="admin-stats">
              {[
                ["Applications", applications.length],
                [
                  "Needs review",
                  applications.filter((item) =>
                    ["Submitted", "Under Review"].includes(item.status),
                  ).length,
                ],
                ["Enquiries", enquiries.length],
                ["Active courses", courses.length],
              ].map(([label, count]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{count}</strong>
                </article>
              ))}
            </div>
          )}
          {section === "applications" && canApprove && <ApprovalInbox setFeedback={setFeedback} />}
          {section === "applications" && !canApprove && permissions.includes("applications.view") && (
            <>
            <div className="admin-list-tools"><input aria-label="Search applications by student or course" placeholder="Search by student or course" value={applicationSearch} onChange={(event) => { setApplicationSearch(event.target.value); setApplicationPage(1); }} /><span>{applicationTotal} applications</span></div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Application</th>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Submitted</th>
                    <th>Status</th>
                    <th>Approval stage</th>
                    <th>Details</th>
                    <th>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((item) => (
                    <tr key={item._id}>
                      <td>{item.applicationNumber}</td>
                      <td>
                        <strong>
                          {item.applicant?.name || item.student?.name || item.personalDetails?.name}
                        </strong>
                        <small>{item.applicant?.email || item.student?.email}</small>
                      </td>
                      <td>{item.course?.name}</td>
                      <td>
                        {new Date(item.submittedAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        <span className="status-pill">{item.status}</span>
                      </td>
                      <td>
                        <span>{item.approvalStage ? item.approvalStage.replaceAll("_", " ") : "Legacy review"}</span>
                      </td>
                      <td>
                        <ActionIcon action="view" label={`View ${item.applicationNumber}`} onClick={() => setSelected(item)} />
                      </td>
                      <td>
                        <button className="timeline-button" title="View approval timeline" aria-label={`View timeline for ${item.applicationNumber}`} onClick={() => setTimelineSelected(item)}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!applications.length && (
                <p className="muted">No applications yet.</p>
              )}
            </div>
            <div className="admin-pagination"><span>Page {applicationPage} of {applicationPages}</span><div><button className="small-button" disabled={applicationPage <= 1} onClick={() => setApplicationPage((page) => page - 1)}>Previous</button><button className="small-button" disabled={applicationPage >= applicationPages} onClick={() => setApplicationPage((page) => page + 1)}>Next</button></div></div>
            </>
          )}
          {section === "enquiries" && (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Name and contact</th>
                    <th>Course</th>
                    <th>Message</th>
                    <th>Received</th>
                    <th>Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {enquiries.map((item) => (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>
                          <a href={`mailto:${item.email}`}>{item.email}</a> Â·{" "}
                          <a href={`tel:${item.phone}`}>{item.phone}</a>
                        </small>
                      </td>
                      <td>{item.course}</td>
                      <td>{item.message || "â€”"}</td>
                      <td>
                        {new Date(item.createdAt).toLocaleDateString("en-IN")}
                      </td>
                      <td>
                        <select
                          value={item.state}
                          onChange={(event) =>
                            updateEnquiry(item, event.target.value)
                          }
                          disabled={!permissions.includes("enquiries.update")}
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {section === "courses" && <CourseManagement courses={courses} coursePage={coursePage} coursePages={coursePages} courseTotal={courseTotal} search={courseSearch} setSearch={setCourseSearch} statusFilter={courseStatus} setStatusFilter={setCourseStatus} page={coursePage} setPage={setCoursePage} loadCourses={loadCourses} permissions={permissions} setFeedback={setFeedback} />}
          {section === "users" && <>
            <div className="admin-list-tools student-tools">
              <input aria-label="Search students by name or course" placeholder="Search by student name or course" value={userSearch} onChange={(event) => { setUserSearch(event.target.value); setUserPage(1); }} />
              <div className="student-status-tools"><select aria-label="Filter students by status" value={userStatus} onChange={(event) => { setUserStatus(event.target.value); setUserPage(1); }}><option value="all">All statuses</option><option value="in_process">In process</option><option value="completed">Completed</option><option value="left">Left</option></select><details className="student-row-menu student-export-menu"><summary aria-label="Student export options" title="More options"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="16" cy="10" r="1.5" /></svg></summary><div className="student-row-menu-panel"><button disabled={exportingStudents} onClick={(event) => { event.currentTarget.closest("details").open = false; exportStudents(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" /></svg>{exportingStudents ? "Preparing download…" : "Download student records"}</button></div></details></div>
              <span>{userTotal} students</span>
            </div>
            <div className="table-scroll student-table"><table><thead><tr><th>Student</th><th>Email</th><th>Phone</th><th>City</th><th>State</th><th>Course</th><th>Status</th><th>Admission date</th><th>Actions</th></tr></thead><tbody>{users.map((student) => <tr key={student._id}><td><strong>{student.name}</strong><small>{student.applicationNumber || ""}</small></td><td>{student.email}</td><td>{student.phone}</td><td>{student.personalDetails?.city || "—"}</td><td>{student.personalDetails?.state || "—"}</td><td>{student.course?.name || "—"}</td><td><select aria-label={`Status for ${student.name}`} className="student-status-select" value={student.enrollmentStatus || "in_process"} disabled={!permissions.includes("students.edit")} onChange={(event) => updateStudentStatus(student, event.target.value).catch(() => {})}><option value="in_process">In process</option><option value="completed">Completed</option><option value="left">Left</option></select></td><td>{new Date(student.admittedAt || student.createdAt).toLocaleDateString("en-IN")}</td><td>{permissions.includes("students.edit") && <ActionIcon action="edit" label={`Edit ${student.name}`} onClick={() => setEditingStudent(student)} />}</td></tr>)}</tbody></table>{!users.length && <p className="muted">No students found.</p>}</div>
            <div className="admin-pagination"><span>Page {userPage} of {userPages}</span><div><button className="small-button" disabled={userPage <= 1} onClick={() => setUserPage((page) => page - 1)}>Previous</button><button className="small-button" disabled={userPage >= userPages} onClick={() => setUserPage((page) => page + 1)}>Next</button></div></div>
          </>}
          {section === "roles" && <RolePermissionsPanel setFeedback={setFeedback} />}
          {section === "staff" && <StaffPanel setFeedback={setFeedback} />}
        </section>
        {selected && (
          <div className="modal-backdrop" onClick={() => setSelected(null)}>
            <section
              className="detail-modal"
              onClick={(event) => event.stopPropagation()}
            >
              <button className="modal-close" onClick={() => setSelected(null)}>
                Ã—
              </button>
              <div className="eyebrow">STUDENT APPLICATION</div>
              <h2>{selected.personalDetails?.name}</h2>
              <div className="contact-actions">
                <a
                  className="button dark"
                  href={`tel:${selected.student?.phone || ""}`}
                >
                  Call {selected.student?.phone || "student"}
                </a>
                <a
                  className="button outline"
                  href={`mailto:${selected.student?.email || ""}`}
                >
                  Email student
                </a>
              </div>
              <dl>
                {[
                  ["Mobile number", selected.student?.phone],
                  ["Email address", selected.student?.email],
                  [
                    "Date of birth",
                    selected.personalDetails?.dateOfBirth &&
                      new Date(
                        selected.personalDetails.dateOfBirth,
                      ).toLocaleDateString("en-IN"),
                  ],
                  ["Address", selected.personalDetails?.address],
                  ["Course", selected.course?.name],
                  ["Qualification", selected.academicDetails?.qualification],
                  ["Passing year", selected.academicDetails?.passingYear],
                  ["Application number", selected.applicationNumber],
                  ["Status", selected.status],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value || "â€”"}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        )}
        <ApplicationTimeline application={timelineSelected} onClose={() => setTimelineSelected(null)} />
        {editingStudent && <StudentEditModal student={editingStudent} onClose={() => setEditingStudent(null)} onSave={updateStudent} />}
      </main>
    </div>
  );
}

export default Admin;


