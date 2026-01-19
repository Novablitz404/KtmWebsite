'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, Check } from 'lucide-react'
import getCroppedImg from '@/utils/canvasUtils' // We'll create this util next
import { toast } from 'sonner'

interface ImageCropperModalProps {
    imageUrl: string
    aspectRatio?: number
    onCropComplete: (croppedBlob: Blob) => void // Sends back the blob to upload
    onClose: () => void
}

export default function ImageCropperModal({
    imageUrl,
    aspectRatio = 3 / 1,
    onCropComplete,
    onClose
}: ImageCropperModalProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 })
    const [zoom, setZoom] = useState(1)
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
    const [isProcessing, setIsProcessing] = useState(false)

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop)
    }

    const onZoomChange = (zoom: number) => {
        setZoom(zoom)
    }

    const onCropCompleteHandler = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels)
    }, [])

    const handleSave = async () => {
        setIsProcessing(true)
        try {
            const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels)
            if (croppedBlob) {
                onCropComplete(croppedBlob)
            } else {
                toast.error('Failed to crop image')
            }
        } catch (e) {
            console.error(e)
            toast.error('Error creating cropped image')
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                    <span className="text-white font-semibold drop-shadow-md pointer-events-auto">Adjust Image</span>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors pointer-events-auto backdrop-blur-md"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cropper Container */}
                <div className="flex-1 relative bg-gray-900">
                    <Cropper
                        image={imageUrl}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                        objectFit="horizontal-cover"
                        showGrid={true}
                    />
                </div>

                {/* Controls */}
                <div className="p-6 bg-white border-t border-gray-100 flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Zoom</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isProcessing}
                            className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {isProcessing ? 'Processing...' : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Apply Crop
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
