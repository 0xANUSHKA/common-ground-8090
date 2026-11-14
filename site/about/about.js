// The about page: the fund's console film and the permission check.
import { Tour } from '../tour/tour.js';
import dashScript from '../dashfilm/script.js';
import { paint } from '../film/lilguy.js';
import { gate } from '../gate.js';
import { autoplay } from '../autoplay.js';

paint(document.querySelector('main'));
gate(document.querySelector('[data-gate]'));

const lazy = document.querySelectorAll('[data-lazy-bg]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-near'); io.unobserve(e.target); } }), { rootMargin: '600px 0px' });
  lazy.forEach((el) => io.observe(el));
} else lazy.forEach((el) => el.classList.add('is-near'));

const root = document.getElementById('dash-film');
if (root) autoplay(new Tour(root, dashScript, { driver: 'manual' }), root, document.querySelector('[data-dash-toggle]'));
