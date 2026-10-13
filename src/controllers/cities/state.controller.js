import State from "../../models/cities/State.js";
export async function getStates(req, res) {
  try {
    const states = await State.find({ isActive: true }).sort({ name: 1 }).select("name code type country").lean();
    return res.json({ success: true, count: states.length, data: states });
  } catch (error) {
    console.error("Get states error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch states" });
  }
}
