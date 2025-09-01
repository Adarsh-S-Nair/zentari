import React from 'react'
import { createPortal } from 'react-dom'

// Fullscreen canvas overlay with falling binary "rain" lines.
// Uses CSS variables from colors.css so it adapts to light/dark themes.
export default function MatrixOverlay() {
  const canvasRef = React.useRef(null)
  const animationRef = React.useRef(null)
  const columnsRef = React.useRef(0)
  const dropsRef = React.useRef([])
  const speedsRef = React.useRef([]) // rows per second
  const tailsRef = React.useRef([]) // number of faded digits to draw behind the head
  const activeRef = React.useRef([]) // whether a column is currently emitting
  const spawnAtRef = React.useRef([]) // ms timestamp when a column should (re)spawn
  const fontSizeRef = React.useRef(14)
  const lastTimeRef = React.useRef(0)
  const charsetRef = React.useRef('ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ')

  // Resolve theme-aware colors from CSS variables
  const getColors = React.useCallback(() => {
    const styles = getComputedStyle(document.documentElement)
    const brandSpend = styles.getPropertyValue('--brand-spending-hex').trim()
    const brandIncome = styles.getPropertyValue('--brand-income-hex').trim()
    const brand = brandIncome || brandSpend || styles.getPropertyValue('--color-primary').trim() || '#667eea'
    const textMuted = styles.getPropertyValue('--color-text-muted').trim() || 'rgba(148,163,184,0.6)'
    return { brand, textMuted }
  }, [])

  const toRgba = React.useCallback((color, alpha) => {
    const c = (color || '').trim()
    if (c.startsWith('#')) {
      const hex = c.replace('#', '')
      const sh = hex.length === 3
      const r = parseInt(sh ? hex[0] + hex[0] : hex.slice(0,2), 16)
      const g = parseInt(sh ? hex[1] + hex[1] : hex.slice(2,4), 16)
      const b = parseInt(sh ? hex[2] + hex[2] : hex.slice(4,6), 16)
      return `rgba(${r},${g},${b},${alpha})`
    }
    if (c.startsWith('rgb')) {
      return c.replace(/rgba?\(([^)]+)\)/, (m, inner) => {
        const [r, g, b] = inner.split(',').map(s => s.trim())
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      })
    }
    return `rgba(34,197,94,${alpha})`
  }, [])

  const resize = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    canvas.width = Math.floor(width * dpr)
    canvas.height = Math.floor(height * dpr)
    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    fontSizeRef.current = Math.max(14, Math.min(22, Math.round(width / 110)))
    columnsRef.current = Math.floor(width / fontSizeRef.current)
    // Start some columns from above the top for staggered entry
    dropsRef.current = Array(columnsRef.current).fill(0).map(() => Math.random() * -20)
    // Slightly slower, smooth motion using time-based speeds
    speedsRef.current = Array(columnsRef.current).fill(0).map(() => 4 + Math.random() * 5) // 4-9 rows/sec
    tailsRef.current = Array(columnsRef.current).fill(0).map(() => 4 + Math.floor(Math.random() * 5)) // 4-8
    // Staggered emission using per-column spawn scheduling
    const now = performance.now()
    activeRef.current = Array(columnsRef.current).fill(false)
    spawnAtRef.current = Array(columnsRef.current).fill(0).map(() => now + Math.random() * 2000)
    lastTimeRef.current = performance.now()
  }, [])

  const draw = React.useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const { brand, textMuted } = getColors()
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const fontSize = fontSizeRef.current
    const columns = columnsRef.current
    // Clear fully each frame to avoid any darkening overlay
    ctx.clearRect(0, 0, w, h)
    // Time-based delta for smooth, speed-controlled animation
    const now = performance.now()
    const dt = Math.max(0, (now - (lastTimeRef.current || now)) / 1000)
    lastTimeRef.current = now
    ctx.font = `${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace`
    for (let i = 0; i < columns; i++) {
      // Activate column only when its scheduled time has arrived
      if (!activeRef.current[i]) {
        if (now < (spawnAtRef.current[i] || 0)) continue
        activeRef.current[i] = true
        dropsRef.current[i] = Math.random() * -10
      }
      const isBright = Math.random() > 0.75
      const headColor = brand
      const chars = charsetRef.current
      const char = chars.charAt((Math.random() * chars.length) | 0)
      const x = i * fontSize
      const row = dropsRef.current[i]
      const y = row * fontSize
      // Vertical streak behind head (very subtle)
      ctx.save()
      ctx.globalAlpha = 0.22
      ctx.strokeStyle = headColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + fontSize / 2, y - fontSize * (tailsRef.current[i] + 1))
      ctx.lineTo(x + fontSize / 2, y)
      ctx.stroke()
      ctx.restore()
      // Head digit
      ctx.shadowColor = headColor
      ctx.shadowBlur = 8
      ctx.fillStyle = headColor
      ctx.fillText(char, x, y)
      // Faded trailing digits
      const tail = tailsRef.current[i]
      for (let t = 1; t <= tail; t++) {
        const alpha = Math.max(0, 0.35 - t * (0.35 / (tail + 1)))
        ctx.shadowBlur = 0
        ctx.fillStyle = toRgba(brand, alpha)
        ctx.fillText(chars.charAt((Math.random() * chars.length) | 0), x, y - t * fontSize)
      }
      // Advance using time-based speed (rows/sec)
      dropsRef.current[i] = row + speedsRef.current[i] * dt
      // Reset drop with randomization for natural look
      if (y > h) {
        // schedule next spawn with jitter to avoid bursts
        activeRef.current[i] = false
        const delay = 300 + Math.random() * 1200 // ms
        spawnAtRef.current[i] = now + delay
        dropsRef.current[i] = Math.random() * -10
        speedsRef.current[i] = 4 + Math.random() * 5
        tailsRef.current[i] = 4 + Math.floor(Math.random() * 5)
      }
    }
    animationRef.current = requestAnimationFrame(draw)
  }, [getColors, toRgba])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    resize()
    animationRef.current = requestAnimationFrame(draw)
    window.addEventListener('resize', resize)
    // Listen for theme swaps via attribute changes
    const observer = new MutationObserver(() => { /* repaint with new colors on next frame */ })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      window.removeEventListener('resize', resize)
      observer.disconnect()
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [draw, resize])

  const overlay = (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483646,
        pointerEvents: 'none',
        mixBlendMode: 'normal'
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  )
  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : null
}


