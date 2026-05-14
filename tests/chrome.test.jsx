/* @vitest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TitleBar, FloatingNav } from '../src/renderer/components/chrome.jsx'

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

describe('FloatingNav component', () => {
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

  it('renders navigation items', async () => {
    await act(async () => {
      root.render(<FloatingNav view="dashboard" setView={() => {}} selectedCount={0} onAddServer={() => {}} theme="dark" onToggleTheme={() => {}} />)
    })

    expect(container.textContent).toContain('Servers')
    expect(container.textContent).toContain('Console')
    expect(container.textContent).toContain('History')
    expect(container.textContent).toContain('Settings')
  })

  it('applies active class to the selected view', async () => {
    await act(async () => {
      root.render(<FloatingNav view="history" setView={() => {}} selectedCount={0} onAddServer={() => {}} theme="dark" onToggleTheme={() => {}} />)
    })

    const buttons = Array.from(container.querySelectorAll('nav.floating-nav button'))
    const historyButton = buttons.find(b => b.textContent.includes('History'))
    expect(historyButton.className).toContain('active')
  })

  it('calls setView when a nav item is clicked', async () => {
    const setView = vi.fn()
    await act(async () => {
      root.render(<FloatingNav view="dashboard" setView={setView} selectedCount={0} onAddServer={() => {}} theme="dark" onToggleTheme={() => {}} />)
    })

    const buttons = Array.from(container.querySelectorAll('nav.floating-nav button'))
    const historyButton = buttons.find(b => b.textContent.includes('History'))
    await act(async () => {
      historyButton.click()
    })

    expect(setView).toHaveBeenCalledWith('history')
  })

  it('renders selectedCount badge on Console item', async () => {
    await act(async () => {
      root.render(<FloatingNav view="dashboard" setView={() => {}} selectedCount={3} onAddServer={() => {}} theme="dark" onToggleTheme={() => {}} />)
    })

    const buttons = Array.from(container.querySelectorAll('nav.floating-nav button'))
    const consoleButton = buttons.find(b => b.textContent.includes('Console'))
    const badge = consoleButton.querySelector('.nav-badge')

    expect(badge).not.toBeNull()
    expect(badge.textContent).toBe('3')
  })

  it('does not render badge if selectedCount is 0 or null', async () => {
    await act(async () => {
      root.render(<FloatingNav view="dashboard" setView={() => {}} selectedCount={0} onAddServer={() => {}} theme="dark" onToggleTheme={() => {}} />)
    })

    const buttons = Array.from(container.querySelectorAll('nav.floating-nav button'))
    const consoleButton = buttons.find(b => b.textContent.includes('Console'))
    const badge = consoleButton.querySelector('.nav-badge')

    expect(badge).toBeNull()
  })

  it('calls onAddServer when Add server button is clicked', async () => {
    const onAddServer = vi.fn()
    await act(async () => {
      root.render(<FloatingNav view="dashboard" setView={() => {}} selectedCount={0} onAddServer={onAddServer} theme="dark" onToggleTheme={() => {}} />)
    })

    const addButton = container.querySelector('button[title="Add server"]')
    await act(async () => {
      addButton.click()
    })

    expect(onAddServer).toHaveBeenCalledTimes(1)
  })

  it('calls onToggleTheme when Toggle theme button is clicked', async () => {
    const onToggleTheme = vi.fn()
    await act(async () => {
      root.render(<FloatingNav view="dashboard" setView={() => {}} selectedCount={0} onAddServer={() => {}} theme="dark" onToggleTheme={onToggleTheme} />)
    })

    const toggleButton = container.querySelector('button[title="Toggle theme"]')
    await act(async () => {
      toggleButton.click()
    })

    expect(onToggleTheme).toHaveBeenCalledTimes(1)
  })
})
