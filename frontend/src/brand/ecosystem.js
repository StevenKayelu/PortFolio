/**
 * Public ecosystem structure (Digital Ecosystem report §02).
 * ---------------------------------------------------------
 * Static until the Brand / Venture / BrandRelationship models land in
 * the API (report §07). Status wording deliberately avoids claims that
 * have not been verified: legal relationships and product ownership
 * stay "awaiting confirmation" until the owner confirms them.
 *
 * status tone: "ok" verified · "pending" awaiting confirmation · "open" empty slot
 */
export const ECOSYSTEM_NODES = [
  {
    id: "sk", name: "Steven Kayelu", short: "Founder", kind: "founder", r: 26,
    role: "Founder · independent professional identity",
    where: "stevenkayelu.online", link: { site: "steven", path: "/", label: "Visit Steven's portfolio" },
    relationship: "Founder of Devegen Ventures. Kept outside the umbrella on purpose: his career, CV and portfolio stand on their own.",
    status: { tone: "ok", label: "Identity confirmed" },
    visit: "Selected work, experience, CV, certificates, writing and career enquiries.",
  },
  {
    id: "dv", name: "Devegen Ventures", short: "Umbrella", kind: "umbrella", r: 36,
    role: "Registered umbrella business name",
    where: "devegenventures.com", link: { site: "devegen", path: "/ventures", label: "Browse the venture directory" },
    relationship: "The umbrella brand that presents ventures, products and partnerships. Using the name does not by itself imply a legal parent–subsidiary structure.",
    status: { tone: "ok", label: "Registered name" },
    visit: "Organisation story, venture directory, partnerships and the founder profile.",
  },
  {
    id: "ds", name: "DevGen Solutions LTD", short: "Services", kind: "service", r: 28,
    role: "Technology services brand",
    where: "devegenventures.com/solutions", link: { site: "devegen", path: "/solutions", label: "Explore DevGen Solutions" },
    relationship: "Operates as the technology services brand within the ecosystem. The legal relationship to Devegen Ventures is still to be confirmed against PACRA records.",
    status: { tone: "pending", label: "Relationship wording pending" },
    visit: "Services, case studies, delivery process and quote requests.",
  },
  {
    id: "fv", name: "Future ventures", short: "Open slot", kind: "slot", r: 26,
    role: "Configurable venture profiles",
    where: "devegenventures.com/ventures/…",
    relationship: "New businesses are added from the admin and published only after ownership, legal, privacy and content checks.",
    status: { tone: "open", label: "None published yet" },
    visit: "Each venture will get its own profile, products and enquiry routing.",
  },
  ...["MotoGo", "TangaOne", "Exam Made Easy"].map((name, i) => ({
    id: `p${i + 1}`, name, short: "Product", kind: "product", r: 17,
    role: "Product or project", where: "To be confirmed",
    relationship: "Named in the ecosystem plan. Ownership and its business relationship have not been confirmed, so it is not yet presented as a venture product.",
    status: { tone: "pending", label: "Awaiting classification" },
    visit: "A case study once ownership and display permission are confirmed.",
  })),
];

export const ECOSYSTEM_LINKS = [
  { a: "sk", b: "dv", kind: "founder" },
  { a: "dv", b: "ds", kind: "verified" },
  { a: "dv", b: "fv", kind: "slot" },
  { a: "ds", b: "p1", kind: "pending" },
  { a: "ds", b: "p2", kind: "pending" },
  { a: "ds", b: "p3", kind: "pending" },
];

/** Two hand-tuned layouts: landscape for wide containers, portrait for phones. */
export const ECOSYSTEM_LAYOUTS = {
  wide: {
    viewBox: [640, 480], boundary: [150, 112, 460, 268],
    pos: { sk: [86, 72], dv: [380, 182], ds: [250, 316], fv: [520, 316], p1: [110, 430], p2: [250, 430], p3: [390, 430] },
  },
  tall: {
    viewBox: [360, 660], boundary: [14, 138, 332, 324],
    pos: { sk: [180, 62], dv: [180, 222], ds: [96, 376], fv: [264, 376], p1: [60, 570], p2: [180, 570], p3: [300, 570] },
  },
};
