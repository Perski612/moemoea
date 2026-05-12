import React from 'react'
import { View } from 'react-native'

const mock = (name: string) => {
  const Comp = ({ children, fill, ...props }: any) =>
    React.createElement(View, { ...props, accessibilityLabel: fill }, children)
  Comp.displayName = name
  return Comp
}

export default mock('Svg')
export const Rect = mock('Rect')
export const Circle = mock('Circle')
export const Path = mock('Path')
export const G = mock('G')
export const Line = mock('Line')
export const Polygon = mock('Polygon')
export const Polyline = mock('Polyline')
export const Text = mock('Text')
export const TSpan = mock('TSpan')
export const Defs = mock('Defs')
export const ClipPath = mock('ClipPath')
export const Stop = mock('Stop')
export const LinearGradient = mock('LinearGradient')
export const RadialGradient = mock('RadialGradient')
export const Use = mock('Use')
export const Symbol = mock('Symbol')
export const Image = mock('Image')
export const ForeignObject = mock('ForeignObject')
export const Mask = mock('Mask')
export const Pattern = mock('Pattern')
export const Marker = mock('Marker')
