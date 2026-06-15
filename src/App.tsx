import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Compras } from '@/pages/Compras'
import { Fornecedores } from '@/pages/Fornecedores'
import { Processamento } from '@/pages/Processamento'
import { Visceras } from '@/pages/Visceras'
import { Clientes } from '@/pages/Clientes'
import { Vendas } from '@/pages/Vendas'
import { Financeiro } from '@/pages/Financeiro'
import { Relatorios } from '@/pages/Relatorios'
import { Usuarios } from '@/pages/Usuarios'
import { Configuracoes } from '@/pages/Configuracoes'
import { Veiculos } from '@/pages/custos/Veiculos'
import { Viagens } from '@/pages/custos/Viagens'
import { Abate } from '@/pages/custos/Abate'
import { CustosOperacionais } from '@/pages/custos/CustosOperacionais'
import { Login } from '@/pages/Login'
import { Cadastro } from '@/pages/Cadastro'
import { ProtectedRoute } from './ProtectedRoute'
import { PwaInstallProvider, PwaManager } from '@/components/pwa'
import { Toaster } from 'react-hot-toast'

function App() {
  return (
    <PwaInstallProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <PwaManager />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/redefinir-senha" element={<Navigate to="/login" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="compras" element={<Compras />} />
            <Route path="fornecedores" element={<Fornecedores />} />
            <Route path="processamento" element={<Processamento />} />
            <Route path="visceras" element={<Visceras />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="vendas" element={<Vendas />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="relatorios" element={<Relatorios />} />
            <Route path="usuarios" element={<Usuarios />} />
            <Route path="configuracoes" element={<Configuracoes />} />
            <Route path="custos/veiculos" element={<Veiculos />} />
            <Route path="custos/viagens" element={<Viagens />} />
            <Route path="custos/abate" element={<Abate />} />
            <Route
              path="custos/operacionais"
              element={<CustosOperacionais />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </PwaInstallProvider>
  )
}

export default App
