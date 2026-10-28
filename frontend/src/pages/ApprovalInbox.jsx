import { useEffect, useState } from "react";
import { api } from "../utils/api";
import ActionIcon from "../components/ActionIcon";

const labels = { reviewer: "Reviewer", department_head: "Department Head", principal: "Principal", director: "Director", enrollment_pending: "Finalizing enrollment" };

export default function ApprovalInbox({ setFeedback }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  async function load(targetPage = page) {
    try {
      const result = await api(`/applications/inbox?page=${targetPage}&limit=20`, {}, true);
      setItems(result.items); setPage(result.page); setPages(result.pages || 1); setTotal(result.total);
    } catch (error) { setFeedback(error.message); }
  }
  useEffect(() => { load(1); }, []);
  async function decide(decision) {
    if (!selected || remark.trim().length < 2) return;
    setSaving(true);
    try {
      await api(`/applications/${selected._id}/decision`, { method: "PATCH", body: JSON.stringify({ decision, note: remark.trim() }) }, true);
      setSelected(null); setRemark(""); setFeedback(decision === "reject" ? "Application rejected with your remark." : ["director", "enrollment_pending"].includes(selected.approvalStage) ? "Admission confirmed and student record created." : "Approved. Application moved to the next approver.");
      await load();
    } catch (error) { setFeedback(error.message); }
    finally { setSaving(false); }
  }
  return <>
    <div className="approval-heading"><div><h2>Approval inbox</h2><p>Applications appear here only when they reach one of your approval stages.</p></div><span>{total} pending</span></div>
    <div className="table-scroll"><table className="approval-table"><thead><tr><th>Application</th><th>Applicant</th><th>Course</th><th>Current approval</th><th>Submitted</th><th>Review</th></tr></thead><tbody>{items.map((item) => <tr key={item._id}><td><strong>{item.applicationNumber}</strong></td><td><strong>{item.applicant?.name || item.student?.name || item.personalDetails?.name}</strong><small>{item.applicant?.email || item.student?.email || ""}</small></td><td>{item.course?.name || "—"}</td><td><span className="status-pill">{labels[item.approvalStage] || item.approvalStage}</span></td><td>{new Date(item.submittedAt).toLocaleDateString("en-IN")}</td><td><ActionIcon action="view" label={`Review ${item.applicationNumber}`} onClick={() => { setSelected(item); setRemark(item.approvalStage === "enrollment_pending" ? item.approvalHistory?.find((entry) => entry.stage === "director")?.note || "Director confirmation" : ""); }} /></td></tr>)}</tbody></table>{!items.length && <p className="empty-state">No applications are waiting for your approval.</p>}</div>
    <div className="pagination"><span>{total ? `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total}` : "Inbox is clear"}</span><div><button className="small-button" disabled={page <= 1} onClick={() => load(page - 1)}>Previous</button><span>Page {page} of {Math.max(pages, 1)}</span><button className="small-button" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button></div></div>
    {selected && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="detail-modal approval-modal" role="dialog" aria-modal="true" aria-labelledby="approval-title"><button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">×</button><div className="eyebrow">{labels[selected.approvalStage]} APPROVAL</div><h2 id="approval-title">{selected.personalDetails?.name || selected.applicant?.name}</h2><p className="approval-subtitle">{selected.applicationNumber} · {selected.course?.name}</p><dl className="approval-details">{[["Email", selected.applicant?.email || selected.student?.email], ["Phone", selected.applicant?.phone || selected.student?.phone], ["Date of birth", selected.personalDetails?.dateOfBirth && new Date(selected.personalDetails.dateOfBirth).toLocaleDateString("en-IN")], ["Address", selected.personalDetails?.address], ["Qualification", selected.academicDetails?.qualification], ["Passing year", selected.academicDetails?.passingYear]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl>
      <div className="approval-timeline">{["reviewer", "department_head", "principal", "director"].map((stage) => { const record = selected.approvalHistory?.find((entry) => entry.stage === stage); const isCurrent = selected.approvalStage === stage || (selected.approvalStage === "enrollment_pending" && stage === "director"); return <article className={record ? "done" : isCurrent ? "current" : ""} key={stage}><span className="timeline-mark">{record?.decision === "approved" ? "✓" : record?.decision === "rejected" ? "×" : isCurrent ? "•" : ""}</span><div><strong>{labels[stage]}</strong>{record && <p>{record.decision === "approved" ? "Approved" : "Rejected"} · {new Date(record.changedAt).toLocaleString("en-IN")}<br />{record.note}</p>}{isCurrent && <small>Your approval is required now</small>}</div></article>; })}</div>
      {selected.approvalStage === "enrollment_pending" && <p className="notice">Director approval is recorded. Retry to finish creating the student record.</p>}<label className="approval-remark">Remark (required)<textarea rows="4" maxLength="1000" value={remark} onChange={(event) => setRemark(event.target.value)} placeholder="Add the reason for your approval or rejection" /></label><div className="approval-actions">{selected.approvalStage !== "enrollment_pending" && <button className="button outline reject-action" disabled={saving || remark.trim().length < 2} onClick={() => decide("reject")}>Reject</button>}<button className="button dark" disabled={saving || remark.trim().length < 2} onClick={() => decide("approve")}>{saving ? "Saving…" : selected.approvalStage === "director" ? "Confirm admission" : selected.approvalStage === "enrollment_pending" ? "Retry final confirmation" : "Approve & send next"}</button></div>
    </section></div>}
  </>;
}
