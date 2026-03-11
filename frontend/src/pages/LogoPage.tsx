import { useEffect } from 'react'

export default function LogoPage() {
  useEffect(() => {
    window.location.replace('/dossier_logo_interactive.html')
  }, [])

  return null
}
