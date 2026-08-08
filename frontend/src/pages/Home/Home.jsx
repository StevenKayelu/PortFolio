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
        <title>Steven Kayelu — Full-Stack Software Engineer</title>
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
