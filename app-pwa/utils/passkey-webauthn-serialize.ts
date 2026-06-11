/** WebAuthn JSON shapes returned by Supabase passkey authentication/options. */
export type PasskeyRequestOptionsJson = {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: Array<{
    id: string
    type?: string
    transports?: AuthenticatorTransport[]
  }>
  userVerification?: UserVerificationRequirement
  hints?: PublicKeyCredentialHint[]
  extensions?: AuthenticationExtensionsClientInputs
}

export type PasskeyAuthenticationResponseJson = {
  id: string
  rawId: string
  type: 'public-key'
  response: {
    authenticatorData: string
    clientDataJSON: string
    signature: string
    userHandle?: string
  }
  clientExtensionResults: AuthenticationExtensionsClientOutputs
  authenticatorAttachment?: AuthenticatorAttachment
}

function base64UrlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

/** Convert Supabase JSON request options to `navigator.credentials.get()` input. */
export function deserializePasskeyRequestOptions(
  options: PasskeyRequestOptionsJson,
): PublicKeyCredentialRequestOptions {
  if (
    typeof PublicKeyCredential !== 'undefined' &&
    'parseRequestOptionsFromJSON' in PublicKeyCredential &&
    typeof (
      PublicKeyCredential as PublicKeyCredential & {
        parseRequestOptionsFromJSON?: (json: unknown) => PublicKeyCredentialRequestOptions
      }
    ).parseRequestOptionsFromJSON === 'function'
  ) {
    return (
      PublicKeyCredential as PublicKeyCredential & {
        parseRequestOptionsFromJSON: (json: unknown) => PublicKeyCredentialRequestOptions
      }
    ).parseRequestOptionsFromJSON(options)
  }

  const { challenge, allowCredentials, ...rest } = options
  const result: PublicKeyCredentialRequestOptions = {
    ...rest,
    challenge: base64UrlToBuffer(challenge),
  }
  if (allowCredentials?.length) {
    result.allowCredentials = allowCredentials.map((cred) => ({
      ...cred,
      id: base64UrlToBuffer(cred.id),
      type: (cred.type ?? 'public-key') as PublicKeyCredentialType,
    }))
  }
  return result
}

/** Serialize `navigator.credentials.get()` result for Supabase verifyAuthentication. */
export function serializePasskeyAuthenticationCredential(
  credential: PublicKeyCredential,
): PasskeyAuthenticationResponseJson {
  if ('toJSON' in credential && typeof credential.toJSON === 'function') {
    return credential.toJSON() as PasskeyAuthenticationResponseJson
  }
  const response = credential.response as AuthenticatorAssertionResponse
  return {
    id: credential.id,
    rawId: credential.id,
    type: 'public-key',
    response: {
      authenticatorData: bufferToBase64Url(response.authenticatorData),
      clientDataJSON: bufferToBase64Url(response.clientDataJSON),
      signature: bufferToBase64Url(response.signature),
      userHandle: response.userHandle
        ? bufferToBase64Url(response.userHandle)
        : undefined,
    },
    clientExtensionResults: credential.getClientExtensionResults(),
    authenticatorAttachment: credential.authenticatorAttachment ?? undefined,
  }
}
