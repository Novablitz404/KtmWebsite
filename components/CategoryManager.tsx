'use client'

import GlobalDropdown from '@/components/GlobalDropdown'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCategory, updateCategory, bulkUpdateCourts, bulkUpdateDeferFinals } from '@/app/actions'
import { Plus, Edit2, X, Check, Save, Loader2, GripVertical, LayoutGrid, Layers } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
    id: string
    name: string
    type: string
    court: string | null
    skillLevel: string | null
    deferFinals: boolean
}

interface CategoryManagerProps {
    tournamentId: string
    categories: Category[]
}

const TYPE_CONFIG: Record<string, { label: string; dot: string; badge: string; cardBg: string }> = {
    KYORUGI: { label: 'Kyorugi', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700',       cardBg: '' },
    POOMSAE: { label: 'Poomsae', dot: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700',  cardBg: 'bg-purple-50/40' },
    KYUKPA:  { label: 'Kyukpa',  dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700',  cardBg: 'bg-orange-50/40' },
}

const SKILL_CONFIG: Record<string, { badge: string }> = {
    Novice:       { badge: 'bg-emerald-100 text-emerald-700' },
    Intermediate: { badge: 'bg-blue-100 text-blue-700'     },
    Advance:      { badge: 'bg-red-100 text-red-700'        },
}

const SKILL_OPTIONS = [
    { label: 'Novice',       value: 'Novice'       },
    { label: 'Intermediate', value: 'Intermediate' },
    { label: 'Advance',      value: 'Advance'      },
]

export default function CategoryManager({ tournamentId, categories }: CategoryManagerProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isPending, startTransition] = useTransition()

    const [isAddModalOpen, setIsAddModalOpen]   = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)

    const [isEditingCourts, setIsEditingCourts]       = useState(false)
    const [courtUpdates, setCourtUpdates]             = useState<Record<string, string>>({})
    const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set())
    const [targetCourtValue, setTargetCourtValue]     = useState('')

    const [newName, setNewName]           = useState('')
    const [newType, setNewType]           = useState('KYORUGI')
    const [newSkillLevel, setNewSkillLevel] = useState('Novice')
    const [newCourt, setNewCourt]         = useState('')

    const openAddModal = () => {
        setNewName(''); setNewType('KYORUGI'); setNewSkillLevel('Novice'); setNewCourt('')
        setIsAddModalOpen(true)
    }

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        const res = await createCategory(tournamentId, newName, newType, newCourt, newSkillLevel)
        setLoading(false)
        if (res.success) { setIsAddModalOpen(false); router.refresh(); toast.success('Category created') }
        else toast.error(res.error || 'Failed to create category')
    }

    const openEditModal = (cat: Category) => {
        if (isEditingCourts) return
        setEditingCategory(cat); setNewName(cat.name); setNewType(cat.type)
        // @ts-ignore
        setNewSkillLevel(cat.skillLevel || 'Novice'); setNewCourt(cat.court || '')
    }

    const handleUpdateCategory = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingCategory) return
        setLoading(true)
        const res = await updateCategory(editingCategory.id, tournamentId, {
            name: newName, type: newType, court: newCourt, skillLevel: newSkillLevel
        })
        setLoading(false)
        if (res.success) { setEditingCategory(null); router.refresh(); toast.success('Category updated') }
        else toast.error(res.error || 'Failed to update category')
    }

    const handleStartEditingCourts = () => {
        const initial: Record<string, string> = {}
        categories.forEach(c => { initial[c.id] = c.court || '' })
        setCourtUpdates(initial); setIsEditingCourts(true)
        setSelectedCategoryIds(new Set()); setTargetCourtValue('')
    }

    const handleToggleSelect = (id: string) => {
        if (!isEditingCourts) return
        const next = new Set(selectedCategoryIds)
        next.has(id) ? next.delete(id) : next.add(id)
        setSelectedCategoryIds(next)
    }

    const handleSelectAll = (ids: string[]) => {
        const next = new Set(selectedCategoryIds)
        const allSelected = ids.every(id => next.has(id))
        allSelected ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id))
        setSelectedCategoryIds(next)
    }

    const handleAssignToSelected = () => {
        if (!targetCourtValue) { toast.error('Enter a court number first'); return }
        if (selectedCategoryIds.size === 0) { toast.error('Select at least one category'); return }
        const next = { ...courtUpdates }
        selectedCategoryIds.forEach(id => { next[id] = targetCourtValue })
        setCourtUpdates(next)
        toast.success(`Assigned Court ${targetCourtValue} to ${selectedCategoryIds.size} categories`)
        setSelectedCategoryIds(new Set())
    }

    const handleSaveCourts = async () => {
        startTransition(async () => {
            const updates = Object.entries(courtUpdates).map(([categoryId, court]) => ({ categoryId, court }))
            const result = await bulkUpdateCourts(updates, tournamentId)
            if (result?.success) { toast.success('Courts saved!'); setIsEditingCourts(false) }
            else toast.error('Failed to update courts.')
        })
    }

    const divisionOrder = ['Supertoddler', 'Toddler', 'Grade School', 'Cadet', 'Junior', 'Senior']

    const groupedCategories = categories.reduce((acc, cat) => {
        let division = 'Other'
        for (const div of divisionOrder) {
            if (cat.name.startsWith(div)) { division = div; break }
        }
        if (!acc[division]) acc[division] = []
        acc[division].push(cat)
        return acc
    }, {} as Record<string, typeof categories>)

    const sortedDivisions = Object.entries(groupedCategories).sort(([a], [b]) => {
        const ia = divisionOrder.indexOf(a), ib = divisionOrder.indexOf(b)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.localeCompare(b)
    })

    const closeModal = () => { setIsAddModalOpen(false); setEditingCategory(null) }

    return (
        <div className="space-y-5 animate-in fade-in duration-300">

            {/* ── Header ────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Categories</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Create and manage tournament categories and divisions.
                    </p>
                </div>

                {!isEditingCourts && (
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={handleStartEditingCourts}
                            disabled={categories.length === 0}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <GripVertical size={15} />
                            Assign Courts
                        </button>
                        <button
                            onClick={openAddModal}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-red-600 to-red-700 shadow-md shadow-red-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                        >
                            <Plus size={16} />
                            Add Category
                        </button>
                    </div>
                )}
            </div>

            {/* ── Court edit toolbar ─────────────────────────────── */}
            {isEditingCourts && (
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div>
                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-2">Target Court</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={targetCourtValue}
                                    onChange={e => setTargetCourtValue(e.target.value)}
                                    className="w-16 px-3 py-2 text-center font-black text-lg border border-red-200 bg-white rounded-xl focus:ring-2 focus:ring-red-400 outline-none"
                                    placeholder="#"
                                />
                                <button
                                    onClick={handleAssignToSelected}
                                    disabled={!targetCourtValue || selectedCategoryIds.size === 0}
                                    className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap"
                                >
                                    Assign to {selectedCategoryIds.size > 0 ? selectedCategoryIds.size : '…'} Selected
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                            onClick={() => setIsEditingCourts(false)}
                            disabled={isPending}
                            className="px-4 py-2 text-sm text-gray-600 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl font-semibold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveCourts}
                            disabled={isPending}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50"
                        >
                            {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            Save Courts
                        </button>
                    </div>
                </div>
            )}

            {/* ── Category list card ─────────────────────────────── */}
            <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
                isEditingCourts ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'
            }`}>
                {/* Card header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
                    <div className="flex items-center gap-2">
                        <LayoutGrid size={14} className="text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">
                            All Categories
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                            {categories.length}
                        </span>
                    </div>
                    {isEditingCourts && (
                        <span className="text-xs text-red-600 font-semibold animate-pulse">
                            Tap cards to select · then assign court
                        </span>
                    )}
                </div>

                {categories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                            <Layers size={20} className="text-gray-300" />
                        </div>
                        <p className="text-sm font-semibold text-gray-500">No categories yet</p>
                        <p className="text-xs text-gray-400 mt-1">Select a template or add manually.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sortedDivisions.map(([division, cats]) => {
                            const allIds      = cats.map(c => c.id)
                            const allDeferred = cats.every(c => c.deferFinals)
                            const isAllSelected = isEditingCourts && allIds.every(id => selectedCategoryIds.has(id))

                            return (
                                <div key={division} className="p-5">
                                    {/* Division header */}
                                    <div className="flex items-center gap-3 mb-3">
                                        <h4 className="text-base font-black text-gray-800">{division}</h4>
                                        <span className="text-xs text-gray-400 font-medium">{cats.length} {cats.length === 1 ? 'category' : 'categories'}</span>

                                        {!isEditingCourts && (
                                            <>
                                                {/* Defer Finals toggle */}
                                                <button
                                                    onClick={async () => {
                                                        startTransition(async () => {
                                                            const result = await bulkUpdateDeferFinals(allIds, !allDeferred, tournamentId)
                                                            if (result?.success) {
                                                                toast.success(`${division}: Defer Finals ${!allDeferred ? 'ON' : 'OFF'}`)
                                                                router.refresh()
                                                            } else {
                                                                toast.error('Failed to update defer finals')
                                                            }
                                                        })
                                                    }}
                                                    disabled={isPending}
                                                    title={allDeferred ? 'Defer Finals: ON' : 'Defer Finals: OFF'}
                                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                                                        allDeferred ? 'bg-red-500' : 'bg-gray-300'
                                                    } ${isPending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                                >
                                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                                        allDeferred ? 'translate-x-4.5' : 'translate-x-0.5'
                                                    }`} />
                                                </button>
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase ${
                                                    allDeferred ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {allDeferred ? 'Defer Finals' : 'Sequential'}
                                                </span>
                                            </>
                                        )}

                                        {isEditingCourts && (
                                            <button
                                                onClick={() => handleSelectAll(allIds)}
                                                className="text-xs font-semibold text-red-600 hover:text-red-800 hover:underline ml-auto"
                                            >
                                                {isAllSelected ? 'Deselect Group' : 'Select Group'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Category cards grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                        {cats.map(cat => {
                                            const isSelected    = selectedCategoryIds.has(cat.id)
                                            const currentCourt  = courtUpdates[cat.id] ?? cat.court
                                            const courtChanged  = isEditingCourts && courtUpdates[cat.id] !== (cat.court || '')
                                            const typeCfg       = TYPE_CONFIG[cat.type] || TYPE_CONFIG.KYORUGI
                                            const skillCfg      = cat.skillLevel ? SKILL_CONFIG[cat.skillLevel] : null

                                            return (
                                                <div
                                                    key={cat.id}
                                                    onClick={() => isEditingCourts ? handleToggleSelect(cat.id) : openEditModal(cat)}
                                                    className={`
                                                        relative rounded-xl border p-3.5 transition-all duration-150 cursor-pointer group
                                                        ${isEditingCourts
                                                            ? isSelected
                                                                ? 'border-red-500 bg-red-50 ring-1 ring-red-400 shadow-sm'
                                                                : 'border-gray-200 bg-white hover:border-red-300 hover:bg-red-50/30'
                                                            : `border-gray-200 hover:border-red-300 hover:shadow-md ${typeCfg.cardBg || 'bg-white'}`
                                                        }
                                                    `}
                                                >
                                                    {/* Left accent line */}
                                                    <div className={`absolute left-0 top-3 bottom-3 w-0.5 rounded-full ${typeCfg.dot} opacity-60`} />

                                                    <div className="flex items-start justify-between pl-2">
                                                        <span className={`text-sm font-semibold pr-4 leading-snug ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>
                                                            {cat.name}
                                                        </span>
                                                        {isEditingCourts ? (
                                                            <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                                                isSelected ? 'bg-red-500 border-red-500' : 'border-gray-300 bg-white group-hover:border-red-300'
                                                            }`}>
                                                                {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                                                            </div>
                                                        ) : (
                                                            <Edit2 size={11} className="text-gray-300 group-hover:text-red-400 transition-colors flex-shrink-0 mt-0.5" />
                                                        )}
                                                    </div>

                                                    {/* Badges */}
                                                    <div className="flex items-center gap-1.5 mt-2.5 pl-2 flex-wrap">
                                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${typeCfg.badge}`}>
                                                            {typeCfg.label}
                                                        </span>
                                                        {skillCfg && (
                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${skillCfg.badge}`}>
                                                                {cat.skillLevel}
                                                            </span>
                                                        )}
                                                        {currentCourt && (
                                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full font-mono transition-all ${
                                                                courtChanged
                                                                    ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                                                                    : 'bg-orange-100 text-orange-700'
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

            {/* ── Add / Edit Modal ───────────────────────────────── */}
            {(isAddModalOpen || editingCategory) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-200">

                        {/* Modal header */}
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-gray-900">
                                    {editingCategory ? 'Edit Category' : 'Add New Category'}
                                </h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {editingCategory ? 'Update category details below.' : 'Fill in the details to create a new category.'}
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="p-6 space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all"
                                    placeholder="e.g. Junior Female -49kg Kyorugi"
                                    required
                                />
                            </div>

                            {/* Type + Skill Level */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                        Discipline
                                    </label>
                                    <GlobalDropdown
                                        value={newType}
                                        onChange={setNewType}
                                        fullWidth
                                        options={[
                                            { label: 'Kyorugi', value: 'KYORUGI' },
                                            { label: 'Poomsae', value: 'POOMSAE' },
                                            { label: 'Kyukpa',  value: 'KYUKPA'  },
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                        Skill Level
                                    </label>
                                    <GlobalDropdown
                                        value={newSkillLevel}
                                        onChange={setNewSkillLevel}
                                        fullWidth
                                        options={SKILL_OPTIONS}
                                    />
                                </div>
                            </div>

                            {/* Court */}
                            <div>
                                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5">
                                    Assigned Court <span className="font-medium text-gray-400 normal-case">(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCourt}
                                    onChange={e => setNewCourt(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 focus:bg-white transition-all"
                                    placeholder="e.g. 1, A, Main"
                                />
                            </div>

                            {/* Skill level preview */}
                            {newSkillLevel && (
                                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                                    newSkillLevel === 'Novice'       ? 'bg-emerald-50 border-emerald-100' :
                                    newSkillLevel === 'Intermediate' ? 'bg-blue-50 border-blue-100' :
                                    'bg-red-50 border-red-100'
                                }`}>
                                    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                        SKILL_CONFIG[newSkillLevel]?.badge || 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {newSkillLevel}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium">
                                        {newSkillLevel === 'Novice'       ? 'Open to beginners — white through blue belt' :
                                         newSkillLevel === 'Intermediate' ? 'Mid-level — red belt and below' :
                                         'Advanced — black belt and above'}
                                    </span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-br from-red-600 to-red-700 shadow-md shadow-red-500/20 hover:shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0"
                                >
                                    {loading
                                        ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                                        : <><Check size={14} strokeWidth={3} /> {editingCategory ? 'Update' : 'Create'} Category</>
                                    }
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
