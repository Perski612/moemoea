describe('appwrite singleton', () => {
  it('exports account, databases, and collection IDs', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@/lib/appwrite')
    expect(mod.account).toBeDefined()
    expect(mod.databases).toBeDefined()
    expect(mod.DB_ID).toBe('trails-db')
    expect(mod.PROFILES_ID).toBe('profiles')
    expect(mod.BIKE_CONFIGS_ID).toBe('bike_configs')
  })
})
