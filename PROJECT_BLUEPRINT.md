# Online Admission Processing System — Project Blueprint

> College name and institution-specific details are placeholders until confirmed.

## 1. Project overview

**Project title:** Online Admission Processing System (OAPS)

**Purpose:** Provide a single online portal where prospective students can explore courses, submit admission enquiries, apply for a course, upload supporting documents, and track application progress. College staff can review and manage applications through an admin area.

**Primary users:** Prospective students and admission administrators.

## 2. Objectives

- Make course and admission information available online.
- Reduce manual enquiry and application handling.
- Keep student, application, and enquiry information organized.
- Give each submitted application a trackable reference number.
- Let administrators review applications and record decisions.
- Give students a clear view of their application status.

## 3. Scope and assumptions

This is a college minor project and demonstration system. Course names, fee amounts, eligibility criteria, contact information, and branding will be configured for the selected college. Payment processing, SMS/email delivery, and integrations with official college systems are outside the initial scope unless specifically required.

## 4. Roles and permissions

### Student / applicant

- View public college, course, eligibility, fee, and admission-process information.
- Register, sign in, and manage basic profile details.
- Submit an enquiry.
- Create and submit an application with academic and personal details.
- Upload required documents.
- View their own application and status history.

### Administrator

- Sign in to a protected admin area.
- View dashboard totals and recent activity.
- Create, edit, activate, or archive course listings.
- View and search applications and enquiries.
- Review application details and documents.
- Change application status and add an internal review note.
- View student records needed for admission processing.

## 5. Functional requirements

1. Public pages show college information, courses, admission steps, eligibility, fees, and contact details.
2. Enquiry form validates required fields and stores a submitted enquiry.
3. Student registration validates input and stores a student account with a securely hashed password.
4. A signed-in student can submit an application for an available course.
5. The system generates a unique application reference after successful submission.
6. The application supports document uploads with file type and size checks.
7. Students can see only their own applications and current status.
8. Administrators can search, inspect, and update application records.
9. Status changes are recorded with a timestamp and the administrator who made the change.
10. Admin routes and student-specific data require authentication and authorization.

## 6. Quality requirements

- Responsive layout for mobile, tablet, and desktop.
- Clear navigation, readable forms, helpful validation, and accessible labels.
- Passwords are hashed; secrets are kept in environment variables.
- Server-side validation is applied even when browser validation exists.
- Errors are handled without exposing passwords, tokens, or internal stack traces.
- Uploaded files are restricted by type and size and are not executable.

## 7. Main modules

### Student-facing modules

- Public information and course catalogue
- Enquiry submission
- Student registration and login
- Student profile
- Admission application and document upload
- Application tracking

### Administration modules

- Admin authentication
- Overview dashboard
- Course management
- Application review and status management
- Enquiry management
- Student lookup
- Basic reports and counts

## 8. Page inventory

### Public

- Home
- About the college
- Courses catalogue
- Course detail
- Admission process and eligibility
- Contact
- Enquiry form

### Student

- Register
- Login
- Student dashboard / profile
- New application
- My applications / application detail

### Admin

- Admin login
- Dashboard
- Courses
- Applications / application detail
- Enquiries
- Students

## 9. Application lifecycle

`Draft → Submitted → Under Review → Approved / Rejected`

An approved application may optionally progress to `Admission Confirmed`. Status transitions should be made by an administrator and recorded in a status history. A student can view the status and relevant public-facing notes, but not internal review notes.

## 10. Initial data model

MongoDB collections (or equivalent relational tables):

### `students`

- `name`
- `email` (unique)
- `phone`
- `passwordHash`
- `address` (optional)
- `createdAt`, `updatedAt`

### `courses`

- `name`, `code`
- `description`
- `duration`
- `eligibility`
- `annualFee`
- `availableSeats` (optional)
- `isActive`
- `createdAt`, `updatedAt`

### `applications`

- `applicationNumber` (unique)
- `studentId`
- `courseId`
- `personalDetails` (date of birth, gender, parent/guardian names, address)
- `academicDetails` (qualification, board, passing year, marks/percentage)
- `documents` (document type, stored path/key, original name, upload time)
- `status`
- `reviewNote` (admin-only)
- `statusHistory` (status, changedBy, timestamp, optional public note)
- `submittedAt`, `createdAt`, `updatedAt`

### `enquiries`

- `name`, `email`, `phone`
- `courseId` (optional)
- `qualification` (optional)
- `message`
- `state` (new, contacted, closed)
- `createdAt`

### `admins`

- `name`
- `email` (unique)
- `passwordHash`
- `role`
- `createdAt`, `updatedAt`

Documents can initially be stored in a local, non-public uploads directory for a classroom demo. A production deployment would need managed private storage and a retention policy.

## 11. Recommended technology stack

- **Frontend:** HTML, CSS, JavaScript; responsive CSS or Bootstrap if useful.
- **Backend:** Node.js and Express.js.
- **Database:** MongoDB with Mongoose.
- **Authentication:** Server-managed sessions or signed tokens, with role checks; password hashing with bcrypt.
- **Uploads:** Multer with strict file limits and type validation.
- **Development tools:** VS Code, Git, MongoDB local instance or Atlas.

This keeps the stack aligned with the proposed JavaScript learning path. We can adjust it if the college mandates another language or database.

## 12. Suggested folder structure

```text
admission-processing-system/
├── client/
│   ├── assets/
│   ├── css/
│   ├── js/
│   └── pages/
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   └── app.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## 13. Delivery phases

1. Confirm college details, required features, and college submission constraints.
2. Sketch the page flow and establish the visual design.
3. Build responsive public pages and reusable components.
4. Add browser-side interactions and form validation.
5. Build Express routes and connect the database.
6. Add student/admin authentication and role-protected pages.
7. Implement applications, uploads, status tracking, and admin review.
8. Manually verify the main flows and fix issues.
9. Prepare setup instructions, project report, diagrams, presentation, and viva notes.

## 14. Acceptance criteria for the first complete version

- A visitor can browse courses and submit an enquiry.
- A student can register, sign in, and submit an application for an active course.
- A successful application receives a unique reference number.
- The student can sign in later and see the application status.
- An administrator can find the application and record an allowed status change.
- Invalid form input and disallowed uploads receive understandable errors.
- Core pages work at mobile and desktop widths.

## 15. Future scope

- Email/SMS notifications
- Online fee payment and receipts
- Seat availability and application deadlines
- Downloadable application acknowledgement
- Advanced reports and exports
- Multiple colleges or admission sessions
- Audit logs, backup, and deployment hardening

## Details to confirm before implementation

- Official college name, logo, address, and contact details
- Actual course list, duration, eligibility, and fees
- Required document list and allowed file types
- Whether students may submit more than one application
- Any college-mandated language, framework, database, or report format
