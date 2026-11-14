const base='https://api.factory.8090.dev/v2/external-api';
export async function factoryRequest(path:string,method='GET',body?:unknown){
 const key=process.env.SOFTWARE_FACTORY_API_KEY;if(!key)throw new Error('8090 key not configured');
 const r=await fetch(base+path,{method,headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw new Error(`8090 ${path} returned HTTP ${r.status}`);
 return r.json() as Promise<any>;
}
export async function recordRequirement(jobId:string,prompt:string,contract:string){
 if(!process.env.SOFTWARE_FACTORY_API_KEY)return undefined;
 // Only this requested demo brief and technical contract are sent; never repo contents or credentials.
 const title=`Common Ground build ${jobId}`;
 const existing=await factoryRequest('/requirements?page_size=100');
 const previous=(existing.data||existing).items?.find((x:any)=>x.title===title);if(previous)return previous;
 const response=await factoryRequest('/requirements','POST',{title,document_type:'FEATURE',markdown_content:`# Requested tool\n${prompt}\n\n# Execution contract\n${contract}\n\n# Distribution\nReview the exact version before granting named recipients access. 8090 records the specification; the Common Ground worker executes code and tests.`});
 return response.data||response;
}
