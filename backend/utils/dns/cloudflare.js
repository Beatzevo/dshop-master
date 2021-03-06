const find = require('lodash/find')
const memoize = require('lodash/memoize')
const stringify = require('json-stable-stringify')
const cloudflare = require('cloudflare')

const { getLogger } = require('../logger')

const log = getLogger('utils.dns.cloudflare')

/**
 * Return a Cloudflare API client
 *
 * @returns {DNS}
 */
function _getClient(credentials) {
  if (typeof credentials === 'string') credentials = JSON.parse(credentials)

  return cloudflare(credentials)
}
const getClient = memoize(_getClient, (a) => {
  if (!a) throw new Error('Must supply Cloudflare credentails')
  return stringify(a[0])
})

async function findZone(cf, conditions) {
  const data = { page: 1, per_page: 100 }
  let response, found
  do {
    response = await cf.zones.browse(data)
    found = find(response.result, conditions)
    data.page = response.result_info.page + 1
  } while (
    !found &&
    response.result_info.page <= response.result_info.total_pages
  )
  return found
}

async function findRecord(cf, id, conditions) {
  const data = { page: 1, per_page: 100 }
  let response, found
  do {
    response = await cf.dnsRecords.browse(id, data)
    found = find(response.result, conditions)
    data.page = response.result_info.page + 1
  } while (
    !found &&
    response.result_info.page <= response.result_info.total_pages
  )
  return found
}

async function setRecords({ email, key, zone, subdomain, ipfsGateway, hash }) {
  const cf = getClient({ email, key })

  const zoneObj = await findZone(cf, { name: zone })
  if (!zoneObj) {
    log.warn(`Zone ${zone} not found.`)
    return
  }
  const zoneId = zoneObj.id
  log.info(`Found zone ${zoneObj.name} ID ${zoneObj.id}`)

  const record = `${subdomain}.${zone}`
  const cname = await findRecord(cf, zoneId, { type: 'CNAME', name: record })
  if (!cname) {
    log.info(`Adding CNAME ${record}`)
    await cf.dnsRecords.add(zoneId, {
      type: 'CNAME',
      name: record,
      content: ipfsGateway
    })
  } else {
    log.info(`CNAME ${record} exists pointing to ${cname.content}`)
  }

  const dnslink = `_dnslink.${record}`
  const txt = await findRecord(cf, zoneObj.id, { type: 'TXT', name: dnslink })
  const content = `dnslink=/ipfs/${hash}`
  if (!txt) {
    log.info(`Adding TXT ${dnslink} to ${content}`)
    await cf.dnsRecords.add(zoneObj.id, {
      type: 'TXT',
      name: dnslink,
      content,
      ttl: 120 // 2 mins
    })
  } else {
    log.info(`TXT ${dnslink} exists pointing to ${txt.content}`)
    if (txt.content !== content) {
      txt.content = content
      log.debug(`Updating TXT to ${content}`)
      await cf.dnsRecords.edit(zoneObj.id, txt.id, txt)
    }
  }
}

module.exports = setRecords

// setRecords({
//   email: 'email@example.com',
//   key: 'abc123',
//   zone: 'example.com',
//   subdomain: 'www',
//   ipfsGateway: 'ipfs-prod.ogn.app',
//   hash: ''
// })
