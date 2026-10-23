// Official business details. These are the defaults; the owner can override most of
// them from the admin Settings page (stored in the database), so no code edit is needed.

export const BUSINESS = {
  name: "Samad and Son's Hardware Store",
  founder: "Suhail Ahmad Magray",
  addressLine: "Peerpora, Ganderbal, Jammu & Kashmir, India",
  landmark: "Opposite J&K Bank",
  country: "India",
  currency: "INR",
  currencySymbol: "₹",
  // Display format and click-to-chat format of the same number.
  whatsappDisplay: "+91 7006839895",
  whatsappNumber: "917006839895",
  heroHeadline: "Your Trusted Hardware Store in Peerpora, Ganderbal",
  heroSubtext:
    "Quality Paints, Plumbing Supplies, Plywood, Construction Materials and Everyday Hardware — All in One Place.",
  locationStatement:
    "Visit Samad and Son's Hardware Store at Peerpora, Ganderbal, Jammu & Kashmir — Opposite J&K Bank.",
  aboutText: [
    "Welcome to Samad and Son's Hardware Store, your local destination for paints, plumbing supplies, plywood, construction materials, and a wide range of hardware products in Peerpora, Ganderbal, Jammu & Kashmir.",
    "Founded by Suhail Ahmad Magray, our business aims to make essential hardware and building materials conveniently accessible to local customers.",
    "Whether you are looking for paints, PVC pipes, PPR fittings, garden pipes, plywood, cutting blades, regmal, brushes, Plaster of Paris, wall putty, or other hardware essentials, our store offers a convenient place to explore the products you need.",
    "Visit us in Peerpora, opposite J&K Bank, or contact us on WhatsApp to enquire about product availability and prices.",
  ],
  whyChooseUs: [
    "Wide Range of Hardware Products",
    "Paints and Plumbing Supplies in One Place",
    "Convenient Local Shopping",
    "Easy WhatsApp Product Enquiries",
    "Assistance in Finding Suitable Materials",
  ],
} as const;

// The 17 launch categories, in display order.
export const DEFAULT_CATEGORIES: { name: string; slug: string; description: string }[] = [
  { name: "Paints and Painting Supplies", slug: "paints-and-painting-supplies", description: "Interior and exterior paints, primers and painting supplies." },
  { name: "PVC Pipes and Fittings", slug: "pvc-pipes-and-fittings", description: "PVC pipes, bends, elbows, tees and other fittings." },
  { name: "PPR Pipes and Fittings", slug: "ppr-pipes-and-fittings", description: "PPR pipes and fittings for hot and cold water lines." },
  { name: "Plywood and Boards", slug: "plywood-and-boards", description: "Plywood sheets and boards for furniture and interiors." },
  { name: "Garden Pipes and Water Hoses", slug: "garden-pipes-and-water-hoses", description: "Garden pipes and water hoses for home and farm use." },
  { name: "Cutting Blades", slug: "cutting-blades", description: "Cutting blades and discs for a range of tools." },
  { name: "Regmal, Sandpaper and Abrasives", slug: "regmal-sandpaper-and-abrasives", description: "Regmal, sandpaper and abrasives for smoothing and finishing." },
  { name: "Paint Brushes and Rollers", slug: "paint-brushes-and-rollers", description: "Brushes and rollers for painting walls, wood and metal." },
  { name: "Plaster of Paris (POP)", slug: "plaster-of-paris-pop", description: "Plaster of Paris for ceilings, walls and decorative work." },
  { name: "Wall Putty", slug: "wall-putty", description: "Wall putty for smooth wall finishing before painting." },
  { name: "Plumbing Materials", slug: "plumbing-materials", description: "Taps, valves, connectors and general plumbing materials." },
  { name: "Construction Materials", slug: "construction-materials", description: "Essential materials for building and repair work." },
  { name: "Hand Tools", slug: "hand-tools", description: "Hand tools for home, workshop and site use." },
  { name: "Adhesives and Sealants", slug: "adhesives-and-sealants", description: "Adhesives, glues and sealants for bonding and sealing." },
  { name: "Screws, Nails and Fasteners", slug: "screws-nails-and-fasteners", description: "Screws, nails, bolts and other fasteners." },
  { name: "General Hardware Items", slug: "general-hardware-items", description: "Everyday hardware items for the home and workshop." },
  { name: "Other Hardware Products", slug: "other-hardware-products", description: "Other hardware products. Ask us if you cannot find what you need." },
];

export const DEFAULT_UNITS: { name: string; shortName: string }[] = [
  { name: "Piece", shortName: "pc" },
  { name: "Box", shortName: "box" },
  { name: "Packet", shortName: "pkt" },
  { name: "Kilogram", shortName: "kg" },
  { name: "Bag", shortName: "bag" },
  { name: "Litre", shortName: "L" },
  { name: "Millilitre", shortName: "ml" },
  { name: "Metre", shortName: "m" },
  { name: "Foot", shortName: "ft" },
  { name: "Roll", shortName: "roll" },
  { name: "Sheet", shortName: "sheet" },
  { name: "Set", shortName: "set" },
  { name: "Bundle", shortName: "bundle" },
];

// Suggested specification names per category slug (used as hints in the admin product form).
export const CATEGORY_SPEC_HINTS: Record<string, string[]> = {
  "paints-and-painting-supplies": ["Paint type", "Finish", "Colour", "Pack size", "Coverage"],
  "pvc-pipes-and-fittings": ["Diameter", "Length", "Material", "Pressure rating", "Fitting compatibility"],
  "ppr-pipes-and-fittings": ["Diameter", "Length", "Material", "Pressure rating", "Fitting compatibility"],
  "plywood-and-boards": ["Thickness", "Sheet dimensions", "Grade", "Board type"],
  "garden-pipes-and-water-hoses": ["Length", "Diameter", "Material", "Roll configuration"],
  "cutting-blades": ["Blade type", "Size / diameter", "Compatible tool", "Material"],
  "regmal-sandpaper-and-abrasives": ["Grit", "Size", "Material", "Intended application"],
  "paint-brushes-and-rollers": ["Brush type", "Width", "Bristle type", "Intended application"],
  "plaster-of-paris-pop": ["Pack weight", "Intended application"],
  "wall-putty": ["Pack weight", "Intended application"],
};
