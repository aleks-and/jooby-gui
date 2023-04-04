import React from 'react';
import {createRoot} from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import {createTheme, ThemeProvider} from '@mui/material/styles';
import App from './components/App';
import '../sass/main.scss';


const theme = createTheme({
    palette: {
        warning: {
            light: '#fef0e4',
            main: '#ed6c02'
        },
        success: {
            light: '#e6f5e7',
            main: '#2e7d32'
        },
        error: {
            light: '#faeaea',
            main: '#d32f2f'
        }
    }
});


createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </React.StrictMode>
);
