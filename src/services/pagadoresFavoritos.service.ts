import { AuthService } from './auth.service'
import { supabase } from './supabase'

function getUser() {
  const user = AuthService.getCachedUser()
  if (!user) {
    throw new Error('Usuário não encontrado no cache')
  }
  return user
}

export type PagadorFavorito = {
  id: number
  nome: string
}

export const pagadoresFavoritosService = {
  async listByCliente(clienteId: string): Promise<PagadorFavorito[]> {
    const user = getUser()

    const { data, error } = await supabase
      .from('recebimentos_pagadores_favoritos')
      .select('id, nome')
      .eq('empresa_id', user.empresa_id)
      .eq('cliente_id', clienteId)
      .order('nome', { ascending: true })

    if (error) throw error
    return data || []
  },

  async add(clienteId: string, nome: string) {
    const user = getUser()
    const nomeNormalizado = nome.trim()
    if (!nomeNormalizado) return

    const { data: existentes, error: buscaError } = await supabase
      .from('recebimentos_pagadores_favoritos')
      .select('id, nome')
      .eq('empresa_id', user.empresa_id)
      .eq('cliente_id', clienteId)

    if (buscaError) throw buscaError

    const jaExiste = (existentes || []).some(
      (item) => item.nome.trim().toLowerCase() === nomeNormalizado.toLowerCase(),
    )
    if (jaExiste) return

    const { error } = await supabase
      .from('recebimentos_pagadores_favoritos')
      .insert({
        empresa_id: user.empresa_id,
        cliente_id: clienteId,
        nome: nomeNormalizado,
      })

    if (error) throw error
  },

  async remove(id: number) {
    const user = getUser()

    const { error } = await supabase
      .from('recebimentos_pagadores_favoritos')
      .delete()
      .eq('id', id)
      .eq('empresa_id', user.empresa_id)

    if (error) throw error
  },
}
