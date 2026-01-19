'use client'

import GlobalDropdown from '@/components/GlobalDropdown'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory } from '@/app/actions'
import { Plus, Edit2, X, Check } from 'lucide-react'

interface Category {
    id: string
    name: string
    type: string
    court: string | null
}

interface CategoryManagerProps {
    tournamentId: string
    categories: Category[]
}

export default function CategoryManager({
    tournamentId,
    categories
}: CategoryManagerProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Modal / Edit States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)

    // Form States
    const [newName, setNewName] = useState('')
    const [newType, setNewType] = useState('KYORUGI')
    const [newCourt, setNewCourt] = useState('')

    const openAddModal = () => {
        setNewName('')
        setNewType('POOMSAE')
        setNewCourt('')
        setIsAddModalOpen(true)
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await createCategory(tournamentId, newName, newType, newCourt)
        setLoading(false)
        if (res.success) {
            setIsAddModalOpen(false)
            router.refresh()
        } else {
            alert(res.error || 'Failed to create category')
        }
    }

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat)
        setNewName(cat.name)
        setNewType(cat.type)
        setNewCourt(cat.court || '')
    }

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingCategory) return

        setLoading(true)
        const res = await updateCategory(editingCategory.id, tournamentId, {
            name: newName,
            type: newType,
            court: newCourt
        })
        setLoading(false)
        if (res.success) {
            setEditingCategory(null)
            router.refresh()
        } else {
            alert(res.error || 'Failed to update category')
        }
    }

    // Division sort order
    const divisionOrder = ['Supertoddler', 'Toddler', 'Grade School', 'Cadet', 'Junior', 'Senior']

    // Group categories by division
    const groupedCategories = categories.reduce((acc, cat) => {
        let division = 'Other'
        for (const div of divisionOrder) {
            if (cat.name.startsWith(div)) {
                division = div
                break
            }
        }
        if (!acc[division]) acc[division] = []
        acc[division].push(cat)
        return acc
    }, {} as Record<string, typeof categories>)

    const sortedDivisions = Object.entries(groupedCategories).sort(([a], [b]) => {
        const indexA = divisionOrder.indexOf(a)
        const indexB = divisionOrder.indexOf(b)
        if (indexA !== -1 && indexB !== -1) return indexA - indexB
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        return a.localeCompare(b)
    })

    return (
        <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Manage Categories</h2>
                    <p className="text-gray-500 text-sm mt-1">Create and manage tournament categories and divisions.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                >
                    <Plus className="w-5 h-5" />
                    <span>Add Category</span>
                </button>
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Categories ({categories.length})
                    </h3>
                </div>

                {categories.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <p>No categories yet. Select a template or add manually.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sortedDivisions.map(([division, cats]) => (
                            <div key={division} className="p-4">
                                <h4 className="font-bold text-gray-900 text-lg mb-3">{division}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {cats.map((cat) => (
                                        <div
                                            key={cat.id}
                                            onClick={() => openEditModal(cat)}
                                            className={`
                                                cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all
                                                ${cat.type === 'POOMSAE' ? 'bg-purple-50' : 'bg-white'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm font-medium text-gray-800 break-words">{cat.name}</span>
                                                <Edit2 className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${cat.type === 'POOMSAE' ? 'bg-purple-200 text-purple-800' : 'bg-blue-100 text-blue-700'}`}>
                                                    {cat.type}
                                                </span>
                                                {cat.court && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 font-mono">
                                                        Court {cat.court}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {(isAddModalOpen || editingCategory) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg min-h-[325px] flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h3 className="font-bold text-lg text-gray-900">
                                {editingCategory ? 'Edit Category' : 'Add New Category'}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setEditingCategory(null) }} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="p-6 space-y-4 flex-1 flex flex-col">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Junior Female Poomsae"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <GlobalDropdown
                                        value={newType}
                                        onChange={setNewType}
                                        fullWidth
                                        options={[
                                            { label: 'Kyorugi', value: 'KYORUGI' },
                                            { label: 'Poomsae', value: 'POOMSAE' }
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Court</label>
                                    <input
                                        type="text"
                                        value={newCourt}
                                        onChange={e => setNewCourt(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. 1"
                                    />
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-3 mt-auto">
                                <button
                                    type="button"
                                    onClick={() => { setIsAddModalOpen(false); setEditingCategory(null) }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                                >
                                    {loading ? 'Saving...' : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Save Category
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
