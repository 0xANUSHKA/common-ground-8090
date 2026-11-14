// The home page: the editor film. It starts by itself when it's on screen, holds on the last frame, then plays again.
// Every frame is a function of t. ?t=12.5 freezes a moment.
import { film } from './film/section.js';
import { paint } from './film/lilguy.js';
import { autoplay } from './autoplay.js';

paint(document.querySelector('main'));

const root = document.getElementById('film');
const tour = film(root);
autoplay(tour, root, document.querySelector('[data-film-toggle]'));
