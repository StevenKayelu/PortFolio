/**
 * Public ecosystem structure (Digital Ecosystem report §02).
 * ---------------------------------------------------------
 * ECOSYSTEM_NODES/LINKS are the static fallback used until GET /ecosystem
 * responds (or if it fails). buildEcosystem() maps the API data onto the
 * same node shape. Status wording avoids unverified claims: relationships
 * and products stay "awaiting confirmation" until confirmed in the admin.
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
];

export const ECOSYSTEM_LINKS = [
  { a: "sk", b: "dv", kind: "founder" },
  { a: "dv", b: "ds", kind: "verified" },
  { a: "dv", b: "fv", kind: "slot" },
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

const PRODUCT_SLOTS = ["p1", "p2", "p3"];

/** Maps GET /ecosystem onto map nodes and links. Unknown data degrades to the fallback copy. */
export function buildEcosystem(api) {
  if (!api?.brands?.length) return { nodes: ECOSYSTEM_NODES, links: ECOSYSTEM_LINKS };
  const base = Object.fromEntries(ECOSYSTEM_NODES.map((n) => [n.id, { ...n }]));
  const rel = (parent, child) => api.relationships.find((r) => r.parent === parent && r.child === child);

  const founder = rel("steven", "devegen");
  if (founder?.verification === "VERIFIED") base.sk.status = { tone: "ok", label: "Founder link confirmed" };

  const umbrella = rel("devegen", "solutions");
  if (umbrella) {
    base.ds.status = umbrella.verification === "VERIFIED"
      ? { tone: "ok", label: "Relationship verified" }
      : { tone: "pending", label: "Relationship wording pending" };
    if (umbrella.note) base.ds.relationship = umbrella.note;
  }

  // The future-venture slot shows the first published venture other than DevGen Solutions.
  const other = api.ventures.find((v) => v.slug !== "devgen-solutions");
  if (other) {
    base.fv = {
      ...base.fv, name: other.name, short: other.stage.toLowerCase(), kind: "service",
      role: `Venture · ${other.stage.charAt(0) + other.stage.slice(1).toLowerCase()}`,
      where: other.website?.replace(/^https?:\/\//, "") || `devegenventures.com/ventures/${other.slug}`,
      relationship: other.summary, visit: other.description || other.summary,
      status: other.verificationStatus === "VERIFIED" ? { tone: "ok", label: "Verified venture" } : { tone: "pending", label: "Verification pending" },
      link: null,
    };
  }

  const products = [...api.ventures.flatMap((v) => v.products), ...(api.unassignedProducts || [])].slice(0, PRODUCT_SLOTS.length);
  const productNodes = products.map((p, i) => ({
    id: PRODUCT_SLOTS[i], name: p.name, short: "Product", kind: "product", r: 17,
    role: p.lifecycle ? `Product · ${p.lifecycle}` : "Product",
    where: p.website?.replace(/^https?:\/\//, "") || "—",
    relationship: p.ownershipStatus === "CONFIRMED" ? "Ownership confirmed." : p.ownershipStatus === "NOT_OWNED" ? "Shown with the owner's permission." : "Ownership is being confirmed.",
    status: p.ownershipStatus === "CONFIRMED" ? { tone: "ok", label: "Ownership confirmed" } : { tone: "pending", label: "Ownership under review" },
    visit: p.summary || "Product details are coming soon.",
  }));

  return {
    nodes: [base.sk, base.dv, base.ds, base.fv, ...productNodes],
    links: [...ECOSYSTEM_LINKS, ...productNodes.map((n) => ({ a: "ds", b: n.id, kind: n.status.tone === "ok" ? "verified" : "pending" }))],
  };
}
