import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Enquiry from "../src/models/enquiries/Enquiry.js";
import Gym from "../src/models/gyms/Gym.js";
import { getProviderEnquiries, getProviderEnquirySummary, getProviderEnquiryById, updateProviderEnquiryStatus } from "../src/controllers/providers/providerEnquiry.controller.js";
import authorizeRoles from "../src/middleware/auth/roleMiddleware.js";

const originals=[]; const mock=(target,key,value)=>{originals.push([target,key,target[key]]);target[key]=value;};
afterEach(()=>{while(originals.length){const [target,key,value]=originals.pop();target[key]=value;}});
const response=()=>({statusCode:200,body:null,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
const chain=(value)=>({select(){return this;},sort(){return this;},skip(){return this;},limit(){return this;},lean:async()=>value});
const providerA=new mongoose.Types.ObjectId(); const providerB=new mongoose.Types.ObjectId();
const enquiry=(overrides={})=>({_id:new mongoose.Types.ObjectId(),provider:providerA,customer:new mongoose.Types.ObjectId(),targetType:"gym",target:new mongoose.Types.ObjectId(),intent:"general",status:"submitted",message:"Please contact me",contact:{name:"Ayush",email:"a@example.com",phone:"999"},context:{membershipName:"",className:""},listingSnapshot:{name:"Gym A",slug:"gym-a",entityType:"gym",imageUrl:"image.jpg",href:"/gym-detail/gym-a"},createdAt:new Date(),updatedAt:new Date(),...overrides});

test("provider enquiry routes accept only business identities",()=>{const mw=authorizeRoles("business");for(const [user,status] of [[undefined,401],[{role:"user"},403],[{role:"admin"},403]]){const res=response();let next=false;mw({user},res,()=>{next=true;});assert.equal(res.statusCode,status);assert.equal(next,false);}let next=false;mw({user:{role:"business"}},response(),()=>{next=true;});assert.equal(next,true);});

test("provider list is owner-scoped, newest-first, paginated, and excludes ownerless/other providers by query",{concurrency:false},async()=>{const item=enquiry();let filter,sort,skip,limit;mock(Enquiry,"find",(value)=>{filter=value;const q=chain([item]);q.sort=(v)=>{sort=v;return q;};q.skip=(v)=>{skip=v;return q;};q.limit=(v)=>{limit=v;return q;};return q;});mock(Enquiry,"countDocuments",async(value)=>{assert.deepEqual(value,filter);return 21;});mock(Gym,"find",()=>chain([{_id:item.target}]));const res=response();await getProviderEnquiries({user:{id:providerA},query:{page:"2",limit:"10"}},res);assert.equal(String(filter.provider),String(providerA));assert.deepEqual(sort,{createdAt:-1,_id:-1});assert.equal(skip,10);assert.equal(limit,10);assert.deepEqual(res.body.pagination,{page:2,limit:10,total:21,pages:3});assert.equal("provider" in res.body.data[0],false);assert.equal("customer" in res.body.data[0],false);});

test("provider list validates filters and pagination",{concurrency:false},async()=>{for(const query of [{status:"bad"},{intent:"bad"},{page:"0"},{limit:"51"},{search:"x".repeat(101)},{providerId:String(providerB)}]){const res=response();await getProviderEnquiries({user:{id:providerA},query},res);assert.equal(res.statusCode,400);}});

test("provider list applies status, intent, and escaped search inside ownership filter",{concurrency:false},async()=>{let filter;mock(Enquiry,"find",(value)=>{filter=value;return chain([]);});mock(Enquiry,"countDocuments",async()=>0);const res=response();await getProviderEnquiries({user:{id:providerA},query:{status:"viewed",intent:"training",search:"A.*(test)"}},res);assert.equal(String(filter.provider),String(providerA));assert.equal(filter.status,"viewed");assert.equal(filter.intent,"training");assert.equal(filter.$or.length,5);assert.equal(filter.$or[0]["contact.name"].source,"A\\\.\\*\\\(test\\\)");});

test("summary counts only the authenticated provider match",{concurrency:false},async()=>{let pipeline;mock(Enquiry,"aggregate",async(value)=>{pipeline=value;return [{_id:"submitted",count:2},{_id:"contacted",count:3}];});const res=response();await getProviderEnquirySummary({user:{id:providerA}},res);assert.equal(String(pipeline[0].$match.provider),String(providerA));assert.deepEqual(res.body.data,{total:5,submitted:2,viewed:0,contacted:3,closed:0});});

test("detail atomically auto-marks submitted as viewed and returns snapshot contact",{concurrency:false},async()=>{const item=enquiry({status:"viewed"});let filter,update;mock(Enquiry,"findOneAndUpdate",(f,u)=>{filter=f;update=u;return chain(item);});mock(Gym,"find",()=>chain([]));const res=response();await getProviderEnquiryById({user:{id:providerA},params:{id:String(item._id)}},res);assert.equal(String(filter.provider),String(providerA));assert.equal(filter.status,"submitted");assert.deepEqual(update,{$set:{status:"viewed"}});assert.equal(res.body.data.status,"viewed");assert.equal(res.body.data.contact.email,"a@example.com");assert.equal(res.body.data.listing.available,false);});

test("contacted/closed detail remains unchanged and cross-provider IDs receive safe 404",{concurrency:false},async()=>{for(const status of ["contacted","closed"]){const item=enquiry({status});mock(Enquiry,"findOneAndUpdate",()=>chain(null));mock(Enquiry,"findOne",(filter)=>{assert.equal(String(filter.provider),String(providerA));return chain(item);});mock(Gym,"find",()=>chain([{_id:item.target}]));const res=response();await getProviderEnquiryById({user:{id:providerA},params:{id:String(item._id)}},res);assert.equal(res.body.data.status,status);while(originals.length){const [target,key,value]=originals.pop();target[key]=value;}}
  mock(Enquiry,"findOneAndUpdate",()=>chain(null));mock(Enquiry,"findOne",()=>chain(null));const res=response();await getProviderEnquiryById({user:{id:providerB},params:{id:String(new mongoose.Types.ObjectId())}},res);assert.equal(res.statusCode,404);
});

test("detail rejects malformed IDs",async()=>{const res=response();await getProviderEnquiryById({user:{id:providerA},params:{id:"bad"}},res);assert.equal(res.statusCode,400);});

for(const [from,to] of [["submitted","contacted"],["submitted","closed"],["viewed","contacted"],["viewed","closed"],["contacted","closed"]]){
  test(`status transition ${from} to ${to} is allowed`,{concurrency:false},async()=>{const item=enquiry({status:from});mock(Enquiry,"findOne",(filter)=>{assert.equal(String(filter.provider),String(providerA));return chain({_id:item._id,status:from});});mock(Enquiry,"findOneAndUpdate",(filter,update)=>{assert.equal(filter.status,from);return chain({...item,status:update.$set.status});});mock(Gym,"find",()=>chain([]));const res=response();await updateProviderEnquiryStatus({user:{id:providerA},params:{id:String(item._id)},body:{status:to}},res);assert.equal(res.statusCode,200);assert.equal(res.body.data.status,to);});
}

test("status rejects backward/closed transitions, unsupported fields, and cross-provider updates",{concurrency:false},async()=>{for(const [from,to] of [["closed","contacted"],["contacted","viewed"],["viewed","submitted"]]){mock(Enquiry,"findOne",()=>chain({status:from}));const res=response();await updateProviderEnquiryStatus({user:{id:providerA},params:{id:String(new mongoose.Types.ObjectId())},body:{status:to}},res);assert.equal(res.statusCode,409);while(originals.length){const [target,key,value]=originals.pop();target[key]=value;}}
  let res=response();await updateProviderEnquiryStatus({user:{id:providerA},params:{id:String(new mongoose.Types.ObjectId())},body:{status:"closed",message:"changed"}},res);assert.equal(res.statusCode,400);
  mock(Enquiry,"findOne",()=>chain(null));res=response();await updateProviderEnquiryStatus({user:{id:providerB},params:{id:String(new mongoose.Types.ObjectId())},body:{status:"closed"}},res);assert.equal(res.statusCode,404);
});
