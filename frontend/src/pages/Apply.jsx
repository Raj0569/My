import { useEffect, useState } from "react";
import { api, STUDENT_TOKEN, STUDENT_USER } from "../utils/api";
import { SiteShell } from "../components/SiteLayout";

const streams = ["Science (PCM)", "Science (PCB)", "Commerce", "Arts / Humanities", "Other"];

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Could not load the secure payment checkout. Please try again."));
    document.body.appendChild(script);
  });
}

export default function Apply() {
  const [courses, setCourses] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [done, setDone] = useState("");
  const [paying, setPaying] = useState(false);
  const user = JSON.parse(localStorage.getItem(STUDENT_USER) || "null");
  const courseId = new URLSearchParams(window.location.search).get("course") || "";
  const [selectedCourseId, setSelectedCourseId] = useState(courseId);
  const returnTo = `/apply?course=${encodeURIComponent(courseId)}&register=1`;
  const course = courses.find((item) => item._id === selectedCourseId);

  useEffect(() => {
    if (!localStorage.getItem(STUDENT_TOKEN)) {
      window.location.replace(`/account?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    api("/courses")
      .then(setCourses)
      .catch((error) => setFeedback(error.message));
  }, [returnTo]);

  async function submit(event) {
    event.preventDefault();
    setFeedback("");
    setPaying(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const order = await api("/applications/register-order", {
        method: "POST",
        body: JSON.stringify({
          courseId: values.courseId,
          termsAccepted: values.termsAccepted === "on",
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
            stream: values.stream,
            percentage: Number(values.percentage),
            subjects: values.subjects.split(",").map((subject) => subject.trim()).filter(Boolean),
            passingYear: Number(values.passingYear),
          },
        }),
      });

      await loadRazorpay();
      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Northfield College",
        description: `${order.courseName} slot booking fee`,
        order_id: order.orderId,
        prefill: { name: values.name, email: user?.email || "", contact: user?.phone || "" },
        theme: { color: "#365942" },
        handler: async (payment) => {
          try {
            const result = await api("/applications/verify-registration-payment", {
              method: "POST",
              body: JSON.stringify({
                orderId: payment.razorpay_order_id,
                paymentId: payment.razorpay_payment_id,
                signature: payment.razorpay_signature,
              }),
            });
            setDone(result.applicationNumber);
          } catch (error) {
            setFeedback(error.message);
          } finally {
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      checkout.on("payment.failed", (event) => {
        setFeedback(event.error?.description || "Payment was not completed. You can try again.");
        setPaying(false);
      });
      checkout.open();
    } catch (error) {
      setFeedback(error.message);
      setPaying(false);
    }
  }

  const qualifications = course?.eligibleQualifications?.length
    ? course.eligibleQualifications
    : ["Class 12 / Senior Secondary"];
  const courseStreams = course?.eligibleStreams?.length && !course.eligibleStreams.some((value) => value.toLocaleLowerCase() === "any stream")
    ? course.eligibleStreams
    : streams;

  return (
    <SiteShell>
      <main className="inner-hero">
        <div className="eyebrow">COURSE REGISTRATION · 2026–27</div>
        <h1>Book your <em>registration slot.</em></h1>
        <p>Tell us your academic details. We’ll check them against the course criteria before opening payment.</p>
        {done ? (
          <section className="success-card">
            <div className="eyebrow">PAYMENT VERIFIED · SLOT BOOKED</div>
            <h2>Your registration is <em>submitted.</em></h2>
            <p>Application number</p><strong>{done}</strong>
            <p>Your application is under college review. Keep this number to track its progress.</p>
            <a className="button dark" href="/portal">Go to student portal ↗</a>
          </section>
        ) : (
          <form className="form-card application-form" onSubmit={submit}>
            <h2>{course ? `Register for ${course.name}` : "Course registration"}</h2>
            {user && <p>Signed in as {user.name} · {user.email}</p>}
            {course && <div className="registration-criteria"><strong>Eligibility:</strong> {course.eligibilityDetails || course.eligibility}{course.minimumPercentage != null && <span> Minimum percentage: {course.minimumPercentage}%.</span>}{course.requiredSubjects?.length > 0 && <span> Required subjects: {course.requiredSubjects.join(", ")}.</span>}</div>}
            <label>Full name<input name="name" defaultValue={user?.name || ""} required minLength="2" /></label>
            <label>Date of birth<input name="dateOfBirth" type="date" required /></label>
            <label className="application-wide">Address<input name="address" required minLength="5" /></label>
            <label>PIN code<input name="pinCode" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" required title="Enter a 6-digit PIN code" /></label>
            <label>City<input name="city" required maxLength="100" /></label>
            <label>State<input name="state" required maxLength="100" /></label>
            <label>Qualification<select name="qualification" required defaultValue=""><option value="" disabled>Select qualification</option>{qualifications.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>12th stream<select name="stream" required defaultValue=""><option value="" disabled>Select your stream</option>{courseStreams.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>12th percentage<input name="percentage" type="number" min="0" max="100" step="0.01" required /></label>
            <label>Passing year<input name="passingYear" type="number" min="2000" max="2035" required /></label>
            <label className="application-wide">Subjects studied (comma-separated)<input name="subjects" placeholder="Physics, Chemistry, Mathematics" required={Boolean(course?.requiredSubjects?.length)} /></label>
          <label className="application-wide">Course<select name="courseId" required value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)}><option value="" disabled>Choose a course</option>{courses.map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
            <label className="application-wide registration-consent"><input name="termsAccepted" type="checkbox" required /> I confirm my details are accurate and understand the ₹5,000 booking fee is non-refundable. Payment books a registration slot; admission remains subject to college review.</label>
            <button className="button dark" disabled={paying || !course}>{paying ? "Opening secure checkout…" : "Check eligibility & pay ₹5,000"}</button>
            <p className="feedback">{feedback}</p>
          </form>
        )}
      </main>
    </SiteShell>
  );
}
