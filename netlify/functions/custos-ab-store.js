// VG · Custos A&B — armazenamento partilhado autenticado.
// V35.3: autorização server-side, escrita por perfil e leituras limitadas ao hotel quando aplicável.
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

const STORE_NAME="vg-custos-ab",AUTH_STORE_NAME="vg-dashboard-operacoes";
const KNOWN_HOTELS=["VG Alagoas", "VG Cabo", "VG Collection Poesia São Luís", "VG Collection Sunset Cumbuco", "VG Collection Ópera São Luís", "VG Cumbuco", "VG Fortaleza", "VG Mares", "VG Salvador", "VG Touros", "VG Collection Amazônia", "VG Collection Ouro Preto", "VG Eco Resort De Angra", "VG Paulista", "VG Rio De Janeiro", "VG Isla Canela", "VG Alentejo Vineyards", "VG Casas De Elvas", "VG Collection Alter Real", "VG Collection Elvas", "VG Collection Monte Do Vilar", "VG Evora", "VG Nep Kids", "VG Albacora", "VG Ampalius", "VG Atlantico", "VG Cerro Alagoa", "VG Collection Praia", "VG Lagos", "VG Marina", "VG Nautico", "VG Tavira", "VG Coimbra", "VG Collection Figueira Da Foz", "VG Collection Serra Da Estrela", "VG Collection Tomar", "VG Cascais", "VG Collection Palacio Dos Arcos", "VG Collection S. Miguel", "VG Collection Sintra", "VG Ericeira", "VG Estoril", "VG Opera", "VG Santa Cruz", "VG Collection Braga", "VG Collection Douro", "VG Collection Ponte De Lima Vineyards", "VG Douro Vineyards", "VG Porto", "VG Porto Ribeira"];
function b64urlDecode(input){let s=String(input||'').replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';return Buffer.from(s,'base64');}
function norm(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/^(HOTEL\s+)?VILA\s+GALE\s+/,'').replace(/^VG(C)?\s+/,'').replace(/^COLLECTION\s+/,'').replace(/\s+/g,' ').trim();}
const HOTEL_NORMS=new Set(KNOWN_HOTELS.map(norm));
function isFull(u){return !!u&&['direcao','admin','compras'].includes(String(u.role||'').toLowerCase());}
function userHotels(u){if(['direcao','admin'].includes(String(u?.role||'').toLowerCase()))return ['*'];const a=Array.isArray(u?.hotels)?u.hotels:(u?.hotel&&u.hotel!=='*'?[u.hotel]:[]);return [...new Set(a.map(x=>String(x||'').trim()).filter(Boolean))];}
function canModule(u,m){if(isFull(u))return true;if(Array.isArray(u?.modules)&&u.modules.length)return u.modules.includes(m);return m==='ab'&&['diretor','assistente'].includes(String(u?.role||'').toLowerCase());}
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
async function authenticatedUser(req){try{const h=req.headers.get('authorization')||'',m=String(h).match(/^Bearer\s+(.+)$/i);if(!m)return null;const parts=m[1].trim().split('.');if(parts.length!==2)return null;const authStore=getStore({name:AUTH_STORE_NAME,consistency:'strong'}),secretRec=await authStore.get('_auth-secret-v1',{type:'json'});if(!secretRec?.value)return null;const expected=crypto.createHmac('sha256',Buffer.from(secretRec.value,'base64')).update(parts[0]).digest(),actual=b64urlDecode(parts[1]);if(actual.length!==expected.length||!crypto.timingSafeEqual(actual,expected))return null;const payload=JSON.parse(b64urlDecode(parts[0]).toString('utf8'));if(!payload?.sub||!payload?.exp||payload.exp<=Math.floor(Date.now()/1000))return null;const users=(await authStore.get('users',{type:'json'}))||{},u=users[payload.sub];if(!u||u.active===false||Number(u.authVersion||1)!==Number(payload.av||1))return null;return {user:payload.sub,role:u.role,hotel:u.hotel,hotels:Array.isArray(u.hotels)?u.hotels:(u.hotel&&u.hotel!=='*'?[u.hotel]:[]),modules:Array.isArray(u.modules)?u.modules:[],name:u.name};}catch(e){return null;}}
function hotelKeyMatch(k,hotel){return norm(k)===norm(hotel);}
function hotelKeyMatchAny(k,hotels){return (Array.isArray(hotels)?hotels:[hotels]).some(h=>hotelKeyMatch(k,h));}
function scopeHotel(value,hotels,parentKey=''){
  const allowed=(Array.isArray(hotels)?hotels:[hotels]).filter(Boolean);
  if(value==null||allowed.includes('*')||!allowed.length)return value;
  if(Array.isArray(value)){
    if(parentKey.toLowerCase()==='hoteis')return value.filter(x=>typeof x==='string'?hotelKeyMatchAny(x,allowed):hotelKeyMatchAny(x?.nome||x?.hotel,allowed)).map(clone);
    const hasHotel=value.some(x=>x&&typeof x==='object'&&!Array.isArray(x)&&['hotel','Hotel','HOTEL','nomeHotel','hotelNome'].some(k=>x[k]!=null));
    return value.filter(x=>!hasHotel||hotelKeyMatchAny(x.hotel??x.Hotel??x.HOTEL??x.nomeHotel??x.hotelNome,allowed)).map(x=>scopeHotel(x,allowed,parentKey));
  }
  if(typeof value!=='object')return value;
  if(parentKey==='porHotel'){const out={};for(const [k,v] of Object.entries(value))if(hotelKeyMatchAny(k,allowed))out[k]=scopeHotel(v,allowed,k);return out;}
  const entries=Object.entries(value),hotelKeys=entries.filter(([k])=>HOTEL_NORMS.has(norm(k)));
  if(hotelKeys.length){const out={};for(const [k,v] of entries){if(HOTEL_NORMS.has(norm(k))){if(hotelKeyMatchAny(k,allowed))out[k]=scopeHotel(v,allowed,k);}else out[k]=scopeHotel(v,allowed,k);}return out;}
  const out={};for(const [k,v] of entries)out[k]=scopeHotel(v,allowed,k);return out;
}
function scopeRead(key,data,user){if(isFull(user))return data;const hs=userHotels(user);if(!hs.length)return null;if(key==='users'||key==='audit')return [];return scopeHotel(data,hs,key);}
function mergeForecasts(existing,incoming,user){const out=clone(existing||{}),src=incoming||{};for(const [period,rec] of Object.entries(src)){const cur=out[period]&&typeof out[period]==='object'?clone(out[period]):{};cur.ano=rec?.ano??cur.ano;cur.mes=rec?.mes??cur.mes;cur.ts=rec?.ts||new Date().toISOString();cur.by=user.user;cur.cenario=rec?.cenario||cur.cenario||{};cur.porHotel=cur.porHotel&&typeof cur.porHotel==='object'?cur.porHotel:{};for(const [h,v] of Object.entries(rec?.porHotel||{}))if(hotelKeyMatchAny(h,userHotels(user)))cur.porHotel[h]=v;out[period]=cur;}return out;}
function mergeAudit(existing,incoming,user){const old=Array.isArray(existing)?existing:[],inc=Array.isArray(incoming)?incoming:[];const fresh=inc.filter(x=>String(x?.user||'').toLowerCase()===String(user.user||'').toLowerCase()).map(x=>({ts:x.ts||new Date().toISOString(),user:user.user,acao:String(x.acao||'').slice(0,120),detalhe:String(x.detalhe||'').slice(0,1000)}));const seen=new Set();return fresh.concat(old).filter(x=>{const k=String(x.ts)+'|'+String(x.user)+'|'+String(x.acao)+'|'+String(x.detalhe);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,200);}
function resp(obj,status=200){return new Response(JSON.stringify(obj),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});}

export default async (req)=>{
  if(req.method!=="POST")return resp({error:"POST only"},405);
  const user=await authenticatedUser(req);if(!user)return resp({error:'Sessão inválida ou expirada.'},401);
  if(!canModule(user,'ab'))return resp({error:'O seu perfil não tem acesso a Compras & A&B.'},403);
  let payload;try{payload=await req.json();}catch{return resp({error:'JSON inválido'},400);}
  const {action,key,data}=payload||{};if(!action)return resp({error:'action em falta'},400);if(!key&&action!=='list')return resp({error:'key em falta'},400);
  const store=getStore({name:STORE_NAME,consistency:'strong'});
  try{
    if(action==='get'){const v=await store.get(key,{type:'json'});return resp({ok:true,data:scopeRead(key,v??null,user)});}
    if(action==='list'){if(!isFull(user))return resp({error:'Sem permissões para listar chaves.'},403);const {blobs}=await store.list({prefix:key||''});return resp({ok:true,data:blobs.map(b=>b.key)});}
    if(action==='set'){
      if(isFull(user)){await store.setJSON(key,data);return resp({ok:true});}
      if(key==='previsoes'){const cur=await store.get(key,{type:'json'});await store.setJSON(key,mergeForecasts(cur,data,user));return resp({ok:true,scoped:true});}
      if(key==='audit'){const cur=await store.get(key,{type:'json'});await store.setJSON(key,mergeAudit(cur,data,user));return resp({ok:true,scoped:true});}
      return resp({error:'Este perfil não pode publicar ou alterar dados globais de A&B.'},403);
    }
    if(action==='del'){if(!isFull(user))return resp({error:'Este perfil não pode eliminar dados de A&B.'},403);await store.delete(key);return resp({ok:true});}
    return resp({error:'action desconhecida'},400);
  }catch(e){return resp({error:String(e?.message||e)},500);}
};
export const config={path:"/api/shared"};
