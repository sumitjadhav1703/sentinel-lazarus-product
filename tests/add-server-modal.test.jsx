/* @vitest-environment jsdom */
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AddServerModal } from '../src/renderer/components/add-server-modal.jsx'

// Helper for React 16+ to trigger controlled inputs
const setInputValue = async (element, value) => {
  await act(async () => {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    nativeInputValueSetter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('AddServerModal', () => {
  let container = null
  let root = null

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    window.api = {
      ssh: {
        testConnection: vi.fn()
      }
    }
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
    delete window.api
    vi.restoreAllMocks()
  })

  it('renders nothing when closed', async () => {
    await act(async () => {
      root.render(<AddServerModal open={false} onClose={() => {}} onAdd={() => {}} />)
    })
    expect(container.innerHTML).toBe('')
  })

  it('renders the modal when open and handles form updates', async () => {
    await act(async () => {
      root.render(<AddServerModal open={true} onClose={() => {}} onAdd={() => {}} />)
    })

    expect(container.textContent).toContain('Add server')

    const aliasInput = container.querySelector('input[placeholder="web-04"]')
    const hostInput = container.querySelector('input[placeholder="web-04.prod.lzrs.io"]')
    const userInput = [...container.querySelectorAll('.field')].find(f => f.textContent.includes('User')).querySelector('input')
    const portInput = [...container.querySelectorAll('.field')].find(f => f.textContent.includes('Port')).querySelector('input')

    await setInputValue(aliasInput, 'test-server')
    await setInputValue(hostInput, 'test.local')
    await setInputValue(userInput, 'admin')
    await setInputValue(portInput, '2222')

    expect(aliasInput.value).toBe('test-server')
    expect(hostInput.value).toBe('test.local')
    expect(userInput.value).toBe('admin')
    expect(portInput.value).toBe('2222')

    // Add server button should be enabled since id and host are not empty
    const addButton = [...container.querySelectorAll('button')].find(b => b.textContent.includes('Add server'))
    expect(addButton.disabled).toBe(false)
  })

  it('disables Add server button if id or host is empty', async () => {
    await act(async () => {
      root.render(<AddServerModal open={true} onClose={() => {}} onAdd={() => {}} />)
    })

    const addButton = [...container.querySelectorAll('button')].find(b => b.textContent.includes('Add server'))
    expect(addButton.disabled).toBe(true)

    const aliasInput = container.querySelector('input[placeholder="web-04"]')
    await setInputValue(aliasInput, 'test')
    // host still empty
    expect(addButton.disabled).toBe(true)
  })

  it('tests connection successfully', async () => {
    window.api.ssh.testConnection.mockResolvedValue({ ok: true })

    await act(async () => {
      root.render(<AddServerModal open={true} onClose={() => {}} onAdd={() => {}} />)
    })

    const aliasInput = container.querySelector('input[placeholder="web-04"]')
    const hostInput = container.querySelector('input[placeholder="web-04.prod.lzrs.io"]')
    await setInputValue(aliasInput, 'test-server')
    await setInputValue(hostInput, 'test.local')

    const testButton = [...container.querySelectorAll('button')].find(b => ['Test', 'Probing...', 'Retest', 'Failed'].includes(b.textContent))

    await act(async () => {
      testButton.click()
    })

    expect(window.api.ssh.testConnection).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-server',
      host: 'test.local',
      user: 'deploy' // default user
    }))

    // Wait for the state to update to ok
    await act(async () => {
      await Promise.resolve()
    })

    expect(testButton.textContent).toBe('Retest')
  })

  it('tests connection failure', async () => {
    window.api.ssh.testConnection.mockResolvedValue({ ok: false })

    await act(async () => {
      root.render(<AddServerModal open={true} onClose={() => {}} onAdd={() => {}} />)
    })

    const aliasInput = container.querySelector('input[placeholder="web-04"]')
    const hostInput = container.querySelector('input[placeholder="web-04.prod.lzrs.io"]')
    await setInputValue(aliasInput, 'test-server')
    await setInputValue(hostInput, 'test.local')

    const testButton = [...container.querySelectorAll('button')].find(b => ['Test', 'Probing...', 'Retest', 'Failed'].includes(b.textContent))

    await act(async () => {
      testButton.click()
    })

    // Wait for the state to update to ok
    await act(async () => {
      await Promise.resolve()
    })

    expect(testButton.textContent).toBe('Failed')
  })

  it('calls onAdd and onClose when Add server is clicked', async () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()

    await act(async () => {
      root.render(<AddServerModal open={true} onClose={onClose} onAdd={onAdd} />)
    })

    const aliasInput = container.querySelector('input[placeholder="web-04"]')
    const hostInput = container.querySelector('input[placeholder="web-04.prod.lzrs.io"]')
    await setInputValue(aliasInput, 'test-server')
    await setInputValue(hostInput, 'test.local')

    const addButton = [...container.querySelectorAll('button')].find(b => b.textContent.includes('Add server'))

    await act(async () => {
      addButton.click()
    })

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      id: 'test-server',
      host: 'test.local'
    }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel or close button is clicked', async () => {
    const onClose = vi.fn()

    await act(async () => {
      root.render(<AddServerModal open={true} onClose={onClose} onAdd={() => {}} />)
    })

    const cancelButton = [...container.querySelectorAll('button')].find(b => b.textContent === 'Cancel')

    await act(async () => {
      cancelButton.click()
    })

    expect(onClose).toHaveBeenCalled()

    onClose.mockClear()

    const closeButton = container.querySelector('button.icon-button')
    await act(async () => {
      closeButton.click()
    })

    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', async () => {
    const onClose = vi.fn()

    await act(async () => {
      root.render(<AddServerModal open={true} onClose={onClose} onAdd={() => {}} />)
    })

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })

    expect(onClose).toHaveBeenCalled()
  })
})
