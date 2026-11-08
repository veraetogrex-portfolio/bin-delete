// Bin Delete — github.com/veraetogrex-portfolio · zero dependencies
// Press Delete: the lid flips open, the letters of the label hop into the bin one by one,
// the empty pill folds into a round bin and a ring counts down the undo window.
// Undo throws the letters back out. Listen for the "bin:delete" event to really delete.

const root  = document.querySelector('#danger');
const btn   = root.querySelector('.bd-btn');
const label = root.querySelector('.bd-label');
const bin   = root.querySelector('.bd-bin');
const ring  = root.querySelector('.bd-ring');
const toast = root.querySelector('.bd-toast');
const UNDO_MS = +root.dataset.undo || 3000;

label.innerHTML = [...label.textContent].map(c => `<i>${c}</i>`).join('');
const letters = [...label.children];
let state = 'idle', gen = 0, fullWidth = 0, countdown = null;
const wait = (ms, g) => new Promise((ok, no) => setTimeout(() => g === gen ? ok() : no('cancelled'), ms));

// centre of an element in the button's own pixels (works inside scaled containers too)
function centre(el) {
  const b = btn.getBoundingClientRect(), r = el.getBoundingClientRect(), k = b.width / btn.offsetWidth;
  return { x: (r.left - b.left + r.width / 2) / k, y: (r.top - b.top + r.height / 2) / k };
}

// 1 · one letter, one arc: up and over, spinning, shrinking into the bin's mouth
function hop(el, i, back = false) {
  const from = centre(el), mouth = centre(bin);
  const dx = mouth.x - from.x, dy = mouth.y - 18 - from.y, peak = -78 - i * 12;
  const home = { transform: 'translate(0,0) rotate(0) scale(1)', opacity: 1 };
  const top  = { transform: `translate(${dx * .5}px,${peak}px) rotate(-120deg) scale(.85)`, opacity: 1, offset: .5 };
  const gone = { transform: `translate(${dx}px,${dy}px) rotate(-240deg) scale(.25)`, opacity: 0 };
  const up = 'cubic-bezier(.2,.7,.4,1)', down = 'cubic-bezier(.6,0,.9,.5)';
  const frames = back ? [{ ...gone, easing: up }, { ...top, easing: 'cubic-bezier(.5,0,.5,1)' }, home]
                      : [{ ...home, easing: up }, { ...top, easing: down }, gone];
  return el.animate(frames, { duration: 430, delay: i * 85, fill: 'both' });
}

// 2 · the whole press: open, swallow the label, fold into a circle, start the undo ring
async function press(g = gen) {
  if (state !== 'idle') return;
  state = 'eating';
  try {
    fullWidth = btn.offsetWidth; btn.style.width = fullWidth + 'px';
    btn.classList.add('is-open');
    await wait(140, g);
    const hops = letters.map((el, i) => hop(el, i));
    await Promise.all(hops.map(a => a.finished));
    btn.classList.remove('is-open'); btn.classList.add('is-full');
    bin.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)' }, { transform: 'rotate(7deg)' }, { transform: 'rotate(0)' }], { duration: 360, easing: 'ease-out' });
    btn.classList.add('is-round'); btn.style.width = '128px';
    await wait(460, g);
    root.classList.add('is-gone');
    ring.classList.add('is-on');
    toast.hidden = false;
    toast.animate([{ opacity: 0, transform: 'translate(-50%,16px)' }, { opacity: 1, transform: 'translate(-50%,0)' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    countdown = ring.firstElementChild.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: UNDO_MS, fill: 'forwards' });
    state = 'undoable';
    await countdown.finished;
    if (g !== gen || state !== 'undoable') return;
    state = 'deleted';
    root.dispatchEvent(new CustomEvent('bin:delete', { bubbles: true }));   // ← delete for real here
    toast.firstElementChild.textContent = 'Deleted for good';
    toast.lastElementChild.hidden = true;
  } catch (e) { if (e !== 'cancelled' && e.name !== 'AbortError') throw e; }
}

// 3 · undo: the pill unfolds and the letters jump back out in the same order
async function undo(g = gen) {
  if (state !== 'undoable') return;
  state = 'spitting';
  try {
    countdown.cancel(); ring.classList.remove('is-on'); root.classList.remove('is-gone');
    toast.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate(-50%,12px)' }], { duration: 200, fill: 'forwards' }).finished.then(() => { if (g === gen) toast.hidden = true; });
    btn.classList.remove('is-round'); btn.style.width = fullWidth + 'px';
    await wait(380, g);
    btn.classList.add('is-open');
    letters.forEach(el => el.getAnimations().forEach(a => a.cancel()));
    const hops = letters.map((el, i) => hop(el, i, true));
    await Promise.all(hops.map(a => a.finished));
    btn.classList.remove('is-open', 'is-full');
    letters.forEach(el => el.getAnimations().forEach(a => a.cancel()));
    btn.style.width = '';
    state = 'idle';
  } catch (e) { if (e !== 'cancelled' && e.name !== 'AbortError') throw e; }
}

function reset() {
  gen++; state = 'idle';
  letters.forEach(el => el.getAnimations().forEach(a => a.cancel()));
  if (countdown) countdown.cancel();
  btn.classList.remove('is-open', 'is-full', 'is-round'); btn.style.width = '';
  ring.classList.remove('is-on'); root.classList.remove('is-gone');
  toast.hidden = true; toast.getAnimations().forEach(a => a.cancel());
  toast.firstElementChild.textContent = 'Project deleted'; toast.lastElementChild.hidden = false;
}

btn.addEventListener('click', () => press());
root.querySelector('.bd-undo').addEventListener('click', () => undo());
root.addEventListener('bin:delete', () => setTimeout(reset, 1600));   // demo page: come back after a beat

root.bin = { press, undo, reset };                        // for scripted demos
