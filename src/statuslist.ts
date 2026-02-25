import {
  StatusList,
  getListFromStatusListJWT,
} from '@sd-jwt/jwt-status-list';
import { Agent, JwsProtectedHeaderOptions, JwsService, JwtPayload } from '@credo-ts/core';

export const STATUS_LIST_URI = 'http://localhost:3000/status-list'

async function signStatusList(agent: Agent, keyId: string, statusList: StatusList): Promise<string> {
  const payload = new JwtPayload({
    iss: 'https://example.com',
    sub: STATUS_LIST_URI,
    iat: Math.floor(Date.now() / 1000),
    additionalClaims: {
      status_list: {
        bits: statusList.getBitsPerStatus(),
        lst: statusList.compressStatusList(),
      }
    }
  });
  const header: JwsProtectedHeaderOptions = {
    alg: 'EdDSA',
    typ: 'statuslist+jwt',
  };

  const jwsService = agent.dependencyManager.resolve(JwsService)

  return jwsService.createJwsCompact(agent.context, {
    keyId,
    payload,
    protectedHeaderOptions: header,
  })
}

export async function generateStatusList(agent: Agent, keyId: string, size = 10): Promise<string> {
  const statusList = new StatusList(new Array(size).fill(0), 1);
  return signStatusList(agent, keyId, statusList)
}

export async function setCredentialStatus(
  agent: Agent,
  keyId: string,
  currentJwt: string,
  index: number,
  status: 0 | 1,
): Promise<string> {
  const statusList = getListFromStatusListJWT(currentJwt)
  statusList.setStatus(index, status)
  return signStatusList(agent, keyId, statusList)
}

export function getCredentialStatus(jwt: string, index: number): number {
  const statusList = getListFromStatusListJWT(jwt)
  return statusList.getStatus(index)
}

export async function saveStatusListToServer(statusListJwt: string) {
  const res = await fetch(STATUS_LIST_URI, {
    method: 'POST',
    body: statusListJwt,
    headers: { 'Content-Type': 'application/statuslist+jwt' },
  })
  if (!res.ok) throw new Error(`Failed to save status list: ${res.statusText}`)
  console.log('Status list saved to server')
}

export async function fetchStatusListFromServer(): Promise<string> {
  const res = await fetch(STATUS_LIST_URI)
  if (!res.ok) throw new Error(`Failed to fetch status list: ${res.statusText}`)
  return res.text()
}

