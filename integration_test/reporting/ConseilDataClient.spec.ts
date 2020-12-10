// import 'mocha';
// import { expect } from 'chai';
// import fetch from 'node-fetch';

// import * as loglevel from 'loglevel';
// import LogSelector from '../../src/utils/LoggerSelector';
// LogSelector.setLogger(loglevel.getLogger('conseiljs'));
// LogSelector.setLevel('debug');

// import FetchSelector from '../../src/utils/FetchSelector';
// FetchSelector.setFetch(fetch);

// import { ConseilQueryBuilder } from "../../src/reporting/ConseilQueryBuilder";
// import { ConseilOperator, ConseilSortDirection, ConseilOutput } from "../../src/types/conseil/QueryTypes"
// import { ConseilDataClient } from '../../src/reporting/ConseilDataClient'

// import { conseilServer } from '../TestAssets';

// describe('ConseilDataClient integration test suite', () => {
//     it('Extract result set as csv', async () => {
//         let query = ConseilQueryBuilder.blankQuery();
//         query = ConseilQueryBuilder.addPredicate(query, 'kind', ConseilOperator.EQ, ['transaction'], false);
//         query = ConseilQueryBuilder.addOrdering(query, 'block_level', ConseilSortDirection.DESC);
//         query = ConseilQueryBuilder.setLimit(query, 5);
//         query = ConseilQueryBuilder.setOutputType(query, ConseilOutput.csv);
//         const result = await ConseilDataClient.executeEntityQuery(conseilServer, 'tezos', conseilServer.network, 'operations', query);

//         expect(result.length).to.be.greaterThan(100);
//         expect(result.toString().split('\n').length).to.equal(6);
//     });
// });
