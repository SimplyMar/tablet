import './styles/tokens.css';
import './styles/base.css';
import './styles/home.css';
import './styles/panels.css';
import './styles/work.css';
import './styles/sheets.css';
import { createDashboard } from './ui/dashboard';
import { startNowPlaying } from './native/nowplaying';

const stage = document.getElementById('stage')!;
const viewport = document.getElementById('viewport')!;

function fit() {
  const s = Math.min(innerWidth / 1152, innerHeight / 718);
  stage.style.transform = `scale(${s})`;
}
addEventListener('resize', fit);
fit();

const dash = createDashboard(stage);

// handle for screenshots and manual poking: window.__dash.openPanel('music')
(window as unknown as { __dash: typeof dash }).__dash = dash;
void startNowPlaying();
viewport.dataset.ready = '1';
