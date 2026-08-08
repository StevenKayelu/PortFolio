import { Helmet } from "react-helmet-async";
import Hero from "./sections/Hero";
import Stats from "./sections/Stats";
import Technologies from "./sections/Technologies";
import FeaturedProjects from "./sections/FeaturedProjects";
import LatestBlogs from "./sections/LatestBlogs";
import Testimonials from "./sections/Testimonials";
import Timeline from "./sections/Timeline";
import ContactCTA from "./sections/ContactCTA";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Your Name — Full-Stack Software Engineer</title>
        <meta
          name="description"
          content="Portfolio, blog, and services from a full-stack software engineer specializing in fast, reliable products end to end."
        />
        <meta property="og:title" content="Your Name — Full-Stack Software Engineer" />
        <meta property="og:type" content="website" />
      </Helmet>

      <Hero />
      <Stats />
      <Technologies />
      <FeaturedProjects />
      <LatestBlogs />
      <Testimonials />
      <Timeline />
      <ContactCTA />
    </>
  );
}
