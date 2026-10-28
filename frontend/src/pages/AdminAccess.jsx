import { useEffect, useState } from "react";
import { api } from "../utils/api";
import ActionIcon from "../components/ActionIcon";

const permissionLabels = {
  "students.view": "View students",
  "students.edit": "Edit students and enrollment status",
  "applications.approve.reviewer": "Reviewer approval",
  "applications.approve.department_head": "Department Head approval",
  "applications.approve.principal": "Principal approval",
  "applications.approve.director": "Director confirmation",
};
const approvalPrefix = "applications.approve.";

function RolePermissionsPanel({ setFeedback }) {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [draft, setDraft] = useState({ name: "", permissions: [] });
  const [editing, setEditing] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  async function load() {
    try { const data = await api("/admin/roles", {}, true); setRoles(data.roles); setCatalog(data.permissions); }
    catch (error) { setFeedback(error.message); }
  }
  useEffect(() => { load(); }, []);
  function start(role = null) {
    setOpenModal(true);
    setEditing(role?._id || null);
    setDraft(role ? { name: role.name, permissions: role.permissions } : { name: "", permissions: [] });
  }
  async function save(event) {
    event.preventDefault();
    try {
      await api(editing ? `/admin/roles/${editing}` : "/admin/roles", { method: editing ? "PATCH" : "POST", body: JSON.stringify(draft) }, true);
      setFeedback(editing ? "Role updated." : "Role created."); setOpenModal(false); await load();
    } catch (error) { setFeedback(error.message); }
  }
  async function remove(role) {
    if (!window.confirm(`Delete the ${role.name} role?`)) return;
    try { await api(`/admin/roles/${role._id}`, { method: "DELETE" }, true); setFeedback("Role deleted."); await load(); }
    catch (error) { setFeedback(error.message); }
  }
  return <>
    <div className="section-title access-heading"><div><h2>Roles &amp; Permissions</h2><p>Create roles and choose what each staff role can access.</p></div><button className="button dark" onClick={() => start()}>+ Create role</button></div>
    <div className="table-scroll"><table className="access-table"><thead><tr><th>Role</th><th>Permissions</th><th>Actions</th></tr></thead><tbody>{roles.map((role) => <tr key={role._id}><td><strong>{role.name}</strong></td><td><div className="role-permission-list">{role.permissions.length ? role.permissions.map((permission) => <span key={permission}>{permissionLabels[permission] || permission}</span>) : <span>No permissions assigned</span>}</div></td><td className="course-row-actions"><ActionIcon action="edit" label={`Edit ${role.name}`} onClick={() => start(role)} /><ActionIcon action="delete" label={`Delete ${role.name}`} onClick={() => remove(role)} /></td></tr>)}</tbody></table>{!roles.length && <p className="empty-state">No roles created yet.</p>}</div>
    {openModal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpenModal(false); }}><section className="detail-modal access-modal" role="dialog" aria-modal="true" aria-labelledby="role-title"><button className="modal-close" onClick={() => setOpenModal(false)} aria-label="Close">×</button><div className="eyebrow">ACCESS CONTROL</div><h2 id="role-title">{editing ? "Edit role" : "Create role"}</h2><form onSubmit={save}><label className="access-name">Role name<input required maxLength="60" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><h3>Permissions</h3><p className="muted">Each approver role can approve one stage only.</p><div className="permission-grid">{catalog.map((permission) => <label key={permission}><input type="checkbox" checked={draft.permissions.includes(permission)} onChange={(event) => { const next = event.target.checked ? (permission.startsWith(approvalPrefix) ? [...draft.permissions.filter((item) => !item.startsWith(approvalPrefix)), permission] : [...draft.permissions, permission]) : draft.permissions.filter((item) => item !== permission); setDraft({ ...draft, permissions: next }); }} />{permissionLabels[permission] || permission}</label>)}</div><div className="editor-actions"><button type="button" className="button outline" onClick={() => setOpenModal(false)}>Cancel</button><button className="button dark">{editing ? "Save role" : "Create role"}</button></div></form></section></div>}
  </>;
}

function StaffPanel({ setFeedback }) {
  const [staff, setStaff] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modal, setModal] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  async function load(targetPage = page) {
    try {
      const params = new URLSearchParams({ page: String(targetPage), limit: "10", q: query, status });
      const data = await api(`/admin/staff?${params}`, {}, true);
      setStaff(data.staff); setRoles(data.roles); setTotal(data.total); setPage(data.page); setPages(data.pages || 1);
    } catch (error) { setFeedback(error.message); }
  }
  useEffect(() => { load(1); }, [query, status]);
  function open(mode, member = {}) {
    setDraft({ name: "", email: "", roleId: "", password: "", ...member }); setModal(mode);
  }
  async function save(event) {
    event.preventDefault(); setSaving(true);
    const editing = modal === "edit";
    try {
      await api(editing ? `/admin/staff/${draft._id}` : "/admin/staff", { method: editing ? "PATCH" : "POST", body: JSON.stringify(draft) }, true);
      setModal(null); setFeedback(editing ? "Staff member updated." : "Staff account created."); await load();
    } catch (error) { setFeedback(error.message); }
    finally { setSaving(false); }
  }
  async function toggle(member) {
    const role = roles.find((item) => item.name === member.roleName);
    if (!role) return setFeedback("This staff member's role was removed. Assign a valid role in Edit first.");
    try { await api(`/admin/staff/${member._id}`, { method: "PATCH", body: JSON.stringify({ name: member.name, email: member.email, roleId: role._id, isActive: !member.isActive }) }, true); await load(); }
    catch (error) { setFeedback(error.message); }
  }
  return <>
    <div className="section-title access-heading"><div><h2>Staff</h2><p>Manage staff accounts, assigned roles, and access status.</p></div><button className="button dark" onClick={() => open("create")}>+ Add staff</button></div>
    <form className="staff-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setQuery(search.trim()); }}><label>Search staff<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" /></label><label>Status<select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="all">All staff</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label><button className="button outline">Search</button></form>
    <div className="table-scroll"><table className="access-table"><thead><tr><th>Staff member</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>{staff.map((member) => <tr key={member._id}><td><strong>{member.name}</strong><small>Added {new Date(member.createdAt).toLocaleDateString("en-IN")}</small></td><td>{member.email}</td><td>{member.roleName}</td><td><button type="button" role="switch" aria-checked={member.isActive} onClick={() => toggle(member)} className={`switch ${member.isActive ? "on" : ""}`}><span />{member.isActive ? "Active" : "Inactive"}</button></td><td><ActionIcon action="edit" label={`Edit ${member.name}`} onClick={() => open("edit", { ...member, roleId: roles.find((role) => role.name === member.roleName)?._id || "" })} /></td></tr>)}</tbody></table>{!staff.length && <p className="empty-state">No staff members match these filters.</p>}</div>
    <div className="pagination"><span>{total ? `Showing ${(page - 1) * 10 + 1}–${Math.min(page * 10, total)} of ${total}` : "No staff members"}</span><div><button className="small-button" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button><span>Page {page} of {Math.max(pages, 1)}</span><button className="small-button" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button></div></div>
    {modal && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(null); }}><section className="detail-modal access-modal" role="dialog" aria-modal="true" aria-labelledby="staff-title"><button className="modal-close" onClick={() => setModal(null)} aria-label="Close">×</button><div className="eyebrow">STAFF MANAGEMENT</div><h2 id="staff-title">{modal === "create" ? "Add staff member" : "Edit staff member"}</h2><form onSubmit={save}><div className="editor-grid"><label>Name<input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label><label>Email<input type="email" required value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label>Role<select required value={draft.roleId} onChange={(event) => setDraft({ ...draft, roleId: event.target.value })}><option value="">Choose role</option>{roles.map((role) => <option key={role._id} value={role._id}>{role.name}</option>)}</select></label>{modal === "create" && <label>Password (12+ characters)<input type="password" minLength="12" required value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} /></label>}</div><div className="editor-actions"><button type="button" className="button outline" onClick={() => setModal(null)}>Cancel</button><button className="button dark" disabled={saving}>{saving ? "Saving…" : modal === "create" ? "Create staff account" : "Save changes"}</button></div></form></section></div>}
  </>;
}

export { RolePermissionsPanel, StaffPanel };
