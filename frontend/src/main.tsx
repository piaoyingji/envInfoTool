import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/app.css';

const queryClient = new QueryClient();
const initialLang = localStorage.getItem('onecrm.lang') || 'ja';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App initialLang={initialLang} />
    </QueryClientProvider>
  </React.StrictMode>
);
