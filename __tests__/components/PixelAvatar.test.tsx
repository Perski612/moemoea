import React from 'react'
import { render } from '@testing-library/react-native'
import { PixelAvatar } from '@/components/PixelAvatar'

describe('PixelAvatar', () => {
  it('rendert ohne Fehler mit Default-Props', () => {
    const { toJSON } = render(<PixelAvatar />)
    expect(toJSON()).toMatchSnapshot()
  })

  it('rendert Fully-Bike mit Coil-Fork anders als Hardtail-Air', () => {
    const { toJSON: toJSONFully } = render(<PixelAvatar bikeType="fully" suspType="coil" />)
    const { toJSON: toJSONHardtail } = render(<PixelAvatar bikeType="hardtail" suspType="air" />)
    expect(JSON.stringify(toJSONFully())).not.toBe(JSON.stringify(toJSONHardtail()))
  })

  it('wendet accentColor als Helmet-Farbe an', () => {
    const { toJSON } = render(<PixelAvatar accentColor="#ff0000" />)
    const json = JSON.stringify(toJSON())
    expect(json).toContain('#ff0000')
  })
})
