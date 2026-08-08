// Placeholder content — swap for real API data (/projects, /blog, /skills,
// /testimonials) once the corresponding controllers ship in later phases.
// Keeping the shape identical to the Prisma models means the swap is a
// data-source change only, not a component rewrite.

// DEPRECATED — no longer imported by any page. Every public page now
// fetches live data via `useFetch` + `apiClient` (see hooks/useFetch.js).
// The equivalent content lives in the database instead, seeded by
// backend/prisma/seed.js (which mirrors these same values). Kept here
// only as a readable reference for what that seed data represents —
// safe to delete once you're confident the live data covers everything.

export const identity = {
  name: "Your Name",
  role: "Full-Stack Software Engineer",
  tagline: "I design and build fast, reliable products end to end — from database to interface.",
  location: "Available worldwide, remote-first",
};

export const stats = [
  { label: "Years experience", value: "6+" },
  { label: "Projects shipped", value: "40+" },
  { label: "Articles published", value: "60+" },
  { label: "Client satisfaction", value: "99%" },
];

export const technologies = [
  "React", "Node.js", "TypeScript", "Express", "MySQL", "Prisma",
  "PostgreSQL", "Docker", "AWS", "GraphQL", "Redis", "Next.js",
];

export const featuredProjects = [
  {
    slug: "commerce-platform",
    title: "Commerce Platform",
    summary: "Headless commerce engine handling 50K+ daily transactions with sub-100ms checkout.",
    stack: ["React", "Node.js", "MySQL", "Redis"],
    coverImage: null,
  },
  {
    slug: "realtime-analytics",
    title: "Realtime Analytics Suite",
    summary: "Streaming dashboard turning raw event data into decisions teams act on same-day.",
    stack: ["TypeScript", "Kafka", "Recharts"],
    coverImage: null,
  },
  {
    slug: "field-ops-app",
    title: "Field Operations App",
    summary: "Offline-first Android app coordinating 300+ field technicians across time zones.",
    stack: ["React Native", "Express", "PostgreSQL"],
    coverImage: null,
  },
];

export const latestBlogs = [
  {
    slug: "designing-for-scale",
    title: "Designing APIs That Survive Contact With Real Traffic",
    excerpt: "The patterns that hold up once your endpoint stops being a demo.",
    readingTimeMins: 7,
    publishedAt: "2026-06-14",
  },
  {
    slug: "prisma-at-scale",
    title: "What I'd Do Differently With Prisma at Scale",
    excerpt: "Migrations, connection pooling, and the query patterns that bit us.",
    readingTimeMins: 9,
    publishedAt: "2026-05-02",
  },
  {
    slug: "theme-engines",
    title: "Building a Theme Engine That Doesn't Fight Your Design System",
    excerpt: "Tokens over overrides: how to make ten themes feel like one decision.",
    readingTimeMins: 6,
    publishedAt: "2026-03-21",
  },
];

export const testimonials = [
  {
    clientName: "Amara Chen",
    clientRole: "VP Engineering",
    clientCompany: "Northline",
    content: "Delivered ahead of schedule and left the codebase easier to work in than they found it.",
    rating: 5,
  },
  {
    clientName: "Daniel Ortiz",
    clientRole: "Founder",
    clientCompany: "Fielda",
    content: "Rare mix of product sense and engineering rigor — asked the right questions before writing code.",
    rating: 5,
  },
];

export const timeline = [
  { year: "2024 — Now", title: "Senior Software Engineer", org: "Independent / Consulting" },
  { year: "2021 — 2024", title: "Software Engineer", org: "Scale-up, fintech" },
  { year: "2019 — 2021", title: "Frontend Developer", org: "Digital agency" },
];

export const about = {
  bio: "I'm a full-stack engineer who cares as much about the terminal experience as the pixel-level one. Over the last six years I've moved from frontend-only work into owning systems end to end — database schema, API design, infrastructure, and the interface on top of it.",
  mission: "Build software that earns trust the boring way: it works, it's fast, and it's honest about what it does.",
  vision: "A future where small teams can ship products that feel like they came from a hundred-person company — because the tools and taste are within reach.",
  values: [
    { title: "Clarity over cleverness", detail: "Code and copy should say exactly what they mean." },
    { title: "Ship, then refine", detail: "Working software in front of real users beats a perfect plan on paper." },
    { title: "Own the outcome", detail: "Not just the ticket — the result the person on the other end actually gets." },
  ],
  education: [
    { degree: "B.Sc. Computer Science", institution: "State University", year: "2015 — 2019" },
  ],
  goals: "Growing into technical leadership on products with real operational stakes — fintech, healthcare, logistics — where good architecture is the difference between a good and a bad day for someone.",
};

export const skills = {
  FRONTEND: [
    { name: "React", proficiency: 95 },
    { name: "TypeScript", proficiency: 90 },
    { name: "Material UI", proficiency: 88 },
  ],
  BACKEND: [
    { name: "Node.js / Express", proficiency: 92 },
    { name: "REST & GraphQL APIs", proficiency: 88 },
  ],
  DATABASE: [
    { name: "MySQL", proficiency: 90 },
    { name: "PostgreSQL", proficiency: 82 },
    { name: "Prisma ORM", proficiency: 90 },
  ],
  CLOUD: [
    { name: "AWS", proficiency: 78 },
    { name: "Cloudflare", proficiency: 74 },
  ],
  DEVOPS: [
    { name: "Docker", proficiency: 80 },
    { name: "CI/CD", proficiency: 76 },
  ],
  SOFT_SKILL: [
    { name: "Technical writing", proficiency: 90 },
    { name: "Client communication", proficiency: 92 },
  ],
};

export const services = [
  { slug: "web-development", title: "Web Development", description: "Marketing sites to complex web apps, built for speed and maintainability.", startingPrice: 1500 },
  { slug: "software-development", title: "Software Development", description: "Custom internal tools and products, from spec through deployment.", startingPrice: 3000 },
  { slug: "api-development", title: "API Development", description: "REST and GraphQL APIs designed for the clients that will consume them.", startingPrice: 1200 },
  { slug: "database-design", title: "Database Design", description: "Normalized schemas that hold up under real usage and future features.", startingPrice: 900 },
  { slug: "ui-ux-design", title: "UI/UX Design", description: "Interfaces that are as considered as the backend powering them.", startingPrice: 1000 },
  { slug: "consultation", title: "Technical Consultation", description: "An outside read on architecture, stack choices, or a stuck project.", startingPrice: 150 },
];

export const experience = [
  { type: "EMPLOYMENT", title: "Senior Software Engineer", organization: "Independent / Consulting", startDate: "2024-01-01", endDate: null, description: "Full-stack engagements for early-stage and scale-up teams." },
  { type: "EMPLOYMENT", title: "Software Engineer", organization: "Fintech Scale-up", startDate: "2021-03-01", endDate: "2023-12-01", description: "Owned the payments API and its MySQL schema through a 10x traffic increase." },
  { type: "FREELANCE", title: "Frontend Developer", organization: "Digital Agency", startDate: "2019-06-01", endDate: "2021-02-01", description: "Built and shipped client sites and dashboards on tight timelines." },
  { type: "INTERNET_CAFE", title: "IT Support & Systems", organization: "Local Internet Café", startDate: "2016-01-01", endDate: "2018-01-01", description: "First hands-on experience with networking, hardware, and Linux systems administration." },
];

export const certificates = [
  { title: "AWS Certified Solutions Architect", institution: "Amazon Web Services", category: "Cloud", issueDate: "2024-02-01", credentialId: "AWS-000000" },
  { title: "Professional Scrum Master I", institution: "Scrum.org", category: "Process", issueDate: "2022-08-01", credentialId: "PSM-000000" },
];

export const galleryItems = [
  { title: "Conference talk, 2025", category: "Speaking" },
  { title: "Hackathon win, 2023", category: "Events" },
  { title: "Workstation setup", category: "Behind the scenes" },
];

export const achievements = [
  { title: "Speaker, Regional Dev Conference", date: "2025-09-01", description: "Talked about theme engines and design systems at scale." },
  { title: "Hackathon Winner", date: "2023-11-01", description: "Built a realtime logistics tracker in 36 hours, took first place." },
];

export const projectCategories = [
  { slug: "web", name: "Web" },
  { slug: "mobile", name: "Mobile" },
  { slug: "data", name: "Data & Analytics" },
];

export const allProjects = [
  ...featuredProjects,
  {
    slug: "internal-tooling-suite",
    title: "Internal Tooling Suite",
    summary: "Consolidated seven spreadsheets into one internal app the ops team actually enjoys using.",
    stack: ["React", "Node.js", "MySQL"],
    category: "web",
  },
].map((p, idx) => ({ ...p, category: p.category || ["web", "mobile", "data"][idx % 3] }));

export const projectDetails = {
  "commerce-platform": {
    features: ["Headless product catalog", "Sub-100ms checkout", "Real-time inventory sync", "Admin order dashboard"],
    challenges: "The existing checkout flow buckled under Black Friday traffic, with cart-abandonment spiking whenever the payment provider added latency.",
    solutions: "Rebuilt checkout as an optimistic, queue-backed flow with idempotent payment retries, so a slow provider response no longer blocked the UI.",
    lessonsLearned: "Idempotency keys should be designed in from day one — retrofitting them under load is far riskier than shipping them upfront.",
    githubUrl: "https://github.com",
    liveDemoUrl: "https://example.com",
  },
  "realtime-analytics": {
    features: ["Streaming ingestion", "Sub-second dashboard refresh", "Custom alerting rules"],
    challenges: "Stakeholders needed same-day decisions from event data that used to take a full ETL cycle to surface.",
    solutions: "Introduced a Kafka-backed streaming layer feeding pre-aggregated views, cutting the decision loop from a day to minutes.",
    lessonsLearned: "Pre-aggregating at write time saved more query complexity than any amount of read-side optimization could have.",
    githubUrl: "https://github.com",
  },
  "field-ops-app": {
    features: ["Offline-first sync", "Route optimization", "Photo-based job verification"],
    challenges: "Technicians regularly worked in areas with no signal, and the old app simply failed to save their work.",
    solutions: "Built a local-first data layer with conflict-free sync, so work saves instantly and reconciles once connectivity returns.",
    lessonsLearned: "Offline-first isn't a feature you bolt on later — it has to shape the data model from the start.",
    githubUrl: "https://github.com",
  },
  "internal-tooling-suite": {
    features: ["Unified data entry", "Role-based views", "Audit trail"],
    challenges: "Seven disconnected spreadsheets meant no one had a single source of truth, and edits regularly overwrote each other.",
    solutions: "One app backed by a proper relational schema, with row-level history so any edit can be traced and reverted.",
    lessonsLearned: "The hardest part wasn't the code — it was getting five teams to agree on one shared definition of each field.",
  },
};

export const blogPostDetails = {
  "designing-for-scale": {
    content: "The gap between a demo endpoint and one that survives real traffic usually comes down to a handful of decisions made early: idempotency, backpressure, and how failure is surfaced to the caller. This piece walks through the patterns that held up under production load and the ones that quietly didn't.",
    category: "Engineering",
    tags: ["APIs", "Architecture"],
  },
  "prisma-at-scale": {
    content: "Prisma is a genuinely pleasant developer experience until connection pooling and migration ordering start to matter. Here's what changed once real traffic and a real team were both in the picture.",
    category: "Engineering",
    tags: ["Prisma", "MySQL"],
  },
  "theme-engines": {
    content: "Ten themes that all feel considered, not just ten palettes swapped into the same template — this is the token-first approach that made it possible, and where it would have broken down with a components-first approach instead.",
    category: "Design",
    tags: ["Design Systems", "React"],
  },
};

export const faqs = [
  { question: "What's your typical process for a new project?", answer: "A short discovery call, a written proposal with scope and timeline, then weekly check-ins until launch." },
  { question: "Do you work with existing codebases?", answer: "Yes — most engagements start with an audit before any new code gets written." },
  { question: "What's your availability?", answer: "I take on a small number of engagements at a time so each one gets real attention." },
];
