import { render } from 'preact';
import { createBrowserStorage } from '../infrastructure/storage/browser-storage.ts';
import { App } from './app.tsx';
import './styles.css';

const root = document.getElementById('app');
if (root === null) {
  throw new Error('application root #app is missing');
}

const { adapter } = createBrowserStorage();
render(<App storage={adapter} />, root);
