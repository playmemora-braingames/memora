
const ORIGIN="https://playmemora-braingames.github.io";
const NOTICE="adult-upload-v1";
const ENABLED=false; // Activate only after the final participant notice has a verified contact.
const headers={"content-type":"application/json","cache-control":"no-store","access-control-allow-origin":ORIGIN,"access-control-allow-methods":"POST, OPTIONS","access-control-allow-headers":"content-type","vary":"Origin"};
const response=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
Deno.serve(async(req:Request)=>{
 if(req.headers.get("origin")!==ORIGIN)return response({error:"origin_not_allowed"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return response({error:"method_not_allowed"},405);
 if(!ENABLED)return response({error:"collection_not_active"},503);
 try {
  if(!(req.headers.get("content-type")||"").startsWith("application/json"))return response({error:"json_required"},415);
  const text=await req.text();if(text.length>4096)return response({error:"request_too_large"},413);
  const body=JSON.parse(text);
  if(!body||typeof body!=="object"||Array.isArray(body))return response({error:"invalid_request"},400);
  const {action}=body;
  if(!["consent","trial","withdraw","export"].includes(action))return response({error:"invalid_action"},400);
  let token=body.token;
  if(action==="consent") {
   if(body.adult!==true||body.agree!==true||body.notice_version!==NOTICE||!["18to29","30to44","45to59","60to75","76plus"].includes(body.age_band))return response({error:"adult_consent_required"},400);
   token=crypto.randomUUID()+crypto.randomUUID();
  }
  if(typeof token!=="string"||!/^([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}){2}$/.test(token))return response({error:"invalid_token"},401);
  let data:Record<string,unknown>={};
  if(action==="consent")data={adult:true,agree:true,notice_version:NOTICE,age_band:body.age_band};
  if(action==="trial"){
   const t=body.trial;
   if(!t||typeof t!=="object"||!["missing","pattern","sequence","pairs"].includes(t.game_type)||!Number.isInteger(t.level)||t.level<1||t.level>12||typeof t.correct!=="boolean"||!(t.response_ms===null||(Number.isInteger(t.response_ms)&&t.response_ms>=0&&t.response_ms<=600000))||typeof t.id!=="string"||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(t.id)||typeof t.played_at!=="string"||!Number.isFinite(Date.parse(t.played_at)))return response({error:"invalid_trial"},400);
   data={id:t.id,game_type:t.game_type,level:t.level,correct:t.correct,response_ms:t.response_ms,played_at:t.played_at};
  }
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url=Deno.env.get("SUPABASE_URL");
  if(!serviceKey||!url)return response({error:"service_unavailable"},503);
  // HMAC prevents stored rate-limit buckets from revealing IP addresses.
  const ip=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
  const hmacKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(serviceKey),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const rateIdentity=action==="consent"?"enroll:"+ip:"participant:"+token;
  const bucket=Array.from(new Uint8Array(await crypto.subtle.sign("HMAC",hmacKey,new TextEncoder().encode(rateIdentity)))).map(x=>x.toString(16).padStart(2,"0")).join("");
  const rpc=await fetch(url+"/rest/v1/rpc/memora_training_request",{method:"POST",headers:{"content-type":"application/json","apikey":serviceKey,"authorization":"Bearer "+serviceKey},body:JSON.stringify({p_action:action,p_hash:await hash(token),p_data:data,p_bucket:bucket})});
  if(!rpc.ok)return response({error:"service_unavailable"},503);
  const result=await rpc.json();
  if(result.error)return response({error:result.error},result.status||400);
  return response(action==="consent"?{...result,token}:result);
 }catch{return response({error:"invalid_or_unavailable_request"},400)}
});
