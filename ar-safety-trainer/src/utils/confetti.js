// Small canvas confetti burst — no library, ~50 particles, fires once.
// Demo/dopamine moment on a passing quiz result, nothing more.

const COLORS = ['#2fbf71', '#ffb020', '#0b5fff']

export function burstConfetti(container) {
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;'
  const rect = container.getBoundingClientRect()
  canvas.width = rect.width
  canvas.height = rect.height
  container.style.position = container.style.position || 'relative'
  container.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const originX = canvas.width / 2
  const originY = canvas.height * 0.35

  const particles = Array.from({ length: 50 }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 2 + Math.random() * 4
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      size: 4 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 0.3,
      life: 1,
    }
  })

  const durationMs = 2200
  const start = performance.now()

  function frame(now) {
    // Screen was navigated away mid-burst (main.innerHTML replaced) —
    // the canvas is detached from the document; stop rather than loop
    // forever against a dead element.
    if (!canvas.isConnected) return

    const elapsed = now - start
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (const p of particles) {
      p.vy += 0.12 // gravity
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.spin
      p.life = Math.max(0, 1 - elapsed / durationMs)

      ctx.save()
      ctx.globalAlpha = p.life
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      ctx.restore()
    }

    if (elapsed < durationMs) {
      requestAnimationFrame(frame)
    } else {
      canvas.remove()
    }
  }

  requestAnimationFrame(frame)
}
