import { useEffect, useState } from "react";
import { api, STUDENT_TOKEN, STUDENT_USER } from "../utils/api";
import { SiteShell } from "../components/SiteLayout";

const approvalLabels = { reviewer: "Reviewer", department_head: "Department Head", principal: "Principal", director: "Director", complete: "Admission confirmed", rejected: "Rejected" };

export default function Portal() {
  const [applications, setApplications] = useState([]);
  const [feedback, setFeedback] = useState("");
  const user = JSON.parse(localStorage.getItem(STUDENT_USER) || "null");
  useEffect(() => {
    if (localStorage.getItem(STUDENT_TOKEN))
      api("/applications/mine")
        .then(setApplications)
        .catch((error) => setFeedback(error.message));
  }, []);
  function signOut() {
    localStorage.removeItem(STUDENT_TOKEN);
    localStorage.removeItem(STUDENT_USER);
    location.href = "/";
  }
  return (
    <SiteShell>
      <main className="inner-hero">
        <div className="eyebrow">STUDENT PORTAL</div>
        <h1>
          Welcome{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.<br />
          <em>Keep moving.</em>
        </h1>
        {user ? (
          <>
            <button className="text-link signout" onClick={signOut}>
              Sign out
            </button>
            <h2 className="subheading">Your applications</h2>
            {applications.length ? (
              <div className="application-list">
                {applications.map((item) => (
                  <article key={item._id}>
                    <div>
                      <small>{item.applicationNumber}</small>
                      <h3>{item.course?.name}</h3>
                      <p>
                        Submitted{" "}
                        {new Date(item.submittedAt).toLocaleDateString("en-IN")}
                      </p>
                      {item.slotBookedAt ? (
                        <p className="portal-stage">
                          ₹5,000 booking fee paid · slot booked{" "}
                          {new Date(item.slotBookedAt).toLocaleDateString("en-IN")}
                        </p>
                      ) : item.payment?.status === "created" ? (
                        <p className="portal-stage">Registration payment is pending.</p>
                      ) : null}
                    </div>
                    <span className="status-pill">{item.status}</span>
                    {item.approvalStage && !["complete", "rejected"].includes(item.approvalStage) && <small className="portal-stage">Waiting for {approvalLabels[item.approvalStage] || item.approvalStage}</small>}
                  </article>
                ))}
              </div>
            ) : (
              <p>{feedback || "No applications yet."}</p>
            )}
            <a className="button dark" href="/apply">
              Start an application ↗
            </a>
          </>
        ) : (
          <>
            <p>Sign in to view your applications and track their progress.</p>
            <a className="button dark" href="/account">
              Sign in ↗
            </a>
          </>
        )}
      </main>
    </SiteShell>
  );
}
