import { createRoot } from 'react-dom/client';
// import App from './App_rttest';
import ScriptWindow from './App_systemaudio';
import App from './App';
import SetupModal from './SetupModal';
import { ThemeProvider } from 'styled-components';
import { theme } from '../style/theme';
import './App.css';

const searchParams = new URLSearchParams(window.location.search);
const isOverlay = searchParams.get('overlay') === '1';
const isSetup = searchParams.get('setup') === '1';

const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
const rendered = isOverlay ? (
  <ScriptWindow />
) : isSetup ? (
  <SetupModal />
) : (
  <App />
);
root.render(<ThemeProvider theme={theme}>{rendered}</ThemeProvider>);

// calling IPC exposed from preload script
window.electron?.ipcRenderer.once('ipc-example', (arg) => {
  console.log(arg);
});
window.electron?.ipcRenderer.sendMessage('ipc-example', ['ping', isOverlay]);
