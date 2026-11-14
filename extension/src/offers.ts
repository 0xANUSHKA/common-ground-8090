type Offer = { tool: { id: string; hash: string; name: string }; owner: { name: string } };
export function newOffers(previous: Set<string> | null, offers: Offer[]) {
  const current = new Set(offers.map(x => `${x.tool.id}:${x.tool.hash}`));
  const fresh = previous === null ? [] : offers.filter(x => !previous.has(`${x.tool.id}:${x.tool.hash}`));
  return { current, fresh: [...new Map(fresh.map(x=>[`${x.tool.id}:${x.tool.hash}`,x])).values()] };
}
