import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Compras } from '@/pages/Compras'
import { Fornecedores } from '@/pages/Fornecedores'
import { Processamento } from '@/pages/Processamento'
import { Clientes } from '@/pages/Clientes'
import { Vendas } from '@/pages/Vendas'
import { Financeiro } from '@/pages/Financeiro'
import { Relatorios } from '@/pages/Relatorios'
import { Usuarios } from '@/pages/Usuarios'
import { Veiculos } from '@/pages/custos/Veiculos'
import { Viagens } from '@/pages/custos/Viagens'
import { Abate } from '@/pages/custos/Abate'
import { CustosOperacionais } from '@/pages/custos/CustosOperacionais'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="compras" element={<Compras />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="processamento" element={<Processamento />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="custos/veiculos" element={<Veiculos />} />
        <Route path="custos/viagens" element={<Viagens />} />
        <Route path="custos/abate" element={<Abate />} />
        <Route path="custos/operacionais" element={<CustosOperacionais />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
