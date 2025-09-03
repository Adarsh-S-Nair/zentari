import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function Carousel({
  items = [],
  renderItem,
  itemWidth = 280,
  gap = 12,
  className = '',
  style = {},
  onItemClick,
  getKey = (item, index) => index,
  getSnapAlignForIndex,
  showPagination = true,
}) {
  const rootRef = useRef(null)
  const carouselRef = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const computeNearestIndex = (el) => {
    if (!el) return 0
    const itemW = itemWidth + gap
    const viewportCenter = el.scrollLeft + el.clientWidth / 2
    let nearest = 0
    let minDist = Infinity
    for (let i = 0; i < items.length; i++) {
      const cardCenter = i * itemW + itemWidth / 2
      const dist = Math.abs(cardCenter - viewportCenter)
      if (dist < minDist) { minDist = dist; nearest = i }
    }
    return nearest
  }

  const updateArrowsAndActive = () => {
    const el = carouselRef.current
    if (!el) return
    const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth - 2)
    const atStart = el.scrollLeft <= 2
    const atEnd = el.scrollLeft >= maxScrollLeft - 2
    setCanLeft(!atStart)
    setCanRight(!atEnd)
    if (atStart) { setActiveIndex(0); return }
    if (atEnd) { setActiveIndex(Math.max(0, items.length - 1)); return }
    setActiveIndex(computeNearestIndex(el))
  }

  const scrollToIndex = (idx) => {
    const el = carouselRef.current
    if (!el) return
    const maxIdx = Math.max(0, items.length - 1)
    const i = Math.max(0, Math.min(idx, maxIdx))
    const itemW = itemWidth + gap
    let target
    if (i === 0) {
      target = 0
    } else if (i === maxIdx) {
      target = el.scrollWidth - el.clientWidth
    } else {
      target = i * itemW + itemWidth / 2 - el.clientWidth / 2
    }
    const clamped = Math.max(0, Math.min(target, el.scrollWidth - el.clientWidth))
    el.scrollTo({ left: clamped, behavior: 'smooth' })
    setTimeout(updateArrowsAndActive, 220)
  }

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    updateArrowsAndActive()
    const onScroll = () => updateArrowsAndActive()
    const onResize = () => updateArrowsAndActive()
    el.addEventListener('scroll', onScroll)
    window.addEventListener('resize', onResize)
    return () => { el.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize) }
  }, [items.length, itemWidth, gap])

  const scrollByAmount = (dir = 1) => {
    const el = carouselRef.current
    if (!el) return
    const perView = Math.max(1, Math.floor((el.clientWidth + gap) / (itemWidth + gap)))
    const nextIndex = Math.max(0, Math.min(items.length - 1, activeIndex + dir * perView))
    scrollToIndex(nextIndex)
  }

  const getSnapAlign = (i) => {
    if (typeof getSnapAlignForIndex === 'function') return getSnapAlignForIndex(i, items.length)
    if (i === 0) return 'start'
    if (i === items.length - 1) return 'end'
    return 'center'
  }

  return (
    <div ref={rootRef} className={`relative ${className}`} style={style}>
      <div className="pointer-events-none absolute left-0 top-0 bottom-10 w-6" style={{ background: 'linear-gradient(90deg, var(--color-bg-secondary) 10%, rgba(0,0,0,0))' }} />
      <div className="pointer-events-none absolute right-0 top-0 bottom-10 w-6" style={{ background: 'linear-gradient(270deg, var(--color-bg-secondary) 10%, rgba(0,0,0,0))' }} />

      {canLeft && (
        <button
          aria-label="Scroll left"
          onClick={() => scrollByAmount(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer"
          style={{ 
            background: 'var(--color-bg-primary)', 
            border: '1px solid var(--color-border-primary)', 
            color: 'var(--color-text-primary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.background = 'var(--color-bg-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.background = 'var(--color-bg-primary)'
          }}
        >
          <FiChevronLeft size={18} />
        </button>
      )}
      {canRight && (
        <button
          aria-label="Scroll right"
          onClick={() => scrollByAmount(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full transition-all duration-200 hover:scale-110 cursor-pointer"
          style={{ 
            background: 'var(--color-bg-primary)', 
            border: '1px solid var(--color-border-primary)', 
            color: 'var(--color-text-primary)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
            e.currentTarget.style.background = 'var(--color-bg-secondary)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            e.currentTarget.style.background = 'var(--color-bg-primary)'
          }}
        >
          <FiChevronRight size={18} />
        </button>
      )}

      <div ref={carouselRef} className="flex gap-3 overflow-x-auto overflow-y-visible hide-scrollbar scroll-smooth" style={{ scrollSnapType: 'x mandatory', paddingTop: 6, paddingBottom: 28 }}>
        {items.map((item, i) => (
          <div key={getKey(item, i)} style={{ flex: '0 0 auto' }}>
            <div role={onItemClick ? 'button' : undefined} onClick={onItemClick ? (e) => onItemClick(e, item) : undefined} className={onItemClick ? 'cursor-pointer' : ''}>
              {renderItem({ item, index: i, snapAlign: getSnapAlign(i) })}
            </div>
          </div>
        ))}
      </div>

      {showPagination && items.length > 1 && (
        <div className="absolute left-0 right-0 bottom-2 flex items-center justify-center gap-1.5 select-none">
          {items.map((_, i) => {
            const isActive = i === activeIndex
            return (
              <button
                key={i}
                aria-label={`Go to item ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className="rounded-full transition-all duration-200 ease-out cursor-pointer"
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.15)'
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--brand-income-hex)'
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(103, 80, 164, 0.20)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = isActive ? 'scale(1.1)' : 'scale(1.0)'
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(148,163,184,0.5)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
                style={{
                  height: 6,
                  width: isActive ? 18 : 6,
                  background: isActive ? 'var(--brand-income-hex)' : 'rgba(148,163,184,0.5)',
                  transform: isActive ? 'scale(1.1)' : 'scale(1.0)',
                  willChange: 'transform'
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}


