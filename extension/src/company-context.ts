type Company = {id:string;kind:string};
// Multiple memberships are normal. Never infer the working company from Redis set order.
export function chooseCompany(orgs:Company[],saved?:string):string {
 const companies=orgs.filter(o=>o.kind==='company');
 if(saved&&companies.some(o=>o.id===saved))return saved;
 return companies.length===1?companies[0].id:'';
}
