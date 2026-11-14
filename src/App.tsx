import Login from "./pages/login"
import Filmes from "./pages/filmes"
import DetalhesFilme from "./pages/detalhes-filme"
import Clientes from "./pages/clientes"
import Locacoes from "./pages/locacoes"
import { ToastContainer } from 'react-toastify';

import { BrowserRouter, Routes, Route } from "react-router"

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/filmes" element={<Filmes />} />
          <Route path="/filmes/:id" element={<DetalhesFilme />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/locacoes" element={<Locacoes />} />
        </Routes>

      </BrowserRouter>
      <ToastContainer position="top-left" />
    </QueryClientProvider>
  )
}
