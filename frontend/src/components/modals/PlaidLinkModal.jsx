import React, { useEffect, useState } from 'react'
import { usePlaidLink } from 'react-plaid-link'
import { supabase } from '../../supabaseClient'

// Global flag to prevent multiple script loading
let plaidScriptLoaded = false;

export default function PlaidLinkModal({ isOpen, onClose, onSuccess, onError }) {
  const [linkToken, setLinkToken] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Set global flag when component mounts
  useEffect(() => {
    if (!plaidScriptLoaded) {
      plaidScriptLoaded = true;
    }
    
    // Cleanup when component unmounts
    return () => {
      // Don't reset the flag on unmount to prevent script reloading
    }
  }, [])

  const createLinkToken = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      
      // Ensure baseUrl doesn't already have a protocol
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const fullUrl = `${protocol}://${cleanBaseUrl}/plaid/create-link-token`
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          client_name: 'Zentari'
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to create link token')
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to create link token')
      }

      setLinkToken(result.link_token)
    } catch (err) {
      const errorMessage = err.message
      setError(errorMessage)
      console.error('Error creating link token:', err)
      if (onError) onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const onPlaidSuccess = async (public_token, metadata) => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'localhost:8000'
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http'
      
      // Ensure baseUrl doesn't already have a protocol
      const cleanBaseUrl = baseUrl.replace(/^https?:\/\//, '')
      const fullUrl = `${protocol}://${cleanBaseUrl}/plaid/accounts?user_id=${user.id}`
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_token: public_token
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || 'Failed to connect accounts')
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to connect accounts')
      }

      // Success! Notify parent
      if (onSuccess) onSuccess(result.accounts)
    } catch (err) {
      const errorMessage = err.message
      setError(errorMessage)
      console.error('Error connecting accounts:', err)
      if (onError) onError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => {
      onClose()
    },
    onEvent: (eventName, metadata) => { }
  })

  useEffect(() => {
    if (isOpen && !linkToken && !loading) {
      createLinkToken()
    }
    
    // Cleanup when modal closes
    if (!isOpen) {
      setLinkToken(null)
      setError(null)
    }
  }, [isOpen])

  useEffect(() => {
    if (ready && linkToken && isOpen) {
      try {
        open()
      } catch (err) {
        console.error('Error opening Plaid Link:', err)
        setError('Failed to open Plaid Link')
        if (onError) onError('Failed to open Plaid Link')
      }
    }
  }, [ready, linkToken, isOpen, open])

  // This component doesn't render anything visible
  // It just manages the Plaid Link flow
  return null
} 