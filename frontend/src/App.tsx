import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CreatorPage } from './pages/CreatorPage';
import { StorePage } from './pages/StorePage';
import { ManagePage } from './pages/ManagePage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreatorPage />} />
        <Route path="/c/:slug" element={<StorePage />} />
        <Route path="/editar/:editToken" element={<ManagePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
