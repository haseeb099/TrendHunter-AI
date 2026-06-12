import { CATEGORY_LABELS, type CategoryTaxonomyRow } from "@shared/searchTypes";

export type TaxonomySeedInput = Omit<CategoryTaxonomyRow, "id">;

/** Display labels for root categories (Amazon / CJ / AliExpress aligned). */
export const ROOT_CATEGORY_LABELS: Record<string, string> = { ...CATEGORY_LABELS };

/**
 * 3-level taxonomy: root → subcategory → product types.
 * Inspired by Amazon browse nodes, CJ category tree, and AliExpress top categories.
 */
const TAXONOMY_STRUCTURE: Record<string, Record<string, string[]>> = {
  home: {
    Kitchen: ["Gadgets", "Cookware", "Storage", "Utensils", "Appliances"],
    "Bed & Bath": ["Bedding", "Towels", "Shower", "Organizers"],
    Decor: ["Lighting", "Wall art", "Rugs", "Candles", "Mirrors"],
    Cleaning: ["Vacuums", "Mops", "Brushes", "Supplies"],
    Furniture: ["Shelving", "Chairs", "Tables", "Desks"],
    Storage: ["Closet", "Bins", "Hooks", "Drawers"],
  },
  garden: {
    "Outdoor living": ["Patio", "Grills", "Furniture", "Umbrellas"],
    Plants: ["Planters", "Tools", "Soil", "Seeds"],
    Pool: ["Accessories", "Cleaning", "Floats"],
    Lighting: ["Solar", "String lights", "Path lights"],
  },
  beauty: {
    Skincare: ["Serums", "Cleansers", "Moisturizers", "Masks", "Sunscreen"],
    Makeup: ["Eyes", "Lips", "Face", "Tools", "Sets"],
    Hair: ["Styling tools", "Care", "Extensions", "Accessories"],
    Nails: ["Polish", "Tools", "Art kits"],
    Fragrance: ["Perfume", "Body mist", "Diffusers"],
    "Men's grooming": ["Beard", "Shaving", "Skincare"],
  },
  electronics: {
    Audio: ["Earbuds", "Headphones", "Speakers", "Microphones"],
    Mobile: ["Chargers", "Cases", "Cables", "Stands", "Power banks"],
    Computers: ["Keyboards", "Mice", "Monitors", "Hubs", "Storage"],
    Gaming: ["Controllers", "Headsets", "Accessories", "Chairs"],
    "Smart home": ["Lighting", "Security", "Plugs", "Sensors"],
    Cameras: ["Action cams", "Tripods", "Lenses", "Accessories"],
    Wearables: ["Smartwatches", "Bands", "Trackers"],
  },
  fashion: {
    Women: ["Dresses", "Tops", "Bottoms", "Activewear", "Loungewear"],
    Men: ["Shirts", "Pants", "Outerwear", "Activewear"],
    Shoes: ["Sneakers", "Sandals", "Boots", "Heels"],
    Bags: ["Handbags", "Backpacks", "Wallets", "Luggage"],
    Accessories: ["Belts", "Hats", "Scarves", "Sunglasses"],
    Jewelry: ["Necklaces", "Earrings", "Bracelets", "Rings"],
  },
  sports: {
    Fitness: ["Yoga", "Resistance bands", "Weights", "Mats", "Recovery"],
    Outdoor: ["Camping", "Hiking", "Fishing", "Climbing"],
    Cycling: ["Lights", "Locks", "Bags", "Accessories"],
    "Water sports": ["Swim", "Kayak", "Snorkel"],
    Team: ["Soccer", "Basketball", "Training"],
  },
  toys: {
    Educational: ["STEM", "Puzzles", "Books", "Science kits"],
    Plush: ["Animals", "Characters", "Baby toys"],
    Games: ["Board games", "Card games", "Party games"],
    Outdoor: ["Ride-ons", "Sports toys", "Bubbles"],
    Collectibles: ["Figures", "Trading", "Models"],
  },
  pet: {
    Dogs: ["Feeders", "Toys", "Grooming", "Beds", "Leashes"],
    Cats: ["Toys", "Feeders", "Trees", "Grooming", "Litter"],
    Fish: ["Tanks", "Filters", "Decor", "Food"],
    Birds: ["Cages", "Feeders", "Toys"],
    Small: ["Habitats", "Bedding", "Accessories"],
  },
  automotive: {
    Interior: ["Organizers", "Phone mounts", "Seat covers", "Mats"],
    Exterior: ["Care kits", "Covers", "Lights"],
    Electronics: ["Dash cams", "Chargers", "Adapters"],
    Tools: ["Jump starters", "Inflators", "Repair"],
    Motorcycle: ["Helmets", "Gear", "Accessories"],
  },
  health: {
    Wellness: ["Massage", "Aromatherapy", "Sleep aids"],
    Supplements: ["Vitamins", "Protein", "Herbal"],
    "Medical supplies": ["First aid", "Supports", "Monitors"],
    Fitness: ["Posture", "Recovery", "Hydration"],
  },
  office: {
    Desk: ["Organizers", "Lamps", "Pads", "Stands"],
    Stationery: ["Pens", "Notebooks", "Labels", "Planners"],
    Tech: ["Webcams", "Mics", "Cables", "Ergonomic"],
    Presentation: ["Whiteboards", "Markers", "Projectors"],
  },
  baby: {
    Nursery: ["Monitors", "Decor", "Storage", "Lighting"],
    Feeding: ["Bottles", "Bibs", "High chairs", "Warmers"],
    Safety: ["Gates", "Locks", "Outlet covers"],
    Clothing: ["Onesies", "Sleepwear", "Accessories"],
    Gear: ["Strollers", "Carriers", "Travel"],
  },
  tools: {
    "Power tools": ["Drills", "Saws", "Sanders", "Grinders"],
    Hand: ["Wrenches", "Screwdrivers", "Pliers", "Hammers"],
    Measurement: ["Laser", "Levels", "Calipers"],
    Safety: ["Gloves", "Goggles", "Masks"],
    Storage: ["Toolboxes", "Organizers", "Workbenches"],
  },
  jewelry: {
    Necklaces: ["Chains", "Pendants", "Sets"],
    Rings: ["Bands", "Fashion", "Stackable"],
    Watches: ["Smart", "Fashion", "Bands"],
    Earrings: ["Studs", "Hoops", "Drops"],
    Bracelets: ["Bangles", "Charm", "Beaded"],
  },
};

const DEFAULT_REGION = "US,UK,EU,GLOBAL";

function defaultMeta(root: string, sub: string, type: string): Pick<
  TaxonomySeedInput,
  "useCase" | "audience" | "priceBand" | "regionRelevance"
> {
  const priceBand =
    type.toLowerCase().includes("premium") || sub === "Jewelry"
      ? "premium"
      : type.toLowerCase().includes("budget") ||
          ["Utensils", "Cables", "Cases", "Toys"].some((k) => type.includes(k))
        ? "low"
        : "mid";
  return {
    useCase: `${sub} ${type}`.toLowerCase(),
    audience: "general shoppers",
    priceBand,
    regionRelevance: DEFAULT_REGION,
  };
}

export function buildTaxonomySeeds(): TaxonomySeedInput[] {
  const rows: TaxonomySeedInput[] = [];
  for (const [root, subs] of Object.entries(TAXONOMY_STRUCTURE)) {
    for (const [sub, types] of Object.entries(subs)) {
      for (const productType of types) {
        rows.push({
          rootCategory: root,
          subcategory: sub,
          productType,
          ...defaultMeta(root, sub, productType),
        });
      }
    }
  }
  return rows;
}

/** Flat list used when DB table is empty or for migrations. */
export const EXPANDED_TAXONOMY_SEEDS = buildTaxonomySeeds();
