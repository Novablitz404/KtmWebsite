'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { selectGuidelineTemplate, deleteAllCategories } from '@/app/actions'

interface GuidelineTemplate {
    id: string
    name: string
}

interface CategoryManagerProps {
    tournamentId: string
    categories: { id: string; name: string }[]
    currentTemplateId: string | null
    currentTemplateName: string | null
    availableTemplates: GuidelineTemplate[]
}

export default function CategoryManager({
    tournamentId,
    categories,
    currentTemplateId,
    currentTemplateName,
    availableTemplates
}: CategoryManagerProps) {
    const router = useRouter()
    const [selectedTemplate, setSelectedTemplate] = useState(currentTemplateId || '')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    const handleTemplateSelect = async () => {
        if (!selectedTemplate) {
            setMessage('Please select a template')
            return
        }

        // Confirm before applying (whether switching or reapplying)
        const isReapply = selectedTemplate === currentTemplateId
        const confirmMsg = isReapply
            ? `Re-applying template will regenerate all categories from template. Continue?`
            : categories.length > 0
                ? `Changing template will delete all ${categories.length} existing categories and their players. Are you sure?`
                : 'Apply this template?'

        const confirmed = confirm(confirmMsg)
        if (!confirmed) return

        setLoading(true)
        setMessage('')

        try {
            const result = await selectGuidelineTemplate(tournamentId, selectedTemplate)
            if (result.error) {
                setMessage(result.error)
            } else {
                setMessage(`Template applied! ${result.categoriesCreated} categories created.`)
                // Force page refresh to show new categories
                router.refresh()
            }
        } catch {
            setMessage('Failed to apply template')
        } finally {
            setLoading(false)
        }
    }

    // Division sort order
    const divisionOrder = ['Supertoddler', 'Toddler', 'Grade School', 'Cadet', 'Junior', 'Senior']

    // Group categories by division - handle multi-word divisions like "Grade School"
    const groupedCategories = categories.reduce((acc, cat) => {
        // Try to match known divisions first
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

    // Sort divisions according to order
    const sortedDivisions = Object.entries(groupedCategories).sort(([a], [b]) => {
        const indexA = divisionOrder.indexOf(a)
        const indexB = divisionOrder.indexOf(b)
        if (indexA === -1 && indexB === -1) return a.localeCompare(b)
        if (indexA === -1) return 1
        if (indexB === -1) return -1
        return indexA - indexB
    })

    return (
        <div className="space-y-6">
            {/* Template Selection */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold mb-2">Guideline Template</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Select a template to automatically populate all divisions and weight categories.
                </p>

                {currentTemplateName ? (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                            <strong>Current Template:</strong> {currentTemplateName}
                        </p>
                    </div>
                ) : (
                    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-sm text-yellow-800">
                            ⚠️ No template selected. Registration is disabled until a template is assigned.
                        </p>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                    <select
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    >
                        <option value="">Select a template...</option>
                        {availableTemplates.map((template) => (
                            <option key={template.id} value={template.id}>
                                {template.name}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleTemplateSelect}
                        disabled={loading || !selectedTemplate}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? 'Applying...' : 'Apply Template'}
                    </button>
                </div>

                {message && (
                    <p className={`mt-3 text-sm ${message.includes('!') ? 'text-green-600' : 'text-red-600'}`}>
                        {message}
                    </p>
                )}
            </div>

            {/* Categories List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Categories ({categories.length})
                    </h3>
                    {currentTemplateName && (
                        <span className="text-xs text-gray-500">From: {currentTemplateName}</span>
                    )}
                </div>

                {categories.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <p>No categories yet. Select a template above to populate categories.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {sortedDivisions.map(([division, cats]) => {
                            // Further group by gender
                            const maleCategories = cats.filter(c => c.name.includes('Male'))
                            const femaleCategories = cats.filter(c => c.name.includes('Female'))
                            const otherCategories = cats.filter(c => !c.name.includes('Male') && !c.name.includes('Female'))

                            // Function to extract weight class from category name
                            const getWeightClass = (categoryName: string, divisionName: string, gender: string) => {
                                return categoryName.replace(divisionName, '').replace(gender, '').trim()
                            }

                            return (
                                <div key={division} className="p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <h4 className="font-bold text-gray-900 text-lg">{division}</h4>
                                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                            {cats.length} categories
                                        </span>
                                    </div>

                                    <div className="ml-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Male Categories */}
                                        {maleCategories.length > 0 && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="mb-2">
                                                    <span className="text-sm font-semibold text-gray-700">Male ({maleCategories.length})</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {maleCategories.map((category) => (
                                                        <span
                                                            key={category.id}
                                                            className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs border border-gray-200"
                                                        >
                                                            {getWeightClass(category.name, division, 'Male')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Female Categories */}
                                        {femaleCategories.length > 0 && (
                                            <div className="bg-gray-50 rounded-lg p-3">
                                                <div className="mb-2">
                                                    <span className="text-sm font-semibold text-gray-700">Female ({femaleCategories.length})</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {femaleCategories.map((category) => (
                                                        <span
                                                            key={category.id}
                                                            className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs border border-gray-200"
                                                        >
                                                            {getWeightClass(category.name, division, 'Female')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Other/Mixed Categories */}
                                        {otherCategories.length > 0 && (
                                            <div className="bg-gray-50 rounded-lg p-3 md:col-span-2">
                                                <div className="mb-2">
                                                    <span className="text-sm font-semibold text-gray-700">All ({otherCategories.length})</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {otherCategories.map((category) => (
                                                        <span
                                                            key={category.id}
                                                            className="px-2 py-0.5 bg-white text-gray-700 rounded text-xs border border-gray-200"
                                                        >
                                                            {category.name.replace(division, '').trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
