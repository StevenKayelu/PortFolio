import { Routes, Route } from "react-router-dom";
import MainLayout from "./components/layout/MainLayout";
import Home from "./pages/Home/Home";
import PhaseOnePreview from "./pages/PhaseOnePreview";
import About from "./pages/About/About";
import Projects from "./pages/Projects/Projects";
import ProjectDetails from "./pages/Projects/ProjectDetails";
import Blog from "./pages/Blog/Blog";
import SingleBlogPost from "./pages/Blog/SingleBlogPost";
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

import AdminLogin from "./pages/Admin/AdminLogin";
import AdminLayout from "./pages/Admin/AdminLayout";
import ProtectedRoute from "./pages/Admin/ProtectedRoute";
import Dashboard from "./pages/Admin/Dashboard";
import BlogEditor from "./pages/Admin/BlogEditor";
import ManageMessages from "./pages/Admin/ManageMessages";
import ManageTestimonials from "./pages/Admin/ManageTestimonials";
import {
  ManageProjects, ManageBlog, ManageServices, ManageExperience,
  ManageCertificates, ManageSkills, ManageGallery, ManageAchievements, ManageFaq,
} from "./pages/Admin/resourcePages";

export default function App() {
  return (
    <Routes>
      {/* Public site — shares the navbar/footer/page-transition shell */}
      <Route element={<MainLayout />}>
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
        <Route path="/contact" element={<Contact />} />
        <Route path="/faq" element={<Faq />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Admin — separate shell, no public navbar/footer */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
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
  );
}