'use client'

import { useState, useEffect } from 'react'
import { X, Search, Edit2, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import GlobalDropdown from '@/components/GlobalDropdown'
import { getClubMembersForOrg, updateClubMemberAsOrg } from '@/app/organization/actions'

interface Member {
    id: string
    name: string | null
    email: string | null
    belt: string | null
    gender: string | null
    weight: number | null
    height: number | null
    imageUrl: string | null
}

interface ClubMembersModalProps {
    clubId: string
    clubName: string
    isOpen: boolean
    onClose: () => void
}

export default function ClubMembersModal({ clubId, clubName, isOpen, onClose }: ClubMembersModalProps) {
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [editingMember, setEditingMember] = useState<Member | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen && clubId) {
            fetchMembers()
        }
    }, [isOpen, clubId])

    const fetchMembers = async () => {
        setLoading(true)
        try {
            const res = await getClubMembersForOrg(clubId)
            if (res.error) {
                toast.error(res.error)
                onClose() // Close if unauthorized or error
            } else if (res.members) {
                setMembers(res.members)
            }
        } catch (error) {
            toast.error('Failed to fetch members')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingMember) return

        setSaving(true)
        try {
            const res = await updateClubMemberAsOrg(editingMember.id, {
                name: editingMember.name || undefined,
                belt: editingMember.belt || undefined,
                gender: editingMember.gender || undefined,
                weight: editingMember.weight || undefined,
                height: editingMember.height || undefined
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                toast.success('Member updated successfully')
                setMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m))
                setEditingMember(null)
            }
        } catch (error) {
            toast.error('Failed to update member')
        } finally {
            setSaving(false)
        }
    }

    const filteredMembers = members.filter(m =>
        (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">{clubName} - Members</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage athletes registered under this club.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col p-6">
                    {/* Search */}
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search members by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all"
                        />
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                                <p>No members found.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Belt</th>
                                        <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stats</th>
                                        <th className="p-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredMembers.map(member => (
                                        <tr key={member.id} className="hover:bg-gray-50 group transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200">
                                                        {member.imageUrl ? (
                                                            <img src={member.imageUrl} alt={member.name || 'User'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-gray-500 font-bold">{(member.name || 'U').charAt(0)}</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{member.name || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-500">{member.email || 'No Email'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                                                    ${member.belt?.includes('Red') ? 'bg-red-50 text-red-700 border-red-100' :
                                                        member.belt?.includes('Blue') ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                            member.belt?.includes('Yellow') ? 'bg-yellow-50 text-yellow-700 border-yellow-100' :
                                                                member.belt?.includes('Black') ? 'bg-gray-900 text-white border-gray-800' :
                                                                    'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}>
                                                    {member.belt || 'No Belt'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-sm text-gray-600">
                                                <div>{member.gender || '-'}</div>
                                                <div className="text-xs text-gray-400">
                                                    {member.weight ? `${member.weight}kg` : '-'} • {member.height ? `${member.height}cm` : '-'}
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => setEditingMember(member)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Edit Member"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested Edit Modal */}
            {editingMember && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-900">Edit Member</h3>
                            <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={editingMember.name || ''}
                                    onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Belt Rank</label>
                                <GlobalDropdown
                                    value={editingMember.belt || 'White'}
                                    onChange={(val) => setEditingMember({ ...editingMember, belt: val })}
                                    options={[
                                        'White',
                                        'Yellow', 'Orange',
                                        'Green', 'Purple',
                                        'Blue', 'Maroon',
                                        'Red', 'Brown',
                                        'Black'
                                    ]}
                                    name="belt"
                                    fullWidth
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                                    <GlobalDropdown
                                        value={editingMember.gender || 'Male'}
                                        onChange={(val) => setEditingMember({ ...editingMember, gender: val })}
                                        options={['Male', 'Female']}
                                        name="gender"
                                        fullWidth
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={editingMember.weight || ''}
                                        onChange={(e) => setEditingMember({ ...editingMember, weight: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                                <input
                                    type="number"
                                    value={editingMember.height || ''}
                                    onChange={(e) => setEditingMember({ ...editingMember, height: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setEditingMember(null)}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50"
                                >
                                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
