/* eslint-disable semi, no-unused-expressions */
import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import Lambda from '../index.js'
import ResHandler from '../src/responseHandlers.js'

chai.should()
chai.use(sinonChai)
chai.use(chaiAsPromised)
const expect = chai.expect

describe('Handlers [index.js]', () => {
  describe('exports.handler', () => {
    let handlerStub, parseStub
    beforeEach(() => {
      handlerStub = sinon.stub(ResHandler, 'resultHandler')
      parseStub = sinon.stub(Lambda, 'parseRecords')
    })

    afterEach(() => {
      handlerStub.restore()
      parseStub.restore()
    })

    it('should return 500 if no records in array', () => {
      let event = {
        'Records': []
      }
      let callback = sinon.spy()
      Lambda.handler(event, null, callback)
      expect(handlerStub).to.be.called
      expect(parseStub).to.be.not.called
    })

    it('should return 500 if records is undefined or false', () => {
      let event = {}
      let callback = sinon.spy()
      Lambda.handler(event, null, callback)
      expect(handlerStub).to.be.called
      expect(parseStub).to.be.not.called
    })

    it('should call parse Records if we have items in the array', () => {
      let event = {
        'Records': [{
          'kinesis': {
            'data': 'base64stuffhere'
          }
        }]
      }
      let callback = sinon.spy()
      Lambda.handler(event, null, callback)
      expect(handlerStub).to.be.not.called
      expect(parseStub).to.be.called
    })

    it('should throw an error if parseRecords throws an error', () => {
      let event = {
        'Records': [{
          'kinesis': {
            'data': 'base64stuffhere'
          }
        }]
      }
      let callback = sinon.spy()
      parseStub.rejects('Failed in parsing some records')
      Lambda.handler(event, null, (err, data) => {
        expect(handlerStub).to.be.not.called
        expect(parseStub).to.be.called
        expect(err.message).to.equal(new Error('Failed in parsing some records').message)
      })

    })
  })

  describe('parseRecords(records)', () => {
    let handlerStub, parseStub
    beforeEach(() => {
      handlerStub = sinon.stub(ResHandler, 'resultHandler')
      parseStub = sinon.stub(Lambda, 'parseRecord')
    })

    afterEach(() => {
      handlerStub.restore()
      parseStub.restore()
    })

    it('should call record parser and result handler for each record', async () => {
      let records = [
        {
          'id': 1
        }, {
          'id': 2
        }
      ]
      await Lambda.parseRecords(records)
      expect(parseStub).to.be.calledTwice
    })

    it('should reject if parseRecord errors', async () => {
      let records = [
        {
          'id': 1
        }, {
          'id': 2
        }
      ]
      parseStub.onFirstCall().returns('success')
      parseStub.onSecondCall().rejects(new Error('failure'))
      let resp
      try{
        let resp = await Lambda.parseRecords(records)
      } catch(err) {
        resp = err
      }
      expect(parseStub).to.be.calledTwice
      expect(resp.message).to.equal('failure')
    })
  })

  describe('parseRecord(record)', () => {
    let testRecord, testData, handlerStub
    beforeEach(() => {
      testData = {
        'id': '10',
        'data': {
          'title': 'Test Book',
          'formats': {
            'url': 'gutenberg_url',
            'size': 123423
          },
          lccn: '15000584'
        },
        'status': 200,
        'stage': 'new'
      }
      testRecord = {
        'kinesis': {
          'data': null
        }
      }

      handlerStub = sinon.stub(ResHandler, 'resultHandler')
    })

    afterEach(() => {
      handlerStub.restore()
    })

    it('should reject if non-200 status recieved', async () => {
      testData['status'] = 500
      testRecord['kinesis']['data'] = Buffer.from(JSON.stringify(testData)).toString('base64')
      let resp
      try {
        resp = await Lambda.parseRecord(testRecord)
      } catch (e) {
        resp = e
      }
      expect(resp['status']).to.equal('failure')
      expect(resp['code']).to.equal('non-200')
    })

    it('should pass to the enhancer stream with a new stage', async () => {
      testRecord['kinesis']['data'] = Buffer.from(JSON.stringify(testData)).toString('base64')
      let resp
      try {
        resp = await Lambda.parseRecord(testRecord)
      } catch (e) {
        resp = e
      }
      expect(handlerStub).to.be.called
      expect(resp['status']).to.equal('success')
      expect(resp['code']).to.equal('enhancing')
    })

    it('should pass to the completed stage', async () => {
      testData['stage'] = 'complete'
      testRecord['kinesis']['data'] = Buffer.from(JSON.stringify(testData)).toString('base64')
      let resp
      try {
        resp = await Lambda.parseRecord(testRecord)
      } catch (e) {
        resp = e
      }
      expect(handlerStub).to.be.called
      expect(resp['status']).to.equal('success')
      expect(resp['code']).to.equal('complete')
    })

    it('should report failure with invalid stage', async () => {
      testData['stage'] = 'badStage'
      testRecord['kinesis']['data'] = Buffer.from(JSON.stringify(testData)).toString('base64')
      let resp
      try {
        resp = await Lambda.parseRecord(testRecord)
      } catch (e) {
        resp = e
      }
      expect(resp['status']).to.equal('failure')
      expect(resp['code']).to.equal('invalid-stage')
    })
  })
})
