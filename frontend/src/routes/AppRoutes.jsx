import Home from "../pages/Home";
import Courses from "../pages/Courses";
import CourseDetails from "../pages/CourseDetails";
import InfoPage from "../pages/InfoPage";
import Account from "../pages/Account";
import Apply from "../pages/Apply";
import Portal from "../pages/Portal";
import Admin from "../pages/Admin";

export default function AppRoutes() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/admin" || path.startsWith("/admin/")) return <Admin />;
  if (path === "/account") return <Account />;
  if (path === "/apply") return <Apply />;
  if (path === "/portal") return <Portal />;
  if (path.startsWith("/courses/")) return <CourseDetails />;
  if (path === "/courses") return <Courses />;
  if (["/about", "/admissions", "/enquiry"].includes(path)) {
    return <InfoPage type={path.slice(1)} />;
  }

  return <Home />;
}
