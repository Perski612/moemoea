import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Colors, Fonts } from '@/constants/theme'

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <View style={s.container}>
          <Text style={s.title}>Fehler</Text>
          <Text style={s.msg}>{this.state.error.message}</Text>
          <TouchableOpacity onPress={() => this.setState({ error: null })} style={s.btn}>
            <Text style={s.btnText}>Neu laden</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return this.props.children
  }
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontFamily: Fonts.display, fontSize: 28, color: Colors.accent, letterSpacing: 2, marginBottom: 12 },
  msg: { fontFamily: Fonts.mono, fontSize: 11, color: Colors.muted, textAlign: 'center', lineHeight: 18 },
  btn: { marginTop: 24, borderWidth: 1, borderColor: Colors.accent, borderRadius: 10, padding: 12, paddingHorizontal: 24 },
  btnText: { fontFamily: Fonts.bodyBd, fontSize: 13, color: Colors.accent },
})
