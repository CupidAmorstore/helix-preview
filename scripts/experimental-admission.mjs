import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Retrospective research triage only. Never writes to a registry or activates orders.
export const POLICY = Object.freeze({maxDrawdown: 0.25, minNeighbourPassShare: 0.5});
const finite = Number.isFinite;
export function assess(row) {
  const reasons = [];
  const r = row?.record;
  const c = row?.candidate;
  const t = c?.train, v = c?.validation;
  const td = t?.maxDrawdown ?? t?.maxDrawdownBound;
  const vd = v?.maxDrawdown ?? v?.maxDrawdownBound;
  const nb = c?.stress?.neighbourPassShare;
  if (r?.status !== 'rejected' || c?.status !== 'rejected' || !Array.isArray(r?.reasons) || r.reasons.length !== 1 || !/^validation trades \d+ < 15$/.test(r.reasons[0]) || !Array.isArray(c?.rejectionReasons) || c.rejectionReasons.length !== 1 || c.rejectionReasons[0] !== r.reasons[0]) reasons.push('not a matching trade-count-only rejection');
  if (!finite(t?.netReturn) || t.netReturn <= 0 || !finite(v?.netReturn) || v.netReturn <= 0) reasons.push('positive historical net returns not established');
  if (!Number.isInteger(v?.trades) || v.trades < 1 || v.trades >= 15 || r?.reasons?.[0] !== `validation trades ${v.trades} < 15`) reasons.push('missing or inconsistent validation trade count');
  if (![td,vd].every(x=>finite(x)&&x>=0&&x<=POLICY.maxDrawdown)) reasons.push('historical drawdown above limit or missing');
  if (!finite(nb)||nb<POLICY.minNeighbourPassShare||nb>1) reasons.push('parameter stability too weak or missing');
  if (c?.test != null) reasons.push('test already inspected: not eligible for this recovery lane');
  if (c?.walkForward && (!finite(c.walkForward.compoundedNet)||c.walkForward.compoundedNet<=0||!Number.isInteger(c.walkForward.positiveFolds)||!Array.isArray(c.walkForward.folds)||c.walkForward.folds.length!==4||c.walkForward.positiveFolds<2||c.walkForward.positiveFolds>4)) reasons.push('recorded walk-forward failed or invalid');
  return {key:row?.key, spec:c?.spec??null, state:reasons.length?'research_deferred':'experimental_research_eligible', reasons, warnings:[...(v?.trades===1?['only one validation trade']:[]),...(!c?.walkForward?['walk-forward not recorded']:[]),'historical modeled costs; fresh venue cost evidence required','selection used previously observed results; prospective evidence required'], historicalValidationNet:v?.netReturn??null, historicalValidationTrades:v?.trades??null, historicalValidationDrawdown:vd??null, historicalTrainingDrawdown:td??null, qualifiedPaper:false, executionAuthorized:false, realMoneyAuthorized:false};
}
export function fromRepo(root) {
  const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
  const reg=read('research/registry.json'), cache=new Map(), rows=[];
  for(const [key,record] of Object.entries(reg)) {
    if(record.status!=='rejected'||record.reasons?.length!==1||!/^validation trades \d+ < 15$/.test(record.reasons[0]))continue;
    const [family,symbol,interval,datasetId]=key.split('|');
    if(!/^run-[0-9TZ-]+$/.test(record.runId)||!['3600000','86400000'].includes(interval)) throw new Error(`invalid registry identity: ${key}`);
    const filename=`research/runs/${record.runId}-${interval==='3600000'?'1h':'1d'}.json`;
    if(!cache.has(filename))cache.set(filename,read(filename));
    const run=cache.get(filename);
    const matches=(symbol==='POOLED'?run.pooled??[]:(run.markets??[]).filter(m=>m.datasetId===datasetId&&m.market.symbol===symbol).flatMap(m=>m.candidates??[])).filter(c=>c.spec?.family===family);
    if(matches.length!==1) throw new Error(`ambiguous or absent run evidence: ${key}`);
    rows.push({key,record,candidate:matches[0]});
  }
  return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const rows=fromRepo(process.argv[2]??process.cwd());
  const results=rows.map(assess);
  console.log(JSON.stringify({policy:POLICY,scope:'historical research triage only',screened:results.length,eligible:results.filter(r=>r.state==='experimental_research_eligible').length,results},null,2));
}
