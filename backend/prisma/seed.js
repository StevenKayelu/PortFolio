import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // ---------- Admin user ----------
  const passwordHash = await bcrypt.hash("ChangeMe123!", 12);
  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: { name: "Site Owner", email: "admin@example.com", passwordHash, role: "SUPER_ADMIN" },
  });

  // ---------- Site settings (Hero / About / Stats / Tech list) ----------
  const settings = {
    identity: {
      name: "DevGen Solutions",
      role: "Full-Stack Software Engineer",
      tagline: "I design and build fast, reliable products end to end — from database to interface.",
      location: "Available worldwide, remote-first",
    },
    stats: [
      { label: "Years experience", value: "6+" },
      { label: "Projects shipped", value: "40+" },
      { label: "Articles published", value: "60+" },
      { label: "Client satisfaction", value: "99%" },
    ],
    technologies: ["React", "Node.js", "TypeScript", "Express", "MySQL", "Prisma", "PostgreSQL", "Docker", "AWS", "GraphQL", "Redis", "Next.js"],
    timeline: [
      { year: "2024 — Now", title: "Senior Software Engineer", org: "Independent / Consulting" },
      { year: "2021 — 2024", title: "Software Engineer", org: "Scale-up, fintech" },
      { year: "2019 — 2021", title: "Frontend Developer", org: "Digital agency" },
    ],
    about: {
      bio: "I'm a full-stack engineer who cares as much about the terminal experience as the pixel-level one. Over the last six years I've moved from frontend-only work into owning systems end to end — database schema, API design, infrastructure, and the interface on top of it.",
      mission: "Build software that earns trust the boring way: it works, it's fast, and it's honest about what it does.",
      vision: "A future where small teams can ship products that feel like they came from a hundred-person company — because the tools and taste are within reach.",
      values: [
        { title: "Clarity over cleverness", detail: "Code and copy should say exactly what they mean." },
        { title: "Ship, then refine", detail: "Working software in front of real users beats a perfect plan on paper." },
        { title: "Own the outcome", detail: "Not just the ticket — the result the person on the other end actually gets." },
      ],
      education: [{ degree: "B.Sc. Computer Science", institution: "State University", year: "2015 — 2019" }],
      goals: "Growing into technical leadership on products with real operational stakes — fintech, healthcare, logistics — where good architecture is the difference between a good and a bad day for someone.",
    },
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.siteSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // ---------- Skills ----------
  const skills = [
    ["React", "FRONTEND", 95], ["TypeScript", "FRONTEND", 90], ["Material UI", "FRONTEND", 88],
    ["Node.js / Express", "BACKEND", 92], ["REST & GraphQL APIs", "BACKEND", 88],
    ["MySQL", "DATABASE", 90], ["PostgreSQL", "DATABASE", 82], ["Prisma ORM", "DATABASE", 90],
    ["AWS", "CLOUD", 78], ["Cloudflare", "CLOUD", 74],
    ["Docker", "DEVOPS", 80], ["CI/CD", "DEVOPS", 76],
    ["Technical writing", "SOFT_SKILL", 90], ["Client communication", "SOFT_SKILL", 92],
  ];
  for (const [name, category, proficiency] of skills) {
    const exists = await prisma.skill.findFirst({ where: { name } });
    if (!exists) await prisma.skill.create({ data: { name, category, proficiency } });
  }

  // ---------- Services ----------
  const services = [
    ["web-development", "Web Development", "Marketing sites to complex web apps, built for speed and maintainability.", 1500],
    ["software-development", "Software Development", "Custom internal tools and products, from spec through deployment.", 3000],
    ["api-development", "API Development", "REST and GraphQL APIs designed for the clients that will consume them.", 1200],
    ["database-design", "Database Design", "Normalized schemas that hold up under real usage and future features.", 900],
    ["ui-ux-design", "UI/UX Design", "Interfaces that are as considered as the backend powering them.", 1000],
    ["consultation", "Technical Consultation", "An outside read on architecture, stack choices, or a stuck project.", 150],
  ];
  for (const [slug, title, description, startingPrice] of services) {
    await prisma.service.upsert({ where: { slug }, update: {}, create: { slug, title, description, startingPrice } });
  }

  // ---------- Experience ----------
  const experience = [
    ["EMPLOYMENT", "Senior Software Engineer", "Independent / Consulting", "2024-01-01", null, "Full-stack engagements for early-stage and scale-up teams."],
    ["EMPLOYMENT", "Software Engineer", "Fintech Scale-up", "2021-03-01", "2023-12-01", "Owned the payments API and its MySQL schema through a 10x traffic increase."],
    ["FREELANCE", "Frontend Developer", "Digital Agency", "2019-06-01", "2021-02-01", "Built and shipped client sites and dashboards on tight timelines."],
    ["INTERNET_CAFE", "IT Support & Systems", "Local Internet Café", "2016-01-01", "2018-01-01", "First hands-on experience with networking, hardware, and Linux systems administration."],
  ];
  for (const [type, title, organization, startDate, endDate, description] of experience) {
    const exists = await prisma.experience.findFirst({ where: { title, organization } });
    if (!exists) {
      await prisma.experience.create({
        data: { type, title, organization, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null, description },
      });
    }
  }

  // ---------- Certificates ----------
  const certificates = [
    ["AWS Certified Solutions Architect", "Amazon Web Services", "Cloud", "2024-02-01", "AWS-000000"],
    ["Professional Scrum Master I", "Scrum.org", "Process", "2022-08-01", "PSM-000000"],
  ];
  for (const [title, institution, category, issueDate, credentialId] of certificates) {
    const exists = await prisma.certificate.findFirst({ where: { title, institution } });
    if (!exists) {
      await prisma.certificate.create({ data: { title, institution, category, issueDate: new Date(issueDate), credentialId } });
    }
  }

  // ---------- Gallery ----------
  const gallery = [["Conference talk, 2025", "Speaking"], ["Hackathon win, 2023", "Events"], ["Workstation setup", "Behind the scenes"]];
  for (const [title, category] of gallery) {
    const exists = await prisma.galleryItem.findFirst({ where: { title } });
    if (!exists) await prisma.galleryItem.create({ data: { title, category, imageUrl: "/uploads/placeholder.webp" } });
  }

  // ---------- Achievements ----------
  const achievements = [
    ["Speaker, Regional Dev Conference", "2025-09-01", "Talked about theme engines and design systems at scale."],
    ["Hackathon Winner", "2023-11-01", "Built a realtime logistics tracker in 36 hours, took first place."],
  ];
  for (const [title, date, description] of achievements) {
    const exists = await prisma.achievement.findFirst({ where: { title } });
    if (!exists) await prisma.achievement.create({ data: { title, date: new Date(date), description } });
  }

  // ---------- FAQ ----------
  const faqs = [
    ["What's your typical process for a new project?", "A short discovery call, a written proposal with scope and timeline, then weekly check-ins until launch."],
    ["Do you work with existing codebases?", "Yes — most engagements start with an audit before any new code gets written."],
    ["What's your availability?", "I take on a small number of engagements at a time so each one gets real attention."],
  ];
  for (const [question, answer] of faqs) {
    const exists = await prisma.faq.findFirst({ where: { question } });
    if (!exists) await prisma.faq.create({ data: { question, answer } });
  }

  // ---------- Testimonials (pre-approved so they show up immediately) ----------
  const testimonials = [
    ["Amara Chen", "VP Engineering", "Northline", "Delivered ahead of schedule and left the codebase easier to work in than they found it.", 5],
    ["Daniel Ortiz", "Founder", "Fielda", "Rare mix of product sense and engineering rigor — asked the right questions before writing code.", 5],
  ];
  for (const [clientName, clientRole, clientCompany, content, rating] of testimonials) {
    const exists = await prisma.testimonial.findFirst({ where: { clientName, clientCompany } });
    if (!exists) {
      await prisma.testimonial.create({ data: { clientName, clientRole, clientCompany, content, rating, isApproved: true, isFeatured: true } });
    }
  }

  // ---------- Project categories + projects ----------
  const categories = [["web", "Web"], ["mobile", "Mobile"], ["data", "Data & Analytics"]];
  const categoryIds = {};
  for (const [slug, name] of categories) {
    const cat = await prisma.projectCategory.upsert({ where: { slug }, update: {}, create: { slug, name } });
    categoryIds[slug] = cat.id;
  }

  const projects = [
    {
      slug: "commerce-platform", title: "Commerce Platform", category: "web",
      summary: "Headless commerce engine handling 50K+ daily transactions with sub-100ms checkout.",
      description: "A full rebuild of an e-commerce platform's checkout and inventory system.",
      challenges: "The existing checkout flow buckled under Black Friday traffic, with cart-abandonment spiking whenever the payment provider added latency.",
      solutions: "Rebuilt checkout as an optimistic, queue-backed flow with idempotent payment retries, so a slow provider response no longer blocked the UI.",
      lessonsLearned: "Idempotency keys should be designed in from day one — retrofitting them under load is far riskier than shipping them upfront.",
      features: ["Headless product catalog", "Sub-100ms checkout", "Real-time inventory sync", "Admin order dashboard"],
      githubUrl: "https://github.com", liveDemoUrl: "https://example.com",
      stack: ["React", "Node.js", "MySQL", "Redis"], isFeatured: true,
    },
    {
      slug: "realtime-analytics", title: "Realtime Analytics Suite", category: "data",
      summary: "Streaming dashboard turning raw event data into decisions teams act on same-day.",
      description: "A streaming analytics platform replacing a daily batch ETL job.",
      challenges: "Stakeholders needed same-day decisions from event data that used to take a full ETL cycle to surface.",
      solutions: "Introduced a Kafka-backed streaming layer feeding pre-aggregated views, cutting the decision loop from a day to minutes.",
      lessonsLearned: "Pre-aggregating at write time saved more query complexity than any amount of read-side optimization could have.",
      features: ["Streaming ingestion", "Sub-second dashboard refresh", "Custom alerting rules"],
      githubUrl: "https://github.com",
      stack: ["TypeScript", "Kafka", "Recharts"], isFeatured: true,
    },
    {
      slug: "field-ops-app", title: "Field Operations App", category: "mobile",
      summary: "Offline-first Android app coordinating 300+ field technicians across time zones.",
      description: "A field service app built for technicians who regularly lose signal.",
      challenges: "Technicians regularly worked in areas with no signal, and the old app simply failed to save their work.",
      solutions: "Built a local-first data layer with conflict-free sync, so work saves instantly and reconciles once connectivity returns.",
      lessonsLearned: "Offline-first isn't a feature you bolt on later — it has to shape the data model from the start.",
      features: ["Offline-first sync", "Route optimization", "Photo-based job verification"],
      githubUrl: "https://github.com",
      stack: ["React Native", "Express", "PostgreSQL"], isFeatured: true,
    },
    {
      slug: "internal-tooling-suite", title: "Internal Tooling Suite", category: "web",
      summary: "Consolidated seven spreadsheets into one internal app the ops team actually enjoys using.",
      description: "An internal tool unifying scattered spreadsheet-based workflows.",
      challenges: "Seven disconnected spreadsheets meant no one had a single source of truth, and edits regularly overwrote each other.",
      solutions: "One app backed by a proper relational schema, with row-level history so any edit can be traced and reverted.",
      lessonsLearned: "The hardest part wasn't the code — it was getting five teams to agree on one shared definition of each field.",
      features: ["Unified data entry", "Role-based views", "Audit trail"],
      stack: ["React", "Node.js", "MySQL"], isFeatured: false,
    },
  ];

  for (const p of projects) {
    const exists = await prisma.project.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await prisma.project.create({
      data: {
        slug: p.slug, title: p.title, summary: p.summary, description: p.description,
        challenges: p.challenges, solutions: p.solutions, lessonsLearned: p.lessonsLearned,
        features: p.features, githubUrl: p.githubUrl, liveDemoUrl: p.liveDemoUrl,
        status: "COMPLETED", isFeatured: p.isFeatured, categoryId: categoryIds[p.category],
        technologies: {
          create: p.stack.map((name) => ({ technology: { connectOrCreate: { where: { name }, create: { name } } } })),
        },
      },
    });
  }

  // ---------- Blog categories/tags + posts ----------
  const blogCategories = [["Engineering", "engineering"], ["Design", "design"]];
  const blogCategoryIds = {};
  for (const [name, slug] of blogCategories) {
    const cat = await prisma.blogCategory.upsert({ where: { slug }, update: {}, create: { name, slug } });
    blogCategoryIds[name] = cat.id;
  }

  const posts = [
    {
      slug: "designing-for-scale", title: "Designing APIs That Survive Contact With Real Traffic",
      excerpt: "The patterns that hold up once your endpoint stops being a demo.",
      content: "The gap between a demo endpoint and one that survives real traffic usually comes down to a handful of decisions made early: idempotency, backpressure, and how failure is surfaced to the caller. This piece walks through the patterns that held up under production load and the ones that quietly didn't.",
      category: "Engineering", tags: ["APIs", "Architecture"], readingTimeMins: 7,
    },
    {
      slug: "prisma-at-scale", title: "What I'd Do Differently With Prisma at Scale",
      excerpt: "Migrations, connection pooling, and the query patterns that bit us.",
      content: "Prisma is a genuinely pleasant developer experience until connection pooling and migration ordering start to matter. Here's what changed once real traffic and a real team were both in the picture.",
      category: "Engineering", tags: ["Prisma", "MySQL"], readingTimeMins: 9,
    },
    {
      slug: "theme-engines", title: "Building a Theme Engine That Doesn't Fight Your Design System",
      excerpt: "Tokens over overrides: how to make ten themes feel like one decision.",
      content: "Ten themes that all feel considered, not just ten palettes swapped into the same template — this is the token-first approach that made it possible, and where it would have broken down with a components-first approach instead.",
      category: "Design", tags: ["Design Systems", "React"], readingTimeMins: 6,
    },
  ];

  for (const p of posts) {
    const exists = await prisma.blogPost.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await prisma.blogPost.create({
      data: {
        slug: p.slug, title: p.title, excerpt: p.excerpt,
        content: p.content, contentFormat: "plain", // becomes "tiptap-json" once written via the admin editor
        status: "PUBLISHED", publishedAt: new Date(), readingTimeMins: p.readingTimeMins,
        categoryId: blogCategoryIds[p.category],
        tags: {
          create: p.tags.map((name) => ({
            tag: { connectOrCreate: { where: { name }, create: { name, slug: name.toLowerCase().replace(/\s+/g, "-") } } },
          })),
        },
      },
    });
  }

  console.log("Seed complete.");
  console.log("Admin login → admin@example.com / ChangeMe123! (change this immediately)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
