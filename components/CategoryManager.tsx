'use client'

import GlobalDropdown from '@/components/GlobalDropdown'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, bulkUpdateCourts } from '@/app/actions'
import { Plus, Edit2, X, Check, Save, Loader2, GripVertical, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
    type: string
    court: string | null
    skillLevel: string | null
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
    const [isPending, startTransition] = useTransition()

    // Modal / Edit States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)

    // Bulk Edit Courts State
    const [isEditingCourts, setIsEditingCourts] = useState(false)
    const [courtUpdates, setCourtUpdates] = useState<Record<string, string>>({})
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
    const [targetCourtValue, setTargetCourtValue] = useState('')

    // Form States
    const [newName, setNewName] = useState('')
    const [newType, setNewType] = useState('KYORUGI')
    const [newSkillLevel, setNewSkillLevel] = useState('Novice')
    const [newCourt, setNewCourt] = useState('')

    const openAddModal = () => {
        setNewName('')
        setNewType('POOMSAE')
        setNewSkillLevel('Novice')
        setNewCourt('')
        setIsAddModalOpen(true)
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await createCategory(tournamentId, newName, newType, newCourt, newSkillLevel)
        setLoading(false)
        if (res.success) {
            setIsAddModalOpen(false)
            router.refresh()
            toast.success("Category created successfully")
        } else {
            toast.error(res.error || 'Failed to create category')
        }
    }

    const openEditModal = (cat: Category) => {
        if (isEditingCourts) return
        setEditingCategory(cat)
        setNewName(cat.name)
        setNewType(cat.type)
        // @ts-ignore
        setNewSkillLevel(cat.skillLevel || 'Novice')
        setNewCourt(cat.court || '')
    }

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingCategory) return

        setLoading(true)
        const res = await updateCategory(editingCategory.id, tournamentId, {
            name: newName,
            type: newType,
            court: newCourt,
            skillLevel: newSkillLevel
        })
        setLoading(false)
        if (res.success) {
            setEditingCategory(null)
            router.refresh()
            toast.success("Category updated")
        } else {
            toast.error(res.error || 'Failed to update category')
        }
    }

    // Bulk Court Edit Handlers
    const handleStartEditingCourts = () => {
        const initial: Record<string, string> = {}
        categories.forEach(c => {
            initial[c.id] = c.court || ''
        })
        setCourtUpdates(initial)
        setIsEditingCourts(true)
        setSelectedCategoryIds(new Set())
        setTargetCourtValue('')
    }

    const handleToggleSelect = (id: string) => {
        if (!isEditingCourts) return
        const next = new Set(selectedCategoryIds)
        if (next.has(id)) {
            next.delete(id)
        } else {
            next.add(id)
        }
        setSelectedCategoryIds(next)
    }

    const handleSelectAll = (ids: string[]) => {
        const next = new Set(selectedCategoryIds)
        const allSelected = ids.every(id => next.has(id))

        if (allSelected) {
            ids.forEach(id => next.delete(id))
        } else {
            ids.forEach(id => next.add(id))
        }
        setSelectedCategoryIds(next)
    }

    const handleAssignToSelected = () => {
        if (!targetCourtValue) {
            toast.error("Enter a court number first")
            return
        }
        if (selectedCategoryIds.size === 0) {
            toast.error("Select at least one category")
            return
        }

        const nextUpdates = { ...courtUpdates }
        selectedCategoryIds.forEach(id => {
            nextUpdates[id] = targetCourtValue
        })
        setCourtUpdates(nextUpdates)
        toast.success(`Assigned Court ${targetCourtValue} to ${selectedCategoryIds.size} categories`)

        // Optional: Clear selection after assignment for rapid workflow? 
        // Or keep it? Keeping it allows correction. Let's keep it but maybe clear the selection if they want.
        // Actually, user flow suggests select -> assign -> verify.
        setSelectedCategoryIds(new Set())
    }

    const handleSaveCourts = async () => {
        startTransition(async () => {
            const updates = Object.entries(courtUpdates).map(([categoryId, court]) => ({
                categoryId,
                court
            }))

            const result = await bulkUpdateCourts(updates, tournamentId)
            if (result?.success) {
                toast.success("Court assignments saved!")
                setIsEditingCourts(false)
            } else {
                toast.error("Failed to update courts.")
            }
        })
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
            <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Manage Categories</h2>
                        <p className="text-gray-500 text-sm mt-1">Create and manage tournament categories and divisions.</p>
                    </div>

                    {!isEditingCourts && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleStartEditingCourts}
                                disabled={categories.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <GripVertical className="w-4 h-4" />
                                Edit Courts
                            </button>
                            <button
                                onClick={openAddModal}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                <Plus className="w-5 h-5" />
                                <span>Add Category</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Bulk Edit Toolbar */}
                {isEditingCourts && (
                    <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">Target Court</span>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={targetCourtValue}
                                        onChange={(e) => setTargetCourtValue(e.target.value)}
                                        className="w-20 px-3 py-2 text-center font-bold border border-red-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="#"
                                    />
                                    <button
                                        onClick={handleAssignToSelected}
                                        disabled={!targetCourtValue || selectedCategoryIds.size === 0}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
                                    >
                                        Assign to {selectedCategoryIds.size} Selected
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                            <button
                                onClick={() => setIsEditingCourts(false)}
                                disabled={isPending}
                                className="px-4 py-2 text-gray-600 hover:bg-white hover:text-gray-900 rounded-lg font-medium transition-colors border border-transparent hover:border-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveCourts}
                                disabled={isPending}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-shadow shadow-md hover:shadow-lg disabled:opacity-50"
                            >
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save All Changes
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Categories List */}
            <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-colors ${isEditingCourts ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
                }`}>

                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Categories ({categories.length})
                    </h3>
                    {isEditingCourts && (
                        <div className="text-sm text-red-600 font-medium animate-pulse">
                            Select categories to assign courts
                        </div>
                    )}
                </div>

                {categories.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <p>No categories yet. Select a template or add manually.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sortedDivisions.map(([division, cats]) => {
                            const allIds = cats.map(c => c.id)
                            const isAllSelected = isEditingCourts && allIds.every(id => selectedCategoryIds.has(id))

                            return (
                                <div key={division} className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h4 className="font-bold text-gray-900 text-lg">{division}</h4>
                                        {isEditingCourts && (
                                            <button
                                                onClick={() => handleSelectAll(allIds)}
                                                className="text-xs font-medium text-red-600 hover:text-red-800 hover:underline"
                                            >
                                                {isAllSelected ? "Deselect Group" : "Select Group"}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {cats.map((cat) => {
                                            const isSelected = selectedCategoryIds.has(cat.id)
                                            const currentCourt = courtUpdates[cat.id] ?? cat.court

                                            return (
                                                <div
                                                    key={cat.id}
                                                    onClick={() => isEditingCourts ? handleToggleSelect(cat.id) : openEditModal(cat)}
                                                    className={`
                                                        relative p-3 rounded-lg border transition-all duration-200
                                                        ${isEditingCourts
                                                            ? isSelected
                                                                ? 'border-red-500 bg-red-50 ring-1 ring-red-500 cursor-pointer'
                                                                : 'border-gray-200 bg-white hover:border-red-300 cursor-pointer'
                                                            : 'cursor-pointer border-gray-200 hover:border-red-300 hover:shadow-sm bg-white'
                                                        }
                                                        ${cat.type === 'POOMSAE' && !isEditingCourts ? 'bg-purple-50/50' : ''}
                                                        ${cat.type === 'KYUKPA' && !isEditingCourts ? 'bg-orange-50/50' : ''}
                                                    `}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <span className={`text-sm font-medium break-words pr-6 ${isSelected ? 'text-red-900' : 'text-gray-800'}`}>
                                                            {cat.name}
                                                        </span>
                                                        {isEditingCourts ? (
                                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white'
                                                                }`}>
                                                                {isSelected && <Check className="w-3 h-3 text-white" />}
                                                            </div>
                                                        ) : (
                                                            <Edit2 className="w-3 h-3 text-gray-400 mt-1 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2 h-7">
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${cat.type === 'POOMSAE' ? 'bg-purple-200 text-purple-800' :
                                                                cat.type === 'KYUKPA' ? 'bg-orange-200 text-orange-800' :
                                                                    'bg-blue-100 text-blue-700'}`}>
                                                            {cat.type}
                                                        </span>
                                                        {cat.skillLevel && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wider ${cat.skillLevel === 'Novice' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {cat.skillLevel}
                                                            </span>
                                                        )}

                                                        {currentCourt && (
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono border transition-colors ${isEditingCourts && courtUpdates[cat.id] !== (cat.court || '')
                                                                ? 'bg-green-100 text-green-800 border-green-200 font-bold animate-pulse'
                                                                : 'bg-orange-100 text-orange-800 border-orange-200'
                                                                }`}>
                                                                Court {currentCourt}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
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
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-shadow"
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
                                            { label: 'Poomsae', value: 'POOMSAE' },
                                            { label: 'Kyukpa', value: 'KYUKPA' }
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Skill Level</label>
                                    <GlobalDropdown
                                        value={newSkillLevel}
                                        onChange={setNewSkillLevel}
                                        fullWidth
                                        options={[
                                            { label: 'Novice', value: 'Novice' },
                                            { label: 'Advance', value: 'Advance' }
                                        ]}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Court</label>
                                    <input
                                        type="text"
                                        value={newCourt}
                                        onChange={e => setNewCourt(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-shadow"
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
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
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
