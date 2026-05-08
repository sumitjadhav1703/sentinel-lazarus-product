/* @vitest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TitleBar } from '../src/renderer/components/chrome.jsx'

describe('TitleBar component', () => {
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

  it('renders the application title', async () => {
    await act(async () => {
      root.render(<TitleBar theme="dark" onToggleTheme={() => {}} />)
    })

    expect(container.textContent).toContain('lazarus-sentinel · miriam@workspace')
  })

  it('renders a toggle theme button', async () => {
    await act(async () => {
      root.render(<TitleBar theme="dark" onToggleTheme={() => {}} />)
    })

    const button = container.querySelector('button[title="Toggle theme"]')
    expect(button).not.toBeNull()
    const svg = button.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('calls onToggleTheme when the toggle button is clicked', async () => {
    const onToggleTheme = vi.fn()
    await act(async () => {
      root.render(<TitleBar theme="light" onToggleTheme={onToggleTheme} />)
    })

    const button = container.querySelector('button[title="Toggle theme"]')
    await act(async () => {
      button.click()
    })

    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })
})
