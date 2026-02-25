import { transformSeedToPrivateJwk } from "@credo-ts/askar"
import { holder, issuer, verifier } from "./agents"
import { DidKey, SdJwtVcRecord, TypedArrayEncoder } from "@credo-ts/core"
import { PublicJwk } from "@credo-ts/core/kms"
import { generateStatusList, setCredentialStatus, STATUS_LIST_URI, fetchStatusListFromServer, saveStatusListToServer } from "./statuslist"

async function app() {
  await issuer.initialize()
  await holder.initialize()
  await verifier.initialize()

  const issuerPrivateJwk = transformSeedToPrivateJwk({
    seed: TypedArrayEncoder.fromString('00000000000000000000000000000000'),
    type: {
      crv: 'Ed25519',
      kty: 'OKP',
    },
  }).privateJwk
  const issuerKey = PublicJwk.fromPublicJwk(
    (
      await issuer.kms.importKey({
        privateJwk: issuerPrivateJwk,
      })
    ).publicJwk
  )

  const issuerDidKey = new DidKey(issuerKey)
  const issuerDidDocument = issuerDidKey.didDocument
  const issuerDidUrl = (issuerDidDocument.verificationMethod ?? [])[0].id
  await issuer.dids.import({
    didDocument: issuerDidDocument,
    did: issuerDidDocument.id,
    overwrite: true,
    keys: [
      {
        didDocumentRelativeKeyId: `#${issuerDidUrl.split('#')[1]}`,
        kmsKeyId: issuerKey.keyId,
      },
    ],
  })

  // Generate initial status list and save to server
  let statusListJwt = await generateStatusList(issuer, issuerKey.keyId)
  console.log("🚀 ~ app ~ statusListJwt:", statusListJwt)
  await saveStatusListToServer(statusListJwt)
  console.log('Initial status list saved. All credentials valid.')

  const holderPrivateJwk = transformSeedToPrivateJwk({
    seed: TypedArrayEncoder.fromString('00000000000000000000000000000001'),
    type: {
      crv: 'Ed25519',
      kty: 'OKP',
    },
  }).privateJwk
  const holderKey = PublicJwk.fromPublicJwk(
    (
      await holder.kms.importKey({
        privateJwk: holderPrivateJwk,
      })
    ).publicJwk
  )

  const credential = {
    vct: 'https://example.com/vct-type',
    given_name: 'John',
    family_name: 'Doe',
    email: 'johndoe@example.com',
    status: {
      status_list: {
        uri: STATUS_LIST_URI,
        idx: 0,
      },
    },
  } as const

  const { compact, payload, header } = await issuer.sdJwtVc.sign({
    payload: credential,
    holder: {
      method: 'jwk',
      jwk: holderKey,
    },
    issuer: {
      didUrl: issuerDidUrl,
      method: 'did',
    },
  })

  type Payload = typeof payload
  type Header = typeof header

  // parse SD-JWT
  const sdJwtVc = holder.sdJwtVc.fromCompact<Header, Payload>(compact)
  sdJwtVc.kmsKeyId = holderKey.keyId

  const verificationResult = await holder.sdJwtVc.verify({
    compactSdJwtVc: compact,
    fetchTypeMetadata: true,
  })

  await holder.sdJwtVc.store({
    record: new SdJwtVcRecord({
      credentialInstances: [
        {
          compactSdJwtVc: compact,
          kmsKeyId: holderKey.keyId,
        },
      ],
    }),
  })

  const verifierDid = 'did:key:zUC74VEqqhEHQcgv4zagSPkqFJxuNWuoBPKjJuHETEUeHLoSqWt92viSsmaWjy82y'

  const verifierMetadata = {
    audience: verifierDid,
    issuedAt: Date.now() / 1000,
    nonce: TypedArrayEncoder.toBase64URL(verifier.kms.randomBytes({ length: 32 })),
  }

  const presentation = await holder.sdJwtVc.present<Payload>({
    sdJwtVc,
    verifierMetadata,
    presentationFrame: {
      email: true,
      status: true
    },
  })

  const { isValid } = await verifier.sdJwtVc.verify({
    compactSdJwtVc: presentation,
    keyBinding: { audience: verifierDid, nonce: verifierMetadata.nonce },
    requiredClaimKeys: [
      'email',
      'status'
    ],
  })
  console.log("Presentation isValid:", isValid)

  let serverJwt = await fetchStatusListFromServer()
  // let status = getCredentialStatus(serverJwt, 0)

  // Revoke
  statusListJwt = await setCredentialStatus(issuer, issuerKey.keyId, serverJwt, 0, 1)
  await saveStatusListToServer(statusListJwt)
  console.log(`Revoking the index ${0}`)


  const presentation1 = await holder.sdJwtVc.present<Payload>({
    sdJwtVc,
    verifierMetadata,
    presentationFrame: {
      email: true,
      status: true
    },
  })

  const { isValid: isValid1 } = await verifier.sdJwtVc.verify({
    compactSdJwtVc: presentation1,
    keyBinding: { audience: verifierDid, nonce: verifierMetadata.nonce },
    requiredClaimKeys: [
      'email',
      'status'
    ],
  })
  console.log("Presentation isValid1:", isValid1)
}

app()
