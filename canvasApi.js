import { normalizeBaseUrl } from './utils.js';

async function apiFetch(url, token){
  const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});
  if(!r.ok){const t=await r.text();throw new Error(`Canvas API error ${r.status}: ${t||r.statusText}`);} return r;
}
const parseNext=(h)=>{if(!h) return null; for(const p of h.split(',')){const m=p.match(/<([^>]+)>;\s*rel="next"/); if(m) return m[1];} return null;};
async function fetchAll(path,{baseUrl,token,query={}}){
  const b=normalizeBaseUrl(baseUrl); let url=new URL(path,b); Object.entries(query).forEach(([k,v])=>Array.isArray(v)?v.forEach(x=>url.searchParams.append(`${k}[]`,x)):url.searchParams.set(k,v));
  const out=[]; let next=url.toString();
  while(next){const r=await apiFetch(next,token); const j=await r.json(); if(Array.isArray(j)) out.push(...j); next=parseNext(r.headers.get('Link'));}
  return out;
}
export async function fetchCurrentUser(cfg){const r=await apiFetch(new URL('/api/v1/users/self',normalizeBaseUrl(cfg.baseUrl)).toString(),cfg.token); return r.json();}
export async function fetchCourses(cfg){return fetchAll('/api/v1/courses',{...cfg,query:{enrollment_state:'active',include:['term','total_scores'],per_page:'100'}});}
export async function fetchAssignments(courseId,cfg){return fetchAll(`/api/v1/courses/${courseId}/assignments`,{...cfg,query:{per_page:'100',include:['submission']}});}
