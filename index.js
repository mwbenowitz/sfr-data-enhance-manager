import ResHandler from './src/responseHandlers'
import logger from './src/helpers/logger'

var records

const STAGES = [
  'new',
  'mw',
  'oclc',
  'lc',
  'complete'
]

exports.handler = async (event, context, callback) => {
  logger.debug('Processing new record batch')
  records = event['Records']
  let resp
  if (!records || records.length < 1) {
    logger.error('Records missing from incoming event')
    resp = {
      'status': 500,
      'code': 'missing_records',
      'message': 'No records found in event'
    }
    ResHandler.resultHandler(resp)
    return callback(new Error('Kinesis stream failed or contained no records'))
  } else {
    try {
      await exports.parseRecords(records)
      return callback(null, 'Successfully parsed records')
    } catch(err) {
      return callback(new Error(err))
    }
  }
}

exports.parseRecords = async (records) => {
  logger.debug('Parsing incoming record set')
  let results = records.map(exports.parseRecord)
  return new Promise((resolve, reject) => {
    Promise.all(results).then((responses) => {
      resolve()
    }).catch((err) => {
      reject(err)
      return
    })
  })
}

exports.parseRecord = (record) => {
  let payload = JSON.parse(new Buffer.from(record.kinesis.data, 'base64').toString('ascii'))
  // TODO Handle non-200 input events
  logger.notice('Parsing record with message: ' + payload.message)
  return new Promise((resolve, reject) => {
    if(payload.status !== 200){
      logger.error('Error recieved from fetcher, store for reprocessing')
      reject({
        'status': 'failure',
        'code': 'non-200'
      })
      return
    } else if(payload.stage === 'complete') {
      logger.notice('Output completed record to database ingest stream')
      ResHandler.resultHandler(payload, process.env.AWS_KINESIS_ENHANCED_OUT_STREAM)
      resolve({
        'status': 'success',
        'code': 'complete'
      })
    } else if(!payload.stage || STAGES.includes(payload.stage)) {
      if(payload.stage === 'new' || !payload.stage){
        logger.notice('Starting processing for new record')
        payload['stage'] = 'mw'
      } else {
        logger.notice('Passing record to processing stage after ' + payload.message)
      }
      ResHandler.resultHandler(payload, process.env.AWS_KINESIS_ENHANCER_STREAM)
      resolve({
        'status': 'success',
        'code': 'enhancing'
      })
    } else {
      logger.error('Invalid Stage!')
      reject({
        'status': 'failure',
        'code': 'invalid-stage'
      })
      return
    }


  })
}
