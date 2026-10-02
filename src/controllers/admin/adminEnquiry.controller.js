import mongoose from "mongoose";
import Enquiry from "../../models/enquiries/Enquiry.js";
import User from "../../models/users/User.js";
import ProviderProfile from "../../models/providers/ProviderProfile.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { escapeRegex } from "../../utils/regex.js";
import { isPubliclyVisibleListing } from "../../utils/publicListing.js";
import { ENQUIRY_STATUSES, ENQUIRY_INTENTS, ENQUIRY_TARGET_TYPES } from "../../utils/enquiryDomain.js";

const TARGET_MODELS = Object.freeze({ gym: Gym, trainer: Trainer, nutritionist: Nutritionist });
const ASSIGNMENTS = Object.freeze(["all", "assigned", "unassigned"]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

function badRequest(res, message, field, details = {}) { return res.status(400).json({ success: false, message, errors: [{ field, message }], ...details }); }
function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function positiveInteger(value, fallback, field, max) {
  if (value === undefined || value === "") return { value: fallback };
  if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` };
  const parsed = Number(value); return parsed < 1 || parsed > max ? { error: `${field} must be between 1 and ${max}` } : { value: parsed };
}

async function providerMap(items) {
  const ids = [...new Set(items.map((item) => item.provider).filter(Boolean).map(String))];
  if (!ids.length) return new Map();
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: ids }, role: "business" }).select("name providerType isActive").lean(),
    ProviderProfile.find({ user: { $in: ids } }).select("user businessName").lean(),
  ]);
  const businessNames = new Map(profiles.map((profile) => [String(profile.user), profile.businessName || ""]));
  return new Map(users.map((user) => [String(user._id), { id: String(user._id), name: user.name || "", businessName: businessNames.get(String(user._id)) || "", providerType: user.providerType || null, isActive: Boolean(user.isActive) }]));
}

function snapshotListing(item) {
  const snapshot = item.listingSnapshot || {};
  return { id: String(item.target), name: snapshot.name || "Unavailable listing", slug: snapshot.slug || "", entityType: snapshot.entityType || item.targetType, image: snapshot.imageUrl ? { url: snapshot.imageUrl, alt: snapshot.name || "" } : null };
}

function serializeList(item, providers) {
  const provider = item.provider ? providers.get(String(item.provider)) || { id: String(item.provider), name: "Unavailable provider", businessName: "", providerType: null, isActive: false } : null;
  const message = item.message || "";
  return { id: String(item._id), targetType: item.targetType, intent: item.intent, status: item.status, messagePreview: message.length > 180 ? `${message.slice(0,177)}...` : message, contact: { name: item.contact?.name || "", email: item.contact?.email || "", phone: item.contact?.phone || "" }, context: { membershipName: item.context?.membershipName || "", className: item.context?.className || "" }, listing: snapshotListing(item), provider, assignment: item.provider ? "assigned" : "unassigned", customerId: String(item.customer), createdAt: item.createdAt, updatedAt: item.updatedAt };
}

async function currentListing(item) {
  const Model = TARGET_MODELS[item.targetType];
  if (!Model) return { exists: false, isActive: false, moderationStatus: null, publiclyAvailable: false, ownerChanged: false, href: null };
  const listing = await Model.findById(item.target).select("_id owner isActive moderationStatus").lean();
  if (!listing) return { exists: false, isActive: false, moderationStatus: null, publiclyAvailable: false, ownerChanged: false, href: null };
  const storedProvider = item.provider ? String(item.provider) : null; const currentOwner = listing.owner ? String(listing.owner) : null;
  return { exists: true, isActive: Boolean(listing.isActive), moderationStatus: listing.moderationStatus || null, publiclyAvailable: isPubliclyVisibleListing(listing), ownerChanged: storedProvider !== currentOwner, href: `/admin/listings/${item.targetType}/${item.target}` };
}

export async function getAdminEnquiries(req, res) {
  try {
    const allowed = ["page","limit","status","intent","assignment","targetType","search"];
    const unsupported = Object.keys(req.query || {}).filter((field) => !allowed.includes(field));
    if (unsupported.length) return badRequest(res,"Unsupported enquiry query fields","query",{unsupportedFields:unsupported});
    const page=positiveInteger(req.query?.page,1,"page",1000); if(page.error)return badRequest(res,page.error,"page");
    const limit=positiveInteger(req.query?.limit,DEFAULT_LIMIT,"limit",MAX_LIMIT); if(limit.error)return badRequest(res,limit.error,"limit");
    const status=clean(req.query?.status).toLowerCase(); const intent=clean(req.query?.intent).toLowerCase(); const assignment=clean(req.query?.assignment).toLowerCase()||"all"; const targetType=clean(req.query?.targetType).toLowerCase(); const search=clean(req.query?.search);
    if(status&&!ENQUIRY_STATUSES.includes(status))return badRequest(res,`status must be one of: ${ENQUIRY_STATUSES.join(", ")}`,"status");
    if(intent&&!ENQUIRY_INTENTS.includes(intent))return badRequest(res,`intent must be one of: ${ENQUIRY_INTENTS.join(", ")}`,"intent");
    if(!ASSIGNMENTS.includes(assignment))return badRequest(res,"assignment must be all, assigned, or unassigned","assignment");
    if(targetType&&!ENQUIRY_TARGET_TYPES.includes(targetType))return badRequest(res,"targetType must be gym, trainer, or nutritionist","targetType");
    if(search.length>MAX_SEARCH_LENGTH)return badRequest(res,`search must not exceed ${MAX_SEARCH_LENGTH} characters`,"search");
    const filter={}; if(status)filter.status=status;if(intent)filter.intent=intent;if(targetType)filter.targetType=targetType;if(assignment==="assigned")filter.provider={$ne:null};if(assignment==="unassigned")filter.provider=null;
    if(search){const expression=new RegExp(escapeRegex(search),"i");filter.$or=["contact.name","contact.email","contact.phone","listingSnapshot.name","message"].map((field)=>({[field]:expression}));}
    const [items,total]=await Promise.all([Enquiry.find(filter).sort({createdAt:-1,_id:-1}).skip((page.value-1)*limit.value).limit(limit.value).lean(),Enquiry.countDocuments(filter)]);
    const providers=await providerMap(items);
    return res.status(200).json({success:true,data:items.map((item)=>serializeList(item,providers)),pagination:{page:page.value,limit:limit.value,total,pages:Math.ceil(total/limit.value)}});
  } catch(error){console.error("Admin enquiry list error:",error?.message);return res.status(500).json({success:false,message:"Failed to fetch admin enquiries"});}
}

export async function getAdminEnquirySummary(req,res){
  try{const [row]=await Enquiry.aggregate([{$group:{_id:null,total:{$sum:1},submitted:{$sum:{$cond:[{$eq:["$status","submitted"]},1,0]}},viewed:{$sum:{$cond:[{$eq:["$status","viewed"]},1,0]}},contacted:{$sum:{$cond:[{$eq:["$status","contacted"]},1,0]}},closed:{$sum:{$cond:[{$eq:["$status","closed"]},1,0]}},assigned:{$sum:{$cond:[{$ne:["$provider",null]},1,0]}},unassigned:{$sum:{$cond:[{$eq:["$provider",null]},1,0]}}}}]);
    return res.status(200).json({success:true,data:row?{total:row.total,submitted:row.submitted,viewed:row.viewed,contacted:row.contacted,closed:row.closed,assigned:row.assigned,unassigned:row.unassigned}:{total:0,submitted:0,viewed:0,contacted:0,closed:0,assigned:0,unassigned:0}});
  }catch(error){console.error("Admin enquiry summary error:",error?.message);return res.status(500).json({success:false,message:"Failed to fetch admin enquiry summary"});}
}

export async function getAdminEnquiryById(req,res){
  try{if(!mongoose.isValidObjectId(req.params.id))return badRequest(res,"Enquiry ID must be a valid MongoDB ObjectId","id");
    const item=await Enquiry.findById(req.params.id).lean();if(!item)return res.status(404).json({success:false,message:"Enquiry not found"});
    const providers=await providerMap([item]);const base=serializeList(item,providers);const current=await currentListing(item);
    return res.status(200).json({success:true,data:{...base,message:item.message||"",listing:{...base.listing,current}}});
  }catch(error){console.error("Admin enquiry detail error:",error?.message);return res.status(500).json({success:false,message:"Failed to fetch admin enquiry"});}
}
