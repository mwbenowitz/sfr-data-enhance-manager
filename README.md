# ResearchNow Metadata Enhancement manager
This Lambda is a simple service that handles the data flow of the ResearchNow ingest pipeline. It reads records fed to it via multiple Kinesis streams and passes the resulting records to the proper step in the metadata enhancement/parsing pipeline. When complete it will pass the completed metadata block to the database for storage.

## Installation/Deployment
1. Clone repository and run `npm install`
2. Copy .env.sample to .env and adjust necessary values (recommended settings are noted)
3. install node-lambda globally with `npm install -g node-lambda` if it does not exist
4. Copy the local/development/production.env.sample and set the appropriate values
5. Copy the event_sources_*.env.sample files and set for the appropriate values
6. Run the appropriate commands in `package.json`
    - `npm run local-run` will run the Lambda with values provided in an event.json file
    - `npm run deploy-*` will package and deploy the Lambda to the designated environment

## Description
This uses a *stage* variable to designate the step of the enhancement process where to pass the current record:
- NONE/new: Pass to the first stage in the metadata process (currently MetadataWrangler)
- mw: Processed by MetadataWrangler, pass to the OCLC enhancer
- oclc: Processed by MW and OCLC, mark as complete
- complete: Finished, pass to database manager

### TODO
- Add additional Enhancement steps (LC, Getty, etc)
- Add Kinesis/DLQ for failed records for re-processing
