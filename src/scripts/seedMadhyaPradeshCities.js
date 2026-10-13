import "dotenv/config";
import dns from "node:dns";
import connectDB from "../config/db.js";
import State from "../models/cities/State.js";
import City from "../models/cities/City.js";

const dnsServers = process.env.DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
if (dnsServers?.length) dns.setServers(dnsServers);

// Starter set of major cities/towns in Madhya Pradesh; not an exhaustive India dataset.
const names = [
  "Bhopal",
  "Indore",
  "Jabalpur",
  "Gwalior",
  "Ujjain",
  "Sagar",
  "Dewas",
  "Satna",
  "Ratlam",
  "Rewa",
  "Murwara",
  "Singrauli",
  "Burhanpur",
  "Khandwa",
  "Bhind",
  "Chhindwara",
  "Guna",
  "Shivpuri",
  "Vidisha",
  "Chhatarpur",
  "Damoh",
  "Mandsaur",
  "Khargone",
  "Neemuch",
  "Pithampur",
  "Hoshangabad",
  "Itarsi",
  "Sehore",
  "Betul",
  "Seoni",
  "Datia",
  "Nagda",
  "Shajapur",
  "Morena",
  "Narmadapuram",
  "Tikamgarh",
  "Harda",
  "Raisen",
  "Ashoknagar",
  "Mhow",
  "Mandla",
  "Dhar",
  "Sidhi",
  "Shahdol",
  "Umaria",
  "Panna",
  "Maihar",
  "Katni"
];
const slugify = (value) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
async function run() {
  await connectDB();
  const state = await State.findOne({ code: "MP" });
  if (!state) throw new Error("Madhya Pradesh state not found. Run seedIndiaStates.js first.");
  let added = 0, linked = 0;
  for (const name of names) {
    const existing = await City.findOne({ $or: [{ slug: slugify(name) }, { name, state: "Madhya Pradesh" }] });
    if (existing) {
      if (existing.state === "Madhya Pradesh" && !existing.stateId?.equals(state._id)) { existing.stateId = state._id; await existing.save(); linked++; }
      continue;
    }
    await City.create({ name, slug: slugify(name), state: state.name, stateId: state._id, country: "India", isActive: true, isPopular: false });
    added++;
  }
  console.log(`Madhya Pradesh cities added: ${added}; existing cities linked: ${linked}`);
  process.exit(0);
}
run().catch((error) => { console.error("Madhya Pradesh city seed failed:", error); process.exit(1); });
