import { supabase } from './supabase'

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${value}; expires=${expires}; path=/`
}

function getCookie(name: string) {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='))
    ?.split('=')[1]
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; path=/`
}

export const AuthService = {
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    const token = data.session?.access_token
    if (token) setCookie('token', token)

    return data.user
  },

  async register(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    })

    if (error) throw error

    const token = data.session?.access_token
    if (token) setCookie('token', token)

    return data.user
  },

  async logout() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error

    deleteCookie('token')
  },

  async me() {
    const { data, error } = await supabase.auth.getUser()

    if (error) throw error
    return data.user
  },

  getToken() {
    return getCookie('token')
  },

  isAuthenticated() {
    return !!getCookie('token')
  }
}