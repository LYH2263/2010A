import { useState, useEffect, useRef } from 'react'
import { uploadProductImage, deleteProductImage, resolveImageUrl, getProductImageConfig } from '../api'
import { useToast } from '../contexts/ToastContext'

export default function ProductImageUploader({ value = [], onChange }) {
  const { showToast } = useToast()
  const fileInputRef = useRef(null)
  const dragOverIndex = useRef(-1)
  const [config, setConfig] = useState({
    max_images_per_product: 20,
    max_file_size_kb: 5120,
    allowed_ext: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  })
  const [pending, setPending] = useState([])

  useEffect(() => {
    getProductImageConfig().then(setConfig).catch(() => {})
  }, [])

  const images = Array.isArray(value) ? value : []

  const updateImages = (next) => {
    if (onChange) onChange(next)
  }

  const validateFile = (file) => {
    const maxSize = config.max_file_size_kb * 1024
    if (file.size > maxSize) {
      return `图片 ${file.name} 超过 ${config.max_file_size_kb}KB 限制`
    }
    const nameLower = file.name.toLowerCase()
    const ok = config.allowed_ext.some((ext) => nameLower.endsWith('.' + ext))
    if (!ok) {
      return `图片 ${file.name} 格式不支持，仅允许 ${config.allowed_ext.join('/')}`
    }
    if (file.type && !file.type.startsWith('image/')) {
      return `文件 ${file.name} 不是图片`
    }
    return null
  }

  const handleFilesSelected = async (files) => {
    const fileList = Array.from(files)
    if (fileList.length === 0) return

    const currentCount = images.length + pending.length
    const allowed = Math.max(0, config.max_images_per_product - currentCount)
    if (allowed === 0) {
      showToast(`最多只能上传 ${config.max_images_per_product} 张图片`)
      return
    }
    const toUpload = fileList.slice(0, allowed)
    if (fileList.length > allowed) {
      showToast(`本次仅允许上传 ${allowed} 张，已达上限`)
    }

    for (const file of toUpload) {
      const err = validateFile(file)
      if (err) {
        showToast(err)
        continue
      }

      const previewUrl = URL.createObjectURL(file)
      const pendingId = 'pending_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)
      const pendingItem = {
        __pendingId: pendingId,
        id: null,
        url: previewUrl,
        absolute_url: previewUrl,
        is_main: images.length === 0 && pending.length === 0,
        progress: 0,
        error: null,
        __preview: previewUrl,
      }
      setPending((prev) => [...prev, pendingItem])

      try {
        const result = await uploadProductImage(file, (pct) => {
          setPending((prev) =>
            prev.map((x) => (x.__pendingId === pendingId ? { ...x, progress: pct } : x))
          )
        })

        const newImg = {
          id: result.id,
          url: result.absolute_url || result.url,
          is_main: pendingItem.is_main,
        }

        setPending((prev) => prev.filter((x) => x.__pendingId !== pendingId))
        updateImages([...images, newImg])
        showToast('图片上传成功', 'success')
      } catch (e) {
        setPending((prev) =>
          prev.map((x) => (x.__pendingId === pendingId ? { ...x, error: e.message } : x))
        )
        showToast(e.message || '上传失败')
      } finally {
        try { URL.revokeObjectURL(previewUrl) } catch (_) {}
      }
    }
  }

  const handleRetryPending = async (pendingId) => {
    showToast('暂不支持重试，请重新选择文件上传')
  }

  const handleRemovePending = (pendingId) => {
    setPending((prev) => prev.filter((x) => x.__pendingId !== pendingId))
  }

  const handleRemove = async (idx) => {
    const img = images[idx]
    if (!img) return
    try {
      if (img.id) await deleteProductImage(img.id).catch(() => {})
    } catch (_) {}
    const next = images.filter((_, i) => i !== idx)
    if (img.is_main && next.length > 0) {
      next[0].is_main = true
    }
    updateImages(next)
  }

  const handleSetMain = (idx) => {
    const next = images.map((img, i) => ({ ...img, is_main: i === idx }))
    updateImages(next)
  }

  const handleDrop = (e, targetIdx) => {
    e.preventDefault()
    e.stopPropagation()
    dragOverIndex.current = -1
    const data = e.dataTransfer
    if (!data) return

    if (data.files && data.files.length > 0) {
      handleFilesSelected(data.files)
      return
    }

    const dragIdxStr = data.getData('text/image-index')
    if (dragIdxStr === '') return
    const fromIdx = parseInt(dragIdxStr, 10)
    if (isNaN(fromIdx) || fromIdx < 0 || fromIdx >= images.length) return
    if (fromIdx === targetIdx) return

    const next = [...images]
    const [moved] = next.splice(fromIdx, 1)
    const insertAt = targetIdx > fromIdx ? targetIdx - 1 : targetIdx
    next.splice(insertAt, 0, moved)
    updateImages(next)
  }

  const handleDragStart = (e, idx) => {
    e.dataTransfer.setData('text/image-index', String(idx))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, idx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverIndex.current = idx
  }

  const handleFileInputChange = (e) => {
    if (e.target.files) handleFilesSelected(e.target.files)
    e.target.value = ''
  }

  const allImages = [...images, ...pending]
  const reachedLimit = allImages.length >= config.max_images_per_product

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-base font-semibold text-gray-800">商品图片</label>
          <p className="text-xs text-gray-500 mt-0.5">
            支持 JPG/PNG/GIF/WEBP，单张 ≤ {config.max_file_size_kb}KB，最多 {config.max_images_per_product} 张，可拖拽排序
          </p>
        </div>
        <span className="text-sm text-gray-500">
          已上传 {images.length} 张
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {allImages.map((img, idx) => {
          const isPending = !!img.__pendingId
          const src = resolveImageUrl(img.absolute_url || img.url)
          const isMain = img.is_main
          return (
            <div
              key={img.__pendingId || ('img_' + img.id + '_' + idx)}
              draggable={!isPending}
              onDragStart={(e) => !isPending && handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`relative group rounded-lg border-2 overflow-hidden aspect-square bg-gray-50 transition-all ${
                isPending ? 'border-dashed border-gray-300' : 'border-gray-200 hover:border-primary'
              }`}
            >
              <img
                src={src}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />

              {isPending && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2">
                  {img.error ? (
                    <>
                      <div className="text-sm font-medium mb-1 text-red-300">上传失败</div>
                      <div className="text-xs text-center mb-2 line-clamp-2">{img.error}</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleRetryPending(img.__pendingId)}
                          className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded"
                        >
                          重试
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePending(img.__pendingId)}
                          className="text-xs bg-red-600/70 hover:bg-red-600 px-2 py-1 rounded"
                        >
                          移除
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs mb-1">上传中... {img.progress || 0}%</div>
                      <div className="w-4/5 h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: (img.progress || 0) + '%' }}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {!isPending && (
                <>
                  {isMain && (
                    <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-0.5 rounded shadow">
                      主图
                    </div>
                  )}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {!isMain && (
                      <button
                        type="button"
                        onClick={() => handleSetMain(idx)}
                        className="bg-white/90 hover:bg-white text-gray-700 text-xs px-2 py-1 rounded shadow"
                        title="设为主图"
                      >
                        主图
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemove(idx)}
                      className="bg-red-500/90 hover:bg-red-600 text-white text-xs px-2 py-1 rounded shadow"
                      title="删除"
                    >
                      删除
                    </button>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/50 to-transparent h-8 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between px-2 pb-1">
                    <span className="text-white text-xs">#{idx + 1}</span>
                    <span className="text-white/70 text-xs cursor-move">↔ 拖拽排序</span>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {!reachedLimit && (
          <label
            onDragOver={(e) => handleDragOver(e, allImages.length)}
            onDrop={(e) => handleDrop(e, allImages.length)}
            className="relative flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary-light/30 text-gray-400 hover:text-primary cursor-pointer transition-colors"
          >
            <svg className="w-10 h-10 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs">点击 / 拖拽上传</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
            />
          </label>
        )}
      </div>

      {reachedLimit && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          已达到最大图片数量（{config.max_images_per_product} 张），如需上传请先删除部分图片。
        </div>
      )}
    </div>
  )
}
