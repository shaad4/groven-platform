export const getHostname = () => {
  return window.location.hostname
}

export const getSubdomain = () => {

  const host = getHostname()

  const parts = host.split('.')

  // acme.lvh.me
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}

export const isTenantDomain = () => {
  return !!getSubdomain()
}

