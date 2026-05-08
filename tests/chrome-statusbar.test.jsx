/* @vitest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StatusBar } from '../src/renderer/components/chrome.jsx'

describe('StatusBar', () => {
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

  it('renders default text with hostCount = 0 and no showPalette', async () => {
    await act(async () => {
      root.render(<StatusBar />)
    })

    expect(container.textContent).toContain('connected · 0 hosts')
    expect(container.textContent).toContain('safety: enabled')
    expect(container.textContent).toContain('session: miriam@lazarus')
    expect(container.textContent).toContain('v0.4.2')
    expect(container.textContent).not.toContain('Cmd+K palette')
  })

  it('renders with custom hostCount', async () => {
    await act(async () => {
      root.render(<StatusBar hostCount={42} />)
    })

    expect(container.textContent).toContain('connected · 42 hosts')
  })

  it('renders Cmd+K palette text when showPalette is true', async () => {
    await act(async () => {
      root.render(<StatusBar showPalette={true} />)
    })

    expect(container.textContent).toContain('Cmd+K palette')
  })
})
