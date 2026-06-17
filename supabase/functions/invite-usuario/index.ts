import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonError('Não autorizado', 401)
    }

    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser()

    if (userError || !user) {
      return jsonError('Não autorizado', 401)
    }

    const body = await req.json()
    const nome = String(body.nome ?? '').trim()
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase()
    const perfil = String(body.perfil ?? 'operador')
    const redirectFromClient = String(body.redirectTo ?? '').trim()

    if (!nome) return jsonError('Informe o nome')
    if (!email) return jsonError('Informe o e-mail')

    const { data: vinculo, error: vinculoError } = await supabaseUser
      .from('usuarios_empresas')
      .select('empresa_id, perfil, status')
      .eq('user_id', user.id)
      .maybeSingle()

    if (vinculoError) return jsonError(vinculoError.message)
    if (!vinculo || vinculo.status !== 1) {
      return jsonError('Sem permissão para convidar usuários')
    }

    if (!['master', 'administrador'].includes(vinculo.perfil)) {
      return jsonError('Sem permissão para convidar usuários')
    }

    if (perfil === 'master' && vinculo.perfil !== 'master') {
      return jsonError(
        'Apenas usuários Master podem autorizar o perfil Master.',
      )
    }

    const { data: existente } = await supabaseUser
      .from('usuarios_empresas')
      .select('id, status')
      .eq('empresa_id', vinculo.empresa_id)
      .ilike('email', email)
      .maybeSingle()

    if (existente?.status === 1) {
      return jsonError('Já existe um usuário com este e-mail na empresa')
    }
    if (existente?.status === 0) {
      return jsonError(
        'Já existe um usuário inativo com este e-mail. Reative-o na lista de usuários.',
      )
    }

    const redirectTo = resolveInviteRedirect(redirectFromClient)

    const { data: invited, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { nome, perfil },
      })

    if (inviteError) return jsonError(inviteError.message)

    const newUserId = invited.user?.id
    if (!newUserId) {
      return jsonError('Não foi possível criar o convite')
    }

    const { data: row, error: insertError } = await supabaseAdmin
      .from('usuarios_empresas')
      .insert({
        user_id: newUserId,
        empresa_id: vinculo.empresa_id,
        nome,
        email,
        perfil,
        status: 1,
      })
      .select()
      .single()

    if (insertError) return jsonError(insertError.message)

    return new Response(JSON.stringify({ usuario: row, inviteSent: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao convidar'
    return jsonError(message)
  }
})

function jsonError(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

const DEFAULT_REDIRECT = 'https://bovi-gest.vercel.app/redefinir-senha'

function isValidInviteRedirect(url: string) {
  try {
    const parsed = new URL(url)
    if (!parsed.pathname.includes('redefinir-senha')) return false
    if (parsed.protocol === 'https:') return true
    return (
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
    )
  } catch {
    return false
  }
}

function resolveInviteRedirect(preferred?: string) {
  const candidates = [
    preferred,
    Deno.env.get('APP_REDEFINIR_SENHA_URL') ?? '',
    DEFAULT_REDIRECT,
  ].filter(Boolean)

  for (const url of candidates) {
    if (isValidInviteRedirect(url)) return url
  }

  return DEFAULT_REDIRECT
}
