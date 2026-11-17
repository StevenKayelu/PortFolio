import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { useBrand } from "./context/BrandContext";
import MainLayout from "./components/layout/MainLayout";
import Home from "./pages/Home/Home";
import PhaseOnePreview from "./pages/PhaseOnePreview";
import About from "./pages/About/About";
import Projects from "./pages/Projects/Projects";
import ProjectDetails from "./pages/Projects/ProjectDetails";
import Blog from "./pages/Blog/Blog";
import Services from "./pages/Services/Services";
import Resume from "./pages/Resume/Resume";
import Experience from "./pages/Experience/Experience";
import Certificates from "./pages/Certificates/Certificates";
import Gallery from "./pages/Gallery/Gallery";
import TestimonialsPage from "./pages/TestimonialsPage/TestimonialsPage";
import Achievements from "./pages/Achievements/Achievements";
import Contact from "./pages/Contact/Contact";
import Faq from "./pages/Faq/Faq";
import PrivacyPolicy from "./pages/Legal/PrivacyPolicy";
import NotFound from "./pages/NotFound/NotFound";
import DevegenHome from "./pages/Devegen/DevegenHome";
import Ventures from "./pages/Devegen/Ventures";
import VentureDetail from "./pages/Devegen/VentureDetail";
import TestimonialInvite from "./pages/Testimonial/TestimonialInvite";
import Compliance from "./pages/Devegen/Compliance";
import SolutionsHome from "./pages/Solutions/SolutionsHome";

// Admin, the TipTap editor and rich blog rendering are split out so
// public visitors never download them.
const SingleBlogPost = lazy(() => import("./pages/Blog/SingleBlogPost"));
const AdminLogin = lazy(() => import("./pages/Admin/AdminLogin"));
const AdminLayout = lazy(() => import("./pages/Admin/AdminLayout"));
const ProtectedRoute = lazy(() => import("./pages/Admin/ProtectedRoute"));
const Dashboard = lazy(() => import("./pages/Admin/Dashboard"));
const BlogEditor = lazy(() => import("./pages/Admin/BlogEditor"));
const ManageMessages = lazy(() => import("./pages/Admin/ManageMessages"));
const ManageTestimonials = lazy(() => import("./pages/Admin/ManageTestimonials"));
const resource = (name) => lazy(() => import("./pages/Admin/resourcePages").then((m) => ({ default: m[name] })));
const ManageProjects = resource("ManageProjects");
const ManageBlog = resource("ManageBlog");
const ManageServices = resource("ManageServices");
const ManageExperience = resource("ManageExperience");
const ManageCertificates = lazy(() => import("./pages/Admin/ManageCertificates"));
const ManageSkills = resource("ManageSkills");
const ManageGallery = resource("ManageGallery");
const ManageAchievements = resource("ManageAchievements");
const ManageFaq = resource("ManageFaq");
const ManageVentures = resource("ManageVentures");
const ManageProducts = resource("ManageProducts");
const ManageLeads = lazy(() => import("./pages/Admin/ManageLeads"));
const ManageApprovals = lazy(() => import("./pages/Admin/ManageApprovals"));
const ManageUsers = lazy(() => import("./pages/Admin/ManageUsers"));
const Account = lazy(() => import("./pages/Admin/Account"));
const ManageSiteContent = lazy(() => import("./pages/Admin/ManageSiteContent"));
const ManageCompliance = lazy(() => import("./pages/Admin/ManageCompliance"));
const ManageSeo = resource("ManageSeo");

function RouteFallback() {
  return (
    <Box role="status" aria-label="Loading page" sx={{ minHeight: "50vh", display: "grid", placeItems: "center" }}>
      <CircularProgress size={28} />
    </Box>
  );
}

/** Routes for stevenkayelu.online (the original portfolio). */
function StevenRoutes() {
  return (
    <>
      <Route path="/" element={<Home />} />
      <Route path="/design-system" element={<PhaseOnePreview />} />
      <Route path="/about" element={<About />} />
      <Route path="/portfolio" element={<Projects />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/:slug" element={<ProjectDetails />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/category/:slug" element={<Blog />} />
      <Route path="/blog/:slug" element={<SingleBlogPost />} />
      <Route path="/services" element={<Services />} />
      <Route path="/resume" element={<Resume />} />
      <Route path="/experience" element={<Experience />} />
      <Route path="/certificates" element={<Certificates />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/testimonials" element={<TestimonialsPage />} />
      <Route path="/achievements" element={<Achievements />} />
    </>
  );
}

/** Routes for devegenventures.com, including the /solutions branch. */
function DevegenRoutes() {
  return (
    <>
      <Route path="/" element={<DevegenHome />} />
      <Route path="/ventures" element={<Ventures />} />
      <Route path="/ventures/:slug" element={<VentureDetail />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/solutions" element={<SolutionsHome />} />
      <Route path="/solutions/services" element={<Services />} />
      <Route path="/solutions/work" element={<Projects />} />
      <Route path="/solutions/work/:slug" element={<ProjectDetails />} />
    </>
  );
}

export default function App() {
  const { siteKey } = useBrand();

  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Public site — shares the navbar/footer/page-transition shell */}
      <Route element={<MainLayout />}>
        {siteKey === "devegen" ? DevegenRoutes() : StevenRoutes()}
        <Route path="/contact" element={<Contact />} />
        <Route path="/testimonial/:token" element={<TestimonialInvite />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin — separate shell, no public navbar/footer */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<ManageLeads />} />
          <Route path="approvals" element={<ManageApprovals />} />
          <Route path="seo" element={<ManageSeo />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="account" element={<Account />} />
          <Route path="content" element={<ManageSiteContent />} />
          <Route path="compliance" element={<ManageCompliance />} />
          <Route path="ventures" element={<ManageVentures />} />
          <Route path="products" element={<ManageProducts />} />
          <Route path="projects" element={<ManageProjects />} />
          <Route path="blog" element={<ManageBlog />} />
          <Route path="blog/new" element={<BlogEditor />} />
          <Route path="blog/:id/edit" element={<BlogEditor />} />
          <Route path="services" element={<ManageServices />} />
          <Route path="experience" element={<ManageExperience />} />
          <Route path="certificates" element={<ManageCertificates />} />
          <Route path="skills" element={<ManageSkills />} />
          <Route path="testimonials" element={<ManageTestimonials />} />
          <Route path="gallery" element={<ManageGallery />} />
          <Route path="achievements" element={<ManageAchievements />} />
          <Route path="faq" element={<ManageFaq />} />
          <Route path="messages" element={<ManageMessages />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  );
}