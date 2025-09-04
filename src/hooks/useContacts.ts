import { useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Contact } from '../types/activity'

export function useContacts() {
  const fetchContacts = useCallback(async (): Promise<Contact[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []) as Contact[]
  }, [])

  const addContact = useCallback(async (name: string, phone?: string): Promise<Contact> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const sanitized = (phone || '').replace(/\D/g, '') || undefined
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ user_id: user.id, name, phone: sanitized }])
      .select()
      .single()

    if (error) throw error
    return data as Contact
  }, [])

  const fetchContactsForActivity = useCallback(async (activityId: string): Promise<Contact[]> => {
    // Step 1: get contact IDs for the activity
    const { data: links, error: linksError } = await supabase
      .from('activity_contacts')
      .select('contact_id')
      .eq('activity_id', activityId)

    if (linksError) throw linksError
    const ids = (links || []).map((r: any) => r.contact_id as string)
    if (ids.length === 0) return []

    // Step 2: fetch contacts by IDs
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .in('id', ids)
      .order('name', { ascending: true })

    if (contactsError) throw contactsError
    return (contacts || []) as Contact[]
  }, [])

  const setContactsForActivity = useCallback(async (activityId: string, contactIds: string[]): Promise<void> => {
    // Fetch current associations
    const { data: current, error: currErr } = await supabase
      .from('activity_contacts')
      .select('contact_id')
      .eq('activity_id', activityId)

    if (currErr) throw currErr
    const currentIds = new Set((current || []).map((r: any) => r.contact_id as string))
    const desiredIds = new Set(contactIds)

    const toAdd = [...desiredIds].filter(id => !currentIds.has(id))
    const toRemove = [...currentIds].filter(id => !desiredIds.has(id))

    if (toAdd.length > 0) {
      const rows = toAdd.map(id => ({ activity_id: activityId, contact_id: id }))
      const { error } = await supabase.from('activity_contacts').insert(rows)
      if (error) throw error
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('activity_contacts')
        .delete()
        .eq('activity_id', activityId)
        .in('contact_id', toRemove)
      if (error) throw error
    }
  }, [])

  return {
    fetchContacts,
    addContact,
    fetchContactsForActivity,
    setContactsForActivity,
  }
}


