import { createBrowserRouter } from 'react-router';
import SetupPage from './pages/SetupPage';
import GamePage from './pages/GamePage';
import ResultsPage from './pages/ResultsPage';

export const router = createBrowserRouter([
  { path: '/', Component: SetupPage },
  { path: '/game', Component: GamePage },
  { path: '/results', Component: ResultsPage },
]);
