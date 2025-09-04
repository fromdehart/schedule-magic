import React, { useEffect, useMemo, useState } from 'react'
import { X, Plus, CheckCircle, Circle } from 'lucide-react'
import { Contact } from '../types/activity'
import { useContacts } from '../hooks/useContacts'

interface ContactsModalProps {
  isOpen: boolean
  onClose: () => void
  activityId: string
  onSaved?: (contacts: Contact[]) => void
}

export const ContactsModal: React.FC<ContactsModalProps> = ({ isOpen, onClose, activityId, onSaved }) => {
  const { fetchContacts, fetchContactsForActivity, setContactsForActivity, addContact } = useContacts()
  const [allContacts, setAllContacts] = useState<Contact[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    ;(async () => {
      const [contacts, existing] = await Promise.all([
        fetchContacts(),
        fetchContactsForActivity(activityId)
      ])
      setAllContacts(contacts)
      setSelectedIds(new Set(existing.map(c => c.id)))
    })()
  }, [isOpen, activityId, fetchContacts, fetchContactsForActivity])

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10)
    const part1 = digits.slice(0, 3)
    const part2 = digits.slice(3, 6)
    const part3 = digits.slice(6, 10)
    if (digits.length <= 3) return part1
    if (digits.length <= 6) return `(${part1}) ${part2}`
    return `(${part1}) ${part2}-${part3}`
  }

  const handleAddQuick = async () => {
    if (!newName.trim()) return
    const created = await addContact(newName.trim(), newPhone.trim() || undefined)
    setAllContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
    setSelectedIds(prev => new Set(prev).add(created.id))
    setNewName('')
    setNewPhone('')
  }

  const selectedContacts = useMemo(() => allContacts.filter(c => selectedIds.has(c.id)), [allContacts, selectedIds])

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await setContactsForActivity(activityId, [...selectedIds])
      // Re-fetch to confirm persisted associations
      const refreshed = await fetchContactsForActivity(activityId)
      onSaved && onSaved(refreshed)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select People</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Add name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              type="tel"
              className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Phone"
              value={newPhone}
              onChange={(e) => setNewPhone(formatPhone(e.target.value))}
              inputMode="numeric"
              maxLength={14}
            />
            <button onClick={handleAddQuick} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {allContacts.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">No contacts yet. Add one above.</div>
            ) : (
              allContacts.map(c => {
                const selected = selectedIds.has(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => toggle(c.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors ${selected ? 'bg-emerald-50 outline outline-1 outline-emerald-300' : ''}`}
                    aria-pressed={selected}
                  >
                    <div className="text-left">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {c.name}
                      </div>
                      {c.phone && <div className="text-sm text-gray-500">{formatPhone(c.phone)}</div>}
                    </div>
                    {selected ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium">Cancel</button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
          >
            {isSaving ? 'Saving...' : 'Save' }
          </button>
        </div>
      </div>
    </div>
  )
}


