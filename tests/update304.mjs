import * as utils from '../lib/utils.mjs'
import headerList from './header-list.mjs'

var tests = []

// first, check to see that the cache actually returns a stored header
var storedHeader = 'Test-Header'
var valueA = utils.httpContent(`${storedHeader}-value-A`)
var lm1 = 'Wed, 01 Jan 2020 00:00:00 GMT'
tests.push({
  name: `HTTP cache must return stored \`${storedHeader}\` from a \`304\` that omits it`,
  id: `304-lm-use-stored-${storedHeader}`,
  requests: [
    {
      response_headers: [
        ['Cache-Control', 'max-age=2'],
        ['Last-Modified', lm1],
        ['Date', 0],
        [storedHeader, valueA]
      ],
      setup: true,
      pause_after: true
    },
    {
      response_headers: [
        ['Last-Modified', lm1],
        ['Date', 0]
      ],
      expected_type: 'lm_validated',
      expected_response_headers: [
        [storedHeader, valueA]
      ],
      setup_tests: ['expected_type']
    }
  ]
})

// now check headers in the list
function check304 (config) {
  if (config.noStore) return
  config.valueA = config.valA || utils.httpContent(`${config.name}-value-A`)
  config.valueB = config.valB || utils.httpContent(`${config.name}-value-B`)
  config.expectedValue = config.noUpdate ? config.valueA : config.valueB
  config.requirement = config.noUpdate ? 'must **not**' : 'must'
  config.etagVal = utils.httpContent(`${config.name}-etag-1`)
  config.etag = `"${config.etagVal}"`
  config.lm = 'Wed, 01 Jan 2020 00:00:00 GMT'

  tests.push({
    name: `HTTP cache ${config.requirement} update and return \`${config.name}\` from a \`304\``,
    id: `304-etag-update-response-${config.name}`,
    depends_on: [`304-lm-use-stored-${storedHeader}`],
    requests: makeRequests(config, 'ETag', config.etag)
  })
}

function makeRequests (config, validatorType, validatorValue) {
  return [
    {
      response_headers: makeResponse(config, config.valueA, validatorType, validatorValue),
      setup: true,
      pause_after: true,
      check_body: 'checkBody' in config ? config.checkBody : true
    },
    {
      response_headers: makeResponse(config, config.valueB, validatorType, validatorValue),
      expected_type: validatorType === 'ETag' ? 'etag_validated' : 'lm_validated',
      setup_tests: ['expected_type'],
      expected_response_headers: [
        [config.name, config.expectedValue]
      ],
      check_body: 'checkBody' in config ? config.checkBody : true
    },
    {
      response_headers: makeResponse(config, config.expectedValue),
      expected_type: 'cached',
      setup_tests: ['expected_type'],
      expected_response_headers: [
        [config.name, config.expectedValue]
      ],
      check_body: 'checkBody' in config ? config.checkBody : true
    }
  ]
}

function makeResponse (config, value, validatorType, validatorValue) {
  var checkHeader = 'noUpdate' in config ? !config.noUpdate : true
  var responseHeaders = [
    ['Date', 0],
    [config.name, value, checkHeader]
  ]
  if (config.name !== 'Cache-Control') {
    responseHeaders.push(['Cache-Control', 'max-age=2'])
  }
  if (validatorType && validatorType !== config.name) {
    responseHeaders.push([validatorType, validatorValue])
  }
  return responseHeaders
}

headerList.forEach(check304)

export default {
  name: 'Update Headers Upon a 304',
  id: 'update304',
  description: 'These tests check cache behaviour upon recieving a `304 Not Modified` response.',
  spec_anchors: ['freshening.responses'],
  tests: tests
}
