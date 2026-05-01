import { describe, expect, it } from 'vitest'
import { normalizeSettings } from '../src/shared/model.js'

describe('normalizeSettings', () => {
  it('should return default settings when input is empty or invalid', () => {
    const defaultSettings = normalizeSettings()
    expect(defaultSettings.theme).toBe('dark')
    expect(defaultSettings.historyRetentionDays).toBe(30)
    expect(defaultSettings.maskSecrets).toBe(true)
    expect(defaultSettings.safetyRules.rmRfGuard).toBe(true)
    expect(Array.isArray(defaultSettings.keys)).toBe(true)

    expect(normalizeSettings(null)).toEqual(defaultSettings)
    expect(normalizeSettings('invalid')).toEqual(defaultSettings)
    expect(normalizeSettings(123)).toEqual(defaultSettings)
  })

  it('should merge partial input with default settings', () => {
    const input = { theme: 'light', historyRetentionDays: 14 }
    const settings = normalizeSettings(input)
    expect(settings.theme).toBe('light')
    expect(settings.historyRetentionDays).toBe(14)
    expect(settings.maskSecrets).toBe(true) // Should keep default
    expect(settings.safetyRules.rmRfGuard).toBe(true)
  })

  it('should handle nested safetyRules and keep defaults for missing ones', () => {
    const input = { safetyRules: { rmRfGuard: false } }
    const settings = normalizeSettings(input)
    expect(settings.safetyRules.rmRfGuard).toBe(false)
    expect(settings.safetyRules.diskGuard).toBe(true) // Default
  })

  it('should handle nested data and keep defaults for missing ones', () => {
    const input = { data: { commandHistory: 'remote' } }
    const settings = normalizeSettings(input)
    expect(settings.data.commandHistory).toBe('remote')
    expect(settings.data.outputLogs).toBe('off') // Default
  })

  it('should restore keys array to default if overwritten with non-array', () => {
    const input = { keys: 'invalid-keys' }
    const settings = normalizeSettings(input)
    expect(Array.isArray(settings.keys)).toBe(true)
    expect(settings.keys.length).toBeGreaterThan(0)
  })

  it('should restore safetyRules to default if overwritten with non-object', () => {
    const input = { safetyRules: 'invalid-rules' }
    const settings = normalizeSettings(input)
    expect(settings.safetyRules.rmRfGuard).toBe(true)
  })

  it('should restore data to default if overwritten with non-object', () => {
    const input = { data: 'invalid-data' }
    const settings = normalizeSettings(input)
    expect(settings.data.commandHistory).toBe('local')
  })

  it('should keep unknown future keys from the input', () => {
    const input = { futureFeature: 'enabled' }
    const settings = normalizeSettings(input)
    expect(settings.futureFeature).toBe('enabled')
  })
})
