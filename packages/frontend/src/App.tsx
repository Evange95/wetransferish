import { BrowserRouter, Routes, Route } from 'react-router';
import { UploadPage } from './ui/pages/UploadPage.js';
import { DownloadPage } from './ui/pages/DownloadPage.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/d/:shareLink" element={<DownloadPage />} />
      </Routes>
    </BrowserRouter>
  );
}
