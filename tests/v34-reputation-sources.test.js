const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.resolve(__dirname,'..'),js=fs.readFileSync(path.join(root,'assets/js/modules/operations-domains-v33.js'),'utf8');
const seed=require('../assets/data/operations-seed-v33.json');
for(const token of ['GRI por origem / fonte','Booking.com','Expedia','Google','Tripadvisor','repSourceTable','repWeeklyHtml','Semanal','Hotel']) assert(js.includes(token),`Reputação V34 deve expor ${token}`);
const sources=new Set(); for(const r of seed.weeklyReputation?.reports||[]) for(const s of r.sources||[]) sources.add(String(s.name||''));
for(const wanted of ['Booking.com','Google','Tripadvisor','Expedia']) assert([...sources].some(x=>x.toLowerCase()===wanted.toLowerCase()),`seed semanal deve conter origem ${wanted}`);
assert(js.includes('<th>Origem</th><th>GRI</th><th>Δ GRI</th>')&&js.includes('reviewsDelta')&&js.includes('mentionsDelta'),'tabela por origem deve mostrar GRI, variações, reviews e semântica');
console.log('✓ V34: GRI por origem Booking/Expedia/Google/Tripadvisor exposto na Reputação semanal/hotel');
