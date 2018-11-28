import AWS from 'aws-sdk'
import logger from './helpers/logger'

AWS.config.update({
  region: 'us-east-1'
})

const kinesis = new AWS.Kinesis()

exports.resultHandler = (handleResp, stream) => {
  let outParams = {
    Data: JSON.stringify(handleResp),
    PartitionKey: process.env.AWS_KINESIS_STANDARD_SHARD,
    StreamName: stream
  }
  let kinesisOut = kinesis.putRecord(outParams).promise()
  kinesisOut.then((data) => {
    logger.notice('Wrote Result to Kinesis stream ' + stream)
  }).catch((err) => {
    logger.warning('FAILED TO PUT TO KINESIS')
  })
  return kinesisOut
}
