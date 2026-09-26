import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/presentation/contexts/auth-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading, perfil } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  if (isAuthenticated) {
    if (!perfil) {
      return <Redirect href="/concluir-perfil" />;
    }
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
});
