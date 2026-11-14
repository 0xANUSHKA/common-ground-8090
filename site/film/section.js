// The Common Ground film: builds the fund's ontology map, draws the lil guys, then hands the script to the tour engine.
// ?t=12.5 freezes a moment for checking; ?record&ratio=16:9|1:1|9:16 is the clean stage for recording (../tour/README.md).
import { Tour } from '../tour/tour.js';
import { paint } from './lilguy.js';
import { fundMap } from './fund.js';
import script from './script.js';

export function film(root) {
  const fund = root.querySelector('[data-tour="fund"]');
  if (fund) fundMap(fund);
  paint(root);
  return new Tour(root, script, { driver: 'manual' });
}
