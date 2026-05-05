/* @vitest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as Icons from '../src/renderer/components/icons.jsx'

describe('Icon components', () => {
  let container = null
  let root = null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root.unmount()
      })
    }
    if (container && container.parentNode) {
      container.parentNode.removeChild(container)
    }
    container = null
    root = null
  })

  const iconNames = Object.keys(Icons).filter(name => typeof Icons[name] === 'function')

  iconNames.forEach((name) => {
    it(`renders ${name} without error`, async () => {
      const Icon = Icons[name]
      await act(async () => {
        root.render(<Icon />)
      })

      const svg = container.querySelector('svg')
      expect(svg).toBeTruthy()
      expect(svg.getAttribute('width')).toBe('16')
      expect(svg.getAttribute('height')).toBe('16')
      expect(svg.getAttribute('stroke')).toBe('currentColor')
      expect(svg.getAttribute('stroke-width')).toBe('1.6')
      expect(svg.getAttribute('aria-hidden')).toBe('true')
    })

    it(`${name} accepts and applies custom props`, async () => {
      const Icon = Icons[name]
      await act(async () => {
        root.render(<Icon size={24} stroke="red" sw={2} className="custom-icon" />)
      })

      const svg = container.querySelector('svg')
      expect(svg.getAttribute('width')).toBe('24')
      expect(svg.getAttribute('height')).toBe('24')
      expect(svg.getAttribute('stroke')).toBe('red')
      expect(svg.getAttribute('stroke-width')).toBe('2')
      expect(svg.classList.contains('custom-icon')).toBe(true)
    })
  })
})
