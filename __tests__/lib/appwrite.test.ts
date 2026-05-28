describe('appwrite singleton', () => {
  it('exports account, databases, and collection IDs', () => {
    const mod = require('@/lib/appwrite')
    expect(mod.account).toBeDefined()
    expect(mod.databases).toBeDefined()
    expect(mod.DB_ID).toBe('trails-db')
    expect(mod.PROFILES_ID).toBe('profiles')
    expect(mod.BIKE_CONFIGS_ID).toBe('bike_configs')
    expect(mod.SESSIONS_ID).toBe('sessions')
    expect(mod.RUNS_ID).toBe('runs')
    expect(mod.CLIP_POSTS_ID).toBe('clip_posts')
  })
})
