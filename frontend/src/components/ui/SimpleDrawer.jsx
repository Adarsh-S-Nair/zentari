import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useMediaQuery } from 'react-responsive'
import { FiChevronLeft } from 'react-icons/fi'
import Spinner from './Spinner'

/**
 * SimpleDrawer: lightweight drawer/bottom-sheet with built-in page stack animation
 * Props:
 * - isOpen: boolean
 * - stack: Array<{ title: string, element: ReactNode }>
 * - onClose(): void
 * - onBack(): void    (optional, called when back button tapped)
 */
export default function SimpleDrawer({ isOpen, stack = [], onClose, onBack }) {
	const isMobile = useMediaQuery({ maxWidth: 670 })

	// Mount/unmount + panel/overlay animations
	const [visible, setVisible] = useState(false)
	const [panelOpen, setPanelOpen] = useState(false)
	const [overlayShown, setOverlayShown] = useState(false)
	useEffect(() => {
		if (isOpen) {
			setVisible(true)
			setPanelOpen(false)
			setOverlayShown(false)
			document.body.style.overflow = 'hidden'
			requestAnimationFrame(() => {
				setPanelOpen(true)
				setOverlayShown(true)
			})
		} else if (visible) {
			setPanelOpen(false)
			setOverlayShown(false)
			const t = setTimeout(() => {
				setVisible(false)
				document.body.style.overflow = ''
			}, 200)
			return () => clearTimeout(t)
		}
	}, [isOpen])

	// Page animation (left/right) based on stack length change
	const top = stack[stack.length - 1] || { title: '', element: null }
	const memoContent = useMemo(() => top.element, [top])
	const [renderedChild, setRenderedChild] = useState(memoContent)
	const [headerTitle, setHeaderTitle] = useState(top.title)
	const [prevChild, setPrevChild] = useState(null)
	const [incomingChild, setIncomingChild] = useState(null)
	const [isAnimating, setIsAnimating] = useState(false)
	const [lastLen, setLastLen] = useState(stack.length)
	const prevRef = useRef(null)
	const currRef = useRef(null)

	useEffect(() => {
		if (!isOpen) return
		const len = stack.length
		const pageAnimEnabled = len !== lastLen
		setLastLen(len)
		if (!pageAnimEnabled) {
			setRenderedChild(memoContent)
			setHeaderTitle(top.title)
			setIsAnimating(false)
			setPrevChild(null)
			setIncomingChild(null)
			return
		}
		setIsAnimating(true)
		const dir = len > lastLen ? 1 : -1 // forward if stack grew
		const prevSnap = renderedChild
		const nextChild = memoContent
		const nextTitle = top.title
		setPrevChild(prevSnap)
		setIncomingChild(nextChild)
		// Update header immediately for instant feedback
		setHeaderTitle(nextTitle)

		requestAnimationFrame(() => {
			const tryAnimate = () => {
				const prevEl = prevRef.current
				const curEl = currRef.current
				if (!prevEl || !curEl) return requestAnimationFrame(tryAnimate)
				prevEl.style.transition = 'none'
				prevEl.style.transform = 'translateX(0%)'
				curEl.style.transition = 'none'
				curEl.style.transform = `translateX(${dir * 100}%)`
				void prevEl.offsetHeight; void curEl.offsetHeight
				requestAnimationFrame(() => {
					prevEl.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)'
					curEl.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)'
					prevEl.style.transform = `translateX(${dir * -100}%)`
					curEl.style.transform = 'translateX(0%)'
				})
			}
			tryAnimate()
		})
		const t = setTimeout(() => {
			setRenderedChild(nextChild)
			// header already set immediately
			setIsAnimating(false)
			setPrevChild(null)
			setIncomingChild(null)
		}, 240)
		return () => clearTimeout(t)
	}, [memoContent, top.title, stack.length, isOpen])

	if (!isOpen && !visible) return null

	const overlayStyle = {
		background: 'rgba(0,0,0,0.45)',
		transition: 'opacity 160ms ease-out',
		opacity: overlayShown ? 1 : 0
	}
	const panelTransform = isMobile
		? (panelOpen ? 'translateY(0)' : 'translateY(100%)')
		: (panelOpen ? 'translateX(0)' : 'translateX(100%)')
	const panelClass = isMobile
		? 'absolute inset-x-0 bottom-0 w-full rounded-t-2xl h-[80vh]'
		: 'absolute inset-y-0 right-0 w-[420px] max-w-[95%]'

	const renderOrSpinner = (child) => child ? child : (
		<div className="w-full h-full flex items-center justify-center"><Spinner label="Loading..." /></div>
	)

	return (
		<div className="fixed inset-0 z-[500]" style={overlayStyle} onClick={(e)=>{ if (e.target === e.currentTarget) onClose?.() }}>
			<div className={`${panelClass} shadow-2xl border flex flex-col`} style={{ background: 'var(--color-bg-primary)', borderColor: 'var(--color-border-primary)', transform: panelTransform, transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
				{/* Header */}
				<div className="grid grid-cols-[40px_1fr_40px] items-center px-2 sm:px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
					<div className="flex items-center justify-start">
						{stack.length > 1 ? (
							<button onClick={onBack} className="p-2 rounded-md cursor-pointer transition-colors" title="Back" aria-label="Back" style={{ color: 'var(--color-text-muted)' }}
								onMouseEnter={(e)=> e.currentTarget.style.background = 'var(--color-bg-hover)'}
								onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
							>
								<FiChevronLeft size={18} />
							</button>
						) : (
							<span style={{ width: 28, height: 28 }} />
						)}
					</div>
					<div className="truncate">
						<h2 className="text-[14px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{headerTitle}</h2>
					</div>
					<div className="flex items-center justify-end">
						<button onClick={onClose} className="p-2 rounded-md cursor-pointer transition-colors" title="Close" aria-label="Close" style={{ color: 'var(--color-text-muted)' }}
							onMouseEnter={(e)=> e.currentTarget.style.background = 'var(--color-bg-hover)'}
							onMouseLeave={(e)=> e.currentTarget.style.background = 'transparent'}
						>
							✕
						</button>
					</div>
				</div>
				{/* Animated content area */}
				<div className="relative flex-1 overflow-hidden">
					{isAnimating && (
						<>
							<div ref={prevRef} className="absolute inset-0 w-full h-full overflow-y-auto">{renderOrSpinner(prevChild)}</div>
							<div ref={currRef} className="absolute inset-0 w-full h-full overflow-y-auto">{renderOrSpinner(incomingChild)}</div>
						</>
					)}
					{!isAnimating && (
						<div className="absolute inset-0 w-full h-full overflow-y-auto">{renderOrSpinner(renderedChild)}</div>
					)}
				</div>
			</div>
		</div>
	)
} 