import logger from '../src/helpers/logger'

import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'
import ResHandler from '../src/responseHandlers.js'

import nock from 'nock'

chai.should()
chai.use(sinonChai)
chai.use(chaiAsPromised)
const expect = chai.expect

describe('responseHandlers [src/responseHandlers.js]', () => {
  describe('exports.resultHandler(resp, stream)', () => {

    it('should log a notice on successful put', () => {
      sinon.spy(logger, 'notice')
      let kinesisMsg = nock('https://kinesis.us-east-1.amazonaws.com')
        .post('/')
        .reply(200, {
          'EncryptionType': 'NONE',
          'SequenceNumber': '0000001',
          'ShardId': 'Shard-0000000000'
        })
      let outProm = ResHandler.resultHandler({'status': 200}, 'aws-fake-stream')
      outProm.then(() => {
        expect(logger.notice).to.be.called
        expect(logger.notice).to.have.been.calledWith('Wrote Result to Kinesis stream aws-fake-stream')
      })
    })

    it('should log a warning on failure', () => {
      sinon.spy(logger, 'warning')
      let kinesisMsg = nock('https://kinesis.us-east-1.amazonaws.com')
        .post('/')
        .reply(500, {
          'EncryptionType': 'NONE',
          'SequenceNumber': '0000001',
          'ShardId': 'Shard-0000000000'
        })
      let outProm = ResHandler.resultHandler({'status': 200}, 'aws-fake-stream')
      outProm.then(() => {
        expect(logger.warning).to.be.called
        expect(logger.warning).to.have.been.calledWith('FAILED TO PUT TO KINESIS')
      })
    })
  })
})
