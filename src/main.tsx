import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '@/styles/index.scss'
import { loadTheme } from '@/services/theme.service'

await loadTheme()
ReactDOM.createRoot(document.getElementById('root')!).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
)


  // <React.StrictMode>
  //   <BrowserRouter>
  //     <App />
  //   </BrowserRouter>
  // </React.StrictMode>,
  // assim ele faz requets duas vezes local