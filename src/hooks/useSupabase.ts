import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useSupabase() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if supabase is available
    if (!supabase) {
      setLoading(false)
      return
    }

    // Get initial session
    const getSession = async () => {
      try {
                 const { data: { session } } = await supabase!.auth.getSession()
        setUser(session?.user || null)
      } catch (error) {
        console.error('Error getting session:', error)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        if (session?.user) {
          setLoading(false)
        }
      }
    )

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    if (!supabase) {
      console.error('Supabase not available')
      return { error: 'Supabase not available' }
    }

    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        return { error }
      }
      setUser(null)
      return { error: null }
    } catch (error) {
      console.error('Error signing out:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) {
      console.error('Supabase not available')
      return { error: 'Supabase not available' }
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('Error signing in:', error)
        return { error }
      }
      
      setUser(data.user)
      return { error: null }
    } catch (error) {
      console.error('Error signing in:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) {
      console.error('Supabase not available')
      return { error: 'Supabase not available' }
    }

    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password
      })
      
      if (error) {
        console.error('Error signing up:', error)
        return { error }
      }
      
      return { error: null }
    } catch (error) {
      console.error('Error signing up:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  return {
    user,
    loading,
    signOut,
    signInWithEmail,
    signUp
  }
} 