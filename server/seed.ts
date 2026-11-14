import type { Company, User, Binding } from './types.js';
import type { Store } from './store.js';
export const users: User[] = [
  {id:'fabio',name:'Fabio',company:'saildrone',publisher:true,exporter:true,eligible:true,capabilities:['time-series','csv','completeness']},
  {id:'theo',name:'Theo',company:'saildrone',publisher:true,exporter:false,eligible:true,capabilities:['time-series','csv','completeness']},
  {id:'maya',name:'Maya',company:'palmetto',publisher:true,exporter:true,eligible:true,capabilities:['time-series','csv','completeness']},
  {id:'leo',name:'Leo',company:'palmetto',publisher:true,exporter:false,eligible:true,capabilities:['billing','invoices']},
  {id:'elli',name:'Elli',company:'palmetto',publisher:false,exporter:false,eligible:false,capabilities:['time-series','csv']},
];
export const companies: Company[] = [
 {id:'saildrone',name:'Saildrone',participating:true,peers:['palmetto'],publishers:['fabio','theo'],exporters:['fabio'],receivers:['fabio','theo'],classes:['data-quality'],evidence:'https://www.saildrone.com/about'},
 {id:'palmetto',name:'Palmetto',participating:true,peers:['saildrone'],publishers:['maya','leo'],exporters:['maya'],receivers:['maya','leo'],classes:['data-quality'],evidence:'https://palmetto.com/about/media-center/press-release/palmetto-raises-375-million-to-accelerate-residential-clean-energy-independence'},
];
export const marine: Binding = {dataset:'marine',timeColumn:'time',signalColumn:'WIND_SPEED_MEAN',skipUnitsRow:true,timeBasis:'utc',start:'2021-09-30T00:00:00Z',end:'2021-10-01T00:00:00Z',cadenceSeconds:60};
export const solar: Binding = {dataset:'solar',timeColumn:'measured_on',signalColumn:'ac_power__423',skipUnitsRow:false,timeBasis:'local-unspecified',start:'2015-01-01T00:00:00',end:'2015-01-02T00:00:00',cadenceSeconds:60};
export function seed(store: Store) {
 for (const u of users) if (!store.get('user',u.id)) store.put('user',u.id,u);
 for (const c of companies) if (!store.get('company',c.id)) store.put('company',c.id,c);
 for (const u of users) if (!store.get('preference',u.id)) store.put('preference',u.id,{mode:'portfolio',muted:[]});
 if (!store.get('network','demo')) store.put('network','demo',{enabled:true,classes:['data-quality'],maxOpenOffers:2});
}
