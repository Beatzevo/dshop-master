import { post, getBytes32FromIpfsHash } from '@origin/ipfs'

async function addData(data, { pgpPublicKey, ipfsApi }) {
  const pubKeyObj = await openpgp.key.readArmored(pgpPublicKey)

  const randomArray = Array.from(crypto.getRandomValues(new Uint32Array(5)))
  data.dataKey = randomArray.map((n) => n.toString(36)).join('')

  const buyerData = await openpgp.encrypt({
    message: openpgp.message.fromText(JSON.stringify(data)),
    passwords: [data.dataKey]
  })

  const encrypted = await openpgp.encrypt({
    message: openpgp.message.fromText(JSON.stringify(data)),
    publicKeys: pubKeyObj.keys
  })

  const res = await post(
    ipfsApi,
    { data: encrypted.data, buyerData: buyerData.data },
    true
  )
  return { hash: res, auth: data.dataKey, bytes32: getBytes32FromIpfsHash(res) }
}

export default addData
