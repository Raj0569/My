# Northfield College Admissions

Admission management application with a React student/admin frontend and a Node.js, Express, and MongoDB backend.

See [PROJECT_DOCUMENTATION.md](PROJECT_DOCUMENTATION.md) for the system overview, approval workflow, permissions, data models, setup instructions, and API reference.

## Project layout

- `frontend/` — React application. `/` is the student website and `/admin` is the protected staff login/dashboard.
- `backend/` — API source, Node dependencies, `.env`, and database scripts.
- `backend/server/` — Express routes, models, authentication, and database connection.

## Run locally

1. Install Node.js and start MongoDB (local or Atlas).
2. In `backend/`, copy `.env.example` to `.env`. Configure `MONGODB_URI`, a long random `JWT_SECRET`, and a unique `ADMIN_BOOTSTRAP_PASSWORD` of at least 12 characters.
3. Install backend packages and seed courses:

   ```powershell
   cd backend
   npm install
   npm run seed-courses
   npm run dev
   ```

4. In a second terminal, install and start the React app:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

5. Open the Vite URL (usually `http://localhost:5173`). Students use the homepage. Staff open `/admin` and sign in.

Bootstrap the database Super Admin by setting `MONGODB_URI` and `ADMIN_BOOTSTRAP_PASSWORD` in `backend/.env`, then run `npm run create-admin` from `backend/`. The bootstrap account is `admin@northfield.local`; it is stored in MongoDB and can sign in at `/admin`. Super Admins can create named staff roles, assign granular permissions, and add staff accounts from **Roles & staff** in `/admin`.

For a production build, run `npm run build` in `frontend/`. The backend serves `frontend/dist` from its own origin when it exists.

## Deploy publicly with Render

The included `render.yaml` configures one Render web service to build the frontend and serve it with the API. To deploy it, sign in to Render, create a Blueprint from `Raj0569/My`, and choose the `main` branch. During setup, provide:

- `MONGODB_URI`: a MongoDB Atlas connection string for a database you control.
- `ADMIN_BOOTSTRAP_PASSWORD`: a unique password with at least 12 characters.
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`: server-side Razorpay API keys. Start with test-mode keys; never put the secret in frontend code or Git.

Render generates `JWT_SECRET` automatically. The API accepts same-origin requests from its deployed website, so no production `CLIENT_ORIGIN` value is needed. On startup, the service adds the sample catalogue and fills in missing course-detail fields without overwriting details already edited by staff. It creates `admin@northfield.local` using `ADMIN_BOOTSTRAP_PASSWORD` if that account does not already exist; later restarts do not reset its password. Keep the database URL and bootstrap password private. The free web service may sleep when idle; consult Render's current plan details before using it for admissions that need reliable availability.

## API

The API is available at `/api` on port 5000. Protected routes use `Authorization: Bearer <token>`.

- Auth: `POST /api/auth/register`, `/api/auth/login`, `/api/auth/admin/login`
- Courses: `GET /api/courses`; permission-protected staff create/update/archive endpoints
- Admin: `/api/admin/students` lists confirmed students; `/api/admin/students/export` returns all records matching the supplied filters; `/api/admin/staff` lists staff and roles; staff and role management endpoints require `staff.manage`
- Approvals: `/api/applications/inbox` returns only the current approver's stage; `/api/applications/:id/decision` requires a remark and enforces Reviewer → Department Head → Principal → Director. Director confirmation creates the enrolled Student record.
- Enquiries: `POST /api/enquiries`; protected staff list and follow-up endpoints
- Applications: student submit/list/track and protected staff review endpoints

Course descriptions, college branding, fees, and contact details are sample project content. The seeded course structures and career paths are indicative examples, not an approved syllabus or verified placement record; staff can replace them with college-confirmed information in the admin Courses section.

Course registration checks the structured eligibility rules configured for each course before creating a Razorpay order for the non-refundable ₹5,000 slot-booking fee. The server verifies the payment signature and captured amount before marking a slot booked and moving the application into review. Configure Razorpay to auto-capture payments and test with test-mode keys before enabling live keys.
