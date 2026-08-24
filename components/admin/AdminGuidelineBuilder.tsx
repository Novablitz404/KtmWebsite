'use client'

import { useState } from 'react'
import { Plus, Trash2, Edit2, GripVertical, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchGuidelineDetails } from '@/app/admin/fetch'
import { addDivision, deleteDivision, addCategory, updateCategory, deleteCategory, updateDivision } from '@/app/admin/actions/manageDivisions'
import { Skeleton } from '@/components/ui/Skeleton'

interface AdminGuidelineBuilderProps {
    templateId: string
    onClose: () => void
}

export default function AdminGuidelineBuilder({ templateId, onClose }: AdminGuidelineBuilderProps) {
    const queryClient = useQueryClient()
    const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)
    const [isAddDivisionOpen, setIsAddDivisionOpen] = useState(false)
    const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
    const [addCategoryType, setAddCategoryType] = useState('KYORUGI')
    const [editingCategory, setEditingCategory] = useState<any | null>(null)
    const [editCategoryType, setEditCategoryType] = useState('KYORUGI')

    // Fetch Full Details
    const { data: template, isLoading } = useQuery({
        queryKey: ['guideline-details', templateId],
        queryFn: () => fetchGuidelineDetails(templateId)
    })

    const handleAddDivision = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        const res = await addDivision(templateId, formData)
        if (res.success) {
            toast.success('Division added')
            setIsAddDivisionOpen(false)
            queryClient.invalidateQueries({ queryKey: ['guideline-details', templateId] })
        } else {
            toast.error(res.error)
        }
    }

    const handleDeleteDivision = async (id: string) => {
        if (!confirm('Delete this division and all its categories?')) return
        const res = await deleteDivision(id)
        if (res.success) {
            toast.success('Division deleted')
            if (selectedDivisionId === id) setSelectedDivisionId(null)
            queryClient.invalidateQueries({ queryKey: ['guideline-details', templateId] })
        } else {
            toast.error(res.error)
        }
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedDivisionId) return
        const formData = new FormData(e.target as HTMLFormElement)
        const res = await addCategory(selectedDivisionId, formData)
        if (res.success) {
            toast.success('Category added')
            setIsAddCategoryOpen(false)
            setAddCategoryType('KYORUGI')
            queryClient.invalidateQueries({ queryKey: ['guideline-details', templateId] })
        } else {
            toast.error(res.error)
        }
    }

    const openEditCategory = (cat: any) => {
        setEditingCategory(cat)
        setEditCategoryType(cat.type || 'KYORUGI')
    }

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingCategory) return
        const formData = new FormData(e.target as HTMLFormElement)
        const res = await updateCategory(editingCategory.id, formData)
        if (res.success) {
            toast.success('Category updated')
            setEditingCategory(null)
            queryClient.invalidateQueries({ queryKey: ['guideline-details', templateId] })
        } else {
            toast.error(res.error)
        }
    }

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Delete this category?')) return
        const res = await deleteCategory(id)
        if (res.success) {
            toast.success('Category deleted')
            queryClient.invalidateQueries({ queryKey: ['guideline-details', templateId] })
        } else {
            toast.error(res.error)
        }
    }

    const selectedDivision = template?.divisions.find((d: any) => d.id === selectedDivisionId)

    if (isLoading) return <div className="p-8"><Skeleton className="h-64 w-full" /></div>

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h3 className="font-bold text-gray-900">{template?.name} Details</h3>
                    <p className="text-xs text-gray-500">Manage structure</p>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* Left Panel: Divisions */}
                <div className="w-1/3 border-r border-gray-100 flex flex-col min-h-0 bg-gray-50/30">
                    <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 uppercase">Divisions</span>
                        <button
                            onClick={() => setIsAddDivisionOpen(true)}
                            className="p-1 hover:bg-white rounded shadow-sm text-gray-600 hover:text-red-600 transition-all border border-transparent hover:border-gray-200"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {template?.divisions.map((div: any) => (
                            <div
                                key={div.id}
                                onClick={() => setSelectedDivisionId(div.id)}
                                className={`group flex items-center justify-between p-3 rounded-lg text-sm cursor-pointer transition-all border ${selectedDivisionId === div.id
                                    ? 'bg-white border-red-200 shadow-sm ring-1 ring-red-500/10'
                                    : 'hover:bg-white border-transparent hover:border-gray-200'
                                    }`}
                            >
                                <div>
                                    <div className={`font-medium ${selectedDivisionId === div.id ? 'text-red-700' : 'text-gray-700'}`}>
                                        {div.name}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {div.minAge}-{div.maxAge} yrs • {div.categories.length} generic
                                    </div>
                                </div>
                                {selectedDivisionId === div.id && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteDivision(div.id) }}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {template?.divisions.length === 0 && (
                            <div className="text-center py-8 text-gray-400 text-xs italic">
                                No divisions yet.
                            </div>
                        )}
                    </div>

                    {/* Add Division Form (Inline) */}
                    {isAddDivisionOpen && (
                        <div className="p-3 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
                            <form onSubmit={handleAddDivision} className="space-y-3">
                                <input name="name" placeholder="Name (e.g. Senior)" className="w-full text-sm border-gray-300 rounded-md py-1.5" required autoFocus />
                                <div className="flex gap-2">
                                    <input name="minAge" type="number" placeholder="Min Age" className="w-1/2 text-sm border-gray-300 rounded-md py-1.5" required />
                                    <input name="maxAge" type="number" placeholder="Max Age" className="w-1/2 text-sm border-gray-300 rounded-md py-1.5" required />
                                </div>
                                <input name="displayOrder" type="number" placeholder="Order" className="w-full text-sm border-gray-300 rounded-md py-1.5 hidden" defaultValue={(template?.divisions?.length ?? 0) + 1} />
                                <div className="flex justify-end gap-2 pt-1">
                                    <button type="button" onClick={() => setIsAddDivisionOpen(false)} className="text-xs px-2 py-1 text-gray-500 font-medium">Cancel</button>
                                    <button type="submit" className="text-xs px-3 py-1 bg-gray-900 text-white rounded font-medium">Add</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Right Panel: Categories */}
                <div className="flex-1 flex flex-col min-h-0 bg-white">
                    {selectedDivision ? (
                        <>
                            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <span className="text-xs font-semibold text-gray-500 uppercase">Categories in {selectedDivision.name}</span>
                                </div>
                                <button
                                    onClick={() => setIsAddCategoryOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Add Category
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-0">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b border-gray-100 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 font-medium">Name</th>
                                            <th className="px-4 py-2 font-medium">Type</th>
                                            <th className="px-4 py-2 font-medium">Gender</th>
                                            <th className="px-4 py-2 font-medium text-right">Limits</th>
                                            <th className="px-4 py-2 w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {selectedDivision.categories.map((cat: any) => (
                                            <tr key={cat.id} className="group hover:bg-gray-50/50">
                                                <td className="px-4 py-2.5 font-medium text-gray-900">{cat.name}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cat.type === 'POOMSAE' ? 'bg-amber-50 text-amber-700' :
                                                            cat.type === 'KYUKPA' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-700'
                                                            }`}>
                                                            {cat.type || 'KYORUGI'}
                                                        </span>
                                                        {cat.type === 'POOMSAE' && (
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cat.poomsaeFormat === 'HEAD_TO_HEAD' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                {cat.poomsaeFormat === 'HEAD_TO_HEAD' ? 'VS' : 'SCORED'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-600">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${cat.gender === 'Male' ? 'bg-blue-50 text-blue-700' :
                                                        cat.gender === 'Female' ? 'bg-pink-50 text-pink-700' : 'bg-purple-50 text-purple-700'
                                                        }`}>
                                                        {cat.gender}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-gray-600 text-right font-mono text-xs">
                                                    {(cat.minWeight > 0 || cat.maxWeight > 0) ? (
                                                        <div title="Weight">{cat.minWeight} - {cat.maxWeight === 999 ? '+' : cat.maxWeight} kg</div>
                                                    ) : null}
                                                    {(cat.minHeight > 0 || cat.maxHeight > 0) ? (
                                                        <div title="Height" className="text-blue-600">{cat.minHeight} - {cat.maxHeight === 999 ? '+' : cat.maxHeight} cm</div>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap">
                                                    <button
                                                        onClick={() => openEditCategory(cat)}
                                                        className="text-gray-300 hover:text-gray-600 transition-colors mr-2"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCategory(cat.id)}
                                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {selectedDivision.categories.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm italic">
                                                    No categories yet. Click "Add Category" to create one.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {isAddCategoryOpen && (
                                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center p-4 z-20">
                                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                            <h4 className="font-bold text-gray-800 text-sm">Add Category</h4>
                                            <button onClick={() => { setIsAddCategoryOpen(false); setAddCategoryType('KYORUGI') }}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                                        </div>
                                        <form onSubmit={handleAddCategory} className="p-4 space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Category Name</label>
                                                <input name="name" placeholder="e.g. Fin or Under 58kg" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required autoFocus />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                                                <select name="type" value={addCategoryType} onChange={(e) => setAddCategoryType(e.target.value)} className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500">
                                                    <option value="KYORUGI">Kyorugi</option>
                                                    <option value="POOMSAE">Poomsae</option>
                                                    <option value="KYUKPA">Kyukpa</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                                                <select name="gender" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Mixed">Mixed</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Min Weight (kg)</label>
                                                    <input name="minWeight" type="number" step="0.01" defaultValue="0" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Max Weight (kg)</label>
                                                    <input name="maxWeight" type="number" step="0.01" placeholder="999 for +" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required />
                                                </div>
                                            </div>
                                            {addCategoryType === 'POOMSAE' && (
                                                <div className="space-y-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Belt</label>
                                                        <input name="belt" placeholder="e.g. Yellow, Black" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Assigned Forms</label>
                                                        <input name="poomsaeForms" placeholder="e.g. Taegeuk 4" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Subtype</label>
                                                        <select name="subtype" defaultValue="INDIVIDUAL" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500">
                                                            <option value="INDIVIDUAL">Individual</option>
                                                            <option value="PAIR">Pair</option>
                                                            <option value="TEAM">Team</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Format</label>
                                                        <select name="poomsaeFormat" defaultValue="SCORED" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500">
                                                            <option value="SCORED">Scored (ranked rounds)</option>
                                                            <option value="HEAD_TO_HEAD">Head-to-Head (VS bracket)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                            <input name="displayOrder" type="hidden" value={selectedDivision.categories.length + 1} />

                                            <div className="pt-2">
                                                <button type="submit" className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                                    Add Category
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {editingCategory && (
                                <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center p-4 z-20">
                                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                            <h4 className="font-bold text-gray-800 text-sm">Edit Category</h4>
                                            <button onClick={() => setEditingCategory(null)}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
                                        </div>
                                        <form onSubmit={handleUpdateCategory} className="p-4 space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Category Name</label>
                                                <input name="name" defaultValue={editingCategory.name} className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required autoFocus />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                                                <select name="type" value={editCategoryType} onChange={(e) => setEditCategoryType(e.target.value)} className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500">
                                                    <option value="KYORUGI">Kyorugi</option>
                                                    <option value="POOMSAE">Poomsae</option>
                                                    <option value="KYUKPA">Kyukpa</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Gender</label>
                                                <select name="gender" defaultValue={editingCategory.gender} className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                    <option value="Mixed">Mixed</option>
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Min Weight (kg)</label>
                                                    <input name="minWeight" type="number" step="0.01" defaultValue={editingCategory.minWeight ?? 0} className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Max Weight (kg)</label>
                                                    <input name="maxWeight" type="number" step="0.01" defaultValue={editingCategory.maxWeight ?? 0} placeholder="999 for +" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" required />
                                                </div>
                                            </div>
                                            {editCategoryType === 'POOMSAE' && (
                                                <div className="space-y-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Belt</label>
                                                        <input name="belt" defaultValue={editingCategory.belt || ''} placeholder="e.g. Yellow, Black" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Assigned Forms</label>
                                                        <input name="poomsaeForms" defaultValue={editingCategory.poomsaeForms || ''} placeholder="e.g. Taegeuk 4" className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Subtype</label>
                                                        <select name="subtype" defaultValue={editingCategory.subtype || 'INDIVIDUAL'} className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500">
                                                            <option value="INDIVIDUAL">Individual</option>
                                                            <option value="PAIR">Pair</option>
                                                            <option value="TEAM">Team</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Format</label>
                                                        <select name="poomsaeFormat" defaultValue={editingCategory.poomsaeFormat || 'SCORED'} className="w-full text-sm border-gray-200 rounded-lg focus:ring-red-500 focus:border-red-500">
                                                            <option value="SCORED">Scored (ranked rounds)</option>
                                                            <option value="HEAD_TO_HEAD">Head-to-Head (VS bracket)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-2">
                                                <button type="submit" className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm">
                                                    Save Changes
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                                <GripVertical className="w-8 h-8 text-gray-200" />
                            </div>
                            <p className="text-sm font-medium text-gray-400">Select a division to manage categories</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
