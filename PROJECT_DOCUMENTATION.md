# Northfield College Admission Management System

## 1. Project overview

Northfield is a web-based admission management system. Applicants can create an account, browse active courses, submit an admission application, and track its progress. Staff work in a protected admin workspace to manage courses, enquiries, student records, staff roles, and the staged admission review process.

An application is reviewed in order by **Reviewer → Department Head → Principal → Director**. Each decision requires a remark. A Student account and Student record are created only after the Director confirms the application and the application reaches **Admission Confirmed**.

This repository is a project/demo implementation. College branding and course catalogue content are sample content.

## 2. Technology stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 6, JavaScript, CSS |
| Backend | Node.js, Express 4 |
| Database | MongoDB with Mongoose 8 |
| Authentication | JWT bearer tokens, bcrypt password hashing |

The Vite development server proxies `/api` requests to `http://localhost:5000`. In production, the Express application can serve the built `frontend/dist` directory.

## 3. Main features

### Public and applicant experience

- Public home, course catalogue, college information, admissions information, and enquiry form.
- Applicant registration and sign-in.
- Admission application form with personal, address, academic, and course details.
- Applicant portal to view submitted applications and their status.
- PIN code is validated as a six-digit value for new applications.

### Staff workspace

- Dashboard and permission-filtered navigation.
- Course listing with search, status filter, pagination, create, view, edit, active/inactive status, and archive actions.
- Enquiry listing and follow-up status changes.
- Applications listing with search, pagination, status, approval stage, details, and timeline.
- Approval inbox for staff members with the matching stage permission.
- Students listing with search by name/email or course, status filter, pagination, editable student details, and enrollment status.
- Student export through the three-dot menu beside the status filter. The export covers every record matching the current search and status filters, across all pages. It includes address and PIN code even though those fields are omitted from the table. The download is UTF-8 CSV and opens in Excel.
- Role and permission management, staff listing, staff role assignment, active/inactive staff status, and staff search/pagination.

## 4. Roles and permissions

There are two staff account types:

- **Super Admin**: full access to the admin workspace and role/staff management.
- **Staff**: access is controlled by permissions assigned through a named role.

Permission examples include:

- `courses.view`, `courses.create`, `courses.edit`, `courses.delete`
- `students.view`, `students.edit`
- `applications.view`
- `applications.approve.reviewer`
- `applications.approve.department_head`
- `applications.approve.principal`
- `applications.approve.director`
- `enquiries.view`, `enquiries.update`
- `staff.manage`

Each approver role should have one approval-stage permission. The server checks permissions on protected routes; hiding a menu item in the frontend is not the security boundary.

## 5. Admission workflow

1. A person registers as an **Applicant**. Registration does not create a Student record.
2. The Applicant submits an application for an active course.
3. The application enters the Reviewer inbox.
4. On approval, it moves to Department Head, then Principal, then Director. Only the current stage is actionable.
5. Approve and reject decisions require a remark. Rejection ends the workflow.
6. After Director approval, the server creates or links the Student account, sets the application to **Admission Confirmed**, and marks the workflow complete.
7. The Students admin list includes only Student records linked to a confirmed application.

Approval history stores the stage, decision, remark, timestamp, and staff account. The application timeline displays these records and indicates the current pending stage.

## 6. Data model summary

| Model | Purpose | Key data |
| --- | --- | --- |
| `Applicant` | Account for a person applying for admission | Name, email, phone, password hash |
| `Application` | Admission request and workflow history | Application number, applicant/student links, course, personal/address details, academic details, status, approval stage/history |
| `Student` | Enrolled student account | Name, email, phone, password hash, role, enrollment status, applicant link, admission date |
| `Course` | Course catalogue item | Name, code, category, description, duration, eligibility rules, course structure, learning outcomes, required documents, placement information, annual fee, active status |
| `Admin` | Super Admin or staff account | Name, email, password hash, role, role name, permissions, active status |
| `AdminRole` | Reusable staff role | Name and permission list |
| `Enquiry` | Public enquiry and staff follow-up | Contact details, course, message, state, reference |

Application address data includes address, PIN code, city, and state. Existing older records may not have the newer PIN/city/state fields; those values can be blank until updated.

Enrollment status on a Student record is separate from admission approval status. The available values are **In process**, **Completed**, and **Left**.

## 7. Local setup

### Requirements

- Node.js and npm
- MongoDB, local or hosted

### Backend

```powershell
cd backend
npm install
```

Copy `.env.example` to `.env` and set `MONGODB_URI`, a strong `JWT_SECRET`, a unique `ADMIN_BOOTSTRAP_PASSWORD` of at least 12 characters, and `CLIENT_ORIGIN`. Keep `.env` private and out of version control.

Seed the sample courses, create the database Super Admin, and start the API:

```powershell
npm run seed-courses
npm run create-admin
npm run dev
```

The API listens on port `5000` by default. The health endpoint is `GET /api/health`.

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`. Public pages are served at `/`, `/courses`, `/apply`, `/account`, and `/portal`; staff sign in at `/admin`.

For a production frontend build:

```powershell
cd frontend
npm run build
```

The bootstrap script creates the Super Admin `admin@northfield.local` using `ADMIN_BOOTSTRAP_PASSWORD` from `.env`; the script refuses passwords shorter than 12 characters.

## 8. Applicant migration

The backend command below creates the four stage roles if missing and moves legacy Student accounts without a confirmed enrollment into Applicant accounts. It retains Student accounts already linked to a confirmed application.

```powershell
cd backend
npm run migrate-applicants
```

This migration changes database records and deletes the legacy Student document when it is moved to Applicant. Back up the database and review the target database before running it on existing data.

## 9. API reference

All routes are under `/api`. Protected routes use:

```text
Authorization: Bearer <JWT>
```

### Authentication

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Register an Applicant |
| `POST` | `/api/auth/login` | Sign in as Applicant or Student |
| `POST` | `/api/auth/admin/login` | Sign in as staff or Super Admin |

### Courses and enquiries

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/courses` | List active courses |
| `GET` | `/api/courses/:id` | Read one active course |
| `GET` | `/api/courses/manage/list` | Search/filter/paginate courses (staff permission required) |
| `POST` | `/api/courses` | Create a course (`courses.create`) |
| `PATCH` | `/api/courses/:id` | Edit or change active status (`courses.edit`) |
| `DELETE` | `/api/courses/:id` | Archive a course (`courses.delete`) |
| `POST` | `/api/enquiries` | Submit a public enquiry |
| `GET` | `/api/enquiries` | List enquiries (`enquiries.view`) |
| `PATCH` | `/api/enquiries/:id/state` | Update follow-up state (`enquiries.update`) |

### Applications and approvals

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/applications/register-order` | Validate the Applicant against configured course rules and create a ₹5,000 Razorpay order |
| `POST` | `/api/applications/verify-registration-payment` | Verify signature and captured payment, book the slot, and submit the application |
| `POST` | `/api/applications` | Disabled legacy application endpoint; use the paid registration flow |
| `GET` | `/api/applications/mine` | List the signed-in Applicant/Student's applications |
| `GET` | `/api/applications/number/:applicationNumber` | Read an application the user owns (staff may view) |
| `GET` | `/api/applications/inbox` | List applications at the signed-in staff member's stage |
| `PATCH` | `/api/applications/:id/decision` | Approve/reject the current stage with a remark |
| `GET` | `/api/applications` | Search and paginate applications (`applications.view`) |

### Admin, Students, roles, and staff

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/admin/students` | Search/filter/paginate confirmed students |
| `GET` | `/api/admin/students/export` | Return all students matching search/status filters for export |
| `PATCH` | `/api/admin/students/:id` | Edit student/contact/address/status (`students.edit`) |
| `GET` | `/api/admin/roles` | List role and permission catalogue (`staff.manage`) |
| `POST` | `/api/admin/roles` | Create a role (`staff.manage`) |
| `PATCH` | `/api/admin/roles/:id` | Edit a role (`staff.manage`) |
| `DELETE` | `/api/admin/roles/:id` | Delete an unassigned role (`staff.manage`) |
| `GET` | `/api/admin/staff` | Search/filter/paginate staff (`staff.manage`) |
| `POST` | `/api/admin/staff` | Create a staff account (`staff.manage`) |
| `PATCH` | `/api/admin/staff/:id` | Edit staff details, role, or active status (`staff.manage`) |

## 10. Source layout

```text
backend/
  server/app.js                 Express app and route mounting
  server/routes/                Authentication, courses, enquiries, applications, admin APIs
  server/models/                Mongoose models
  server/middleware/            Authentication, permissions, async error wrapper
  server/scripts/               Admin bootstrap, course seed, applicant migration
frontend/
  src/pages/                    Public, applicant, admin, and approval screens
  src/components/               Shared site components and action icons
  src/utils/api.js              API client and token storage keys
  src/styles.css                Site and admin styles
```

## 11. Operational notes

- Passwords are stored as bcrypt hashes; JWTs expire after eight hours.
- Restart the backend after route or model changes if it is running without a file watcher.
- Keep database credentials and JWT secrets in `.env`; never add them to documentation or source control.
- Sample/demo approvals are not real admission decisions. Do not treat seeded preview records as official college records.
